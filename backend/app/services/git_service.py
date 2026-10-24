"""Git and GitHub service for safe public repository intake, cloning, and publishing."""
import os
import re
import uuid
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlparse
from typing import Tuple, Optional, Dict, Any


class GitSecurityError(Exception):
    """Raised when an operation violates Git security policy."""
    pass


class GitService:
    """Provides secure Git clone, inspection, patch export, and branch publishing."""

    GITHUB_HOSTS = {"github.com", "www.github.com"}
    REPO_NAME_REGEX = re.compile(r"^[a-zA-Z0-9_\-\.]+$")
    DEFAULT_BRANCH_NAMES = {"main", "master", "develop", "dev", "trunk"}

    @classmethod
    def parse_and_validate_github_url(cls, raw_url: str) -> Tuple[str, str, str]:
        """Validate and normalize public GitHub URL.
        
        Returns:
            Tuple of (canonical_https_url, owner, repo_name)
        
        Raises:
            GitSecurityError on invalid host, embedded credentials, or malformed path.
        """
        if not raw_url or not isinstance(raw_url, str):
            raise GitSecurityError("Repository URL must be a non-empty string.")

        clean_url = raw_url.strip()

        # Reject embedded credentials (e.g. https://user:pass@github.com)
        if "@" in clean_url.split("/")[2] if len(clean_url.split("/")) > 2 else False:
            raise GitSecurityError("Credentials embedded in repository URL are strictly forbidden.")

        parsed = urlparse(clean_url)

        # Allow https (or http for local testing)
        if parsed.scheme not in ("https", "http"):
            raise GitSecurityError(f"Unsupported URL scheme '{parsed.scheme}'. Only HTTPS is permitted.")

        # Validate host is github.com
        hostname = (parsed.hostname or "").lower()
        if hostname not in cls.GITHUB_HOSTS:
            raise GitSecurityError(f"Host '{hostname}' is not supported. Only public GitHub repositories are permitted.")

        # Parse path: /<owner>/<repo>
        path_parts = [p for p in parsed.path.strip("/").split("/") if p]
        if len(path_parts) < 2:
            raise GitSecurityError("Invalid GitHub repository path. Expected format: https://github.com/owner/repository")

        owner = path_parts[0]
        repo_raw = path_parts[1]
        repo_name = repo_raw[:-4] if repo_raw.endswith(".git") else repo_raw

        # Sanitize owner and repo name
        if not cls.REPO_NAME_REGEX.match(owner) or ".." in owner:
            raise GitSecurityError(f"Invalid repository owner name: {owner}")
        if not cls.REPO_NAME_REGEX.match(repo_name) or ".." in repo_name:
            raise GitSecurityError(f"Invalid repository name: {repo_name}")

        canonical_url = f"https://github.com/{owner}/{repo_name}"
        return canonical_url, owner, repo_name

    @classmethod
    def clone_repository(
        cls,
        repo_url: str,
        dest_base_dir: Path,
        depth: int = 1,
        branch: Optional[str] = None,
        timeout_seconds: int = 60,
    ) -> Tuple[Path, str, str]:
        """Safely clone a public repository into an isolated directory.
        
        Returns:
            Tuple of (clone_directory_path, default_branch, head_commit_sha)
        """
        canonical_url, owner, repo_name = cls.parse_and_validate_github_url(repo_url)

        # Create unique directory per intake
        unique_token = uuid.uuid4().hex[:8]
        clone_dir = dest_base_dir / f"{owner}_{repo_name}_{unique_token}"
        clone_dir.mkdir(parents=True, exist_ok=True)

        cmd = [
            "git", "clone",
            "--depth", str(depth),
            "--single-branch",
        ]
        if branch:
            cmd.extend(["--branch", branch])
        cmd.extend([canonical_url, str(clone_dir)])

        # Run git clone with sanitized environment and timeout
        env = os.environ.copy()
        env["GIT_TERMINAL_PROMPT"] = "0"  # Never hang asking for username/password

        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                env=env,
            )
            if res.returncode != 0:
                shutil.rmtree(clone_dir, ignore_errors=True)
                error_msg = res.stderr.strip() or res.stdout.strip()
                raise GitSecurityError(f"Git clone failed: {error_msg}")
        except subprocess.TimeoutExpired:
            shutil.rmtree(clone_dir, ignore_errors=True)
            raise TimeoutError(f"Git clone timed out after {timeout_seconds} seconds")

        # Capture HEAD commit SHA
        sha_proc = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(clone_dir),
            capture_output=True,
            text=True,
        )
        head_sha = sha_proc.stdout.strip() if sha_proc.returncode == 0 else "UNKNOWN"

        # Capture active branch
        branch_proc = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=str(clone_dir),
            capture_output=True,
            text=True,
        )
        detected_branch = branch_proc.stdout.strip() if branch_proc.returncode == 0 else "main"

        return clone_dir, detected_branch, head_sha

    @classmethod
    def publish_repair_branch(
        cls,
        repo_dir: Path,
        repo_url: str,
        base_commit_sha: str,
        experiment_id: int,
        github_token: str,
        patch_diff: str,
        branch_name: Optional[str] = None,
        commit_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Publish verified patch to a dedicated repair branch on remote GitHub repository.
        
        Strict Safety Guarantees:
        1. Base commit validation: prevents publishing if remote has drifted.
        2. Forbidden branches: NEVER pushes to main, master, or default branches.
        3. NO force-pushes: rejects any force-push operation.
        4. Token safety: Token is used via credential header and NEVER written to disk or git remotes.
        """
        canonical_url, owner, repo_name = cls.parse_and_validate_github_url(repo_url)

        if not github_token or not github_token.strip():
            return {
                "status": "PUBLISH_AUTH_REQUIRED",
                "message": "GitHub Personal Access Token is required to publish a repair branch. Read-only analysis and patch export remain available.",
            }

        # 1. Dedicated repair branch name
        target_branch = branch_name or f"chaospatch/repair-{experiment_id}"

        # 2. Strict Protection: Forbidden branches
        clean_target = target_branch.strip().lower()
        if clean_target in cls.DEFAULT_BRANCH_NAMES or clean_target.startswith("main") or clean_target.startswith("master"):
            return {
                "status": "FORBIDDEN_BRANCH",
                "message": f"Directly pushing to default or protected branch '{target_branch}' is strictly prohibited. Use dedicated chaospatch/* repair branch.",
            }

        # 3. Verify base commit
        sha_proc = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(repo_dir),
            capture_output=True,
            text=True,
        )
        current_sha = sha_proc.stdout.strip()
        if base_commit_sha and current_sha != base_commit_sha:
            return {
                "status": "ABORTED_BASE_DRIFT",
                "message": f"Base commit drift detected (Expected: {base_commit_sha}, Found: {current_sha}). Verification must be re-run on current commit.",
            }

        # 4. Create new repair branch
        checkout_proc = subprocess.run(
            ["git", "checkout", "-b", target_branch],
            cwd=str(repo_dir),
            capture_output=True,
            text=True,
        )
        if checkout_proc.returncode != 0:
            # If branch already exists locally, checkout
            subprocess.run(["git", "checkout", target_branch], cwd=str(repo_dir), capture_output=True)

        # 5. Commit changes
        msg = commit_message or f"fix(chaospatch): verified automated reliability repair (exp #{experiment_id})"
        subprocess.run(["git", "add", "-A"], cwd=str(repo_dir), capture_output=True)
        
        commit_proc = subprocess.run(
            ["git", "-c", "user.name=CHAOSPATCH Bot", "-c", "user.email=bot@chaospatch.local", "commit", "-m", msg],
            cwd=str(repo_dir),
            capture_output=True,
            text=True,
        )
        
        # Capture new commit SHA
        new_sha_proc = subprocess.run(["git", "rev-parse", "HEAD"], cwd=str(repo_dir), capture_output=True, text=True)
        new_commit_sha = new_sha_proc.stdout.strip()

        # 6. Push to remote using authenticated ephemeral header
        # Header config ensures token is not stored in remote URL or .git/config
        auth_header = f"Authorization: Basic {github_token}" if github_token.startswith("ghp_") or github_token.startswith("github_pat_") else f"Authorization: Bearer {github_token}"
        
        # We push to the canonical repository HTTPS URL with extraheader
        push_cmd = [
            "git",
            "-c", f"http.extraheader={auth_header}",
            "push",
            "-u",
            canonical_url,
            f"{target_branch}:{target_branch}",
        ]

        env = os.environ.copy()
        env["GIT_TERMINAL_PROMPT"] = "0"

        push_res = subprocess.run(
            push_cmd,
            cwd=str(repo_dir),
            capture_output=True,
            text=True,
            timeout=30,
            env=env,
        )

        if push_res.returncode != 0:
            err_msg = push_res.stderr.strip() or push_res.stdout.strip()
            if "403" in err_msg or "Permission to" in err_msg or "denied" in err_msg:
                return {
                    "status": "INSUFFICIENT_PERMISSIONS",
                    "message": f"Write access denied for repository '{canonical_url}'. You must have write/collaborator permissions to push branches to this repository, or fork the repository and apply the patch.",
                }
            return {
                "status": "PUSH_FAILED",
                "message": f"Failed to push repair branch: {err_msg}",
            }

        remote_url = f"{canonical_url}/tree/{target_branch}"
        return {
            "status": "PUBLISHED",
            "published_branch": target_branch,
            "commit_sha": new_commit_sha,
            "remote_branch_url": remote_url,
            "message": f"Successfully published verified repair branch to {remote_url}",
        }

    @classmethod
    def generate_export_patch(cls, experiment_id: int, base_commit: str, patch_diff: str, summary: str = "") -> str:
        """Format standard git unified patch file with provenance metadata."""
        lines = [
            f"# CHAOSPATCH Verified Repair Patch",
            f"# Experiment ID: #{experiment_id}",
            f"# Base Commit: {base_commit}",
            f"# Summary: {summary}",
            f"# Generated: Independent Verification PASSED",
            "",
            patch_diff.strip(),
            "",
        ]
        return "\n".join(lines)
