import {
  Experiment,
  ScenarioInfo,
  Incident,
  EvidenceItem,
  RepairAttempt,
  VerificationRun,
  ExperimentEvent,
  DashboardSummary,
  SystemSettings,
  InferenceTestResult,
  ExperimentReport,
  ProjectInspectionResult,
  RepoBaselineResponse,
  RepoDiagnosisPatchResponse,
  RepoPatchVerifyResponse,
  RepoPublishResponse,
  MonkeyVectorInfo,
  MonkeyConfig,
  MonkeyLaunchResponse,
  MonkeyStatusResponse,
} from '../types';
import { buildApiUrl, getApiBaseUrl } from './config';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = buildApiUrl(endpoint);
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
      try {
        const errJson = await res.json();
        if (errJson.detail) errorMsg = errJson.detail;
      } catch {
        // ignore json parse error
      }
      throw new Error(errorMsg);
    }
    return res.json();
  }

  // Health
  async getHealth(): Promise<{ status: string; version: string; database: string; inference: string }> {
    return this.request('/health');
  }

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    return this.request('/dashboard/summary');
  }

  // Scenarios
  async getScenarios(): Promise<ScenarioInfo[]> {
    return this.request('/scenarios');
  }

  // Experiments
  async listExperiments(limit = 50, offset = 0): Promise<{ experiments: Experiment[]; total: number }> {
    return this.request(`/experiments?limit=${limit}&offset=${offset}`);
  }

  async createExperiment(scenario_type: string, target_environment = 'SANDBOX'): Promise<Experiment> {
    return this.request('/experiments', {
      method: 'POST',
      body: JSON.stringify({ scenario_type, target_environment }),
    });
  }

  async getExperiment(id: number): Promise<Experiment> {
    return this.request(`/experiments/${id}`);
  }

  async startExperiment(id: number, autoApprove = false): Promise<{ message: string }> {
    return this.request(`/experiments/${id}/start?auto_approve=${autoApprove}`, {
      method: 'POST',
    });
  }

  async cancelExperiment(id: number): Promise<{ message: string }> {
    return this.request(`/experiments/${id}/cancel`, {
      method: 'POST',
    });
  }

  async getExperimentEvents(id: number): Promise<ExperimentEvent[]> {
    return this.request(`/experiments/${id}/events`);
  }

  async getExperimentEvidence(id: number): Promise<EvidenceItem[]> {
    return this.request(`/experiments/${id}/evidence`);
  }

  async getExperimentRepairs(id: number): Promise<RepairAttempt[]> {
    return this.request(`/experiments/${id}/repairs`);
  }

  async approveRepair(experimentId: number, repairId: number): Promise<{ message: string }> {
    return this.request(`/experiments/${experimentId}/repairs/${repairId}/approve`, {
      method: 'POST',
    });
  }

  async rejectRepair(experimentId: number, repairId: number): Promise<{ message: string }> {
    return this.request(`/experiments/${experimentId}/repairs/${repairId}/reject`, {
      method: 'POST',
    });
  }

  async getExperimentVerification(id: number): Promise<VerificationRun[]> {
    return this.request(`/experiments/${id}/verification`);
  }

  async getExperimentReport(id: number): Promise<ExperimentReport> {
    return this.request(`/experiments/${id}/report`);
  }

  async getExperimentReportMarkdown(id: number): Promise<{ markdown: string }> {
    return this.request(`/experiments/${id}/report/markdown`);
  }

  // Incidents
  async getIncidents(): Promise<Incident[]> {
    return this.request('/incidents');
  }

  // Settings
  async getSettings(): Promise<SystemSettings> {
    return this.request('/settings');
  }

  async testInference(): Promise<InferenceTestResult> {
    return this.request('/settings/inference-test', {
      method: 'POST',
    });
  }

  // Universal Public GitHub Repository Mode
  async intakeRepo(repoUrl: string, projectRoot = '/', targetBranch?: string): Promise<ProjectInspectionResult> {
    return this.request('/repository/intake', {
      method: 'POST',
      body: JSON.stringify({
        repo_url: repoUrl,
        project_root: projectRoot,
        target_branch: targetBranch,
      }),
    });
  }

  async runRepoBaseline(experimentId: number, testFilter?: string): Promise<RepoBaselineResponse> {
    return this.request('/repository/run-baseline', {
      method: 'POST',
      body: JSON.stringify({
        experiment_id: experimentId,
        test_filter: testFilter,
      }),
    });
  }

  async diagnoseAndPatchRepo(experimentId: number): Promise<RepoDiagnosisPatchResponse> {
    return this.request(`/repository/diagnose-and-patch?experiment_id=${experimentId}`, {
      method: 'POST',
    });
  }

  async verifyRepoPatch(experimentId: number, patchDiff?: string): Promise<RepoPatchVerifyResponse> {
    return this.request('/repository/verify-patch', {
      method: 'POST',
      body: JSON.stringify({
        experiment_id: experimentId,
        patch_diff: patchDiff,
      }),
    });
  }

  async publishRepoBranch(
    experimentId: number,
    githubToken: string,
    branchName?: string,
    commitMessage?: string
  ): Promise<RepoPublishResponse> {
    return this.request('/repository/publish-branch', {
      method: 'POST',
      body: JSON.stringify({
        experiment_id: experimentId,
        github_token: githubToken,
        branch_name: branchName,
        commit_message: commitMessage,
      }),
    });
  }

  getPatchExportUrl(experimentId: number): string {
    return buildApiUrl(`/repository/export-patch/${experimentId}`);
  }

  // Monkey Chaos Engine
  async fetchMonkeyVectors(): Promise<{ vectors: MonkeyVectorInfo[]; intensities: string[] }> {
    return this.request('/monkey/vectors');
  }

  async launchMonkeyChaos(config: MonkeyConfig): Promise<MonkeyLaunchResponse> {
    return this.request('/monkey/launch', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async fetchMonkeyStatus(experimentId: number): Promise<MonkeyStatusResponse> {
    return this.request(`/monkey/experiments/${experimentId}/status`);
  }

  // SSE Stream
  subscribeToExperiment(
    experimentId: number,
    onEvent: (event: ExperimentEvent) => void,
    onError?: (err: any) => void
  ): () => void {
    const streamUrl = buildApiUrl(`/experiments/${experimentId}/stream`);
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        onEvent(parsed);
      } catch (err) {
        // keepalive or non-json message
      }
    };

    // Generic event dispatcher for custom event types
    const eventTypes = [
      'LOG', 'STAGE_BASELINING', 'STAGE_INJECTING', 'STAGE_OBSERVING',
      'STAGE_DIAGNOSING', 'STAGE_PATCH_REVIEW', 'STAGE_APPLYING',
      'STAGE_VERIFYING', 'STAGE_COMPLETED', 'STAGE_FAILED',
      'FAULT_INJECTED', 'AI_DIAGNOSIS_SUCCESS', 'AI_UNAVAILABLE',
      'PATCH_PROPOSED', 'PATCH_APPLIED', 'PATCH_REJECTED',
      'REPORT_READY', 'EXPERIMENT_CANCELLED',
      'MONKEY_STRIKE_LAUNCHED', 'MONKEY_STRIKE_APPLIED',
    ];

    eventTypes.forEach((type) => {
      eventSource.addEventListener(type, (e: any) => {
        try {
          const parsed = JSON.parse(e.data);
          onEvent(parsed);
        } catch {
          // ignore
        }
      });
    });

    eventSource.onerror = (err) => {
      if (onError) onError(err);
    };

    return () => {
      eventSource.close();
    };
  }
}

export const api = new ApiClient();
export { buildApiUrl, getApiBaseUrl } from './config';
