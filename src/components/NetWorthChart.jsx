import { useMemo, useState, useEffect } from 'react'
import { AreaChart, Area, Tooltip, ResponsiveContainer, ReferenceLine, YAxis } from 'recharts'
import { formatMonthDisplay, formatCurrency, formatCompact } from '../utils'

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
      background: '#edf1f5',
      borderRadius: 14,
      padding: '8px 16px',
      boxShadow: '6px 6px 12px rgba(174,182,192,0.48), -6px -6px 12px rgba(255,255,255,1)',
      border: 'none',
      fontFamily: 'var(--font)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#55636D', marginBottom: 4 }}>
        {formatMonthDisplay(point.month)}{isForecast ? ' · Est.' : ''}
      </div>
      <div style={{
        fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em',
        color: isForecast ? '#55636D' : '#1F2529',
      }}>
        {formatCurrency(value)}
      </div>
    </div>
  )
}

function GoalLabel({ viewBox, goal }) {
  if (!viewBox) return null
  const { x, y, width } = viewBox
  const label = `Goal ${formatCompact(goal)}`
  return (
    <text
      x={x + width - 4}
      y={y - 5}
      textAnchor="end"
      fill="#F59E0B"
      fontSize={10}
      fontWeight={700}
      fontFamily="Afacad, system-ui, sans-serif"
    >
      {label}
    </text>
  )
}

export default function NetWorthChart({ data, forecastData = [], selectedMonth, height = 160, goal = null }) {
  // ── Hooks (must run before any early return) ──
  // Build combined dataset with separate dataKeys for each segment.
  // Memoised on the data's content so hover / selected-month re-renders keep a
  // stable reference — that prevents recharts from replaying its draw animation
  // on every interaction (it only replays on mount, i.e. on time-range change).
  const dataSig = (data || []).map(d => `${d.month}:${d.netWorth}`).join('|')
  const forecastSig = forecastData.map(d => `${d.month}:${d.netWorth}`).join('|')
  const combined = useMemo(() => {
    if (!data || data.length === 0) return []
    const c = data.map(d => ({ ...d, historical: d.netWorth, forecast: null }))
    if (forecastData.length > 0) {
      c[c.length - 1] = { ...c[c.length - 1], forecast: data[data.length - 1].netWorth }
      forecastData.forEach(d => c.push({ ...d, historical: null, forecast: d.netWorth }))
    }
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSig, forecastSig])

  // Dots stay hidden until the line has finished drawing, then fade in.
  const [dotsVisible, setDotsVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDotsVisible(true), 1200)
    return () => clearTimeout(t)
  }, [])

  if (!data || data.length < 2) return null

  const hasForecast = forecastData.length > 0
  const lastHistorical = data[data.length - 1]
  const endPoint = hasForecast ? forecastData[forecastData.length - 1] : lastHistorical
  const isUp = endPoint.netWorth >= data[0].netWorth
  const color = isUp ? '#4F9289' : '#EF4444'
  const gradId = isUp ? 'nwGradUp' : 'nwGradDown'
  const fGradId = isUp ? 'nwForecastUp' : 'nwForecastDown'

  // Y-axis domain — expand to include goal line if above data range
  const allValues = combined.map(d => d.historical ?? d.forecast).filter(v => v != null)
  const maxDataVal = allValues.length > 0 ? Math.max(...allValues) : 0
  const minDataVal = allValues.length > 0 ? Math.min(...allValues) : 0
  const goalAbove = goal != null && goal > maxDataVal
  const yDomain = goalAbove
    ? [minDataVal, Math.round(goal * 1.12)]
    : ['auto', 'auto']

  // Thin the dots on long ranges so they don't crowd the line. The line itself
  // stays continuous — only the markers are sampled. The selected month and the
  // final point always show regardless of the stride.
  const dotStride = Math.max(1, Math.ceil(combined.length / 12))
  const showDotAt = (index) => index % dotStride === 0 || index === combined.length - 1

  // Dot renderer for the historical area
  const historicalDot = ({ cx, cy, payload, index }) => {
    if (!dotsVisible) return null
    if (payload.historical == null || !isFinite(cx) || !isFinite(cy)) return null
    const isSelected = payload.month === selectedMonth
    if (isSelected) return (
      <g className="nw-dot-appear">
        <circle cx={cx} cy={cy} r={9} fill={color} opacity={0.22} className="dot-pulse-ring" />
        <circle cx={cx} cy={cy} r={5} fill={color} />
      </g>
    )
    if (!showDotAt(index)) return null
    return <circle className="nw-dot-appear" cx={cx} cy={cy} r={3.5} fill={color} />
  }

  // Dot renderer for the forecast area (skip junction point — historical area owns it)
  const forecastDot = ({ cx, cy, payload, index }) => {
    if (!dotsVisible) return null
    if (payload.forecast == null || payload.historical != null || !isFinite(cx) || !isFinite(cy)) return null
    const isSelected = payload.month === selectedMonth
    if (isSelected) return (
      <g className="nw-dot-appear">
        <circle cx={cx} cy={cy} r={8} fill={color} opacity={0.18} className="dot-pulse-ring" />
        <circle cx={cx} cy={cy} r={4.5} fill={color} opacity={0.65} />
      </g>
    )
    if (!showDotAt(index)) return null
    return <circle className="nw-dot-appear" cx={cx} cy={cy} r={3} fill={color} opacity={0.45} />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={combined} margin={{ top: 20, right: 4, left: 4, bottom: 4 }}>
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
        <YAxis domain={yDomain} hide />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: 'rgba(28,41,43,0.12)', strokeWidth: 1, strokeDasharray: '4 3' }}
        />
        {goal != null && (
          <ReferenceLine
            y={goal}
            stroke="#F59E0B"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={<GoalLabel goal={goal} />}
          />
        )}
        <Area
          type="monotone"
          dataKey="historical"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradId})`}
          dot={historicalDot}
          activeDot={{ r: 6, fill: color, stroke: 'white', strokeWidth: 2 }}
          isAnimationActive={true}
          animationBegin={0}
          animationDuration={1100}
          animationEasing="ease-out"
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
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={1100}
            animationEasing="ease-out"
            connectNulls={false}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}
