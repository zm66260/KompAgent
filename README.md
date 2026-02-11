# 全空间智能体 (Spatial Agent)

基于 DeepAgents/LangGraph 的时空数据分析与设备调度平台。

## 项目结构

```
spatial-agent/
├── libs/                    # TypeScript 库
│   └── spatial-agent/       # 核心 Agent 库
│       └── src/
│           ├── agent.ts     # createSpatialAgent
│           ├── middleware/  # 时空查询、设备控制中间件
│           ├── backends/    # PostGIS、设备 API 后端
│           └── skills/      # 技能加载器
│
├── backend/                 # Python FastAPI 后端
│   ├── main.py
│   └── app/
│       ├── controllers/     # API 控制器
│       ├── services/        # 业务逻辑
│       └── models/          # 数据模型
│
├── examples/
│   └── frontend/            # React + Vite 前端示例
│
└── package.json             # pnpm workspace 配置
```

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- Python >= 3.11
- PostgreSQL + PostGIS
- Redis

### 安装依赖

```bash
# 安装 Node.js 依赖
pnpm install

# 安装 Python 依赖
cd backend && uv sync
```

### 开发模式

```bash
# 同时启动前端和后端
pnpm dev

# 或分别启动
pnpm dev:frontend  # 前端 http://localhost:5173
pnpm dev:backend   # 后端 http://localhost:8000
```

### 构建

```bash
# 构建 TypeScript 库
pnpm build

# 构建前端
pnpm --filter @spatial-agent/frontend build
```

## 核心功能

### 1. 时空查询

使用自然语言查询 PostGIS 数据库：

```typescript
import { createSpatialAgent } from "@spatial-agent/core";

const agent = createSpatialAgent({
  spatial: {
    postgis: {
      connectionString: process.env.DATABASE_URL,
    },
  },
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "查询过去24小时北京区域的无人机轨迹" }],
});
```

### 2. 设备调度

控制远程设备（无人机、机器人等）：

```typescript
const agent = createSpatialAgent({
  spatial: {
    deviceApi: {
      endpoint: process.env.DEVICE_API_URL,
      apiKey: process.env.DEVICE_API_KEY,
    },
  },
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "让无人机 DRONE001 起飞到 150 米高度" }],
});
```

### 3. 轨迹分析

分析移动轨迹数据：

```typescript
import { calculateTrajectoryLength, detectStopPoints } from "@spatial-agent/core";

const length = calculateTrajectoryLength(points);
const stops = detectStopPoints(points, 0.5, 60);
```

## 技术栈

- **Agent 框架**: DeepAgents + LangGraph
- **语言**: TypeScript / Python
- **后端**: FastAPI + PostgreSQL/PostGIS
- **前端**: React + Vite + TailwindCSS
- **LLM**: Claude (Anthropic) / GPT-4 (OpenAI)

## 许可证

MIT License
