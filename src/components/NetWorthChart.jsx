import { useMemo, useState, useEffect, useRef } from 'react'
import { AreaChart, Area, Tooltip, ResponsiveContainer, ReferenceLine, YAxis } from 'recharts'
import { formatMonthDisplay, formatCurrency, formatCompact } from '../utils'

// Whether the draw animation plays is decided by the caller via `animateDraw`
// and latched at mount: page load and time-range changes animate; the fresh
// mounts from entering/exiting the scenario switcher don't.

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
      background: 'var(--c-surface)',
      borderRadius: 'var(--r-card)',
      padding: '8px 16px',
      boxShadow: 'var(--shadow-md), var(--shadow-sm)',
      border: 'none',
      fontFamily: 'var(--font)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--c-ink-mute)', marginBottom: 4 }}>
        {formatMonthDisplay(point.month)}{isForecast ? ' · Est.' : ''}
      </div>
      <div style={{
        fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums',
        color: isForecast ? 'var(--c-ink-mute)' : 'var(--c-ink)',
      }}>
        {formatCurrency(value)}
      </div>
    </div>
  )
}

// Goal line colors: orange when a goal is set; with none set the placeholder
// uses the app's border color for the line and secondary ink for the CTA text
// (hex because SVG presentation attributes can't read CSS vars — matches
// --c-border / --c-ink-mute in index.css).
const GOAL_COLOR = '#ec652b'
const UNSET_LINE_COLOR = '#e3e4e8'
const UNSET_TEXT_COLOR = '#7c7f88'
const UNSET_DOT_COLOR = '#cbcccf' /* --color-mist — tertiary grey */

// Label for the goal reference line. The line is the single goal element on
// the dashboard — it shows the target, the time remaining, and (via onClick)
// opens the goal editor, so a transparent hit strip covers the line and label
// to make the whole thing tappable.
function GoalLabel({ viewBox, label, fill = GOAL_COLOR, onClick }) {
  if (!viewBox) return null
  const { x, y, width } = viewBox
  // Swallow pointer movement over the strip so the chart's tooltip / month
  // selection never fires from a tap meant for the goal line.
  const stop = onClick ? (e) => e.stopPropagation() : undefined
  return (
    <g
      onClick={onClick ? (e) => { e.stopPropagation(); onClick() } : undefined}
      onMouseMove={stop}
      onMouseDown={stop}
      onTouchStart={stop}
      onTouchMove={stop}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <text
        x={x + width - 4}
        y={y - 5}
        textAnchor="end"
        fill={fill}
        fontSize={10}
        fontWeight={500}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {label}
      </text>
      {onClick && <rect x={x} y={y - 24} width={width} height={36} fill="transparent" />}
    </g>
  )
}

function goalLineText(goal, goalEta) {
  return `Goal ${formatCompact(goal)}${goalEta ? ` · ${goalEta}` : ''}`
}

export default function NetWorthChart({ data, forecastData = [], selectedMonth, height = 160, goal = null, goalEta = null, onGoalClick = null, onSelectMonth, animateDraw = false, emptyPointCount = 12 }) {
  // ── Hooks (must run before any early return) ──
  // Build combined dataset with separate dataKeys for each segment.
  // Memoised on the data's content so hover / selected-month re-renders keep a
  // stable reference — that prevents recharts from replaying its draw animation
  // on every interaction (it only replays on mount, i.e. on time-range change).
  // Latch the draw decision at mount so later prop changes don't replay it.
  const animateRef = useRef(null)
  if (animateRef.current === null) animateRef.current = !!animateDraw
  const animate = animateRef.current

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

  // Dots stay hidden until the line has finished drawing, then fade in. With no
  // draw animation (later mounts) they're shown immediately.
  const [dotsVisible, setDotsVisible] = useState(!animate)
  useEffect(() => {
    if (!animate) return
    const t = setTimeout(() => setDotsVisible(true), 1200)
    return () => clearTimeout(t)
  }, [animate])

  // First-time / empty state: no trend to draw yet, but the chart frame still
  // renders — a flat baseline in the border color stands in for the (empty)
  // net worth line, and the goal line (or a CTA to create one) lives on the
  // chart from day one. Plain SVG since recharts needs data for a domain.
  if (!data || data.length < 2) {
    const hasGoal = goal != null
    const showGoalLine = hasGoal || !!onGoalClick
    const label = hasGoal ? goalLineText(goal, goalEta) : '+ Set a goal'
    const lineY = 26
    return (
      <div
        style={{ height, cursor: onGoalClick ? 'pointer' : undefined }}
        role={onGoalClick ? 'button' : undefined}
        tabIndex={onGoalClick ? 0 : undefined}
        aria-label={onGoalClick ? (hasGoal ? 'Edit goal' : 'Set a goal') : undefined}
        onClick={onGoalClick ?? undefined}
        onKeyDown={onGoalClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGoalClick() } } : undefined}
      >
        <svg width="100%" height={height} style={{ display: 'block' }}>
          {showGoalLine && (
            <>
              <text
                x="100%"
                dx={-4}
                y={lineY - 9}
                textAnchor="end"
                fill={hasGoal ? GOAL_COLOR : UNSET_TEXT_COLOR}
                fontSize={10}
                fontWeight={500}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {label}
              </text>
              <line
                x1={4} y1={lineY} x2="100%" y2={lineY}
                stroke={hasGoal ? GOAL_COLOR : UNSET_LINE_COLOR}
                strokeDasharray="5 3"
                strokeWidth={1.5}
              />
            </>
          )}
          {/* Flat "no data yet" net worth line along the bottom — drawn out
              with the same timing as the real chart, month dots fading in
              after (dotsVisible reuses that latch) */}
          <line
            className={animate ? 'nw-empty-draw' : undefined}
            pathLength={1}
            x1="1%" y1={height - 8} x2="99%" y2={height - 8}
            stroke={UNSET_LINE_COLOR}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          {dotsVisible && Array.from({ length: Math.max(2, emptyPointCount) }, (_, i) => (
            <circle
              key={i}
              className="nw-dot-appear"
              cx={`${1 + (i / (Math.max(2, emptyPointCount) - 1)) * 98}%`}
              cy={height - 8}
              r={3.5}
              fill={UNSET_DOT_COLOR}
            />
          ))}
        </svg>
      </div>
    )
  }

  const hasForecast = forecastData.length > 0
  const lastHistorical = data[data.length - 1]
  const endPoint = hasForecast ? forecastData[forecastData.length - 1] : lastHistorical
  const isUp = endPoint.netWorth >= data[0].netWorth
  const color = isUp ? '#167e6c' : '#dc2626'
  const gradId = isUp ? 'nwGradUp' : 'nwGradDown'
  const fGradId = isUp ? 'nwForecastUp' : 'nwForecastDown'

  // Y-axis domain — expand to include the goal line if above data range. With
  // no goal set, a placeholder line floats above the data as the set-a-goal CTA.
  const allValues = combined.map(d => d.historical ?? d.forecast).filter(v => v != null)
  const maxDataVal = allValues.length > 0 ? Math.max(...allValues) : 0
  const minDataVal = allValues.length > 0 ? Math.min(...allValues) : 0
  const placeholderGoalY = maxDataVal + Math.max((maxDataVal - minDataVal) * 0.3, Math.abs(maxDataVal) * 0.08, 1)
  const goalLineY = goal ?? (onGoalClick ? placeholderGoalY : null)
  const goalAbove = goalLineY != null && goalLineY > maxDataVal
  // A goal under the data range must also stretch the domain — outside it,
  // recharts discards the reference line and the goal becomes uneditable.
  const goalBelow = goalLineY != null && goalLineY < minDataVal
  const yDomain = goalAbove
    ? [minDataVal, Math.round(goalLineY * 1.12)]
    : goalBelow
      ? [Math.round(goalLineY - (maxDataVal - goalLineY) * 0.08), 'auto']
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
      <AreaChart
        data={combined}
        margin={{ top: 20, right: 4, left: 4, bottom: 4 }}
        onClick={(state) => {
          const month = state?.activePayload?.[0]?.payload?.month
          if (month && onSelectMonth) onSelectMonth(month)
        }}
        style={onSelectMonth ? { cursor: 'pointer' } : undefined}
      >
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
          cursor={{ stroke: 'rgba(17,26,74,0.15)', strokeWidth: 1, strokeDasharray: '4 3' }}
        />
        <Area
          type="monotone"
          dataKey="historical"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradId})`}
          dot={historicalDot}
          activeDot={{ r: 6, fill: color, stroke: 'white', strokeWidth: 2 }}
          isAnimationActive={animate}
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
            isAnimationActive={animate}
            animationBegin={0}
            animationDuration={1100}
            animationEasing="ease-out"
            connectNulls={false}
          />
        )}
        {/* Declared after the areas: SVG hit-tests in document order, so the
            goal line and its tap strip must come last to stay clickable when
            the trend line crosses above it */}
        {goalLineY != null && (
          <ReferenceLine
            y={goalLineY}
            stroke={goal != null ? GOAL_COLOR : UNSET_LINE_COLOR}
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={
              <GoalLabel
                label={goal != null ? goalLineText(goal, goalEta) : '+ Set a goal'}
                fill={goal != null ? GOAL_COLOR : UNSET_TEXT_COLOR}
                onClick={onGoalClick}
              />
            }
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}
