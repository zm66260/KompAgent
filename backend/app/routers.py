"""
API Routers Registration
"""

from fastapi import FastAPI

from app.controllers import agent, spatial, device, health


def register_routers(app: FastAPI, prefix: str = "/api") -> None:
    """Register all API routers"""

    # Health check (no prefix)
    app.include_router(health.router, tags=["Health"])

    # API routes
    app.include_router(agent.router, prefix=f"{prefix}/agent", tags=["Agent"])
    app.include_router(spatial.router, prefix=f"{prefix}/spatial", tags=["Spatial"])
    app.include_router(device.router, prefix=f"{prefix}/device", tags=["Device"])
