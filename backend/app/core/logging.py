"""Structured logging for CHAOSPATCH."""
import logging
import json
import sys
from datetime import datetime


class StructuredFormatter(logging.Formatter):
    """JSON structured log formatter."""

    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "experiment_id"):
            log_entry["experiment_id"] = record.experiment_id
        if hasattr(record, "event_type"):
            log_entry["event_type"] = record.event_type
        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = str(record.exc_info[1])
        return json.dumps(log_entry)


def setup_logging(level: str = "INFO"):
    """Configure structured logging."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())

    root = logging.getLogger("chaospatch")
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    root.addHandler(handler)
    root.propagate = False

    return root


logger = setup_logging()
