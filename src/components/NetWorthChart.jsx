import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { AreaChart, Area, Tooltip, ResponsiveContainer, ReferenceLine, YAxis, XAxis } from 'recharts'
import { formatMonthDisplay, formatCurrency, formatCompact } from '../utils'
import { markerPlan, visibleMarkers } from '../lib/chartTicks'

// The chart is engraved into the same stone plane the rest of the product is
// made of, rather than drawn on top of it. Three ideas carry that:
//
//   · every incised line is a dark groove with a lit lip below and to the
//     right of it, because the key light sits high and to the left — the same
//     source the surfaces, cards, and buttons are lit by. The drafting grid is
//     a plane behind the chart rather than a member of it, so it can run past
//     the chart to the screen edges;
//   · the trend is a forest inlay seated in a shallow channel: shaded along
//     its own top edge by the wall above it, with the stone below catching
//     light on the cut edge. Nothing dark is cast onto the stone;
//   · time points share one circular geometry and differ only in material.
//     Past is filled with brass, present is a larger medallion inside an
//     engraved focus ring, future is the same socket left empty — and the
//     projected path is the same channel at the same width, cut but not yet
//     filled.
//
// Whether the reveal plays is decided by the caller via `animateDraw` and
// latched at mount: page load and time-range changes animate; the fresh mounts
// from entering/exiting the scenario switcher don't.

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
// the component. Filter flood colours are the exception — those are literal,
// because flood-color resolves var() inconsistently across engines.
const HISTORY_COLOR = 'var(--chart-history)'
const GOAL_COLOR = 'var(--chart-goal)'
const GROOVE_COLOR = 'var(--chart-groove)'
const UNSET_LINE_COLOR = 'var(--chart-grid)'
const UNSET_TEXT_COLOR = 'var(--chart-axis)'

// One circular geometry for every time point; only the material changes.
const MARKER_R = 4.2
const SELECTED_SCALE = 1.5
const HOLO_SELECTED_SCALE = 1.28

// Filter and gradient ids are suffixed per instance so two charts on one page
// (dashboard and the scenario switcher mid-transition) cannot collide.
let uid = 0

function chartMaterials(ns, wash, shade, height, holographic = false) {
  return (
    <defs>
      {/* A groove: the source is the dark upper wall, the offset white copy is
          the lit lower lip. Every incised line in the chart uses this.

          Straight rules get the user-space variant. A horizontal line's
          bounding box has zero height, so a percentage filter region collapses
          with it and the browser renders nothing at all — which silently
          erased the grid and the goal line. */}
      <filter id={`${ns}-engrave`} x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0.7" dy="0.7" stdDeviation="0" floodColor="#ffffff" floodOpacity="0.62" />
      </filter>

      <filter id={`${ns}-engrave-rule`} filterUnits="userSpaceOnUse"
        x="-40" y="-40" width="3000" height="1400">
        <feDropShadow dx="0.7" dy="0.7" stdDeviation="0" floodColor="#ffffff" floodOpacity="0.6" />
      </filter>

      {/* An inlay seated in a channel. The depth is carried inside the stroke
          rather than cast onto the stone: the wall above shades the top of the
          inlay itself, which is what you see looking into a filled groove.
          Nothing is drawn outside the line — a drop shadow copies the entire
          stroke, so any outer offset reads as a second line running alongside
          rather than as depth.

          Shifting the alpha down and subtracting it from itself leaves the top
          sliver of the shape; blurring that and clipping it back to the source
          keeps the shading within the inlay.

          Below the line, a white copy sits behind the source so only a sliver
          shows past its lower right: that is the stone's own edge catching the
          light where the channel is cut, the same lip the grid and the empty
          sockets carry. It belongs outside the stroke because it is the stone,
          not the inlay. */}
      <filter id={`${ns}-inlay`} x="-40%" y="-40%" width="180%" height="180%">
        <feOffset in="SourceAlpha" dx="0" dy="1.1" result="shifted" />
        <feComposite in="SourceAlpha" in2="shifted" operator="out" result="topEdge" />
        <feGaussianBlur in="topEdge" stdDeviation="0.55" result="topSoft" />
        <feComposite in="topSoft" in2="SourceAlpha" operator="in" result="topClipped" />
        <feFlood floodColor={shade} floodOpacity="0.62" result="shade" />
        <feComposite in="shade" in2="topClipped" operator="in" result="innerShade" />

        <feOffset in="SourceAlpha" dx="0.45" dy="0.6" result="lipShift" />
        <feFlood floodColor="#ffffff" floodOpacity="0.5" result="lipColor" />
        <feComposite in="lipColor" in2="lipShift" operator="in" result="lip" />

        <feMerge>
          <feMergeNode in="lip" />
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="innerShade" />
        </feMerge>
      </filter>

      {/* The bronze variant's metal: the same brushed-brass palette the
          completed months are made of, laid across the plot in user space so
          the trend and the months sample one continuous ramp. In bounding-box
          units the gradient would restart inside every dot, which is what
          makes a marker read as a bead sitting on the line. */}
      <linearGradient id={`${ns}-metal`} gradientUnits="userSpaceOnUse"
        x1="0" y1="0" x2="0" y2={height}>
        <stop offset="0%" stopColor="var(--chart-brass-light)" />
        <stop offset="52%" stopColor="var(--chart-brass)" />
        <stop offset="100%" stopColor="var(--chart-brass-dark)" />
      </linearGradient>

      {/* Metal filling the channel, with a crown of its own. The brass months
          read as dimensional because they carry a lit face and a shadowed one
          across the key light's axis; the trend is the same material, so it is
          embossed the same way — highlight banked along its top-left edge,
          shadow where it turns away at the bottom-right. Both are clipped back
          inside the stroke, so the dimension belongs to the metal rather than
          being cast onto the stone. The stone's own cut edge still catches
          light below it. */}
      <filter id={`${ns}-inlay-metal`} x="-40%" y="-40%" width="180%" height="180%">
        <feOffset in="SourceAlpha" dx="0.85" dy="0.95" result="mDR" />
        <feComposite in="SourceAlpha" in2="mDR" operator="out" result="mTL" />
        <feGaussianBlur in="mTL" stdDeviation="0.5" result="mTLs" />
        <feComposite in="mTLs" in2="SourceAlpha" operator="in" result="mTLc" />
        <feFlood floodColor="#fff4d8" floodOpacity="0.8" result="mHiC" />
        <feComposite in="mHiC" in2="mTLc" operator="in" result="mHi" />

        <feOffset in="SourceAlpha" dx="-0.85" dy="-0.95" result="mUL" />
        <feComposite in="SourceAlpha" in2="mUL" operator="out" result="mBR" />
        <feGaussianBlur in="mBR" stdDeviation="0.6" result="mBRs" />
        <feComposite in="mBRs" in2="SourceAlpha" operator="in" result="mBRc" />
        <feFlood floodColor="#4a3410" floodOpacity="0.6" result="mLoC" />
        <feComposite in="mLoC" in2="mBRc" operator="in" result="mLo" />

        <feOffset in="SourceAlpha" dx="0.45" dy="0.65" result="mLipShift" />
        <feFlood floodColor="#ffffff" floodOpacity="0.45" result="mLipColor" />
        <feComposite in="mLipColor" in2="mLipShift" operator="in" result="mLip" />

        <feMerge>
          <feMergeNode in="mLip" />
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="mLo" />
          <feMergeNode in="mHi" />
        </feMerge>
      </filter>

      {/* Brushed brass, lit face to shadowed face along the same axis. */}
      <linearGradient id={`${ns}-brass`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--chart-brass-light)" />
        <stop offset="46%" stopColor="var(--chart-brass)" />
        <stop offset="100%" stopColor="var(--chart-brass-dark)" />
      </linearGradient>

      {/* An empty socket: stone floor, darkest where the near wall shades it. */}
      <radialGradient id={`${ns}-socket`} cx="34%" cy="30%" r="84%">
        <stop offset="0%" stopColor="rgba(69, 61, 49, 0.26)" />
        <stop offset="100%" stopColor="rgba(69, 61, 49, 0.07)" />
      </radialGradient>

      <linearGradient id={`${ns}-fill`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={wash} stopOpacity={0.07} />
        <stop offset="100%" stopColor={wash} stopOpacity={0} />
      </linearGradient>

      {holographic && (
        <>
          {/* An emerald gauze below an upward historical series. The area
              shape itself supplies the hard cutoff at the current month;
              the vertical fade softens downward without bleeding forward. */}
          <linearGradient id={`${ns}-growth-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.62} />
            <stop offset="20%" stopColor="#34d399" stopOpacity={0.42} />
            <stop offset="60%" stopColor="#6ee7b7" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#a7f3d0" stopOpacity={0} />
          </linearGradient>
        </>
      )}
    </defs>
  )
}

// Past: brass fitted flush into a prepared socket.
function BrassInlay({ cx, cy, ns, r = MARKER_R, className, style }) {
  return (
    <g className={className} style={style}>
      <circle cx={cx} cy={cy} r={r + 0.55} fill="none" stroke="var(--chart-brass-rim)" strokeWidth={0.85}
        filter={`url(#${ns}-engrave)`} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${ns}-brass)`} />
      {/* Machined rim: bright where the light lands, dark where it leaves. */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy - r}`}
        fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={0.8} strokeLinecap="round"
      />
      <path
        d={`M ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy + r}`}
        fill="none" stroke="rgba(74,58,28,0.4)" strokeWidth={0.8} strokeLinecap="round"
      />
    </g>
  )
}

// Bronze variant: a completed month is the line. Same fill, no rim, no socket
// — recharts puts the curve and the dots inside one layer and the inlay filter
// is applied to that layer, so an unrimmed circle of the same colour merges
// into the channel instead of reading as a marker laid over it.
function BronzeNode({ cx, cy, ns, r = MARKER_R, className, style }) {
  return (
    <circle className={className} style={style} cx={cx} cy={cy} r={r}
      fill={`url(#${ns}-metal)`} filter={`url(#${ns}-inlay-metal)`} />
  )
}

// Future: the same socket, prepared and left empty.
function EmptySocket({ cx, cy, ns, r = MARKER_R, className, style }) {
  return (
    <g className={className} style={style}>
      <circle cx={cx} cy={cy} r={r} fill="var(--chart-marker-fill)" />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${ns}-socket)`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={GROOVE_COLOR} strokeWidth={0.9}
        filter={`url(#${ns}-engrave)`} />
    </g>
  )
}

// Holographic future months are possibilities, not missing data. A solid
// violet bead keeps them subordinate to teal history while remaining clearly
// intentional and tappable.
function FutureNode({ cx, cy, r = MARKER_R, className, style }) {
  return (
    <g className={`nw-future-node${className ? ` ${className}` : ''}`} style={style}>
      <circle cx={cx} cy={cy} r={r} fill="var(--chart-projection)"
        stroke="rgba(255,255,255,0.78)" strokeWidth={0.75} />
      <circle cx={cx - r * 0.28} cy={cy - r * 0.3} r={Math.max(0.75, r * 0.2)}
        fill="rgba(255,255,255,0.66)" />
    </g>
  )
}

// Present: a larger medallion, seated inside a concentric engraving.
function Medallion({ cx, cy, ns, filled, animate, bronze, holographic = false }) {
  const r = MARKER_R * (holographic ? HOLO_SELECTED_SCALE : SELECTED_SCALE)
  return (
    <g className={animate ? 'nw-medallion' : undefined} style={{ transformOrigin: `${cx}px ${cy}px` }}>
      {holographic && (
        <>
          <circle className="nw-selected-aura nw-selected-aura--outer"
            cx={cx} cy={cy} r={r + 8} fill="rgba(125,108,255,0.08)" />
          <circle className="nw-selected-aura nw-selected-aura--inner"
            cx={cx} cy={cy} r={r + 3.5} fill="rgba(67,200,255,0.11)"
            stroke="rgba(255,255,255,0.7)" strokeWidth={0.6} />
        </>
      )}
      {(filled || !holographic) && (
        <circle cx={cx} cy={cy} r={r + 5.5} fill="none" stroke={GROOVE_COLOR} strokeWidth={0.75}
          strokeOpacity={0.62} filter={`url(#${ns}-engrave)`} />
      )}
      {!filled
        ? holographic
          ? <FutureNode cx={cx} cy={cy} r={r} />
          : <EmptySocket cx={cx} cy={cy} ns={ns} r={r} />
        : bronze
          ? <BronzeNode cx={cx} cy={cy} ns={ns} r={r} />
          : <BrassInlay cx={cx} cy={cy} ns={ns} r={r} />}
    </g>
  )
}

// Label for the goal reference line. The line is the single goal element on
// the dashboard — it shows the target, the time remaining, and (via onClick)
// opens the goal editor, so a transparent hit strip covers the line and label
// to make the whole thing tappable.
function GoalLabel({ viewBox, label, fill = UNSET_TEXT_COLOR, onClick }) {
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
        y={y - 6}
        textAnchor="end"
        fill={fill}
        fontSize={10}
        fontWeight={500}
        letterSpacing="0.02em"
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

export default function NetWorthChart({ data, forecastData = [], selectedMonth, height = 160, goal = null, goalEta = null, onGoalClick = null, onSelectMonth, animateDraw = false, emptyPointCount = 12, colorVariant = 'multicolor' }) {
  // ── Hooks (must run before any early return) ──
  const nsRef = useRef(null)
  if (nsRef.current === null) nsRef.current = `nw${++uid}`
  const ns = nsRef.current
  const bronze = colorVariant === 'bronze'
  const trendColor = bronze ? `url(#${ns}-metal)` : HISTORY_COLOR
  // The wash under the trend has to be a flat colour: a gradient stop cannot
  // reference another paint server.
  const washColor = bronze ? 'var(--chart-brass-dark)' : HISTORY_COLOR

  const animateRef = useRef(null)
  if (animateRef.current === null) animateRef.current = !!animateDraw
  const reduceMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
  // Holographic owns the chart entrance at the well level. Drawing the line,
  // grid, and sockets again underneath that settle created two competing
  // reveals, so the material theme renders the complete chart immediately.
  const holographicTheme = typeof document !== 'undefined'
    && document.documentElement.dataset.theme === 'holographic'
  const animate = animateRef.current && !reduceMotion && !holographicTheme

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

  // The reveal is staged so the chart reads as being made rather than faded in:
  // the groove draws first, then brass settles into the prepared sockets, then
  // the empty sockets and the projection appear. `markersIn` gates the whole
  // marker layer; the per-marker stagger is CSS animation-delay from there.
  const [markersIn, setMarkersIn] = useState(!animate)
  useEffect(() => {
    if (!animate) return
    const t = setTimeout(() => setMarkersIn(true), 700)
    return () => clearTimeout(t)
  }, [animate])
  // The settle animation is a one-shot: recharts re-renders every dot on each
  // hover and selection, and without this latch each one would replay it.
  const [settled, setSettled] = useState(!animate)
  useEffect(() => {
    if (!markersIn || settled) return
    const t = setTimeout(() => setSettled(true), 900)
    return () => clearTimeout(t)
  }, [markersIn, settled])
  const drawAnimationActive = animate && !markersIn

  // Horizontal scrubbing: holding and dragging across the plane moves the
  // active month. A tap still selects, since a press-release with no movement
  // ends in the same handler.
  const scrubbing = useRef(false)
  const selectFrom = useCallback((state) => {
    const month = state?.activePayload?.[0]?.payload?.month
    if (month && onSelectMonth) onSelectMonth(month)
  }, [onSelectMonth])
  useEffect(() => {
    const end = () => { scrubbing.current = false }
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [])

  // First-time / empty state: no trend to draw yet, but the plane still shows
  // its engraving — a flat baseline groove stands in for the (empty) net worth
  // line, with prepared sockets along it, and the goal line (or a CTA to create
  // one) is present from day one. Plain SVG since recharts needs a domain.
  if (!data || data.length < 2) {
    const hasGoal = goal != null
    const showGoalLine = hasGoal || !!onGoalClick
    const label = hasGoal ? goalLineText(goal, goalEta) : '+ Set a goal'
    const lineY = 26
    const count = Math.max(2, emptyPointCount)
    return (
      <div
        style={{ height, cursor: onGoalClick ? 'pointer' : undefined }}
        role={onGoalClick ? 'button' : undefined}
        tabIndex={onGoalClick ? 0 : undefined}
        aria-label={onGoalClick ? (hasGoal ? 'Edit goal' : 'Set a goal') : undefined}
        onClick={onGoalClick ?? undefined}
        onKeyDown={onGoalClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGoalClick() } } : undefined}
      >
        <svg width="100%" height={height} style={{ display: 'block', overflow: 'visible' }}>
          {chartMaterials(ns, washColor, '#08170f', height)}
          {showGoalLine && (
            <>
              <text
                x="100%"
                dx={-4}
                y={lineY - 10}
                textAnchor="end"
                fill={UNSET_TEXT_COLOR}
                fontSize={10}
                fontWeight={500}
                fontFamily="var(--font-interface)"
              >
                {label}
              </text>
              <line
                x1={4} y1={lineY} x2="100%" y2={lineY}
                stroke={hasGoal ? GOAL_COLOR : UNSET_LINE_COLOR}
                strokeWidth={0.9}
                filter={`url(#${ns}-engrave-rule)`}
              />
            </>
          )}
          <line
            className={animate ? 'nw-empty-draw' : undefined}
            pathLength={1}
            x1="1%" y1={height - 8} x2="99%" y2={height - 8}
            stroke={GROOVE_COLOR}
            strokeWidth={1.4}
            strokeLinecap="round"
            filter={`url(#${ns}-engrave-rule)`}
          />
          {markersIn && Array.from({ length: count }, (_, i) => (
            <EmptySocket
              key={i}
              ns={ns}
              cx={`${1 + (i / (count - 1)) * 98}%`}
              cy={height - 8}
              className={settled ? undefined : 'nw-marker-settle'}
              style={settled ? undefined : { animationDelay: `${i * 34}ms` }}
            />
          ))}
        </svg>
      </div>
    )
  }

  const hasForecast = forecastData.length > 0
  const lastHistorical = data[data.length - 1]
  const positiveGrowth = lastHistorical.netWorth > data[0].netWorth

  // Y-axis domain — expand to include the goal line if above data range. With
  // no goal set, a placeholder line floats above the data as the set-a-goal CTA.
  const allValues = combined.map(d => d.historical ?? d.forecast).filter(v => v != null)
  const maxDataVal = allValues.length > 0 ? Math.max(...allValues) : 0
  const minDataVal = allValues.length > 0 ? Math.min(...allValues) : 0
  const placeholderGoalY = maxDataVal + Math.max((maxDataVal - minDataVal) * 0.3, Math.abs(maxDataVal) * 0.08, 1)
  const goalLineY = goal ?? (onGoalClick ? placeholderGoalY : null)
  // Pad against the data's own span, not against the absolute value. Scaling
  // headroom by the value pushed the trend into the bottom third of the plot
  // whenever a goal sat above it — at these magnitudes 12% of the value is far
  // more than the whole span — and pinning the floor to minDataVal left the
  // lowest marker half off the bottom edge and awkward to hit.
  const span = Math.max(maxDataVal - minDataVal, Math.abs(maxDataVal) * 0.02, 1)
  const pad = span * 0.16
  let lo = minDataVal - pad
  let hi = maxDataVal + pad
  // A goal outside the data range still has to be inside the domain — outside
  // it, recharts discards the reference line and the goal becomes uneditable.
  if (goalLineY != null) {
    if (goalLineY > hi) hi = goalLineY + span * 0.1
    else if (goalLineY < lo) lo = goalLineY - span * 0.1
  }
  const yDomain = [Math.round(lo), Math.round(hi)]

  // Thin the markers on long ranges so the sockets don't crowd the groove. The
  // line itself stays continuous — only the time points are sampled. Nothing is
  // forced into the pattern: the stride is phased on the last real month, which
  // keeps the gaps identical end to end and holds the sockets still while the
  // user scrubs. The selected medallion still draws wherever it lands; when
  // that is off the beat, the markers around it step aside rather than crowd
  // it — see visibleMarkers.
  const markerSet = new Set(visibleMarkers(
    markerPlan(combined.length, data.length - 1),
    combined.findIndex(d => d.month === selectedMonth),
  ))
  const showDotAt = (index) => markerSet.has(index)

  const settleProps = (index) => settled
    ? {}
    : { className: 'nw-marker-settle', style: { animationDelay: `${Math.min(index, 14) * 38}ms` } }

  // Past months: brass. The selected one becomes the medallion.
  const historicalDot = ({ cx, cy, payload, index }) => {
    if (!markersIn) return null
    if (payload.historical == null || !isFinite(cx) || !isFinite(cy)) return null
    if (payload.month === selectedMonth) {
      return <Medallion key={payload.month} cx={cx} cy={cy} ns={ns} filled animate={settled} bronze={bronze} holographic={holographicTheme} />
    }
    if (!showDotAt(index)) return null
    return bronze
      ? <BronzeNode key={payload.month} cx={cx} cy={cy} ns={ns} {...settleProps(index)} />
      : <BrassInlay key={payload.month} cx={cx} cy={cy} ns={ns} {...settleProps(index)} />
  }

  // Future months: the same socket, left empty. The junction point belongs to
  // the historical series, which has already filled it.
  const forecastDot = ({ cx, cy, payload, index }) => {
    if (!markersIn) return null
    if (payload.forecast == null || payload.historical != null || !isFinite(cx) || !isFinite(cy)) return null
    if (payload.month === selectedMonth) {
      return <Medallion key={payload.month} cx={cx} cy={cy} ns={ns} filled={false} animate={settled} bronze={bronze} holographic={holographicTheme} />
    }
    if (!showDotAt(index)) return null
    return holographicTheme
      ? <FutureNode key={payload.month} cx={cx} cy={cy} {...settleProps(index)} />
      : <EmptySocket key={payload.month} cx={cx} cy={cy} ns={ns} {...settleProps(index)} />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={combined}
        margin={{ top: 20, right: 14, left: 14, bottom: 6 }}
        onClick={selectFrom}
        onMouseDown={(state) => { scrubbing.current = true; selectFrom(state) }}
        onMouseMove={(state) => { if (scrubbing.current) selectFrom(state) }}
        onTouchStart={() => { scrubbing.current = true }}
        onTouchMove={(state) => { if (scrubbing.current) selectFrom(state) }}
        style={onSelectMonth ? { cursor: 'pointer', touchAction: 'pan-y' } : undefined}
      >
        {chartMaterials(ns, washColor, '#08170f', height, holographicTheme)}
        <YAxis domain={yDomain} hide />
        <XAxis dataKey="month" hide />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: GROOVE_COLOR, strokeOpacity: 0.5, strokeWidth: 1 }}
        />
        {holographicTheme && positiveGrowth && (
          <Area
            type="monotone"
            dataKey="historical"
            stroke="none"
            fill={`url(#${ns}-growth-fill)`}
            dot={false}
            activeDot={false}
            className="nw-positive-growth-wash"
            isAnimationActive={false}
            baseValue={yDomain[0]}
            connectNulls={false}
          />
        )}
        {/* Forecast is declared first so the realised history sits over it at
            the junction, keeping the projection visually subordinate. */}
        {hasForecast && (
          <Area
            type="monotone"
            dataKey="forecast"
            stroke={holographicTheme ? 'var(--violet-500)' : GROOVE_COLOR}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeDasharray={holographicTheme ? '2 7' : undefined}
            fill="none"
            dot={forecastDot}
            activeDot={false}
            filter={holographicTheme ? undefined : `url(#${ns}-engrave-rule)`}
            className={`nw-forecast-line${animate ? ' nw-forecast-reveal' : ''}`}
            isAnimationActive={drawAnimationActive}
            animationBegin={140}
            animationDuration={760}
            animationEasing="ease-out"
            connectNulls={false}
          />
        )}
        <Area
          type="monotone"
          dataKey="historical"
          stroke={trendColor}
          strokeWidth={2.4}
          strokeLinecap="round"
          fill={`url(#${ns}-fill)`}
          dot={historicalDot}
          activeDot={false}
          filter={`url(#${ns}-${bronze ? 'inlay-metal' : 'inlay'})`}
          isAnimationActive={drawAnimationActive}
          animationBegin={0}
          animationDuration={720}
          animationEasing="ease-out"
          connectNulls={false}
        />
        {/* Declared after the areas: SVG hit-tests in document order, so the
            goal line and its tap strip must come last to stay clickable when
            the trend line crosses above it */}
        {goalLineY != null && (
          <ReferenceLine
            y={goalLineY}
            stroke={goal != null ? GOAL_COLOR : UNSET_LINE_COLOR}
            strokeWidth={0.9}
            filter={`url(#${ns}-engrave-rule)`}
            label={
              <GoalLabel
                label={goal != null ? goalLineText(goal, goalEta) : '+ Set a goal'}
                fill={UNSET_TEXT_COLOR}
                onClick={onGoalClick}
              />
            }
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}
