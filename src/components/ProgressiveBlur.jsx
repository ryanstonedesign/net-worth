// Progressive blur for the scrims at the top and bottom of the app. A single
// backdrop blur faded out with a mask only fades its opacity — the blur is
// just as strong wherever it shows. Here the blur itself ramps: a stack of
// layers, each blurring twice as hard as the last and masked to its own band,
// so the content goes from sharp to fully dissolved toward `edge`. The tint
// on top carries the white fade.
//
// The container must not carry a mask, filter or backdrop-filter of its own:
// any of those makes it the backdrop root and the layers would blur nothing.
const BLURS = [0.5, 1, 2, 4, 8, 16]
const STEP = 100 / (BLURS.length + 1)

function bandMask(i, edge) {
  const dir = edge === 'top' ? 'to top' : 'to bottom'
  const at = (n) => `${(n * STEP).toFixed(2)}%`
  const last = i === BLURS.length - 1
  return last
    ? `linear-gradient(${dir}, transparent ${at(i)}, #000 ${at(i + 1)})`
    : `linear-gradient(${dir}, transparent ${at(i)}, #000 ${at(i + 1)}, #000 ${at(i + 2)}, transparent ${at(i + 3)})`
}

export default function ProgressiveBlur({ edge = 'top', className = '' }) {
  return (
    <div className={`progressive-blur progressive-blur--${edge} ${className}`.trim()} aria-hidden="true">
      {BLURS.map((blur, i) => {
        const mask = bandMask(i, edge)
        return (
          <div
            key={blur}
            className="progressive-blur__layer"
            style={{
              WebkitBackdropFilter: `blur(${blur}px)`,
              backdropFilter: `blur(${blur}px)`,
              WebkitMaskImage: mask,
              maskImage: mask,
            }}
          />
        )
      })}
      <div className="progressive-blur__tint" />
    </div>
  )
}
