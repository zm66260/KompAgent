/**
 * Spatial Backend Protocol
 *
 * Extends the base BackendProtocol with spatial-specific operations
 */

import type { BackendProtocol } from "deepagents";
import type { SpatialQuery, SpatialQueryResult, GeoFence } from "../types.js";

/**
 * Protocol for spatial backends
 */
export interface SpatialBackendProtocol extends BackendProtocol {
  /**
   * Execute a spatial query
   */
  executeSpatialQuery(query: SpatialQuery): Promise<SpatialQueryResult>;

  /**
   * Create a geofence
   */
  createGeoFence(fence: Omit<GeoFence, "id" | "createdAt" | "updatedAt">): Promise<GeoFence>;

  /**
   * Check if a point is within a geofence
   */
  checkGeoFence(fenceId: string, point: { longitude: number; latitude: number }): Promise<boolean>;

  /**
   * Execute raw SQL (with safety validation)
   */
  executeSQL(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
}
