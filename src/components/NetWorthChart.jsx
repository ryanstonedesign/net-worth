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
    <div className="nw-chart-tooltip">
      <div className="nw-chart-tooltip__label">
        {formatMonthDisplay(point.month)}{isForecast ? ' · Est.' : ''}
      </div>
      <div className={`nw-chart-tooltip__value${isForecast ? ' estimated' : ''}`}>
        {formatCurrency(value)}
      </div>
    </div>
  )
}

// SVG presentation attributes accept CSS custom properties, keeping all chart
// materials connected to the live theme rather than baking palette values into
// the component.
const HISTORY_COLOR = 'var(--chart-history)'
const PROJECTION_COLOR = 'var(--chart-projection)'
const GOAL_COLOR = 'var(--chart-goal)'
const UNSET_LINE_COLOR = 'var(--chart-grid)'
const UNSET_TEXT_COLOR = 'var(--chart-axis)'
const UNSET_DOT_COLOR = 'var(--color-line-strong)'
const MARKER_FILL = 'var(--chart-marker-fill)'
const CROSSHAIR_COLOR = 'var(--chart-crosshair)'

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
        fontFamily="var(--font-interface)"
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
  const reduceMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
  const animate = animateRef.current && !reduceMotion

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
  // draw animation (later mounts) they're shown immediately. The same latch
  // switches the recharts animation off entirely once the initial draw is done:
  // only mounts animate — interactions that reshape the series (selecting a
  // month that extends or shrinks the window) must not replay the draw.
  const [dotsVisible, setDotsVisible] = useState(!animate)
  useEffect(() => {
    if (!animate) return
    const t = setTimeout(() => setDotsVisible(true), 760)
    return () => clearTimeout(t)
  }, [animate])
  const drawAnimationActive = animate && !dotsVisible

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
                fontFamily="var(--font-interface)"
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
        <circle cx={cx} cy={cy} r={9} fill={HISTORY_COLOR} opacity={0.14} className="dot-pulse-ring" />
        <circle cx={cx} cy={cy} r={4.5} fill={HISTORY_COLOR} stroke={MARKER_FILL} strokeWidth={1.5} />
      </g>
    )
    if (!showDotAt(index)) return null
    return <circle className="nw-dot-appear" cx={cx} cy={cy} r={2.75} fill={HISTORY_COLOR} />
  }

  // Dot renderer for the forecast area (skip junction point — historical area owns it)
  const forecastDot = ({ cx, cy, payload, index }) => {
    if (!dotsVisible) return null
    if (payload.forecast == null || payload.historical != null || !isFinite(cx) || !isFinite(cy)) return null
    const isSelected = payload.month === selectedMonth
    if (isSelected) return (
      <g className="nw-dot-appear">
        <circle cx={cx} cy={cy} r={8} fill={PROJECTION_COLOR} opacity={0.14} className="dot-pulse-ring" />
        <circle cx={cx} cy={cy} r={4} fill={PROJECTION_COLOR} stroke={MARKER_FILL} strokeWidth={1.5} />
      </g>
    )
    if (!showDotAt(index)) return null
    return <circle className="nw-dot-appear" cx={cx} cy={cy} r={2.5} fill={PROJECTION_COLOR} opacity={0.72} />
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
            <stop offset="0%" stopColor={HISTORY_COLOR} stopOpacity={0.075} />
            <stop offset="100%" stopColor={HISTORY_COLOR} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={fGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PROJECTION_COLOR} stopOpacity={0.04} />
            <stop offset="100%" stopColor={PROJECTION_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis domain={yDomain} hide />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: CROSSHAIR_COLOR, strokeOpacity: 0.38, strokeWidth: 1, strokeDasharray: '3 3' }}
        />
        <Area
          type="monotone"
          dataKey="historical"
          stroke={HISTORY_COLOR}
          strokeWidth={2.25}
          fill={`url(#${gradId})`}
          dot={historicalDot}
          activeDot={{ r: 5, fill: HISTORY_COLOR, stroke: MARKER_FILL, strokeWidth: 2 }}
          isAnimationActive={drawAnimationActive}
          animationBegin={0}
          animationDuration={720}
          animationEasing="ease-out"
          connectNulls={false}
        />
        {hasForecast && (
          <Area
            type="monotone"
            dataKey="forecast"
            stroke={PROJECTION_COLOR}
            strokeWidth={1.75}
            strokeOpacity={0.9}
            strokeDasharray="5 4"
            fill={`url(#${fGradId})`}
            dot={forecastDot}
            activeDot={{ r: 4.5, fill: PROJECTION_COLOR, stroke: MARKER_FILL, strokeWidth: 2 }}
            isAnimationActive={drawAnimationActive}
            animationBegin={0}
            animationDuration={720}
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
