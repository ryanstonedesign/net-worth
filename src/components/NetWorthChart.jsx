import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMonthDisplay, formatCurrency } from '../utils'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null

  const isForecast = !!point.isForecast
  const value = isForecast
    ? (point.forecast ?? point.historical)
    : (point.historical ?? point.forecast)
  if (value == null) return null

  return (
    <div style={{
      background: 'rgba(242,250,252,0.97)',
      borderRadius: 14,
      padding: '8px 16px',
      boxShadow: '0 8px 32px rgba(10,40,60,0.18)',
      border: '1px solid rgba(200,232,244,0.7)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      fontFamily: 'var(--font)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#4E6F73', marginBottom: 4 }}>
        {formatMonthDisplay(point.month)}{isForecast ? ' · Est.' : ''}
      </div>
      <div style={{
        fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em',
        color: isForecast ? '#4E6F73' : '#1C292B',
      }}>
        {formatCurrency(value)}
      </div>
    </div>
  )
}

export default function NetWorthChart({ data, forecastData = [], selectedMonth, height = 160 }) {
  if (!data || data.length < 2) return null

  const hasForecast = forecastData.length > 0
  const lastHistorical = data[data.length - 1]
  const endPoint = hasForecast ? forecastData[forecastData.length - 1] : lastHistorical
  const isUp = endPoint.netWorth >= data[0].netWorth
  const color = isUp ? '#1AB766' : '#EF4444'
  const gradId = isUp ? 'nwGradUp' : 'nwGradDown'
  const fGradId = isUp ? 'nwForecastUp' : 'nwForecastDown'

  // Build combined dataset with separate dataKeys for each segment
  const combined = data.map(d => ({ ...d, historical: d.netWorth, forecast: null }))
  if (hasForecast) {
    combined[combined.length - 1] = { ...combined[combined.length - 1], forecast: lastHistorical.netWorth }
    forecastData.forEach(d => combined.push({ ...d, historical: null, forecast: d.netWorth }))
  }

  // Dot renderer for the historical area
  const historicalDot = ({ cx, cy, payload }) => {
    if (payload.historical == null || !isFinite(cx) || !isFinite(cy)) return null
    const isSelected = payload.month === selectedMonth
    if (isSelected) return (
      <g>
        <circle cx={cx} cy={cy} r={9} fill={color} opacity={0.22} className="dot-pulse-ring" />
        <circle cx={cx} cy={cy} r={5} fill={color} />
      </g>
    )
    return <circle cx={cx} cy={cy} r={3.5} fill={color} />
  }

  // Dot renderer for the forecast area (skip junction point — historical area owns it)
  const forecastDot = ({ cx, cy, payload }) => {
    if (payload.forecast == null || payload.historical != null || !isFinite(cx) || !isFinite(cy)) return null
    const isSelected = payload.month === selectedMonth
    if (isSelected) return (
      <g>
        <circle cx={cx} cy={cy} r={8} fill={color} opacity={0.18} className="dot-pulse-ring" />
        <circle cx={cx} cy={cy} r={4.5} fill={color} opacity={0.65} />
      </g>
    )
    return <circle cx={cx} cy={cy} r={3} fill={color} opacity={0.45} />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={combined} margin={{ top: 8, right: 4, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={fGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.1} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: 'rgba(28,41,43,0.12)', strokeWidth: 1, strokeDasharray: '4 3' }}
        />
        <Area
          type="monotone"
          dataKey="historical"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradId})`}
          dot={historicalDot}
          activeDot={{ r: 6, fill: color, stroke: 'white', strokeWidth: 2 }}
          isAnimationActive={false}
          connectNulls={false}
        />
        {hasForecast && (
          <Area
            type="monotone"
            dataKey="forecast"
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.45}
            strokeDasharray="6 4"
            fill={`url(#${fGradId})`}
            dot={forecastDot}
            activeDot={{ r: 5, fill: color, fillOpacity: 0.7, stroke: 'white', strokeWidth: 2 }}
            isAnimationActive={false}
            connectNulls={false}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}
