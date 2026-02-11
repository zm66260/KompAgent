/**
 * Device Control Middleware
 *
 * Provides tools for controlling remote devices (drones, robots, etc.)
 */

import type { AgentMiddleware } from "langchain";
import type { DeviceConfig } from "../backends/index.js";
import type { DeviceAction } from "../types.js";

/**
 * Options for device control middleware
 */
export interface DeviceControlMiddlewareOptions {
  /** Device API configuration */
  deviceApi: DeviceConfig;
  /** Allowed actions */
  allowedActions?: DeviceAction[];
  /** Require confirmation for critical actions */
  requireConfirmation?: DeviceAction[];
}

/**
 * Default critical actions that require confirmation
 */
const DEFAULT_CONFIRM_ACTIONS: DeviceAction[] = ["takeoff", "land", "return_home", "stop"];

/**
 * Create device control middleware
 *
 * Adds tools for:
 * - Listing available devices
 * - Sending commands to devices
 * - Monitoring device status
 * - Managing device missions
 */
export function createDeviceControlMiddleware(
  options: DeviceControlMiddlewareOptions
): AgentMiddleware {
  const { deviceApi, allowedActions, requireConfirmation = DEFAULT_CONFIRM_ACTIONS } = options;

  // TODO: Implement actual middleware using createMiddleware from langchain
  // This is a placeholder that shows the structure

  return {
    name: "DeviceControlMiddleware",
    // Middleware implementation will be added here
  } as unknown as AgentMiddleware;
}

/**
 * Validate device command
 */
export function validateDeviceCommand(
  action: string,
  allowedActions?: DeviceAction[]
): { valid: boolean; error?: string } {
  const validActions: DeviceAction[] = [
    "takeoff",
    "land",
    "move_to",
    "return_home",
    "pause",
    "resume",
    "stop",
    "capture_photo",
    "start_video",
    "stop_video",
    "set_altitude",
    "set_speed",
    "custom",
  ];

  if (!validActions.includes(action as DeviceAction)) {
    return {
      valid: false,
      error: `Invalid action: ${action}. Valid actions: ${validActions.join(", ")}`,
    };
  }

  if (allowedActions && !allowedActions.includes(action as DeviceAction)) {
    return {
      valid: false,
      error: `Action not allowed: ${action}`,
    };
  }

  return { valid: true };
}
