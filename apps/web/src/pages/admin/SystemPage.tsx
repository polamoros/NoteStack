import { trpc } from '@/api/client'
import { Database, Clock, Users, FileText, Activity } from 'lucide-react'

export function AdminSystemPage() {
  const { data: health } = trpc.admin.system.health.useQuery(undefined, { refetchInterval: 30_000 })
  const { data: stats } = trpc.admin.system.stats.useQuery(undefined, { refetchInterval: 60_000 })

  function formatUptime(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">System</h1>

      {/* Health */}
      <div className="rounded-lg border p-4 space-y-4">
        <h2 className="font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Health
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <StatRow label="Status" value={
            <span className={`font-medium ${health?.status === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
              {health?.status ?? '…'}
            </span>
          } />
          <StatRow label="Database" value={health?.db ?? '…'} />
          <StatRow label="Uptime" value={health ? formatUptime(health.uptime) : '…'} icon={<Clock className="h-3.5 w-3.5" />} />
          <StatRow label="Version" value={health?.version ?? '…'} />
          <StatRow label="Node.js" value={health?.nodeVersion ?? '…'} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<Users className="h-5 w-5 text-blue-500" />} label="Users" value={stats?.userCount ?? 0} />
        <StatCard icon={<FileText className="h-5 w-5 text-purple-500" />} label="Notes" value={stats?.noteCount ?? 0} />
        <StatCard icon={<Database className="h-5 w-5 text-green-500" />} label="DB Size" value={stats?.dbSize ?? '…'} />
      </div>
    </div>
  )
}

function StatRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium flex items-center gap-1">
        {icon}
        {value}
      </p>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-4 flex items-center gap-3">
      {icon}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  )
}
