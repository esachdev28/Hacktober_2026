"""Database engine and session management."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # SQLite specific
    echo=settings.app_debug,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables and run lightweight migrations."""
    from app.models import experiments  # noqa: F401 - import to register models
    Base.metadata.create_all(bind=engine)

    # Safe lightweight schema migration for SQLite
    with engine.connect() as conn:
        try:
            # Check existing columns in experiments table
            result = conn.exec_driver_sql("PRAGMA table_info(experiments)")
            existing_cols = {row[1] for row in result.fetchall()}
            
            repo_columns = [
                ("repo_url", "VARCHAR(255)"),
                ("repo_owner", "VARCHAR(100)"),
                ("repo_name", "VARCHAR(100)"),
                ("default_branch", "VARCHAR(100)"),
                ("base_commit_sha", "VARCHAR(40)"),
                ("detected_language", "VARCHAR(50)"),
                ("detected_framework", "VARCHAR(50)"),
                ("project_root", "VARCHAR(255) DEFAULT '/'"),
                ("publish_status", "VARCHAR(30)"),
                ("published_branch", "VARCHAR(100)"),
                ("published_commit_sha", "VARCHAR(40)"),
                ("published_branch_url", "VARCHAR(255)"),
            ]
            
            for col_name, col_type in repo_columns:
                if col_name not in existing_cols:
                    conn.exec_driver_sql(f"ALTER TABLE experiments ADD COLUMN {col_name} {col_type}")
            conn.commit()
        except Exception:
            pass

