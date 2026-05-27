"""
Shared structured logging configuration for all SmartFinance microservices.

Outputs JSON-formatted logs with correlation IDs for distributed tracing
across the microservice boundary (architecture §20).
"""

import logging
import json
import sys
from datetime import datetime, timezone


class JSONFormatter(logging.Formatter):
    """Formats log records as single-line JSON for easy ingestion by Loki/ELK."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": getattr(record, "service", "unknown"),
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": getattr(record, "correlation_id", None),
        }

        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)


def setup_logging(service_name: str, level: int = logging.INFO) -> logging.Logger:
    """
    Configure the root logger with JSON output.

    Args:
        service_name: Identifier for this microservice (e.g., "user-service").
        level: Logging level threshold.

    Returns:
        A configured logger instance for the service.
    """
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.addHandler(handler)

    logger = logging.getLogger(service_name)
    # Attach the service name so the formatter can include it
    old_factory = logging.getLogRecordFactory()

    def record_factory(*args, **kwargs):
        record = old_factory(*args, **kwargs)
        record.service = service_name  # type: ignore[attr-defined]
        return record

    logging.setLogRecordFactory(record_factory)

    return logger
