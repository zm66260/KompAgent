/**
 * Spatial Skills Middleware
 *
 * Extends deepagents' skills middleware with spatial-specific skills
 */

import type { AgentMiddleware } from "langchain";

/**
 * Options for spatial skills middleware
 */
export interface SpatialSkillsOptions {
  /** Directory containing skill definitions */
  skillsDir: string;
  /** Include built-in spatial skills */
  includeBuiltIn?: boolean;
}

/**
 * Built-in spatial skill definitions
 */
const BUILT_IN_SKILLS = [
  {
    name: "spatial-query",
    description: "时空数据查询技能，支持自然语言到 SQL 转换",
    capabilities: ["spatial_query", "sql_generation", "data_analysis"],
  },
  {
    name: "device-scheduler",
    description: "设备调度技能，用于管理和调度无人机、机器人等远程设备",
    capabilities: ["device_control", "mission_planning", "task_scheduling"],
  },
  {
    name: "trajectory-analysis",
    description: "轨迹分析技能，提供轨迹统计、停留点检测、路径优化等功能",
    capabilities: ["trajectory_stats", "stop_detection", "path_optimization"],
  },
  {
    name: "geofence-manager",
    description: "地理围栏管理技能，创建、管理围栏并监控进出事件",
    capabilities: ["geofence_creation", "event_monitoring", "alert_management"],
  },
];

/**
 * Create spatial skills middleware
 *
 * Loads skill definitions from the specified directory and
 * optionally includes built-in spatial skills.
 */
export function createSpatialSkillsMiddleware(options: SpatialSkillsOptions): AgentMiddleware {
  const { skillsDir, includeBuiltIn = true } = options;

  // TODO: Implement using deepagents' createSkillsMiddleware
  // This is a placeholder

  return {
    name: "SpatialSkillsMiddleware",
    // Middleware implementation
  } as unknown as AgentMiddleware;
}

/**
 * Get built-in spatial skills
 */
export function getBuiltInSpatialSkills() {
  return BUILT_IN_SKILLS;
}
