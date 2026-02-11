/**
 * Device Backend
 *
 * Backend for communicating with device control APIs
 */

import type { Device, DeviceCommand, DeviceStatus } from "../types.js";

/**
 * Device API configuration
 */
export interface DeviceConfig {
  /** API endpoint URL */
  endpoint: string;
  /** API key for authentication */
  apiKey?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    minWait: number;
    maxWait: number;
  };
}

/**
 * Device backend for controlling remote devices
 */
export class DeviceBackend {
  private config: DeviceConfig;
  private connected = false;

  constructor(config: DeviceConfig) {
    this.config = {
      timeout: config.timeout ?? 30000,
      retry: config.retry ?? {
        maxAttempts: 3,
        minWait: 1000,
        maxWait: 10000,
      },
      ...config,
    };
  }

  /**
   * Connect to device API
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    // Verify API is accessible
    const response = await this.fetch("/health");
    if (!response.ok) {
      throw new Error(`Failed to connect to device API: ${response.status}`);
    }

    this.connected = true;
  }

  /**
   * List all devices
   */
  async listDevices(): Promise<Device[]> {
    const response = await this.fetch("/devices");
    const data = (await response.json()) as { devices: Device[] };
    return data.devices;
  }

  /**
   * Get device by ID
   */
  async getDevice(deviceId: string): Promise<Device | null> {
    try {
      const response = await this.fetch(`/devices/${deviceId}`);
      if (!response.ok) return null;
      return (await response.json()) as Device;
    } catch {
      return null;
    }
  }

  /**
   * Get device status
   */
  async getDeviceStatus(deviceId: string): Promise<DeviceStatus | null> {
    const device = await this.getDevice(deviceId);
    return device?.status ?? null;
  }

  /**
   * Send command to device
   */
  async sendCommand(
    command: Omit<DeviceCommand, "id" | "createdAt" | "status">
  ): Promise<DeviceCommand> {
    const response = await this.fetch("/commands", {
      method: "POST",
      body: JSON.stringify(command),
    });

    return (await response.json()) as DeviceCommand;
  }

  /**
   * Get command status
   */
  async getCommandStatus(commandId: string): Promise<DeviceCommand | null> {
    try {
      const response = await this.fetch(`/commands/${commandId}`);
      if (!response.ok) return null;
      return (await response.json()) as DeviceCommand;
    } catch {
      return null;
    }
  }

  /**
   * Cancel command
   */
  async cancelCommand(commandId: string): Promise<boolean> {
    try {
      const response = await this.fetch(`/commands/${commandId}/cancel`, {
        method: "POST",
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Stream device telemetry
   */
  async *streamTelemetry(deviceId: string): AsyncGenerator<Record<string, unknown>> {
    const response = await fetch(`${this.config.endpoint}/devices/${deviceId}/telemetry/stream`, {
      headers: this.getHeaders(),
    });

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get telemetry stream");
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split("\n").filter(Boolean);

      for (const line of lines) {
        if (line.startsWith("data:")) {
          try {
            yield JSON.parse(line.slice(5)) as Record<string, unknown>;
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  /**
   * Internal fetch with retry
   */
  private async fetch(path: string, options?: RequestInit): Promise<Response> {
    const url = `${this.config.endpoint}${path}`;
    const headers = {
      ...this.getHeaders(),
      ...options?.headers,
    };

    let lastError: Error | null = null;
    const { maxAttempts, minWait, maxWait } = this.config.retry!;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
          signal: AbortSignal.timeout(this.config.timeout!),
        });

        if (response.ok) {
          return response;
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      if (attempt < maxAttempts) {
        const waitTime = Math.min(minWait * Math.pow(2, attempt - 1), maxWait);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    throw lastError;
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }
}
