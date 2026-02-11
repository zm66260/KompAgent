"""
Spatial Controller - Spatial queries and analysis
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.spatial import spatial_service

logger = logging.getLogger(__name__)

router = APIRouter()


class SpatialQueryRequest(BaseModel):
    """Spatial query request"""
    query: str  # Natural language query
    max_rows: Optional[int] = 100


class SpatialQueryResponse(BaseModel):
    """Spatial query response"""
    success: bool
    sql: str
    data: List[dict]
    row_count: int
    execution_time_ms: float
    error: Optional[str] = None


@router.post("/query")
async def execute_query(request: SpatialQueryRequest) -> SpatialQueryResponse:
    """
    Execute a natural language spatial query.

    The query will be converted to SQL using LLM, validated, and executed against PostGIS.

    Example queries:
    - "查询过去24小时的无人机轨迹"
    - "显示所有在线的设备"
    - "统计每架无人机的平均速度"
    - "查找北京区域内的所有地理围栏"
    """
    logger.info(f"Spatial query: {request.query}")

    try:
        result = await spatial_service.query_natural_language(
            query=request.query,
            max_rows=request.max_rows or 100,
        )

        return SpatialQueryResponse(
            success=result["success"],
            sql=result["sql"],
            data=result["data"],
            row_count=result["row_count"],
            execution_time_ms=result["execution_time_ms"],
            error=result.get("error"),
        )
    except Exception as e:
        logger.error(f"Query error: {e}")
        return SpatialQueryResponse(
            success=False,
            sql="",
            data=[],
            row_count=0,
            execution_time_ms=0,
            error=str(e),
        )


@router.get("/stats")
async def get_database_stats() -> dict:
    """Get database statistics"""
    return await spatial_service.get_database_stats()


class TrajectoryRequest(BaseModel):
    """Trajectory query request"""
    entity_id: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    bbox: Optional[List[float]] = None  # [minLon, minLat, maxLon, maxLat]
    limit: Optional[int] = 1000


@router.post("/trajectory")
async def query_trajectory(request: TrajectoryRequest) -> dict:
    """Query trajectory data"""
    # Build natural language query
    query_parts = []

    if request.entity_id:
        query_parts.append(f"无人机 {request.entity_id} 的")
    else:
        query_parts.append("所有无人机的")

    query_parts.append("轨迹数据")

    if request.start_time and request.end_time:
        query_parts.append(f"，时间范围从 {request.start_time} 到 {request.end_time}")
    elif request.start_time:
        query_parts.append(f"，从 {request.start_time} 开始")

    if request.bbox:
        query_parts.append(f"，在区域 [{request.bbox}] 内")

    query = "".join(query_parts)

    result = await spatial_service.query_natural_language(query, request.limit or 1000)

    return {
        "trajectories": result["data"],
        "count": result["row_count"],
        "sql": result["sql"],
        "success": result["success"],
        "error": result.get("error"),
    }


@router.post("/trajectory/analyze")
async def analyze_trajectory(request: TrajectoryRequest) -> dict:
    """Analyze trajectory data - calculate statistics"""
    # Build analysis query
    entity_filter = f"无人机 {request.entity_id}" if request.entity_id else "所有无人机"
    query = f"统计{entity_filter}的轨迹点数量、平均速度、平均高度和总距离"

    result = await spatial_service.query_natural_language(query, 100)

    if result["success"] and result["data"]:
        return {
            "success": True,
            "analysis": result["data"],
            "sql": result["sql"],
        }
    else:
        return {
            "success": False,
            "error": result.get("error", "分析失败"),
            "sql": result.get("sql", ""),
        }


class GeoFenceRequest(BaseModel):
    """Geofence query request"""
    name: Optional[str] = None
    fence_type: Optional[str] = None
    is_active: Optional[bool] = True


@router.get("/geofence")
async def list_geofences(
    fence_type: Optional[str] = None,
    is_active: Optional[bool] = None
) -> dict:
    """List all geofences"""
    query_parts = ["查询所有地理围栏"]

    if fence_type:
        query_parts.append(f"，类型为 {fence_type}")
    if is_active is not None:
        status = "启用" if is_active else "禁用"
        query_parts.append(f"，状态为{status}")

    query = "".join(query_parts)
    result = await spatial_service.query_natural_language(query, 100)

    return {
        "geofences": result["data"],
        "count": result["row_count"],
        "sql": result["sql"],
        "success": result["success"],
    }


class PointCheckRequest(BaseModel):
    """Point check request"""
    longitude: float
    latitude: float


@router.post("/geofence/{fence_id}/check")
async def check_geofence(fence_id: str, point: PointCheckRequest) -> dict:
    """Check if a point is inside a geofence"""
    query = f"检查点 ({point.longitude}, {point.latitude}) 是否在围栏 ID {fence_id} 内"

    # Direct SQL for this specific query
    sql = f"""
    SELECT
        id, name, fence_type,
        ST_Contains(
            boundary,
            ST_SetSRID(ST_MakePoint({point.longitude}, {point.latitude}), 4326)
        ) as is_inside
    FROM geo_fence
    WHERE id = {fence_id}
    """

    try:
        results, exec_time = await spatial_service.execute_query(sql, 1)
        if results:
            return {
                "fence_id": fence_id,
                "fence_name": results[0].get("name"),
                "inside": results[0].get("is_inside", False),
                "point": {"longitude": point.longitude, "latitude": point.latitude},
            }
        else:
            return {
                "fence_id": fence_id,
                "inside": False,
                "error": "围栏不存在",
            }
    except Exception as e:
        return {
            "fence_id": fence_id,
            "inside": False,
            "error": str(e),
        }


@router.get("/devices")
async def list_devices(
    device_type: Optional[str] = None,
    status: Optional[str] = None
) -> dict:
    """List all devices with their current status and location"""
    query_parts = ["查询所有设备的状态和位置"]

    if device_type:
        query_parts.append(f"，设备类型为 {device_type}")
    if status:
        query_parts.append(f"，状态为 {status}")

    query = "".join(query_parts)
    result = await spatial_service.query_natural_language(query, 100)

    return {
        "devices": result["data"],
        "count": result["row_count"],
        "sql": result["sql"],
        "success": result["success"],
    }
