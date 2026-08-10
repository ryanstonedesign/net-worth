// One rhythm for the chart's time points.
//
// Two things have to agree about where a month sits: the brass markers cut into
// the trend line, and the vertical rules of the drafting plane behind it. The
// markers live inside recharts; the plane is a CSS background on a 100vw
// element that knows nothing about the data. Both derive their spacing here so
// they cannot drift apart.
//
// The spacing is a plain stride over the point indices — no forced extras. The
// previous version always drew the final point and always drew the selected
// one, which put a marker half a step from its neighbour whenever either landed
// off the stride, and that irregularity is what reads as sloppy on long ranges.

const DEFAULTS = {
  // Roughly a dozen sockets is as dense as the groove takes before they crowd.
  maxMarkers: 12,
  // Rules land on every Nth marker — the densest N that keeps the plot under
  // maxGridLines. On a short range that is every marker; on a long one it
  // opens up to every other, which is where the thinning actually matters.
  gridEveryNth: 1,
  maxGridLines: 6,
}

/**
 * @param {number} pointCount  how many time points the chart is plotting
 * @param {number} anchorIndex the index the rhythm is phased on — pass the last
 *   real month, so the present sits on the beat and the pattern stays put while
 *   the user scrubs (phasing on the selection would slide every marker instead)
 * @returns {{dotStride:number, gridStep:number, anchor:number,
 *            markerIndices:number[], gridIndices:number[], firstGridIndex:number}}
 */
export function markerPlan(pointCount, anchorIndex = 0, opts = {}) {
  const { maxMarkers, gridEveryNth, maxGridLines } = { ...DEFAULTS, ...opts }
  const n = Math.max(0, Math.floor(pointCount) || 0)
  if (n <= 0) {
    return { dotStride: 1, gridStep: 1, anchor: 0, markerIndices: [], gridIndices: [], firstGridIndex: 0 }
  }

  const dotStride = Math.max(1, Math.ceil(n / maxMarkers))
  const anchor = Number.isFinite(anchorIndex) && anchorIndex >= 0 && anchorIndex < n
    ? Math.floor(anchorIndex)
    : 0

  const markerIndices = []
  for (let i = anchor % dotStride; i < n; i += dotStride) markerIndices.push(i)

  let every = Math.max(1, gridEveryNth)
  while (Math.ceil(markerIndices.length / every) > maxGridLines) every += 1

  // Phase the rules on the anchor too, so one rule passes through the present.
  const anchorPos = (anchor - (anchor % dotStride)) / dotStride
  const gridIndices = []
  for (let p = anchorPos % every; p < markerIndices.length; p += every) {
    gridIndices.push(markerIndices[p])
  }

  return {
    dotStride,
    gridStep: dotStride * every,
    anchor,
    markerIndices,
    gridIndices,
    firstGridIndex: gridIndices.length > 0 ? gridIndices[0] : 0,
  }
}

/**
 * The markers a plan actually draws, given where the selection sits.
 *
 * The medallion marks a real month, so it has to render wherever the user
 * scrubbed to — including between two beats of the rhythm. Left alone it lands
 * a half-step from its neighbours and the three of them read as a clump, which
 * is the crowding the even stride exists to avoid. So the rhythm yields: any
 * marker closer than a full stride to the medallion drops out, leaving the
 * cursor at least one normal gap of clearance on each side. The pattern's
 * phase never moves — only this local clearance — so nothing slides while the
 * user drags across the plane, and the grid rules stay where they are.
 */
export function visibleMarkers({ markerIndices, dotStride }, selectedIndex) {
  if (!Number.isFinite(selectedIndex) || selectedIndex < 0) return markerIndices
  if (markerIndices.includes(selectedIndex)) return markerIndices
  return markerIndices.filter(i => Math.abs(i - selectedIndex) >= dotStride)
}
