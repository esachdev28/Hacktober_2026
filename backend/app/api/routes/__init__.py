# API routes module
from app.api.routes.health import router as health_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.scenarios import router as scenarios_router
from app.api.routes.experiments import router as experiments_router
from app.api.routes.incidents import router as incidents_router
from app.api.routes.settings import router as settings_router
from app.api.routes.repository import router as repository_router
from app.api.routes.monkey import router as monkey_router

__all__ = [
    "health_router",
    "dashboard_router",
    "scenarios_router",
    "experiments_router",
    "incidents_router",
    "settings_router",
    "repository_router",
    "monkey_router",
]

