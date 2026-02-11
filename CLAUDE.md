# CLAUDE.md - 全空间智能体开发规范

> 本文件定义项目开发全过程规范，开发前必读。
> 技术栈细节请参考 [TECH_STACK.md](./TECH_STACK.md)
> **基于 Node.js + TypeScript + deepagents + Next.js 技术栈**

---

## 1. 常用命令

### 1.1 环境管理

```bash
# Node.js 版本管理（推荐使用 nvm）
nvm install 20
nvm use 20
node --version  # v20+

# 包管理器
npm install -g pnpm@9.15.0
pnpm --version  # 9.15.0

# 初始化项目
pnpm install

# 安装依赖
pnpm install                                    # 安装所有包
pnpm --filter @spatial-agent/core add deepagents  # 给特定包添加依赖
pnpm add -D typescript                          # 添加开发依赖

# Workspace 操作
pnpm -r build                                   # 构建所有包
pnpm -r clean                                   # 清理所有包
```

### 1.2 Next.js 开发

```bash
# 启动开发服务器（带 HMR）
pnpm --filter @spatial-agent/web dev            # 默认 http://localhost:3000

# 构建生产版本
pnpm --filter @spatial-agent/web build
pnpm --filter @spatial-agent/web start          # 启动生产服务器

# 运行 TypeScript 文件（直接执行）
tsx src/scripts/test-agent.ts
```

### 1.3 数据库操作

```bash
# PostgreSQL 连接
psql -h localhost -U agent -d spatial_agent

# Drizzle ORM 迁移
pnpm --filter @spatial-agent/web db:generate  # 生成迁移
pnpm --filter @spatial-agent/web db:push      # 推送到数据库
pnpm --filter @spatial-agent/web db:studio    # 打开数据库 GUI

# Redis 操作
redis-cli
redis-cli KEYS "session:*"
redis-cli FLUSHDB  # 清空当前数据库
```

### 1.4 Docker 与沙箱

```bash
# 构建沙箱镜像
docker build -t spatial-agent-sandbox:latest -f docker/Sandbox.Dockerfile .

# 运行开发环境（包含 Next.js）
docker-compose -f docker-compose.dev.yml up -d

# 查看沙箱容器
docker ps -a --filter "name=sandbox-*"

# 清理过期沙箱
docker container prune -f

# 沙箱资源监控
docker stats $(docker ps -q --filter "name=sandbox-*")

# Next.js 容器日志
docker-compose logs -f web
```

### 1.5 代码质量

```bash
# TypeScript 类型检查
pnpm typecheck                              # 检查所有包
pnpm --filter @spatial-agent/core typecheck # 检查单个包

# ESLint 检查
pnpm lint
pnpm lint:fix

# 格式化（Prettier）
pnpm format
pnpm format:check

# 测试
pnpm test                                   # 运行所有测试
pnpm test:unit                              # 单元测试
pnpm test:e2e                               # 端到端测试
pnpm test:coverage                          # 测试覆盖率
```

---

## 2. 核心文件与实用函数

### 2.1 项目结构

```
spatial-agent/
├── pnpm-workspace.yaml          # Workspace 配置
├── package.json                 # 根脚本
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
│           │   │   └── ...
│           │   ├── map-3d.tsx   # CesiumJS
│           │   ├── map-2d.tsx   # Mapbox
│           │   ├── data-chart.tsx        # ECharts
│           │   ├── sandbox-monitor.tsx   # 沙箱监控
│           │   └── chat-interface.tsx    # 对话界面
│           ├── lib/             # 工具函数
│           │   ├── db.ts        # Drizzle 客户端
│           │   ├── redis.ts     # Redis 客户端
│           │   ├── agent.ts     # AgentRunner 实例
│           │   └── utils.ts     # cn() 等工具
│           ├── services/        # 业务逻辑（服务端）
│           │   ├── agent.service.ts
│           │   ├── spatial.service.ts
│           │   └── device.service.ts
│           └── hooks/           # React Hooks（客户端）
│               └── use-chat.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts       # 构建配置
│   │   └── src/
│   │       ├── index.ts
│   │       ├── agent.ts         # AgentRunner 封装
│   │       ├── backends/
│   │       │   ├── protocol.ts          # Backend 抽象
│   │       │   ├── docker-sandbox.ts
│   │       │   ├── remote-device.ts
│   │       │   └── local-fs.ts
│   │       ├── middleware/
│   │       │   └── mcp.ts
│   │       ├── skills/
│   │       │   └── loader.ts
│   │       └── utils/
│   │           ├── logger.ts
│   │           ├── retry.ts
│   │           └── validators.ts
│   │
│   ├── types/                   # 共享类型
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── agent.ts
│   │       ├── spatial.ts
│   │       ├── device.ts
│   │       └── sandbox.ts
│   │
│   └── api-client/              # API 客户端
│       └── src/
│           ├── index.ts
│           └── client.ts
│
├── skills/                      # 技能定义
│   ├── spatial-query/
│   │   └── SKILL.md
│   ├── device-scheduler/
│   │   └── SKILL.md
│   └── data-visualization/
│       └── SKILL.md
│
└── tests/
    ├── unit/web/src/lib
    ├── integration/
    └── e2e/
```

### 2.2 核心实用函数

#### 配置管理 (`apps/web/src/lib/config.ts`)

```typescript
import { z } from "zod";

const envSchema = z.object({
  // 服务配置
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().default(3000),

  // 数据库
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // LLM
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  DASHSCOPE_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),

  // 沙箱
  SANDBOX_IMAGE: z.string().default("spatial-agent-sandbox:latest"),
  SANDBOX_TIMEOUT: z.coerce.number().default(300),

  // 设备调度
  DEVICE_SCHEDULER_ENDPOINT: z.string().url().optional(),
  DEVICE_SCHEDULER_API_KEY: z.string().optional(),
});

export const config = envSchema.parse(process.env);

export type Config = z.infer<typeof envSchema>;
```

#### 重试装饰器 (`packages/core/src/utils/retry.ts`)

```typescript
export interface RetryOptions {
  maxAttempts?: number;
  minWait?: number;
  maxWait?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * 重试装饰器（支持同步和异步函数）
 */
export function withRetry<T extends (...args: any[]) => any>(
  fn: T,
  options: RetryOptions = {}
): T {
  const {
    maxAttempts = 3,
    minWait = 1000,
    maxWait = 10000,
    onRetry,
  } = options;

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxAttempts) {
          const waitTime = Math.min(
            minWait * Math.pow(2, attempt - 1),
            maxWait
          );

          onRetry?.(lastError, attempt);
          console.warn(
            `Retry attempt ${attempt}/${maxAttempts} after ${waitTime}ms:`,
            lastError.message
          );

          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError;
  }) as T;
}

// 使用示例
const fetchWithRetry = withRetry(
  async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  {
    maxAttempts: 3,
    minWait: 1000,
    maxWait: 5000,
    onRetry: (error, attempt) => {
      console.log(`Retrying... Attempt ${attempt}, Error: ${error.message}`);
    },
  }
);
```

#### 结构化日志 (`packages/core/src/utils/logger.ts`)

```typescript
import winston from "winston";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: "spatial-agent",
    version: process.env.npm_package_version,
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
          }`;
        })
      ),
    }),
  ],
});

// 使用示例
logger.info("处理用户请求", {
  requestId: "req_123",
  userId: "user_456",
  intentType: "spatial_query",
});

logger.error("SQL 生成失败", {
  error: error.message,
  stack: error.stack,
  requestId: "req_123",
});
```

#### AgentRunner 封装模板

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

export interface MCPServerConfig {
  name: string;
  url: string;
}

export type AgentEvent =
  | { type: "token"; content: string }
  | { type: "plan"; plan: Plan }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; result: unknown }
  | { type: "file_change"; path: string; action: "created" | "modified" | "deleted" }
  | { type: "done" }
  | { type: "error"; message: string };

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
      {
        messages: [{ role: "user", content: input }],
      },
      {
        configurable: { thread_id: config?.threadId || "default" },
      }
    )) {
      yield this.transformEvent(event);
    }
  }

  private transformEvent(event: unknown): AgentEvent {
    // 转换 LangGraph 事件为统一格式
    // ...
    return { type: "token", content: "" };
  }
}
```

---

## 3. 代码风格指南

### 3.1 TypeScript 规范

#### 基础规范
- **TypeScript 版本**: 5.6+
- **严格模式**: `strict: true` 强制启用
- **行长度**: 100 字符（Prettier 配置）
- **引号**: 双引号优先
- **分号**: 强制使用

#### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件 | kebab-case | `agent-runner.ts`, `sandbox-service.ts` |
| 类/接口 | PascalCase | `AgentRunner`, `BackendProtocol` |
| 函数/变量 | camelCase | `createAgent`, `sandboxId` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT` |
| 类型别名 | PascalCase | `AgentEvent`, `SpatialQueryParams` |
| 私有字段 | # 前缀 | `#privateField` (ES2022+) 或 `private` 关键字 |

#### 导入顺序

```typescript
// 1. Node.js 内置模块
import { readFile } from "fs/promises";
import { randomUUID } from "crypto";

// 2. 第三方库（Next.js / React）
import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";

// 3. deepagents / LangChain
import { createDeepAgent } from "deepagents";
import { ChatAnthropic } from "@langchain/anthropic";

// 4. Workspace 包
import type { Session, Message } from "@spatial-agent/types";
import { AgentRunner } from "@spatial-agent/core";

// 5. 相对导入（lib/services）
import { config } from "@/lib/config.js";
import { logger } from "@/lib/logger.js";
import { db } from "@/lib/db.js";

// 6. 类型导入（分离）
import type { User } from "@/types.js";
```

### 3.2 异步编程规范

```typescript
// ✅ 正确：统一使用 async/await
async function fetchData(url: string): Promise<Data> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// ❌ 错误：混用 Promise 和 async/await
async function badExample() {
  return fetch(url).then((res) => res.json()); // 不一致！
}

// ✅ 正确：并行异步操作
async function fetchMultiple(urls: string[]): Promise<Data[]> {
  const promises = urls.map((url) => fetchData(url));
  return Promise.all(promises);
}

// ✅ 正确：顺序执行（有依赖关系）
async function sequentialOps() {
  const user = await fetchUser();
  const sessions = await fetchSessions(user.id);
  const messages = await fetchMessages(sessions[0].id);
  return { user, sessions, messages };
}

// ✅ 正确：CPU 密集型操作使用 Worker Threads
import { Worker } from "worker_threads";

async function processLargeData(data: number[]): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./worker.js");
    worker.postMessage(data);
    worker.on("message", resolve);
    worker.on("error", reject);
  });
}
```

### 3.3 错误处理

```typescript
// ✅ 正确：自定义错误层次
export class SpatialAgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpatialAgentError";
  }
}

export class IntentParseError extends SpatialAgentError {
  constructor(
    public readonly rawInput: string,
    public readonly reason: string
  ) {
    super(`无法解析意图: ${reason}, 输入: ${rawInput}`);
    this.name = "IntentParseError";
  }
}

export class SQLValidationError extends SpatialAgentError {
  constructor(
    public readonly sql: string,
    public readonly validationErrors: string[]
  ) {
    super(`SQL 验证失败: ${validationErrors.join(", ")}`);
    this.name = "SQLValidationError";
  }
}

// ✅ 正确：节点内异常捕获
async function robustNode(state: AgentState): Promise<Partial<AgentState>> {
  try {
    const result = await riskyOperation();
    return { result };
  } catch (error) {
    if (error instanceof IntentParseError) {
      logger.warn("意图解析失败，触发澄清流程", { error: error.message });
      return {
        requiresClarification: true,
        clarificationPrompt: error.reason,
      };
    }

    if (error instanceof SQLValidationError) {
      logger.error("SQL 验证失败", {
        sql: error.sql,
        errors: error.validationErrors,
      });
      return {
        executionStatus: "sql_failed",
        error: "生成的 SQL 不安全",
      };
    }

    // 未预期错误
    logger.error("未预期错误", { error });
    return {
      executionStatus: "error",
      error: "系统内部错误",
    };
  }
}

// ✅ 正确：使用 Zod 进行运行时验证
import { z } from "zod";

const DeviceCommandSchema = z.object({
  deviceId: z.string().regex(/^[A-Z0-9]{8,16}$/),
  action: z.enum(["takeoff", "land", "move_to", "return_home", "pause"]),
  parameters: z.record(z.unknown()).optional(),
  priority: z.number().min(1).max(10).default(5),
});

type DeviceCommand = z.infer<typeof DeviceCommandSchema>;

// 使用
function scheduleDevice(rawCommand: unknown): void {
  try {
    const command = DeviceCommandSchema.parse(rawCommand);
    // command 现在是类型安全的
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`无效的设备指令: ${error.message}`);
    }
    throw error;
  }
}
```

### 3.4 文档注释（JSDoc）

```typescript
/**
 * Agent状态定义
 *
 * 所有字段必须可序列化（用于检查点持久化）
 */
export interface AgentState {
  /** 对话历史 */
  messages: Array<{ role: string; content: string }>;
  
  /**
   * 解析后的意图对象
   * @example
   * {
   *   type: "spatial_query",
   *   parameters: {
   *     timeRange: "last_24h",
   *     area: "POLYGON((116.3 39.8, ...))"
   *   }
   * }
   */
  intent?: Intent;
  
  /** 执行计划 */
  plan?: Plan;
  
  /** 检查点 ID（用于状态恢复） */
  checkpointId: string;
}

/**
 * 根据意图生成时空数据库 SQL 查询
 *
 * @param intent - 结构化意图对象，必须包含时空约束
 * @param schemaContext - 相关表/字段的 Schema 描述
 * @returns 参数化 SQL 查询字符串（使用 $1, $2 占位符）
 * @throws {SQLValidationError} 当生成 SQL 无法通过安全验证时
 *
 * @example
 * ```typescript
 * const intent = {
 *   type: "spatial_query",
 *   parameters: {
 *     timeRange: "last_24h",
 *     spatialConstraints: "POLYGON((...))",
 *     targetAttributes: ["drone_id", "avg_speed"]
 *   }
 * };
 * const sql = await generateSQL(intent, schemaDescriptions);
 * console.log(sql);
 * // SELECT drone_id, AVG(speed) FROM drone_trajectory
 * // WHERE timestamp > NOW() - INTERVAL '24 hours'
 * // AND ST_Within(location, ST_GeomFromText($1, 4326))
 * // GROUP BY drone_id
 * ```
 */
export async function generateSQL(
  intent: Intent,
  schemaContext: string[]
): Promise<string> {
  // ...
}
```

---

## 4. 测试规范

### 4.1 测试分层

```
tests/
├── unit/                         # 单元测试（< 100ms/测试）
│   ├── backends/
│   │   ├── docker-sandbox.test.ts
│   │   └── remote-device.test.ts
│   ├── services/
│   │   ├── agent.service.test.ts
│   │   └── spatial.service.test.ts
│   └── utils/
│       ├── retry.test.ts
│       └── validators.test.ts
├── integration/                  # 集成测试（< 5s/测试）
│   ├── agent-flow.test.ts
│   ├── db-connection.test.ts
│   └── device-api.test.ts
└── e2e/                          # 端到端测试（完整流程）
    └── full-pipeline.test.ts
```

### 4.2 测试规范（Vitest）

```typescript
// tests/unit/utils/retry.test.ts
import { describe, it, expect, vi } from "vitest";
import { withRetry } from "@spatial-agent/core/utils/retry";

describe("withRetry", () => {
  it("should retry on failure", async () => {
    let attempts = 0;
    
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) throw new Error("Failed");
      return "success";
    });

    const retryFn = withRetry(fn, {
      maxAttempts: 3,
      minWait: 10,
      maxWait: 10,
    });

    const result = await retryFn();

    expect(result).toBe("success");
    expect(attempts).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should fail after max attempts", async () => {
    const fn = vi.fn(async () => {
      throw new Error("Always fails");
    });

    const retryFn = withRetry(fn, { maxAttempts: 2, minWait: 10 });

    await expect(retryFn()).rejects.toThrow("Always fails");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
```

```typescript
// tests/integration/agent-flow.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AgentRunner } from "@spatial-agent/core";
import { DockerSandboxBackend } from "@spatial-agent/core/backends";
import { MemorySaver } from "@langchain/langgraph-checkpoint";

describe("Agent Flow Integration", () => {
  let agent: AgentRunner;
  let backend: DockerSandboxBackend;

  beforeAll(async () => {
    backend = new DockerSandboxBackend({
      image: "spatial-agent-sandbox:test",
    });
    await backend.initialize();

    agent = new AgentRunner({
      model: "openai:gpt-4o-mini", // 测试用小模型
      backend,
      checkpointer: new MemorySaver(),
    });
    await agent.initialize();
  });

  afterAll(async () => {
    await backend.cleanup();
  });

  it("should handle spatial query intent", async () => {
    const events: any[] = [];

    for await (const event of agent.invoke(
      "查询过去24小时北京区域的无人机轨迹"
    )) {
      events.push(event);
    }

    const planEvent = events.find((e) => e.type === "plan");
    expect(planEvent).toBeDefined();
    expect(planEvent.plan.steps).toContainEqual(
      expect.objectContaining({
        action: "execute_sql",
      })
    );

    const doneEvent = events.find((e) => e.type === "done");
    expect(doneEvent).toBeDefined();
  });
});
```

### 4.3 Mock 与 Fixtures

```typescript
// tests/fixtures/models.ts
import { vi } from "vitest";
import type { BaseLanguageModel } from "@langchain/core/language_models/base";

/**
 * Mock LLM（用于测试，避免真实 API 调用）
 */
export function createMockLLM(responses: string[]): BaseLanguageModel {
  let callCount = 0;

  return {
    invoke: vi.fn(async () => {
      const response = responses[callCount % responses.length];
      callCount++;
      return { content: response };
    }),
    stream: vi.fn(async function* () {
      yield* responses[0].split(" ").map((token) => ({ content: token }));
    }),
  } as any;
}
```

```typescript
// tests/fixtures/data.ts
import type { Intent, SpatialQueryParams } from "@spatial-agent/types";

export const mockSpatialIntent: Intent = {
  type: "spatial_query",
  parameters: {
    timeRange: {
      type: "relative",
      value: "last_24h",
    },
    spatialConstraints: {
      type: "polygon",
      coordinates: [
        [116.3, 39.8],
        [116.5, 39.8],
        [116.5, 40.0],
        [116.3, 40.0],
        [116.3, 39.8],
      ],
    },
    targetAttributes: ["drone_id", "avg_speed"],
  },
};

export const mockDeviceCommand = {
  deviceId: "DRONE001",
  action: "takeoff" as const,
  parameters: {
    altitude: 100,
  },
  priority: 5,
};
```

---

## 5. 沙箱系统规范

### 5.1 沙箱创建与管理

```typescript
// apps/web/src/services/sandbox.service.ts
import Dockerode from "dockerode";
import { randomUUID } from "crypto";
import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";

export interface SandboxConfig {
  memory?: number; // 字节
  cpuQuota?: number; // 微秒
  timeout?: number; // 秒
  networkEnabled?: boolean;
}

export class SandboxService {
  private docker: Dockerode;
  private activeSandboxes = new Map<string, Dockerode.Container>();

  constructor() {
    this.docker = new Dockerode();
  }

  async createSandbox(config?: SandboxConfig): Promise<string> {
    const sandboxId = `sandbox-${randomUUID()}`;

    logger.info("创建沙箱", { sandboxId, config });

    const container = await this.docker.createContainer({
      Image: config?.networkEnabled
        ? "spatial-agent-sandbox-network:latest"
        : "spatial-agent-sandbox:latest",
      name: sandboxId,
      NetworkMode: config?.networkEnabled ? "bridge" : "none",
      HostConfig: {
        Memory: config?.memory || 512 * 1024 * 1024, // 默认 512MB
        CpuQuota: config?.cpuQuota || 50000, // 默认 50% CPU
        ReadonlyRootfs: true, // 只读文件系统
        SecurityOpt: ["no-new-privileges"], // 安全加固
        Tmpfs: {
          "/tmp": "rw,noexec,nosuid,size=100m", // 临时文件系统
        },
      },
      Env: [
        `TIMEOUT=${config?.timeout || 300}`,
        `SANDBOX_ID=${sandboxId}`,
      ],
    });

    await container.start();
    this.activeSandboxes.set(sandboxId, container);

    // 自动清理：超时后销毁
    setTimeout(
      () => this.cleanupSandbox(sandboxId),
      (config?.timeout || 300) * 1000
    );

    return sandboxId;
  }

  async executeInSandbox(
    sandboxId: string,
    command: string
  ): Promise<ExecutionResult> {
    const container = this.activeSandboxes.get(sandboxId);
    if (!container) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    logger.info("执行沙箱命令", { sandboxId, command });

    const exec = await container.exec({
      Cmd: ["/bin/sh", "-c", command],
      AttachStdout: true,
      AttachStderr: true,
    });

    const startTime = Date.now();
    const stream = await exec.start({ hijack: true, stdin: false });

    let stdout = "";
    let stderr = "";

    stream.on("data", (chunk) => {
      const str = chunk.toString();
      // Docker 使用多路复用流，第一个字节表示类型
      if (chunk[0] === 1) stdout += str.slice(8);
      else if (chunk[0] === 2) stderr += str.slice(8);
    });

    await new Promise((resolve) => stream.on("end", resolve));

    const inspect = await exec.inspect();
    const executionTime = Date.now() - startTime;

    logger.info("沙箱命令执行完成", {
      sandboxId,
      exitCode: inspect.ExitCode,
      executionTime,
    });

    return {
      stdout,
      stderr,
      exitCode: inspect.ExitCode || 0,
      executionTime,
    };
  }

  async getSandboxStats(sandboxId: string): Promise<SandboxStats> {
    const container = this.activeSandboxes.get(sandboxId);
    if (!container) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    const stats = await container.stats({ stream: false });

    return {
      cpuUsage: this.calculateCPUUsage(stats),
      memoryUsage: stats.memory_stats.usage / (1024 * 1024), // MB
      memoryLimit: stats.memory_stats.limit / (1024 * 1024),
      networkIO: stats.networks?.eth0 || { rx_bytes: 0, tx_bytes: 0 },
    };
  }

  async cleanupSandbox(sandboxId: string): Promise<void> {
    const container = this.activeSandboxes.get(sandboxId);
    if (!container) return;

    try {
      logger.info("清理沙箱", { sandboxId });
      await container.stop({ t: 5 });
      await container.remove();
      this.activeSandboxes.delete(sandboxId);
    } catch (error) {
      logger.error("沙箱清理失败", { sandboxId, error });
    }
  }

  async listActiveSandboxes(): Promise<SandboxInfo[]> {
    const sandboxes: SandboxInfo[] = [];

    for (const [id, container] of this.activeSandboxes.entries()) {
      const inspect = await container.inspect();
      const stats = await this.getSandboxStats(id);

      sandboxes.push({
        id,
        status: inspect.State.Status as "running" | "paused" | "stopped",
        createdAt: new Date(inspect.Created),
        uptime: Date.now() - new Date(inspect.Created).getTime(),
        ...stats,
      });
    }

    return sandboxes;
  }

  private calculateCPUUsage(stats: any): number {
    const cpuDelta =
      stats.cpu_stats.cpu_usage.total_usage -
      stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta =
      stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numCpus = stats.cpu_stats.online_cpus || 1;

    if (systemDelta === 0) return 0;
    return (cpuDelta / systemDelta) * numCpus * 100;
  }
}
```

### 5.2 沙箱安全策略

⚠️ **强制安全约束**

```typescript
// 沙箱白名单配置
const ALLOWED_COMMANDS = new Set([
  "python",
  "node",
  "sh",
  "bash",
  "cat",
  "echo",
  "ls",
  "grep",
  "awk",
  "sed",
]);

const BLOCKED_PATTERNS = [
  /rm\s+-rf/i, // 删除文件
  />\s*\/dev\//i, // 访问设备文件
  /curl|wget/i, // 网络请求（非网络沙箱）
  /nc|netcat/i, // 网络工具
  /__import__\s*\(\s*['"]os['"]\)/i, // Python os 模块动态导入
];

export function validateSandboxCommand(command: string): void {
  // 检查黑名单模式
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      throw new Error(`Blocked pattern detected: ${pattern}`);
    }
  }

  // 命令长度限制
  if (command.length > 10000) {
    throw new Error("Command too long");
  }
}
```

---

## 6. 项目特有警告与注意事项

### 6.1 TypeScript 严格模式

⚠️ **必须启用严格模式**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### 6.2 状态对象序列化

⚠️ **状态对象必须可 JSON 序列化**

```typescript
// ❌ 错误：包含不可序列化的字段
interface BadAgentState {
  messages: Message[];
  dbConnection: DatabaseConnection; // 不可序列化！
  fileHandle: FileHandle; // 不可序列化！
}

// ✅ 正确：所有字段都是可序列化的
interface GoodAgentState {
  messages: Message[];
  dbConnectionString: string; // 配置字符串
  fileContent: string; // 文件内容而非句柄
  checkpointId: string;
}
```

### 6.3 数据库安全

```typescript
import { sql } from "drizzle-orm";

// ✅ 正确：参数化查询
async function queryTrajectory(droneId: string, startTime: Date) {
  return db.execute(sql`
    SELECT * FROM drone_trajectory
    WHERE drone_id = ${droneId}
    AND timestamp > ${startTime}
  `);
}

// ❌ 错误：字符串拼接（SQL 注入风险）
async function badQuery(droneId: string) {
  const query = `SELECT * FROM drone_trajectory WHERE drone_id = '${droneId}'`;
  return db.execute(sql.raw(query)); // 危险！
}

// ✅ 正确：表名白名单
const ALLOWED_TABLES = new Set([
  "drone_trajectory",
  "device_status",
  "mission_log",
]);

function validateTableName(table: string): void {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
}
```

### 6.4 异步错误处理

```typescript
// ✅ 正确：使用 try-catch
async function fetchData() {
  try {
    const data = await riskyOperation();
    return data;
  } catch (error) {
    logger.error("数据获取失败", { error });
    throw error;
  }
}

// ✅ 正确：Promise.allSettled（容错）
async function fetchMultipleSources(urls: string[]) {
  const results = await Promise.allSettled(
    urls.map((url) => fetch(url).then((r) => r.json()))
  );

  const successful = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => r.value);

  const failed = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => r.reason);

  if (failed.length > 0) {
    logger.warn(`${failed.length} requests failed`, { failed });
  }

  return successful;
}

// ❌ 错误：未处理的 Promise 拒绝
async function badExample() {
  riskyOperation(); // 忘记 await！
}
```

### 6.5 内存泄漏预防

```typescript
// ✅ 正确：清理定时器
export class PeriodicTask {
  private intervalId: NodeJS.Timeout | null = null;

  start(fn: () => void, interval: number): void {
    this.stop(); // 防止重复启动
    this.intervalId = setInterval(fn, interval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// ✅ 正确：清理 EventEmitter 监听器
import { EventEmitter } from "events";

export class ManagedEmitter {
  private emitter = new EventEmitter();
  private listeners = new Map<string, Function>();

  on(event: string, listener: (...args: any[]) => void): void {
    this.emitter.on(event, listener);
    this.listeners.set(event, listener);
  }

  cleanup(): void {
    for (const [event, listener] of this.listeners.entries()) {
      this.emitter.off(event, listener);
    }
    this.listeners.clear();
  }
}
```

---

## 7. 快速检查清单

### 提交代码前

- [ ] `pnpm typecheck` 通过（无 TypeScript 错误）
- [ ] `pnpm lint` 通过（ESLint 检查）
- [ ] `pnpm format:check` 通过（Prettier 格式检查）
- [ ] `pnpm test:unit` 通过（单元测试）
- [ ] 手动测试关键路径
- [ ] 更新 CHANGELOG.md（如需要）

### 发布前

- [ ] 版本号更新（`packages/*/package.json`）
- [ ] `pnpm test` 全部通过
- [ ] `pnpm build` 构建成功
- [ ] 数据库迁移脚本测试（`pnpm db:push`）
- [ ] Docker 镜像构建测试
- [ ] 部署文档更新
- [ ] 回滚方案准备

---

*最后更新：2026-02-10*  
*维护者：全空间智能体开发团队*
