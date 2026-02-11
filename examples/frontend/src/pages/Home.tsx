import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-4">
          全空间智能体
        </h1>
        <p className="text-xl text-muted-foreground">
          Spatial Intelligence Agent Platform
        </p>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          基于 DeepAgents/LangGraph 的时空数据分析与设备调度平台，
          支持自然语言交互、轨迹可视化、实时监控等功能。
        </p>
      </div>

      {/* Features */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          title="智能对话"
          description="使用自然语言与 AI 助手交互，执行复杂的时空分析任务"
          href="/chat"
        />
        <FeatureCard
          title="时空查询"
          description="自然语言转 SQL，查询 PostGIS 数据库中的时空数据"
          href="/spatial"
        />
        <FeatureCard
          title="设备调度"
          description="管理和调度无人机、机器人等远程设备"
          href="/device"
        />
      </div>

      {/* Tech Stack */}
      <div className="border rounded-lg p-6">
        <h2 className="font-semibold mb-4">技术栈</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              后端
            </h3>
            <ul className="text-sm space-y-1">
              <li>• Python FastAPI + PostgreSQL/PostGIS</li>
              <li>• DeepAgents + LangGraph (TypeScript)</li>
              <li>• Redis 会话管理</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              前端
            </h3>
            <ul className="text-sm space-y-1">
              <li>• React + TypeScript + Vite</li>
              <li>• TailwindCSS + Radix UI</li>
              <li>• Zustand 状态管理</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="block border rounded-lg p-6 hover:border-primary transition-colors"
    >
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
