# TECH_STACK.md - 全空间智能体技术栈

> 本文件详细定义项目技术栈，是 [CLAUDE.md](./CLAUDE.md) 的配套参考文档。
> **基于 Node.js + TypeScript + deepagentsjs + Next.js 技术栈**

---

## 1. 技术选型总览

### 1.1 架构决策

| 层级 | 技术方案 | 选型理由 |
|------|----------|----------|
| **Agent 框架** | deepagents 1.6+ | **LangChain 官方 TypeScript 实现**，完整生态支持 |
| **编程语言** | TypeScript 5.7+ + Node.js 20+ | 全栈统一、类型安全、前后端代码共享 |
| **Monorepo** | pnpm workspace 9.15+ | 高效依赖管理、多包支持 |
| **全栈框架** | Next.js 15+ (App Router) | 前后端一体、RSC、API Routes |
| **UI 组件** | shadcn/ui + Radix UI | 可定制、无障碍、TypeScript 原生 |
| **样式方案** | Tailwind CSS 3.4+ | 实用优先、响应式、高性能 |
| **数据库** | PostgreSQL + PostGIS + pgvector | 时空数据、向量检索、检查点持久化 |
| **ORM** | Drizzle ORM 0.38+ | 类型安全、零运行时开销、SQL-like API |
| **缓存/消息** | Redis (ioredis 5.4+) | 会话缓存、消息队列、Pub/Sub |
| **沙箱环境** | Docker + dockerode 4.0+ | 代码隔离执行、安全保障 |
| **LLM 接入** | LangChain 官方接口 | Anthropic、OpenAI 等多模型支持 |

### 1.2 技术栈全景图

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js 15 (App Router)                      │
│  ┌─────────────────────┐     ┌──────────────────────────┐      │
│  │   Client 客户端      │     │   Server API Routes      │      │
│  │  React 19 + RSC     │ ←─→ │   /api/chat (SSE)        │      │
│  │  shadcn/ui          │     │   /api/spatial           │      │
│  │  Tailwind CSS       │     │   /api/device            │      │
│  │  TanStack Query     │     │   /api/sandbox           │      │
│  └─────────────────────┘     └──────────────────────────┘      │
│         ↓ Mapbox/Cesium              ↓ deepagents              │
│  ┌─────────────────────┐     ┌──────────────────────────┐      │
│  │  3D/2D 地图可视化    │     │   AgentRunner            │      │
│  │  ECharts 图表       │     │   Backend 抽象层          │      │
│  │  沙箱监控面板        │     │   Skills 技能系统        │      │
│  └─────────────────────┘     └──────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      核心层 (packages/core)                      │
│  AgentRunner (deepagents 封装)  │  Backend Protocol            │
│  ├─ DockerSandboxBackend (隔离执行)                             │
│  ├─ RemoteDeviceBackend (设备远程控制)                          │
│  └─ LocalFilesystemBackend (开发环境)                           │
│  Skills 加载器 │  Middleware │  Memory 管理                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        数据层                                    │
│  PostgreSQL 17 + PostGIS 3.4 + pgvector                         │
│  ├─ 时空数据（drone_trajectory, device_status）                 │
│  ├─ 向量检索（schema_embeddings）                               │
│  └─ 检查点存储（agent_checkpoints）                             │
│  Redis 7 + ioredis 5.4                                          │
│  └─ Session 缓存 + 消息队列                                     │
│  Drizzle ORM 0.38 (类型安全 SQL 操作)                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        基础设施层                                │
│  Docker Compose (开发/生产)  │  Docker Sandbox (代码执行)      │
│  Nginx (反向代理，可选)       │  Kubernetes (大规模，可选)      │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Monorepo 目录结构

```
spatial-agent/
├── pnpm-workspace.yaml          # pnpm workspace 配置
├── package.json                 # 根配置
├── tsconfig.base.json           # 共享 TS 配置
├── .env.example                 # 环境变量模板
│
├── apps/
│   └── web/                     # Next.js 全栈应用
│       ├── package.json
│       ├── next.config.mjs
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── drizzle.config.ts
│       ├── components.json      # shadcn/ui 配置
│       └── src/
│           ├── app/             # Next.js App Router
│           │   ├── layout.tsx
│           │   ├── page.tsx
│           │   ├── (dashboard)/
│           │   │   ├── layout.tsx
│           │   │   ├── spatial/
│           │   │   │   └── page.tsx      # 时空查询界面
│           │   │   ├── trajectory/
│           │   │   │   └── page.tsx      # 轨迹可视化
│           │   │   ├── device/
│           │   │   │   └── page.tsx      # 设备调度面板
│           │   │   └── sandbox/
│           │   │       └── page.tsx      # 沙箱监控
│           │   └── api/         # API Routes
│           │       ├── chat/
│           │       │   └── route.ts      # SSE 流式对话
│           │       ├── spatial/
│           │       │   └── route.ts      # 时空查询 API
│           │       ├── device/
│           │       │   └── route.ts      # 设备调度 API
│           │       └── sandbox/
│           │           └── route.ts      # 沙箱管理 API
│           ├── components/      # React 组件
│           │   ├── ui/          # shadcn/ui 组件
│           │   │   ├── button.tsx
│           │   │   ├── card.tsx
│           │   │   ├── dialog.tsx
│           │   │   └── ...
│           │   ├── map-3d.tsx   # CesiumJS 3D 地球
│           │   ├── map-2d.tsx   # Mapbox 2D 地图
│           │   ├── data-chart.tsx        # ECharts 图表
│           │   ├── sandbox-monitor.tsx   # 沙箱监控
│           │   └── chat-interface.tsx    # 对话界面
│           ├── lib/             # 工具函数
│           │   ├── db.ts        # Drizzle 数据库客户端
│           │   ├── redis.ts     # Redis 客户端
│           │   ├── agent.ts     # AgentRunner 实例化
│           │   └── utils.ts     # cn() 等工具函数
│           ├── services/        # 业务逻辑（服务端）
│           │   ├── agent.service.ts
│           │   ├── spatial.service.ts
│           │   ├── device.service.ts
│           │   └── sandbox.service.ts
│           └── hooks/           # React Hooks（客户端）
│               ├── use-chat.ts
│               └── use-sandbox.ts
│
├── packages/
│   ├── core/                    # Agent 核心库
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── agent.ts         # AgentRunner
│   │       ├── backends/
│   │       │   ├── protocol.ts          # Backend 抽象接口
│   │       │   ├── docker-sandbox.ts    # Docker 沙箱
│   │       │   ├── remote-device.ts     # 远程设备
│   │       │   └── local-fs.ts          # 本地文件系统
│   │       ├── middleware/
│   │       │   └── mcp.ts
│   │       ├── skills/
│   │       │   └── loader.ts
│   │       └── utils/
│   │           ├── logger.ts
│   │           ├── retry.ts
│   │           └── validators.ts
│   │
│   ├── types/                   # 共享类型定义
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── agent.ts
│   │       ├── spatial.ts
│   │       ├── device.ts
│   │       └── sandbox.ts
│   │
│   └── db/                      # 数据库 Schema（可选独立包）
│       ├── package.json
│       └── src/
│           ├── schema.ts        # Drizzle Schema
│           └── migrations/
│
└── skills/                      # 技能定义
    ├── spatial-query/
    │   └── SKILL.md
    ├── device-scheduler/
    │   └── SKILL.md
    └── data-visualization/
        └── SKILL.md
```

---

## 2. 核心框架：deepagents

> **说明**：deepagents 是 LangChain 官方团队（langchain-ai）开发的 TypeScript Agent 框架，
> 基于 LangGraph 架构，与 Python LangChain 生态完全兼容。

### 2.1 版本与依赖

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// packages/core/package.json
{
  "name": "@spatial-agent/core",
  "version": "0.1.0",
  "type": "module",
  "dependencies": {
    "deepagents": "^1.6.1",
    "@langchain/core": "^1.1.17",
    "@langchain/langgraph": "^1.1.2",
    "@langchain/langgraph-checkpoint": "^1.0.0",
    "@langchain/langgraph-checkpoint-postgres": "^1.0.0",
    "@langchain/anthropic": "^1.3.12",
    "@langchain/openai": "^1.2.3",
    "dockerode": "^4.0.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@spatial-agent/types": "workspace:*",
    "typescript": "^5.7.0",
    "tsup": "^8.4.0",
    "vitest": "^2.1.0"
  }
}
```

```json
// apps/web/package.json (Next.js)
{
  "name": "@spatial-agent/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@spatial-agent/core": "workspace:*",
    "@spatial-agent/types": "workspace:*",
    "next": "^15.2.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    
    // UI 组件
    "@radix-ui/react-dialog": "^1.1.3",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-slot": "^1.1.3",
    "@radix-ui/react-toast": "^1.2.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.4.0",
    "lucide-react": "^0.563.0",
    
    // 数据层
    "drizzle-orm": "^0.38.0",
    "postgres": "^3.4.0",
    "ioredis": "^5.4.0",
    
    // 状态管理 & 数据获取
    "@tanstack/react-query": "^5.90.20",
    "zustand": "^5.0.10",
    
    // 地图 & 可视化
    "mapbox-gl": "^3.8.0",
    "cesium": "^1.125.0",
    "echarts": "^5.6.0",
    "echarts-for-react": "^3.0.2",
    
    // Markdown & Syntax Highlighting
    "react-markdown": "^10.1.0",
    "react-syntax-highlighter": "^16.1.0",
    
    // 工具库
    "uuid": "^11.0.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3",
    "typescript": "^5.7.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.5.6",
    "autoprefixer": "^10.4.23",
    "drizzle-kit": "^0.30.0"
  }
}
```

### 2.2 AgentRunner 封装

```typescript
// packages/core/src/agent.ts
import { createDeepAgent } from "deepagents";
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import type { BaseLanguageModel } from "@langchain/core/language_models/base";
import type { BackendProtocol } from "./backends/protocol.js";

export interface AgentRunnerConfig {
  model: string | BaseLanguageModel;
  backend: BackendProtocol;
  checkpointer?: BaseCheckpointSaver;
  skills?: string[];
  mcpServers?: MCPServerConfig[];
  systemPrompt?: string;
}

export class AgentRunner {
  private agent: any | null = null;
  private config: AgentRunnerConfig;

  constructor(config: AgentRunnerConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.agent = createDeepAgent({
      model: this.config.model,
      backend: this.config.backend,
      checkpointer: this.config.checkpointer,
      skills: this.config.skills,
      systemPrompt: this.config.systemPrompt,
    });
  }

  async *invoke(
    input: string,
    config?: { threadId?: string }
  ): AsyncGenerator<AgentEvent> {
    if (!this.agent) await this.initialize();

    for await (const event of this.agent.stream(
      { messages: [{ role: "user", content: input }] },
      { configurable: { thread_id: config?.threadId || "default" } }
    )) {
      yield this.transformEvent(event);
    }
  }

  private transformEvent(event: unknown): AgentEvent {
    // 转换 LangGraph 事件为统一格式
    // ...
  }
}
```

### 2.3 Backend 抽象层设计

```typescript
// packages/core/src/backends/protocol.ts
export interface BackendProtocol {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  executeCommand(command: string): Promise<CommandResult>;
  listDirectory(path: string): Promise<FileInfo[]>;
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
}

export interface SandboxBackendProtocol extends BackendProtocol {
  sandboxId: string;
  getStatus(): Promise<SandboxStatus>;
}
```

```typescript
// packages/core/src/backends/docker-sandbox.ts
import Dockerode from "dockerode";
import type { SandboxBackendProtocol } from "./protocol.js";

export class DockerSandboxBackend implements SandboxBackendProtocol {
  public sandboxId: string;
  private docker: Dockerode;
  private container: Dockerode.Container | null = null;

  constructor(config: { image?: string; timeout?: number }) {
    this.sandboxId = `sandbox-${Date.now()}`;
    this.docker = new Dockerode();
  }

  async initialize(): Promise<void> {
    this.container = await this.docker.createContainer({
      Image: "spatial-agent-sandbox:latest",
      name: this.sandboxId,
      NetworkMode: "none",
      HostConfig: {
        Memory: 512 * 1024 * 1024,
        CpuQuota: 50000,
      },
    });
    await this.container.start();
  }

  async executeCommand(command: string): Promise<CommandResult> {
    // 实现沙箱命令执行
    // ...
  }

  async cleanup(): Promise<void> {
    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
  }
}
```

---

## 3. Next.js 全栈架构

### 3.1 App Router 结构

```typescript
// apps/web/src/app/layout.tsx
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

```typescript
// apps/web/src/components/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
```

### 3.2 API Routes（SSE 流式对话）

```typescript
// apps/web/src/app/api/chat/route.ts
import { AgentRunner } from "@spatial-agent/core";
import { dockerSandboxBackend, postgresCheckpointer } from "@/lib/agent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { message, sessionId } = await request.json();

  const agent = new AgentRunner({
    model: "anthropic:claude-sonnet-4",
    backend: dockerSandboxBackend,
    checkpointer: postgresCheckpointer,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of agent.invoke(message, { threadId: sessionId })) {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

### 3.3 shadcn/ui 组件使用

```typescript
// apps/web/src/components/chat-interface.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendIcon } from "lucide-react";

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // SSE 流式接收
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input, sessionId: "session_123" }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let assistantMessage: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMessage]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));
          if (data.type === "token") {
            assistantMessage.content += data.content;
            setMessages((prev) => [...prev.slice(0, -1), { ...assistantMessage }]);
          }
        }
      }
    }
  };

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>时空智能体对话</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 pr-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-4 ${
                msg.role === "user" ? "text-right" : "text-left"
              }`}
            >
              <div
                className={`inline-block p-3 rounded-lg ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </ScrollArea>
        <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入您的查询..."
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <SendIcon className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

---

## 4. 数据层技术栈

### 4.1 Drizzle ORM Schema

```typescript
// apps/web/src/lib/db/schema.ts
import { pgTable, serial, varchar, timestamp, jsonb, real, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 时空数据表
export const droneTrajectory = pgTable(
  "drone_trajectory",
  {
    id: serial("id").primaryKey(),
    droneId: varchar("drone_id", { length: 64 }).notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    // PostGIS 地理类型（需要使用 sql 模板）
    location: sql`geography(point, 4326)`.notNull(),
    altitude: real("altitude"),
    speed: real("speed"),
    metadata: jsonb("metadata"),
  },
  (table) => ({
    locationIdx: index("idx_trajectory_location").using("gist", table.location),
    timeIdx: index("idx_trajectory_time").using("brin", table.timestamp),
  })
);

// Schema 向量表（pgvector）
export const schemaEmbeddings = pgTable(
  "schema_embeddings",
  {
    id: serial("id").primaryKey(),
    tableName: varchar("table_name", { length: 256 }).notNull(),
    columnName: varchar("column_name", { length: 256 }),
    description: text("description"),
    // pgvector 向量类型
    embedding: sql`vector(1536)`.notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // HNSW 索引
    embeddingIdx: index("idx_embedding_hnsw").using(
      "hnsw",
      sql`${table.embedding} vector_cosine_ops`
    ),
  })
);
```

```typescript
// apps/web/src/lib/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

### 4.2 向量检索服务

```typescript
// apps/web/src/services/schema-recall.service.ts
import { db } from "@/lib/db";
import { schemaEmbeddings } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { OpenAIEmbeddings } from "@langchain/openai";

export class SchemaRecallService {
  private embeddings: OpenAIEmbeddings;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
    });
  }

  async recallRelevantSchemas(query: string, topK = 5) {
    const queryEmbedding = await this.embeddings.embedQuery(query);

    const results = await db.execute(sql`
      SELECT 
        table_name,
        column_name,
        description,
        1 - (embedding <=> ${sql.raw(`'[${queryEmbedding.join(",")}]'::vector`)}) AS similarity
      FROM ${schemaEmbeddings}
      ORDER BY embedding <=> ${sql.raw(`'[${queryEmbedding.join(",")}]'::vector`)}
      LIMIT ${topK}
    `);

    return results.rows;
  }
}
```

### 4.3 Redis 缓存管理

```typescript
// apps/web/src/lib/redis.ts
import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL!);

// 会话缓存
export async function cacheSession(sessionId: string, data: any, ttl = 1800) {
  await redis.setex(`session:${sessionId}`, ttl, JSON.stringify(data));
}

export async function getSession(sessionId: string) {
  const data = await redis.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}

// 查询结果缓存
export async function cacheSpatialQuery(
  queryHash: string,
  result: any,
  ttl = 86400
) {
  await redis.setex(`query:${queryHash}`, ttl, JSON.stringify(result));
}
```

---

## 5. 沙箱系统设计

### 5.1 沙箱服务（Next.js API Route）

```typescript
// apps/web/src/app/api/sandbox/route.ts
import { DockerSandboxBackend } from "@spatial-agent/core/backends";

export async function POST(request: Request) {
  const { code, language } = await request.json();

  const sandbox = new DockerSandboxBackend({
    image: "spatial-agent-sandbox:latest",
    timeout: 300,
  });

  try {
    await sandbox.initialize();

    const result = await sandbox.executeCommand(
      language === "python" ? `python -c "${code}"` : `node -e "${code}"`
    );

    return Response.json({
      success: true,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  } finally {
    await sandbox.cleanup();
  }
}
```

### 5.2 沙箱监控组件

```typescript
// apps/web/src/components/sandbox-monitor.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SandboxMonitor() {
  const { data: sandboxes } = useQuery({
    queryKey: ["sandboxes"],
    queryFn: () => fetch("/api/sandbox/list").then((r) => r.json()),
    refetchInterval: 5000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>沙箱实例监控</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sandboxes?.map((sandbox: any) => (
            <div
              key={sandbox.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex-1">
                <div className="font-medium">{sandbox.id}</div>
                <div className="text-sm text-muted-foreground">
                  CPU: {sandbox.cpuUsage}% · 内存: {sandbox.memoryUsage} MB
                </div>
              </div>
              <Badge variant={sandbox.status === "running" ? "default" : "secondary"}>
                {sandbox.status}
              </Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => stopSandbox(sandbox.id)}
              >
                停止
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 6. 前端可视化

### 6.1 3D 地图（CesiumJS）

```typescript
// apps/web/src/components/map-3d.tsx
"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";

export function Map3D({ trajectories }: { trajectories: TrajectoryPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    viewerRef.current = new Cesium.Viewer(containerRef.current, {
      terrainProvider: Cesium.createWorldTerrain(),
    });

    trajectories.forEach((point) => {
      viewerRef.current!.entities.add({
        position: Cesium.Cartesian3.fromDegrees(
          point.longitude,
          point.latitude,
          point.altitude
        ),
        point: {
          pixelSize: 10,
          color: Cesium.Color.RED,
        },
      });
    });

    return () => viewerRef.current?.destroy();
  }, [trajectories]);

  return <div ref={containerRef} className="w-full h-[600px]" />;
}
```

### 6.2 数据图表（ECharts）

```typescript
// apps/web/src/components/data-chart.tsx
"use client";

import ReactECharts from "echarts-for-react";

export function TrajectoryChart({ data }: { data: ChartData }) {
  const option = {
    title: { text: "无人机轨迹分析" },
    tooltip: { trigger: "axis" },
    xAxis: { type: "time" },
    yAxis: { type: "value", name: "高度 (m)" },
    series: [
      {
        name: "高度",
        type: "line",
        data: data.points.map((p) => [p.timestamp, p.altitude]),
        smooth: true,
      },
      {
        name: "速度",
        type: "line",
        data: data.points.map((p) => [p.timestamp, p.speed]),
        smooth: true,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 400 }} />;
}
```

---

## 7. 开发工具链

### 7.1 常用命令

```bash
# 环境管理
pnpm install
pnpm -r build                     # 构建所有包

# Next.js 开发
pnpm --filter @spatial-agent/web dev      # 开发模式
pnpm --filter @spatial-agent/web build    # 生产构建
pnpm --filter @spatial-agent/web start    # 启动生产服务器

# 数据库
pnpm --filter @spatial-agent/web db:generate  # 生成迁移
pnpm --filter @spatial-agent/web db:push      # 推送到数据库
pnpm --filter @spatial-agent/web db:studio    # Drizzle Studio

# 类型检查 & 代码质量
pnpm typecheck
pnpm lint
pnpm format

# 测试
pnpm test
pnpm test:e2e

# Docker
docker-compose up -d
docker-compose logs -f web
```

### 7.2 开发环境配置

```yaml
# docker-compose.dev.yml
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: spatial_agent_dev
      POSTGRES_USER: agent
      POSTGRES_PASSWORD: dev123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://agent:dev123@postgres:5432/spatial_agent_dev
      REDIS_URL: redis://redis:6379
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    depends_on:
      - postgres
      - redis
    volumes:
      - ./apps/web:/app
      - /app/node_modules
      - /app/.next

volumes:
  postgres_data:
```

### 7.3 Next.js 配置

```typescript
// apps/web/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  webpack: (config, { isServer }) => {
    // 排除某些模块在客户端打包
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
```

---

## 8. 安全与性能

### 8.1 安全策略

```typescript
// apps/web/src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // CORS 处理
  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
```

### 8.2 性能优化

```typescript
// apps/web/src/app/(dashboard)/layout.tsx
import dynamic from "next/dynamic";

// 动态导入重组件（代码分割）
const Map3D = dynamic(() => import("@/components/map-3d"), {
  ssr: false,
  loading: () => <div>加载地图中...</div>,
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r">
        {/* 侧边栏 */}
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
```

---

*版本：v1.0*  
*更新日期：2026-02-10*  
*维护者：全空间智能体架构组*
