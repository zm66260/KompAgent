/**
 * Spatial Agent Types
 */

/**
 * Geographic point
 */
export interface GeoPoint {
  longitude: number;
  latitude: number;
  altitude?: number;
}

/**
 * Trajectory point with timestamp
 */
export interface TrajectoryPoint extends GeoPoint {
  timestamp: Date;
  speed?: number; // m/s
  heading?: number; // degrees, 0-360
  accuracy?: number; // meters
  metadata?: Record<string, unknown>;
}

/**
 * Trajectory
 */
export interface Trajectory {
  id: string;
  entityId: string;
  entityType: "drone" | "vehicle" | "ship" | "person" | "other";
  points: TrajectoryPoint[];
  startTime: Date;
  endTime: Date;
  totalDistance?: number; // meters
  avgSpeed?: number; // m/s
  metadata?: Record<string, unknown>;
}

/**
 * Spatial query parameters
 */
export interface SpatialQuery {
  /** Query type */
  type: "point" | "polygon" | "circle" | "bbox" | "trajectory";
  /** Time range */
  timeRange?: {
    start: Date;
    end: Date;
  };
  /** Spatial geometry (GeoJSON) */
  geometry?: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  /** Additional filters */
  filters?: Record<string, unknown>;
  /** Fields to select */
  select?: string[];
  /** Order by */
  orderBy?: { field: string; direction: "asc" | "desc" }[];
  /** Limit */
  limit?: number;
}

/**
 * Spatial query result
 */
export interface SpatialQueryResult {
  queryId: string;
  sql: string;
  executionTime: number; // milliseconds
  rowCount: number;
  data: Record<string, unknown>[];
  columns: {
    name: string;
    type: string;
    isGeometry: boolean;
  }[];
  warnings?: string[];
}

/**
 * Device status
 */
export type DeviceStatus =
  | "online"
  | "offline"
  | "busy"
  | "idle"
  | "error"
  | "maintenance"
  | "charging";

/**
 * Device type
 */
export type DeviceType = "drone" | "robot" | "sensor" | "camera" | "vehicle" | "other";

/**
 * Device information
 */
export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  location?: GeoPoint;
  battery?: number; // 0-100
  lastSeen: Date;
  capabilities: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Device command action
 */
export type DeviceAction =
  | "takeoff"
  | "land"
  | "move_to"
  | "return_home"
  | "pause"
  | "resume"
  | "stop"
  | "capture_photo"
  | "start_video"
  | "stop_video"
  | "set_altitude"
  | "set_speed"
  | "custom";

/**
 * Device command
 */
export interface DeviceCommand {
  id: string;
  deviceId: string;
  action: DeviceAction;
  parameters?: Record<string, unknown>;
  priority: number; // 1-10
  createdAt: Date;
  executedAt?: Date;
  completedAt?: Date;
  status: "pending" | "executing" | "completed" | "failed" | "cancelled";
  result?: Record<string, unknown>;
  error?: string;
}

/**
 * Geofence
 */
export interface GeoFence {
  id: string;
  name: string;
  type: "polygon" | "circle";
  geometry: {
    type: "Polygon" | "Point";
    coordinates: number[] | number[][];
  };
  radius?: number; // meters, only for circle
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Geofence event
 */
export interface GeoFenceEvent {
  id: string;
  fenceId: string;
  entityId: string;
  eventType: "enter" | "exit" | "dwell";
  location: GeoPoint;
  timestamp: Date;
  dwellTime?: number; // seconds
}
