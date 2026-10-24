"""CHAOSPATCH FastAPI Application Entrypoint."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import logger
from app.db.database import init_db
from app.api.routes import (
    health_router,
    dashboard_router,
    scenarios_router,
    experiments_router,
    incidents_router,
    settings_router,
    repository_router,
    monkey_router,
)


# Initialize database schema
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info("CHAOSPATCH backend ready for chaos experiments.")
    yield
    logger.info("CHAOSPATCH backend shutting down.")


app = FastAPI(
    title="CHAOSPATCH API",
    description="Inject failure. Let AI recover. Automated chaos engineering & AI repair verification platform.",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(scenarios_router, prefix="/api")
app.include_router(experiments_router, prefix="/api")
app.include_router(incidents_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(repository_router, prefix="/api")
app.include_router(monkey_router, prefix="/api")


@app.get("/")
def root():
    return {
        "product": "CHAOSPATCH",
        "tagline": "Inject failure. Let AI recover.",
        "version": "0.1.0",
        "docs": "/docs",
    }
