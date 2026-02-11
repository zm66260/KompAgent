/**
 * Spatial Agent Middleware
 */

export {
  createSpatialQueryMiddleware,
  type SpatialQueryMiddlewareOptions,
} from "./spatial-query.js";

export {
  createDeviceControlMiddleware,
  type DeviceControlMiddlewareOptions,
} from "./device-control.js";

export { createTrajectoryMiddleware, type TrajectoryMiddlewareOptions } from "./trajectory.js";
