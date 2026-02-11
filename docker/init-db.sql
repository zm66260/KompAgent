-- 初始化 PostGIS 扩展和示例表
-- 此脚本在数据库容器首次启动时自动执行

-- 启用 PostGIS 扩展
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- 创建无人机轨迹表
CREATE TABLE IF NOT EXISTS drone_trajectory (
    id SERIAL PRIMARY KEY,
    drone_id VARCHAR(32) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    altitude DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

-- 创建空间索引
CREATE INDEX IF NOT EXISTS idx_drone_trajectory_location
    ON drone_trajectory USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_drone_trajectory_drone_id
    ON drone_trajectory (drone_id);
CREATE INDEX IF NOT EXISTS idx_drone_trajectory_timestamp
    ON drone_trajectory (timestamp DESC);

-- 创建设备状态表
CREATE TABLE IF NOT EXISTS device_status (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(32) NOT NULL UNIQUE,
    device_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'offline',
    location GEOMETRY(Point, 4326),
    battery_level INTEGER,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    properties JSONB
);

CREATE INDEX IF NOT EXISTS idx_device_status_device_id
    ON device_status (device_id);
CREATE INDEX IF NOT EXISTS idx_device_status_location
    ON device_status USING GIST (location);

-- 创建地理围栏表
CREATE TABLE IF NOT EXISTS geo_fence (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    boundary GEOMETRY(Polygon, 4326) NOT NULL,
    fence_type VARCHAR(32) DEFAULT 'alert',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geo_fence_boundary
    ON geo_fence USING GIST (boundary);

-- 创建任务日志表
CREATE TABLE IF NOT EXISTS mission_log (
    id SERIAL PRIMARY KEY,
    mission_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(32) NOT NULL,
    action VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    start_location GEOMETRY(Point, 4326),
    end_location GEOMETRY(Point, 4326),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_mission_log_mission_id
    ON mission_log (mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_log_device_id
    ON mission_log (device_id);

-- 插入示例数据
INSERT INTO device_status (device_id, device_type, status, location, battery_level, properties) VALUES
    ('DRONE001', 'quadcopter', 'idle', ST_SetSRID(ST_MakePoint(116.4074, 39.9042), 4326), 85, '{"model": "DJI Mavic 3", "max_altitude": 500}'),
    ('DRONE002', 'quadcopter', 'flying', ST_SetSRID(ST_MakePoint(116.3912, 39.9067), 4326), 62, '{"model": "DJI Mavic 3", "max_altitude": 500}'),
    ('ROBOT001', 'ground_robot', 'idle', ST_SetSRID(ST_MakePoint(116.4156, 39.9089), 4326), 90, '{"model": "Boston Dynamics Spot"}')
ON CONFLICT (device_id) DO NOTHING;

-- 插入示例轨迹数据 (北京区域)
INSERT INTO drone_trajectory (drone_id, location, altitude, speed, heading, timestamp) VALUES
    ('DRONE001', ST_SetSRID(ST_MakePoint(116.4074, 39.9042), 4326), 100, 0, 0, NOW() - INTERVAL '2 hours'),
    ('DRONE001', ST_SetSRID(ST_MakePoint(116.4084, 39.9052), 4326), 120, 5.2, 45, NOW() - INTERVAL '1 hour 55 minutes'),
    ('DRONE001', ST_SetSRID(ST_MakePoint(116.4094, 39.9062), 4326), 150, 8.5, 45, NOW() - INTERVAL '1 hour 50 minutes'),
    ('DRONE001', ST_SetSRID(ST_MakePoint(116.4104, 39.9072), 4326), 150, 10.1, 45, NOW() - INTERVAL '1 hour 45 minutes'),
    ('DRONE001', ST_SetSRID(ST_MakePoint(116.4114, 39.9082), 4326), 150, 9.8, 45, NOW() - INTERVAL '1 hour 40 minutes'),
    ('DRONE002', ST_SetSRID(ST_MakePoint(116.3912, 39.9067), 4326), 80, 0, 0, NOW() - INTERVAL '30 minutes'),
    ('DRONE002', ST_SetSRID(ST_MakePoint(116.3922, 39.9077), 4326), 100, 6.5, 30, NOW() - INTERVAL '25 minutes'),
    ('DRONE002', ST_SetSRID(ST_MakePoint(116.3932, 39.9087), 4326), 120, 8.2, 30, NOW() - INTERVAL '20 minutes');

-- 插入示例地理围栏 (北京天安门广场区域)
INSERT INTO geo_fence (name, description, boundary, fence_type) VALUES
    ('天安门广场禁飞区', '天安门广场核心区域禁止飞行',
     ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(116.3913 39.9054, 116.3913 39.9003, 116.3978 39.9003, 116.3978 39.9054, 116.3913 39.9054)')), 4326),
     'no_fly'),
    ('测试巡检区域', '日常巡检测试区域',
     ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(116.4050 39.9100, 116.4050 39.9000, 116.4200 39.9000, 116.4200 39.9100, 116.4050 39.9100)')), 4326),
     'patrol');

-- 输出初始化完成信息
DO $$
BEGIN
    RAISE NOTICE '数据库初始化完成！';
    RAISE NOTICE '- PostGIS 扩展已启用';
    RAISE NOTICE '- 示例表已创建 (drone_trajectory, device_status, geo_fence, mission_log)';
    RAISE NOTICE '- 示例数据已插入';
END $$;
