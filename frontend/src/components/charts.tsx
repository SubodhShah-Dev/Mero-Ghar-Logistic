import type { ReactNode } from 'react'

export interface Datum {
  label: string
  value: number
  color?: string
}

export function ChartCard({ title, subtitle, children, action }: {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="bg-forest-900 border border-forest-700 rounded-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display font-bold text-base text-cream-50">{title}</h2>
          {subtitle && <p className="text-forest-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

export function Bars({ data, height = 180, format }: {
  data: Datum[]
  height?: number
  format?: (value: number) => string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => {
        const h = Math.round((d.value / max) * 100)
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end min-w-0" title={`${d.label}: ${format ? format(d.value) : d.value}`}>
            <span className="text-[10px] font-semibold text-cream-200">{format ? format(d.value) : d.value}</span>
            <div
              className={`w-full rounded-t-sm transition-all ${d.color || 'bg-saffron-400/80 hover:bg-saffron-400'}`}
              style={{ height: `${Math.max(h, d.value > 0 ? 3 : 1)}%` }}
            />
            <span className="text-[10px] text-forest-500 truncate w-full text-center">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export function HBars({ data, format }: {
  data: Datum[]
  format?: (value: number) => string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-xs text-forest-300 truncate text-right">{d.label}</span>
          <div className="flex-1 bg-forest-800 rounded-sm h-5 overflow-hidden">
            <div
              className={`h-full rounded-sm transition-all ${d.color || 'bg-saffron-400/80'}`}
              style={{ width: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 1)}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-xs font-semibold text-cream-200">
            {format ? format(d.value) : d.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function Donut({ segments, size = 150, centerLabel }: {
  segments: Datum[]
  size?: number
  centerLabel?: string
}) {
  const total = Math.max(1, segments.reduce((sum, s) => sum + s.value, 0))
  const radius = size / 2 - 12
  const stroke = 14
  const circ = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#112018" strokeWidth={stroke} />
        {segments.map((s) => {
          const len = (s.value / total) * circ
          const el = (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color || '#f5a623'}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
            />
          )
          offset += len
          return el
        })}
        <text x="50%" y="50%" className="fill-cream-50" style={{ fontSize: size / 5, fontWeight: 800 }} textAnchor="middle" dominantBaseline="middle" transform={`rotate(90 ${size / 2} ${size / 2})`}>
          {centerLabel || total}
        </text>
      </svg>
      <ul className="space-y-1.5 min-w-[140px]">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color || '#f5a623' }} />
            <span className="text-forest-300 flex-1 capitalize">{s.label.replace('_', ' ')}</span>
            <span className="text-cream-200 font-semibold">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
