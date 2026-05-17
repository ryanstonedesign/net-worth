import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMonthDisplay, formatCurrency } from '../utils'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { month, netWorth } = payload[0].payload
  return (
    <div style={{
      background: 'rgba(242,250,252,0.97)',
      borderRadius: 14,
      padding: '10px 16px',
      boxShadow: '0 8px 32px rgba(10,40,60,0.18)',
      border: '1px solid rgba(200,232,244,0.7)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      fontFamily: 'var(--font)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#4E6F73', marginBottom: 3 }}>
        {formatMonthDisplay(month)}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#1C292B', letterSpacing: '-0.02em' }}>
        {formatCurrency(netWorth)}
      </div>
    </div>
  )
}

export default function NetWorthChart({ data, height = 160 }) {
  if (!data || data.length < 2) return null

  const isUp = data[data.length - 1].netWorth >= data[0].netWorth
  const color = isUp ? '#1AB766' : '#EF4444'
  const gradId = isUp ? 'nwGradUp' : 'nwGradDown'

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: 'rgba(28,41,43,0.12)', strokeWidth: 1, strokeDasharray: '4 3' }}
        />
        <Area
          type="monotone"
          dataKey="netWorth"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradId})`}
          dot={{ r: 3.5, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: color, stroke: 'white', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
