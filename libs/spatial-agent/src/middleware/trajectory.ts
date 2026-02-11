/**
 * Trajectory Middleware
 *
 * Provides tools for trajectory analysis and visualization
 */

import type { AgentMiddleware } from "langchain";
import type { GeoPoint, TrajectoryPoint } from "../types.js";

/**
 * Options for trajectory middleware
 */
export interface TrajectoryMiddlewareOptions {
  /** Maximum points to process at once */
  maxPoints?: number;
  /** Simplification tolerance (meters) */
  simplifyTolerance?: number;
}

/**
 * Create trajectory middleware
 *
 * Adds tools for:
 * - Calculating trajectory statistics (distance, speed, duration)
 * - Detecting stop points
 * - Simplifying trajectories
 * - Converting coordinate systems
 */
export function createTrajectoryMiddleware(options: TrajectoryMiddlewareOptions): AgentMiddleware {
  const { maxPoints = 10000, simplifyTolerance = 10 } = options;

  // TODO: Implement actual middleware using createMiddleware from langchain
  // This is a placeholder that shows the structure

  return {
    name: "TrajectoryMiddleware",
    // Middleware implementation will be added here
  } as unknown as AgentMiddleware;
}

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const deltaLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate total trajectory length
 * @returns Total distance in meters
 */
export function calculateTrajectoryLength(points: GeoPoint[]): number {
  let totalDistance = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (prev && curr) {
      totalDistance += calculateDistance(prev, curr);
    }
  }

  return totalDistance;
}

/**
 * Calculate average speed from trajectory points
 * @returns Average speed in m/s
 */
export function calculateAverageSpeed(points: TrajectoryPoint[]): number {
  if (points.length < 2) return 0;

  const first = points[0];
  const last = points[points.length - 1];

  if (!first || !last) return 0;

  const totalDistance = calculateTrajectoryLength(points);
  const duration =
    (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 1000; // seconds

  if (duration === 0) return 0;

  return totalDistance / duration;
}

/**
 * Detect stop points in trajectory
 * @param points - Trajectory points
 * @param speedThreshold - Speed threshold for stop detection (m/s)
 * @param durationThreshold - Minimum stop duration (seconds)
 * @returns Array of stop point indices
 */
export function detectStopPoints(
  points: TrajectoryPoint[],
  speedThreshold = 0.5,
  durationThreshold = 60
): number[] {
  const stopPoints: number[] = [];

  let stopStart: number | null = null;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const speed = point?.speed ?? 0;

    if (speed <= speedThreshold) {
      if (stopStart === null) {
        stopStart = i;
      }
    } else {
      if (stopStart !== null) {
        const startPoint = points[stopStart];
        const endPoint = points[i - 1];

        if (startPoint && endPoint) {
          const duration =
            (new Date(endPoint.timestamp).getTime() - new Date(startPoint.timestamp).getTime()) /
            1000;

          if (duration >= durationThreshold) {
            stopPoints.push(stopStart);
          }
        }
        stopStart = null;
      }
    }
  }

  return stopPoints;
}
