"""
Agent Controller - Chat and Agent interactions with spatial query support
"""

import json
import logging
import re
from typing import Optional
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.llm import llm_service
from app.services.spatial import spatial_service

logger = logging.getLogger(__name__)

router = APIRouter()

# System prompt for the spatial agent
SYSTEM_PROMPT = """你是一个全空间智能体助手，专注于时空数据分析和设备调度。

你的能力包括：
1. **时空查询**: 帮助用户查询和分析时空数据库中的数据
2. **轨迹分析**: 分析移动轨迹数据，计算距离、速度、停留点等
3. **设备调度**: 帮助管理无人机、机器人等设备的任务
4. **地理围栏**: 理解和管理地理围栏相关的问题

当用户询问数据查询相关的问题时，我会自动生成SQL并执行查询。

请始终使用中文回复用户，除非用户明确要求使用其他语言。
保持回复简洁、专业、有帮助。"""

# Keywords that indicate spatial query intent
SPATIAL_QUERY_KEYWORDS = [
    # Chinese keywords
    "查询", "查找", "搜索", "显示", "列出", "获取",
    "轨迹", "位置", "坐标", "区域", "范围",
    "无人机", "设备",
    "围栏",
    "统计", "分析", "平均", "最大", "最小",
    "过去", "小时", "天", "时间",
    # English keywords
    "query", "find", "search", "show", "list", "get", "fetch",
    "trajectory", "location", "coordinate", "area", "region",
    "drone", "device", "robot", "uav",
    "geofence", "fence",
    "statistic", "analyze", "average", "maximum", "minimum",
    "past", "hour", "day", "time", "last",
]


def is_spatial_query(message: str) -> bool:
    """Check if the message is a spatial query request"""
    message_lower = message.lower()
    match_count = sum(1 for kw in SPATIAL_QUERY_KEYWORDS if kw in message_lower)
    # Need at least 2 keyword matches to be considered a spatial query
    return match_count >= 2


class ChatRequest(BaseModel):
    """Chat request model"""
    message: str
    session_id: Optional[str] = None
    context: Optional[dict] = None


class ChatResponse(BaseModel):
    """Chat response model"""
    session_id: str
    message: str
    metadata: Optional[dict] = None


@router.post("/chat")
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Send a message to the agent.

    The agent will:
    1. Detect if it's a spatial query
    2. If yes, generate SQL, execute query, and format results
    3. If no, respond with general conversation
    """
    logger.info(f"Chat request: {request.message[:50]}...")

    # Check if this is a spatial query
    if is_spatial_query(request.message):
        logger.info("Detected spatial query intent")
        return await handle_spatial_query(request)

    # Regular conversation
    response_text = await llm_service.chat(
        message=request.message,
        system_prompt=SYSTEM_PROMPT,
    )

    return ChatResponse(
        session_id=request.session_id or "default",
        message=response_text,
        metadata={"provider": llm_service.provider, "type": "conversation"},
    )


async def handle_spatial_query(request: ChatRequest) -> ChatResponse:
    """Handle spatial query requests"""
    try:
        # Execute spatial query
        result = await spatial_service.query_natural_language(
            query=request.message,
            max_rows=50,  # Limit for chat context
        )

        if result["success"]:
            # Format the results for the user
            data = result["data"]
            row_count = result["row_count"]
            sql = result["sql"]
            exec_time = result["execution_time_ms"]

            # Build response message
            if row_count == 0:
                response_text = f"查询完成，没有找到符合条件的数据。\n\n**执行的 SQL:**\n```sql\n{sql}\n```"
            else:
                # Format data as a readable summary
                response_text = format_query_results(request.message, data, sql, row_count, exec_time)

            return ChatResponse(
                session_id=request.session_id or "default",
                message=response_text,
                metadata={
                    "type": "spatial_query",
                    "sql": sql,
                    "row_count": row_count,
                    "execution_time_ms": exec_time,
                    "data": data[:10],  # Include first 10 rows in metadata
                },
            )
        else:
            # Query failed
            error_msg = result.get("error", "未知错误")
            sql = result.get("sql", "")

            return ChatResponse(
                session_id=request.session_id or "default",
                message=f"查询执行失败: {error_msg}\n\n**尝试的 SQL:**\n```sql\n{sql}\n```",
                metadata={
                    "type": "spatial_query_error",
                    "error": error_msg,
                    "sql": sql,
                },
            )

    except Exception as e:
        logger.error(f"Spatial query error: {e}")
        return ChatResponse(
            session_id=request.session_id or "default",
            message=f"处理查询时发生错误: {str(e)}",
            metadata={"type": "error", "error": str(e)},
        )


def format_query_results(query: str, data: list, sql: str, row_count: int, exec_time: float) -> str:
    """Format query results into a readable message"""
    lines = []

    lines.append(f"**查询结果** (共 {row_count} 条记录，耗时 {exec_time:.2f}ms)")
    lines.append("")

    # Format data as a table-like structure
    if data:
        # Get column names from first row
        columns = list(data[0].keys())

        # Show first few rows
        max_rows = min(10, len(data))
        for i, row in enumerate(data[:max_rows]):
            row_strs = []
            for col in columns:
                value = row.get(col)
                if value is not None:
                    # Format floats
                    if isinstance(value, float):
                        row_strs.append(f"{col}: {value:.4f}")
                    else:
                        row_strs.append(f"{col}: {value}")
            lines.append(f"{i+1}. " + ", ".join(row_strs))

        if row_count > max_rows:
            lines.append(f"... 还有 {row_count - max_rows} 条记录")

    lines.append("")
    lines.append("**执行的 SQL:**")
    lines.append(f"```sql\n{sql}\n```")

    return "\n".join(lines)


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    """Stream chat responses using SSE"""
    logger.info(f"Stream chat request: {request.message[:50]}...")

    async def generate():
        try:
            # Check if this is a spatial query
            if is_spatial_query(request.message):
                # For spatial queries, we don't stream - just return the result
                yield f"data: {json.dumps({'type': 'token', 'content': '正在执行空间查询...'}, ensure_ascii=False)}\n\n"

                result = await spatial_service.query_natural_language(
                    query=request.message,
                    max_rows=50,
                )

                if result["success"]:
                    formatted = format_query_results(
                        request.message,
                        result["data"],
                        result["sql"],
                        result["row_count"],
                        result["execution_time_ms"],
                    )
                    yield f"data: {json.dumps({'type': 'token', 'content': formatted}, ensure_ascii=False)}\n\n"
                else:
                    error_msg = f"查询失败: {result.get('error', '未知错误')}"
                    yield f"data: {json.dumps({'type': 'token', 'content': error_msg}, ensure_ascii=False)}\n\n"

                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return

            # Regular streaming conversation
            async for token in llm_service.chat_stream(
                message=request.message,
                system_prompt=SYSTEM_PROMPT,
            ):
                event_data = json.dumps({"type": "token", "content": token}, ensure_ascii=False)
                yield f"data: {event_data}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            logger.error(f"Stream error: {e}")
            error_data = json.dumps({"type": "error", "message": str(e)}, ensure_ascii=False)
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/config")
async def get_config() -> dict:
    """Get current LLM configuration (without sensitive data)"""
    config = llm_service.config.copy()
    if "api_key" in config:
        config["api_key"] = "***" if config["api_key"] else None

    # Get database stats
    db_stats = await spatial_service.get_database_stats()

    return {
        "provider": llm_service.provider,
        "llm_config": config,
        "database": db_stats,
    }


@router.get("/sessions/{session_id}")
async def get_session(session_id: str) -> dict:
    """Get session history"""
    return {
        "session_id": session_id,
        "messages": [],
        "created_at": None,
    }


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str) -> dict:
    """Delete a session"""
    return {"deleted": True, "session_id": session_id}
