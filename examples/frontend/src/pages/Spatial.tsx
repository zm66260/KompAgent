import { useState } from "react";

export function SpatialPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleQuery = async () => {
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/spatial/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: "查询失败" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">时空查询</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Query Input */}
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold mb-4">查询输入</h2>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="例如：查询过去24小时北京区域的无人机轨迹"
              className="w-full h-32 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <button
              onClick={handleQuery}
              disabled={isLoading || !query.trim()}
              className="mt-4 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? "查询中..." : "执行查询"}
            </button>
          </div>

          {/* Example Queries */}
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold mb-4">示例查询</h2>
            <div className="space-y-2">
              {[
                "查询过去24小时北京区域的无人机轨迹",
                "统计上周每天的飞行次数",
                "找出停留时间超过10分钟的位置",
                "计算设备 DRONE001 今天的总飞行距离",
              ].map((example, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(example)}
                  className="block w-full text-left text-sm px-3 py-2 rounded hover:bg-secondary"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-4">查询结果</h2>
          {result ? (
            <div className="space-y-4">
              {result.sql && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    生成的 SQL
                  </h3>
                  <pre className="bg-secondary p-3 rounded text-sm overflow-x-auto">
                    {result.sql}
                  </pre>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  结果 ({result.row_count || 0} 行)
                </h3>
                <pre className="bg-secondary p-3 rounded text-sm overflow-x-auto max-h-64">
                  {JSON.stringify(result.data || result, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              执行查询后，结果将在此处展示
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
