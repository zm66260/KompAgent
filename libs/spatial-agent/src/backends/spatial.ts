/**
 * Spatial Backend Base Class
 */

import type {
  BackendProtocol,
  FileInfo,
  GrepMatch,
  FileData,
  WriteResult,
  EditResult,
} from "deepagents";
import type { SpatialBackendProtocol } from "./protocol.js";
import type { SpatialQuery, SpatialQueryResult, GeoFence } from "../types.js";

/**
 * Base spatial backend implementation
 */
export abstract class SpatialBackend implements SpatialBackendProtocol {
  /**
   * Execute a spatial query
   */
  abstract executeSpatialQuery(query: SpatialQuery): Promise<SpatialQueryResult>;

  /**
   * Create a geofence
   */
  abstract createGeoFence(
    fence: Omit<GeoFence, "id" | "createdAt" | "updatedAt">
  ): Promise<GeoFence>;

  /**
   * Check if a point is within a geofence
   */
  abstract checkGeoFence(
    fenceId: string,
    point: { longitude: number; latitude: number }
  ): Promise<boolean>;

  /**
   * Execute raw SQL
   */
  abstract executeSQL(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]>;

  // Implement BackendProtocol methods
  abstract lsInfo(path: string): Promise<FileInfo[]>;
  abstract read(filePath: string, offset?: number, limit?: number): Promise<string>;
  abstract readRaw(filePath: string): Promise<FileData>;
  abstract grepRaw(
    pattern: string,
    path?: string | null,
    glob?: string | null
  ): Promise<GrepMatch[] | string>;
  abstract globInfo(pattern: string, path?: string): Promise<FileInfo[]>;
  abstract write(filePath: string, content: string): Promise<WriteResult>;
  abstract edit(
    filePath: string,
    oldString: string,
    newString: string,
    replaceAll?: boolean
  ): Promise<EditResult>;
}
