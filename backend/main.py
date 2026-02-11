"""
Spatial Agent Backend - FastAPI Application Entry Point
"""

import asyncio
import logging
import os
import signal
import sys
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("spatial-agent")

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app import create_app
from app.config import settings

# Create FastAPI application
app = create_app()

# Graceful shutdown handling
shutdown_event = asyncio.Event()


def signal_handler(signum: int, frame: object) -> None:
    """Handle shutdown signals"""
    logger.warning(f"Received shutdown signal: {signum}")
    shutdown_event.set()


signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)


@app.on_event("startup")
async def startup_event() -> None:
    """Application startup handler"""
    logger.info("Starting Spatial Agent Backend")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")

    # Write PID file
    pid_file = Path(__file__).parent / "runtime" / "run.pid"
    pid_file.parent.mkdir(parents=True, exist_ok=True)
    pid_file.write_text(str(os.getpid()))
    logger.info(f"PID file written: {os.getpid()}")


@app.on_event("shutdown")
async def shutdown_event_handler() -> None:
    """Application shutdown handler"""
    logger.info("Shutting down Spatial Agent Backend")

    # Remove PID file
    pid_file = Path(__file__).parent / "runtime" / "run.pid"
    if pid_file.exists():
        pid_file.unlink()

    logger.info("Shutdown complete")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
    )
