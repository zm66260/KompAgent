/**
 * Spatial Query Middleware
 *
 * Provides tools for querying spatial databases (PostGIS)
 */

import type { AgentMiddleware } from "langchain";
import type { PostGISConfig } from "../backends/index.js";

/**
 * Options for spatial query middleware
 */
export interface SpatialQueryMiddlewareOptions {
  /** PostGIS configuration */
  postgis: PostGISConfig;
  /** Allowed tables (whitelist) */
  allowedTables?: string[];
  /** Maximum query result rows */
  maxRows?: number;
}

/**
 * Default allowed tables
 */
const DEFAULT_ALLOWED_TABLES = [
  "drone_trajectory",
  "device_status",
  "mission_log",
  "geo_fence",
  "telemetry_data",
  "spatial_index",
];

/**
 * Create spatial query middleware
 *
 * Adds tools for:
 * - Generating SQL from natural language
 * - Executing spatial queries
 * - Validating query safety
 */
export function createSpatialQueryMiddleware(
  options: SpatialQueryMiddlewareOptions
): AgentMiddleware {
  const { postgis, allowedTables = DEFAULT_ALLOWED_TABLES, maxRows = 1000 } = options;

  // TODO: Implement actual middleware using createMiddleware from langchain
  // This is a placeholder that shows the structure

  return {
    name: "SpatialQueryMiddleware",
    // Middleware implementation will be added here
    // Using LangGraph's createMiddleware pattern
  } as unknown as AgentMiddleware;
}

/**
 * Validate SQL query for safety
 */
export function validateSQLQuery(
  sql: string,
  allowedTables: string[]
): { valid: boolean; error?: string } {
  // Check for SQL injection patterns
  const dangerousPatterns = [
    /;\s*drop\s+/i,
    /;\s*delete\s+/i,
    /;\s*update\s+/i,
    /;\s*insert\s+/i,
    /;\s*truncate\s+/i,
    /;\s*alter\s+/i,
    /'\s*or\s+'1'\s*=\s*'1/i,
    /"\s*or\s+"1"\s*=\s*"1/i,
    /union\s+select/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sql)) {
      return {
        valid: false,
        error: `Potentially dangerous SQL pattern detected: ${pattern.source}`,
      };
    }
  }

  // Check table names against whitelist
  const tablePattern = /\bfrom\s+(\w+)/gi;
  let match;
  while ((match = tablePattern.exec(sql)) !== null) {
    const tableName = match[1]?.toLowerCase();
    if (tableName && !allowedTables.includes(tableName)) {
      return {
        valid: false,
        error: `Table not in allowed list: ${tableName}`,
      };
    }
  }

  return { valid: true };
}
