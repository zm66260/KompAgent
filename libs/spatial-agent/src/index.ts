/**
 * Spatial Agent - AI agents for spatial intelligence
 *
 * Built on top of DeepAgents/LangGraph for spatial data analysis,
 * device control, and trajectory visualization.
 */

// Re-export core deepagents functionality
export {
  createDeepAgent,
  createSettings,
  findProjectRoot,
  type Settings,
  type SettingsOptions,
} from "deepagents";

// Export spatial-specific agent creation
export { createSpatialAgent } from "./agent.js";
export type { CreateSpatialAgentParams, SpatialAgentConfig } from "./agent.js";

// Export spatial middleware
export {
  createSpatialQueryMiddleware,
  createDeviceControlMiddleware,
  createTrajectoryMiddleware,
  type SpatialQueryMiddlewareOptions,
  type DeviceControlMiddlewareOptions,
  type TrajectoryMiddlewareOptions,
} from "./middleware/index.js";

// Export backends
export {
  SpatialBackend,
  PostGISBackend,
  DeviceBackend,
  type SpatialBackendProtocol,
  type PostGISConfig,
  type DeviceConfig,
} from "./backends/index.js";

// Export skills
export { createSpatialSkillsMiddleware, type SpatialSkillsOptions } from "./skills/index.js";

// Export types
export type {
  SpatialQuery,
  SpatialQueryResult,
  GeoPoint,
  Trajectory,
  TrajectoryPoint,
  Device,
  DeviceCommand,
  DeviceStatus,
  GeoFence,
} from "./types.js";

// Export LLM utilities
export {
  createLLM,
  detectLLMProvider,
  getModelString,
  GITHUB_MODELS,
  type LLMConfig,
  type LLMProvider,
} from "./llm.js";
