import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMonthShort, formatCurrency } from '../utils'

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
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#4E6F73', marginBottom: 2 }}>
        {formatMonthShort(month)}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#1C292B', letterSpacing: '-0.02em' }}>
        {formatCurrency(netWorth)}
      </div>
    </div>
  )
}

export default function NetWorthChart({ data }) {
  if (!data || data.length < 2) return null

  const chartData = data.map(d => ({
    ...d,
    label: formatMonthShort(d.month),
  }))

  const min = Math.min(...data.map(d => d.netWorth))
  const max = Math.max(...data.map(d => d.netWorth))
  const padding = (max - min) * 0.15 || 10000
  const domain = [Math.max(0, min - padding), max + padding]

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <div className="chart-title">Net Worth Trend</div>
        <div className="chart-subtitle">{data.length} months tracked</div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#19AEC2" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#19AEC2" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#4E6F73', fontFamily: 'Sora, sans-serif', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="netWorth"
            stroke="#19AEC2"
            strokeWidth={2.5}
            fill="url(#nwGrad)"
            dot={false}
            activeDot={{ r: 5, fill: '#19AEC2', strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
