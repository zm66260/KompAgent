import { useState, useEffect } from "react";

interface Device {
  id: string;
  name: string;
  type: string;
  status: string;
  battery?: number;
  location?: { longitude: number; latitude: number };
}

export function DevicePage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch("/api/device/");
      const data = await response.json();
      setDevices(data.devices || []);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendCommand = async (deviceId: string, action: string) => {
    try {
      await fetch(`/api/device/${deviceId}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      // Refresh device list
      fetchDevices();
    } catch (error) {
      console.error("Failed to send command:", error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">设备调度</h1>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatusCard
          title="在线设备"
          value={devices.filter((d) => d.status === "online").length}
          color="green"
        />
        <StatusCard
          title="执行中"
          value={devices.filter((d) => d.status === "busy").length}
          color="blue"
        />
        <StatusCard
          title="空闲"
          value={devices.filter((d) => d.status === "idle").length}
          color="gray"
        />
        <StatusCard
          title="离线"
          value={devices.filter((d) => d.status === "offline").length}
          color="red"
        />
      </div>

      {/* Device List */}
      <div className="border rounded-lg">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">设备列表</h2>
          <button
            onClick={fetchDevices}
            className="text-sm text-primary hover:underline"
          >
            刷新
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">加载中...</div>
        ) : devices.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            暂无设备数据，请先配置设备调度服务
          </div>
        ) : (
          <div className="divide-y">
            {devices.map((device) => (
              <div
                key={device.id}
                className="p-4 hover:bg-secondary/50 cursor-pointer"
                onClick={() => setSelectedDevice(device.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{device.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {device.type} | {device.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {device.battery !== undefined && (
                      <span className="text-sm">{device.battery}%</span>
                    )}
                    <StatusBadge status={device.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Device Actions */}
      {selectedDevice && (
        <div className="mt-6 border rounded-lg p-4">
          <h2 className="font-semibold mb-4">设备操作 - {selectedDevice}</h2>
          <div className="flex gap-2 flex-wrap">
            {["takeoff", "land", "pause", "resume", "return_home"].map(
              (action) => (
                <button
                  key={action}
                  onClick={() => sendCommand(selectedDevice, action)}
                  className="px-4 py-2 border rounded-lg hover:bg-secondary"
                >
                  {action}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: "green" | "blue" | "gray" | "red";
}) {
  const colorClasses = {
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
    gray: "bg-gray-100 text-gray-800",
    red: "bg-red-100 text-red-800",
  };

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorClasses: Record<string, string> = {
    online: "bg-green-100 text-green-800",
    busy: "bg-blue-100 text-blue-800",
    idle: "bg-gray-100 text-gray-800",
    offline: "bg-red-100 text-red-800",
    error: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`px-2 py-1 text-xs rounded-full ${colorClasses[status] || colorClasses.offline}`}
    >
      {status}
    </span>
  );
}
