"""Root entrypoint for Render and PaaS hosting."""
import sys
from pathlib import Path

# Ensure backend root is in Python module search path
backend_dir = Path(__file__).resolve().parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app

__all__ = ["app"]
