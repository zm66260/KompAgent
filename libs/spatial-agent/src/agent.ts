/**
 * Spatial Agent - extends DeepAgent with spatial intelligence capabilities
 */

import { createDeepAgent } from "deepagents";
import type { AgentMiddleware } from "langchain";
import type { StructuredTool } from "@langchain/core/tools";
import type { BaseCheckpointSaver, BaseStore } from "@langchain/langgraph-checkpoint";

import {
  createSpatialQueryMiddleware,
  createDeviceControlMiddleware,
  createTrajectoryMiddleware,
} from "./middleware/index.js";
import { createSpatialSkillsMiddleware } from "./skills/index.js";
import type { PostGISConfig, DeviceConfig } from "./backends/index.js";

/**
 * Spatial agent configuration
 */
export interface SpatialAgentConfig {
  /** PostGIS database configuration */
  postgis?: PostGISConfig;
  /** Device control API configuration */
  deviceApi?: DeviceConfig;
  /** Enable trajectory analysis features */
  enableTrajectory?: boolean;
  /** Custom skills directory */
  skillsDir?: string;
}

/**
 * Parameters for creating a spatial agent
 */
export interface CreateSpatialAgentParams {
  /** LLM model to use (default: claude-sonnet-4-5-20250929) */
  model?: string;
  /** Custom tools to add */
  tools?: StructuredTool[];
  /** System prompt override */
  systemPrompt?: string;
  /** Custom middleware to add */
  middleware?: AgentMiddleware[];
  /** Checkpointer for conversation persistence */
  checkpointer?: BaseCheckpointSaver | boolean;
  /** BaseStore for long-term memory */
  store?: BaseStore;
  /** Agent name */
  name?: string;
  /** Spatial-specific configuration */
  spatial?: SpatialAgentConfig;
}

/**
 * Default system prompt for spatial agents
 */
const SPATIAL_SYSTEM_PROMPT = `你是一个全空间智能体助手，专注于时空数据分析和设备调度。

你的能力包括：
1. **时空查询**: 使用自然语言查询时空数据库（PostGIS），生成并执行 SQL
2. **轨迹分析**: 分析和可视化移动轨迹数据，计算距离、速度、停留点等
3. **设备调度**: 管理无人机、机器人等设备的任务调度和实时控制
4. **地理围栏**: 创建和管理地理围栏，监控进出事件

请始终使用中文回复用户，除非用户明确要求使用其他语言。

在处理空间数据时：
- 优先使用参数化 SQL 查询，防止注入攻击
- 对于复杂的空间分析，先制定计划再执行
- 返回结果时，使用 GeoJSON 格式便于可视化`;

/**
 * Create a Spatial Agent with spatial intelligence capabilities.
 *
 * Extends DeepAgent with middleware for:
 * - Spatial query generation and execution (PostGIS)
 * - Device control and scheduling
 * - Trajectory analysis and visualization
 * - Geofencing and location-based services
 *
 * @param params Configuration parameters for the spatial agent
 * @returns DeepAgent instance with spatial capabilities
 *
 * @example
 * ```typescript
 * const agent = createSpatialAgent({
 *   spatial: {
 *     postgis: {
 *       connectionString: process.env.DATABASE_URL,
 *     },
 *     deviceApi: {
 *       endpoint: process.env.DEVICE_API_URL,
 *       apiKey: process.env.DEVICE_API_KEY,
 *     },
 *   },
 * });
 *
 * const result = await agent.invoke({
 *   messages: [{ role: "user", content: "查询过去24小时北京区域的无人机轨迹" }],
 * });
 * ```
 */
export function createSpatialAgent(params: CreateSpatialAgentParams = {}) {
  const {
    model = "claude-sonnet-4-5-20250929",
    tools = [],
    systemPrompt,
    middleware: customMiddleware = [],
    checkpointer,
    store,
    name = "spatial-agent",
    spatial = {},
  } = params;

  // Build spatial middleware array
  const spatialMiddleware: AgentMiddleware[] = [];

  // Add spatial query middleware if PostGIS is configured
  if (spatial.postgis) {
    spatialMiddleware.push(
      createSpatialQueryMiddleware({
        postgis: spatial.postgis,
      })
    );
  }

  // Add device control middleware if device API is configured
  if (spatial.deviceApi) {
    spatialMiddleware.push(
      createDeviceControlMiddleware({
        deviceApi: spatial.deviceApi,
      })
    );
  }

  // Add trajectory middleware if enabled
  if (spatial.enableTrajectory !== false) {
    spatialMiddleware.push(createTrajectoryMiddleware({}));
  }

  // Add spatial skills middleware if skills directory is configured
  if (spatial.skillsDir) {
    spatialMiddleware.push(
      createSpatialSkillsMiddleware({
        skillsDir: spatial.skillsDir,
      })
    );
  }

  // Combine system prompts
  const finalSystemPrompt = systemPrompt
    ? `${systemPrompt}\n\n${SPATIAL_SYSTEM_PROMPT}`
    : SPATIAL_SYSTEM_PROMPT;

  // Combine all middleware
  const allMiddleware = [...spatialMiddleware, ...customMiddleware];

  // Create the agent using deepagents
  return createDeepAgent({
    model,
    tools,
    systemPrompt: finalSystemPrompt,
    middleware: allMiddleware,
    checkpointer,
    store,
    name,
  });
}
