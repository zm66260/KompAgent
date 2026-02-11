"""
Spatial Query Service - Natural language to SQL conversion and execution
"""

import json
import logging
import re
import time
from typing import Any, Optional
from datetime import datetime, timedelta

import asyncpg

from app.config import settings
from app.services.llm import llm_service

logger = logging.getLogger(__name__)

# Database schema description for LLM
DATABASE_SCHEMA = """
数据库表结构：

1. drone_trajectory - 无人机轨迹表
   - id: SERIAL PRIMARY KEY
   - drone_id: VARCHAR(32) - 无人机ID
   - location: GEOMETRY(Point, 4326) - 位置点 (经度, 纬度)
   - altitude: DOUBLE PRECISION - 高度(米)
   - speed: DOUBLE PRECISION - 速度(米/秒)
   - heading: DOUBLE PRECISION - 航向角(度)
   - timestamp: TIMESTAMPTZ - 时间戳
   - metadata: JSONB - 元数据

2. device_status - 设备状态表
   - id: SERIAL PRIMARY KEY
   - device_id: VARCHAR(32) UNIQUE - 设备ID
   - device_type: VARCHAR(32) - 设备类型 (quadcopter, ground_robot等)
   - status: VARCHAR(32) - 状态 (idle, flying, offline等)
   - location: GEOMETRY(Point, 4326) - 当前位置
   - battery_level: INTEGER - 电池电量(%)
   - last_seen: TIMESTAMPTZ - 最后在线时间
   - properties: JSONB - 设备属性

3. geo_fence - 地理围栏表
   - id: SERIAL PRIMARY KEY
   - name: VARCHAR(128) - 围栏名称
   - description: TEXT - 描述
   - boundary: GEOMETRY(Polygon, 4326) - 围栏边界
   - fence_type: VARCHAR(32) - 围栏类型 (no_fly, alert, patrol等)
   - is_active: BOOLEAN - 是否启用
   - created_at: TIMESTAMPTZ
   - updated_at: TIMESTAMPTZ

4. mission_log - 任务日志表
   - id: SERIAL PRIMARY KEY
   - mission_id: VARCHAR(64) - 任务ID
   - device_id: VARCHAR(32) - 设备ID
   - action: VARCHAR(64) - 动作
   - status: VARCHAR(32) - 状态
   - start_location: GEOMETRY(Point, 4326)
   - end_location: GEOMETRY(Point, 4326)
   - started_at: TIMESTAMPTZ
   - completed_at: TIMESTAMPTZ
   - error_message: TEXT
   - metadata: JSONB

PostGIS 常用函数：
- ST_AsText(geom) - 转为WKT格式
- ST_AsGeoJSON(geom) - 转为GeoJSON
- ST_X(point), ST_Y(point) - 获取经度/纬度
- ST_Distance(geom1, geom2) - 计算距离(度)
- ST_DWithin(geom1, geom2, distance) - 在指定距离内
- ST_Within(geom1, geom2) - 判断是否在多边形内
- ST_MakePoint(lon, lat) - 创建点
- ST_SetSRID(geom, 4326) - 设置坐标系
- ST_Buffer(geom, distance) - 创建缓冲区

时间查询示例：
- NOW() - INTERVAL '24 hours' - 过去24小时
- NOW() - INTERVAL '7 days' - 过去7天
- timestamp BETWEEN '2024-01-01' AND '2024-01-31' - 时间范围
"""

SQL_GENERATION_PROMPT = f"""你是一个 PostGIS 空间数据库专家。根据用户的自然语言查询，生成安全、高效的 SQL 语句。

{DATABASE_SCHEMA}

重要规则：
1. 只生成 SELECT 语句，不允许 INSERT/UPDATE/DELETE/DROP 等修改操作
2. 使用参数化查询的格式，但直接填入值（因为这是只读查询）
3. 限制返回行数，默认 LIMIT 100
4. 对于位置数据，使用 ST_AsGeoJSON 或 ST_X/ST_Y 格式化输出
5. 时间范围查询使用 INTERVAL 语法
6. 输出格式必须是纯 SQL，不要包含 markdown 代码块或其他格式

示例：
用户: "查询过去24小时北京区域的无人机轨迹"
SQL: SELECT drone_id, ST_X(location) as longitude, ST_Y(location) as latitude, altitude, speed, timestamp FROM drone_trajectory WHERE timestamp > NOW() - INTERVAL '24 hours' ORDER BY timestamp DESC LIMIT 100

用户: "显示所有在线的无人机"
SQL: SELECT device_id, device_type, status, ST_X(location) as longitude, ST_Y(location) as latitude, battery_level, last_seen FROM device_status WHERE device_type = 'quadcopter' AND status != 'offline' ORDER BY last_seen DESC

用户: "统计每架无人机的平均速度"
SQL: SELECT drone_id, COUNT(*) as point_count, AVG(speed) as avg_speed, AVG(altitude) as avg_altitude FROM drone_trajectory WHERE timestamp > NOW() - INTERVAL '24 hours' GROUP BY drone_id ORDER BY avg_speed DESC

现在请根据用户的查询生成 SQL：
"""


class SpatialQueryService:
    """Service for spatial queries using natural language"""

    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None

    async def get_pool(self) -> asyncpg.Pool:
        """Get or create database connection pool"""
        if self._pool is None:
            # Convert SQLAlchemy URL to asyncpg format
            db_url = settings.DATABASE_URL
            if db_url.startswith("postgresql+asyncpg://"):
                db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

            self._pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10)
        return self._pool

    async def close(self):
        """Close connection pool"""
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def generate_sql(self, natural_query: str) -> str:
        """
        Use LLM to convert natural language query to SQL.

        Args:
            natural_query: Natural language query from user

        Returns:
            Generated SQL query
        """
        prompt = f"{SQL_GENERATION_PROMPT}\n\n用户查询: {natural_query}\nSQL:"

        response = await llm_service.chat(
            message=prompt,
            system_prompt="你是一个 SQL 生成器。只输出纯 SQL 语句，不要有任何其他文字。",
        )

        # Clean up the response
        sql = response.strip()

        # Remove markdown code blocks if present
        if sql.startswith("```"):
            lines = sql.split("\n")
            sql = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

        # Remove sql prefix
        if sql.lower().startswith("sql"):
            sql = sql[3:].strip()

        return sql.strip()

    def validate_sql(self, sql: str) -> tuple[bool, str]:
        """
        Validate SQL for safety.

        Returns:
            (is_valid, error_message)
        """
        sql_upper = sql.upper().strip()

        # Check for dangerous keywords
        dangerous_keywords = [
            "INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE",
            "ALTER", "CREATE", "GRANT", "REVOKE", "EXECUTE",
            "COPY", "VACUUM", "REINDEX"
        ]

        for keyword in dangerous_keywords:
            # Check if keyword is at the start or after a semicolon
            if sql_upper.startswith(keyword) or f"; {keyword}" in sql_upper:
                return False, f"不允许的操作: {keyword}"

        # Check for SQL injection patterns
        injection_patterns = [
            r";\s*--",  # Comment after semicolon
            r"'\s*OR\s+'1'\s*=\s*'1",  # OR 1=1
            r'"\s*OR\s+"1"\s*=\s*"1',
            r"UNION\s+SELECT",  # UNION injection
        ]

        for pattern in injection_patterns:
            if re.search(pattern, sql, re.IGNORECASE):
                return False, f"检测到潜在的 SQL 注入模式"

        # Must start with SELECT
        if not sql_upper.startswith("SELECT"):
            return False, "只允许 SELECT 查询"

        return True, ""

    async def execute_query(
        self, sql: str, max_rows: int = 100
    ) -> tuple[list[dict], float]:
        """
        Execute SQL query and return results.

        Args:
            sql: SQL query to execute
            max_rows: Maximum rows to return

        Returns:
            (results, execution_time_ms)
        """
        # Add LIMIT if not present
        if "LIMIT" not in sql.upper():
            sql = f"{sql.rstrip(';')} LIMIT {max_rows}"

        pool = await self.get_pool()
        start_time = time.time()

        try:
            async with pool.acquire() as conn:
                rows = await conn.fetch(sql)
                execution_time = (time.time() - start_time) * 1000  # ms

                # Convert rows to dicts
                results = [dict(row) for row in rows]

                # Convert datetime objects to strings
                for row in results:
                    for key, value in row.items():
                        if isinstance(value, datetime):
                            row[key] = value.isoformat()

                return results, execution_time

        except asyncpg.PostgresError as e:
            logger.error(f"Database error: {e}")
            raise Exception(f"数据库错误: {str(e)}")

    async def query_natural_language(
        self, query: str, max_rows: int = 100
    ) -> dict[str, Any]:
        """
        Execute a natural language spatial query.

        Args:
            query: Natural language query
            max_rows: Maximum rows to return

        Returns:
            Query result with SQL, data, and metadata
        """
        # Generate SQL from natural language
        logger.info(f"Generating SQL for: {query}")
        sql = await self.generate_sql(query)
        logger.info(f"Generated SQL: {sql}")

        # Validate SQL
        is_valid, error = self.validate_sql(sql)
        if not is_valid:
            return {
                "success": False,
                "error": error,
                "sql": sql,
                "data": [],
                "row_count": 0,
                "execution_time_ms": 0,
            }

        # Execute query
        try:
            results, execution_time = await self.execute_query(sql, max_rows)
            return {
                "success": True,
                "sql": sql,
                "data": results,
                "row_count": len(results),
                "execution_time_ms": round(execution_time, 2),
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "sql": sql,
                "data": [],
                "row_count": 0,
                "execution_time_ms": 0,
            }

    async def get_database_stats(self) -> dict:
        """Get database statistics"""
        pool = await self.get_pool()

        try:
            async with pool.acquire() as conn:
                # Get table counts
                trajectory_count = await conn.fetchval(
                    "SELECT COUNT(*) FROM drone_trajectory"
                )
                device_count = await conn.fetchval(
                    "SELECT COUNT(*) FROM device_status"
                )
                fence_count = await conn.fetchval(
                    "SELECT COUNT(*) FROM geo_fence"
                )

                return {
                    "tables": {
                        "drone_trajectory": trajectory_count,
                        "device_status": device_count,
                        "geo_fence": fence_count,
                    },
                    "status": "connected",
                }
        except Exception as e:
            return {
                "tables": {},
                "status": "error",
                "error": str(e),
            }


# Global service instance
spatial_service = SpatialQueryService()
