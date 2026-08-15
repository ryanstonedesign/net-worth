import { getRefraction, subscribeRefraction } from './refraction'

/* Procedural pearlescent pane for the Holographic theme.
 *
 * The picture is light passing through a sheet of frosted iridescent glass:
 * a nearly-white ground, a handful of very large curved caustic folds running
 * off every edge, and thin dispersed colour riding the folds. Nothing here is
 * a moving gradient — each fold is a distance field with a caustic falloff,
 * the colour comes from sampling that field at a per-channel offset the way a
 * prism splits a wavefront, and the whole pane is bent by a smooth refraction
 * field before any of it is evaluated.
 *
 * Everything moves on its own period, and the periods are mutually
 * incommensurate to five decimal places, so the composite does not return to
 * a previous state inside any session — there is no loop to notice.
 */

const VERTEX_SHADER = `
attribute vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2  uResolution;
uniform float uTime;

/* Prototype dials (lib/refraction). Each is a multiplier on the constants
   below, so 1.0 is the tuned design and the numbers in this file stay the
   thing being adjusted rather than being replaced. Speed is not here: it
   scales the clock on the JS side, so moving it changes the rate from now on
   instead of rescaling the phase already accumulated and jumping the pane. */
uniform float uVibrancy;
uniform float uThickness;
uniform float uTravel;

/* Iridescent tints. Cool for most of the cycle; the warm pearl is held out of
   the ramp and mixed in separately so it surfaces occasionally rather than on
   every pass, the way a warm glint only appears at certain angles. */
const vec3 TINT_CYAN   = vec3(0.52, 0.98, 0.96);
const vec3 TINT_ICE    = vec3(0.62, 0.85, 1.00);
const vec3 TINT_VIOLET = vec3(0.78, 0.72, 1.00);
const vec3 TINT_PINK   = vec3(1.00, 0.79, 0.92);
const vec3 TINT_PEARL  = vec3(1.00, 0.93, 0.82);

mat2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

/* Cyclic four-stop ramp. The interpolant is smoothstepped so the ramp is
   continuous in its first derivative at every stop — a linear mix leaves a
   crease at each one, and a crease across a fold this wide reads as a
   rainbow band. */
vec3 iridescence(float phase, float warm) {
  float t = fract(phase) * 4.0;
  float i = floor(t);
  float f = smoothstep(0.0, 1.0, t - i);
  vec3 a = i < 0.5 ? TINT_CYAN : (i < 1.5 ? TINT_ICE    : (i < 2.5 ? TINT_VIOLET : TINT_PINK));
  vec3 b = i < 0.5 ? TINT_ICE  : (i < 1.5 ? TINT_VIOLET : (i < 2.5 ? TINT_PINK   : TINT_CYAN));
  return mix(mix(a, b, f), TINT_PEARL, warm);
}

/* Refraction through an uneven pane: the path bends by the local gradient of a
   slowly evolving thickness field. Two octaves is the whole budget — a third
   starts to read as noise cloud rather than glass.

   The two octaves run at very different rates on purpose. The coarse one is
   the slow swell of the pane, minutes per cycle; the fine one travels a few
   times faster, and it is what keeps the field continuously in motion instead
   of holding a shape between the slow beats. */
vec2 bend(vec2 p, float t) {
  return p + vec2(
    sin(p.y * 1.19 + t * 0.01253) + 0.42 * sin(p.y * 2.31 - t * 0.04871),
    cos(p.x * 1.07 - t * 0.01031) + 0.42 * cos(p.x * 2.53 + t * 0.04139)
  ) * 0.19;
}

/* A caustic is a fold in the wavefront, not a blurred line: a narrow bright
   core sitting inside a much wider shoulder. The two widths are deliberately
   far apart — tie them together and the core dissolves into the shoulder, and
   every fold overlaps every other into one flat wash. */
const float HALO_SPREAD = 3.6;

/* Dispersion belongs to the sharp edge of the fold. By the time light has
   scattered out into the shoulder the wavelengths have mixed back together,
   so only the core is split per channel — splitting the shoulder as well is
   what smears a spectrum across the whole band and reads as a rainbow. */
vec3 causticLight(float d, float w, float spread) {
  float mid = exp(-abs(d) / w);
  vec3 split = vec3(
    exp(-abs(d - spread) / w),
    mid,
    exp(-abs(d + spread) / w)
  );
  /* Held back most of the way to the achromatic core. At full strength the
     flanks separate into saturated red and cyan lines and the fold reads as a
     little rainbow; this leaves the shift as a fringe on an otherwise white
     filament, which is what the glass actually does. */
  vec3 core = mix(vec3(mid), split, 0.52);

  float h = w * HALO_SPREAD;
  float halo = exp(-(d * d) / (h * h));
  return core * 0.70 + vec3(halo * 0.30);
}

/* Both are multiples of a fold's own drift, so each fold keeps its own periods
   and the set stays mutually incommensurate across folds. The ratios are
   deliberately not whole numbers: at 9.0 the ripple would close on the arc
   every ninth pass and the fold would repeat on the arc's period. */
const float BREATHE_RATIO = 4.73;
const float RIPPLE_RATIO = 9.19;

/* One caustic fold: a curved ridge, the distance to it, and the caustic
   falloff of that distance. The ridge is three sines of unrelated period, so
   the curve is asymmetric and never straightens out as the phases drift. */
vec3 fold(
  vec2 p, float t, float angle, float drift, float bowFreq, float bow,
  float width, float offset, float tintPhase, float tintRate, float amp
) {
  vec2 q = rot(angle) * p;
  float ph = t * drift;

  /* The arc opens and closes on its own cycle, so the fold is never sitting at
     one fixed curvature waiting for its phase to come round. */
  float sweep = bow * uTravel * (1.0 + 0.25 * sin(t * drift * BREATHE_RATIO + tintPhase * 4.1));

  float ridge = sin(q.x * bowFreq + ph) * sweep
              + sin(q.x * bowFreq * 0.53 - ph * 0.79) * sweep * 0.52
              + sin(q.x * bowFreq * 0.23 + ph * 0.37) * sweep * 0.86;

  /* A ripple travelling along the fold: a fraction of the arc's amplitude at
     many times its phase velocity. The arc alone only rocks, and a rock this
     slow reads as a rigid thing being moved rather than as light — this is
     what keeps the curve moving through itself while the arc drifts. */
  float rp = t * drift * RIPPLE_RATIO;
  ridge += sin(q.x * bowFreq * 2.7 - rp) * sweep * 0.17
         + sin(q.x * bowFreq * 4.3 + rp * 0.63) * sweep * 0.085;

  float d = q.y - offset - ridge;

  float w = width * uThickness;
  vec3 light = causticLight(d, w, w * 0.32);

  float warm = smoothstep(0.88, 1.0, sin(t * tintRate * 0.37 + tintPhase * 5.7));

  /* Vibrancy moves colour and presence together. Below 1 the tint pales toward
     plain white light and the fold dims, but only to half — it keeps its shape
     rather than vanishing, so the dial reads as "less colour", not "less pane". */
  vec3 tint = mix(vec3(1.0), iridescence(tintPhase + t * tintRate, warm), uVibrancy);
  return light * tint * amp * mix(0.5, 1.0, min(uVibrancy, 1.0));
}

void main() {
  vec2 frag = gl_FragCoord.xy;

  /* Normalised on the short edge, so the folds keep their proportions and run
     well past the long edge instead of being squeezed to fit it. */
  vec2 p = (frag * 2.0 - uResolution) / min(uResolution.x, uResolution.y);
  float t = uTime;

  /* Folds are evaluated in a vertically compressed copy of the pane. On a
     phone the tall axis is more than twice the short one, and at 1:1 the folds
     tile the height instead of sweeping it — squashing y makes each one a
     single large curve that leaves the frame on both sides, which is what the
     structures are supposed to be. */
  vec2 f = vec2(p.x, p.y * 0.62);

  /* The pane tilts a few degrees over about ten minutes. This is the sun
     changing angle, not the glass moving: every fold below inherits it, so
     nothing animates on an axis of its own. */
  vec2 w = bend(rot(0.09 * sin(t * 0.01039)) * f, t);

  vec3 light = vec3(0.0);
  /* Angle, drift, bow frequency, bow, core width, offset, tint phase, tint
     rate, amplitude. Bow frequencies sit near a half cycle across the pane, so
     each fold is one gentle arc rather than a wave; the angles are spread so
     the arcs cross each other instead of stacking into a grain. */
  light += fold(w, t,  0.21, 0.00787, 1.32, 0.40, 0.09, -1.02, 0.00, 0.00411, 1.20);
  light += fold(w, t, -0.74, 0.00541, 1.07, 0.52, 0.15, -0.34, 0.37, 0.00271, 1.08);
  light += fold(w, t,  0.58, 0.00997, 1.63, 0.34, 0.07,  0.28, 0.62, 0.00533, 0.96);
  light += fold(w, t, -1.19, 0.00673, 1.19, 0.46, 0.12,  0.86, 0.81, 0.00193, 1.14);
  light += fold(w, t,  1.42, 0.00439, 0.91, 0.61, 0.19,  1.42, 0.14, 0.00347, 0.90);

  /* The card stack sits in the middle of the screen, so light is pulled down
     over a tall ellipse there. It is attenuated rather than cut: the folds
     still cross the middle, they just stop competing with the numbers. */
  vec2 c = vec2(p.x * 0.95, p.y * 0.62);
  light *= mix(0.70, 1.0, smoothstep(0.0, 1.0, dot(c, c)));

  /* Nearly white, a half step cool. The undertone deepens toward the edges so
     the pane reads as curved glass rather than flat paper.

     The exact level is what governs how legible the folds are, because they
     compose by screen: a fold can only ever lift a pixel by (1 - base), so a
     ground at 0.93 leaves seven percent of range for the entire effect no
     matter how hard the folds are driven. Dropping it a few points is worth
     far more contrast than raising amplitude, and costs nothing in calm. */
  float edge = smoothstep(0.15, 1.75, length(p * vec2(1.0, 0.62)));
  vec3 base = mix(vec3(0.898, 0.905, 0.926), vec3(0.802, 0.816, 0.864), edge);

  /* Exposure rather than a clamp: where folds pile up, a clamp flattens the
     overlap into a plate of pure white with a visible edge, while this rolls
     off asymptotically and keeps the crossing readable. */
  vec3 lit = 1.0 - exp(-light);

  /* Screen, so the folds only ever add light and can never darken the ground
     where two of them cross. */
  vec3 col = 1.0 - (1.0 - base) * (1.0 - lit);

  /* A broad sheen crossing the pane on its own much longer period, well below
     the threshold where it reads as a separate element. */
  col += (sin(dot(p, vec2(0.62, 0.38)) * 1.1 + t * 0.00913)) * 0.012;

  /* Eight-bit output over gradients this shallow bands into visible steps. A
     static sub-LSB dither breaks them up; it is deliberately not animated,
     since an animated one shimmers on a surface this flat. */
  float n = fract(sin(dot(frag, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  col += n * (1.4 / 255.0);

  gl_FragColor = vec4(col, 1.0);
}
`

/* The image is all low-frequency light, so it survives being rendered well
   below device resolution and bilinearly stretched — which is free extra
   diffusion, and keeps a full-screen fragment shader cheap on a phone. */
const MAX_PIXELS = 480000
const TARGET_FPS = 30
const FRAME_INTERVAL = 1000 / TARGET_FPS
/* Time to freeze at when motion is not wanted: far enough in that the folds
   have drifted into an interesting arrangement rather than their t=0 one. */
const STILL_TIME = 137.0

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function link(gl) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs)
    if (fs) gl.deleteShader(fs)
    return null
  }
  const program = gl.createProgram()
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    return null
  }
  return program
}

/* Buffer size for a viewport, clamped so the shader never runs more than
   MAX_PIXELS fragments however large or dense the display is. */
export function bufferSize(cssWidth, cssHeight, dpr, maxPixels = MAX_PIXELS) {
  const density = Math.min(Math.max(dpr || 1, 1), 2)
  const w = Math.max(1, cssWidth) * density
  const h = Math.max(1, cssHeight) * density
  const scale = Math.min(1, Math.sqrt(maxPixels / (w * h)))
  return {
    width: Math.max(2, Math.round(w * scale)),
    height: Math.max(2, Math.round(h * scale)),
  }
}

/* Returns null whenever the effect cannot run — no WebGL, a driver that
   refuses the program, a lost context. Callers treat null as "leave the CSS
   background alone", so there is always something on screen. */
export function createPearlescentRenderer(canvas) {
  if (!canvas) return null

  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power',
  }) || canvas.getContext('experimental-webgl')
  if (!gl) return null

  const program = link(gl)
  if (!program) return null

  /* One triangle covering the viewport. A quad would rasterise the diagonal
     twice for no benefit. */
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)

  const aPosition = gl.getAttribLocation(program, 'aPosition')
  const uResolution = gl.getUniformLocation(program, 'uResolution')
  const uTime = gl.getUniformLocation(program, 'uTime')
  const uVibrancy = gl.getUniformLocation(program, 'uVibrancy')
  const uThickness = gl.getUniformLocation(program, 'uThickness')
  const uTravel = gl.getUniformLocation(program, 'uTravel')

  gl.useProgram(program)
  gl.enableVertexAttribArray(aPosition)
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

  const motionQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null

  let raf = 0
  let lastDraw = 0
  let clock = 0
  let needsResize = true
  let destroyed = false
  let onLost = null
  let stillDials = null

  const markResize = () => { needsResize = true }

  function resize() {
    if (!needsResize) return
    needsResize = false
    const rect = canvas.getBoundingClientRect()
    const size = bufferSize(
      rect.width || window.innerWidth,
      rect.height || window.innerHeight,
      window.devicePixelRatio,
    )
    if (size.width === canvas.width && size.height === canvas.height) return
    canvas.width = size.width
    canvas.height = size.height
    gl.viewport(0, 0, size.width, size.height)
  }

  function draw(time) {
    if (destroyed || gl.isContextLost()) return
    resize()
    const dials = getRefraction()
    gl.useProgram(program)
    gl.uniform2f(uResolution, canvas.width, canvas.height)
    gl.uniform1f(uTime, time)
    gl.uniform1f(uVibrancy, dials.vibrancy)
    gl.uniform1f(uThickness, dials.thickness)
    gl.uniform1f(uTravel, dials.travel)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  function frame(now) {
    raf = window.requestAnimationFrame(frame)
    if (lastDraw && now - lastDraw < FRAME_INTERVAL) return
    /* Clamped so a backgrounded tab resumes where it left off instead of
       jumping the folds forward by however long it was hidden. */
    const dt = lastDraw ? Math.min((now - lastDraw) / 1000, 0.5) : 0
    lastDraw = now
    /* Speed scales the clock rather than the phase, so turning the dial
       changes the rate from here on instead of rescaling everything already
       accumulated and snapping the folds to a new arrangement. */
    clock += dt * getRefraction().speed
    draw(clock)
  }

  function stop() {
    if (raf) window.cancelAnimationFrame(raf)
    raf = 0
    lastDraw = 0
    if (stillDials) { stillDials(); stillDials = null }
  }

  function start() {
    if (destroyed || raf) return
    if (motionQuery && motionQuery.matches) {
      /* Still frame, no loop: the pane is composed but holds its angle. The
         dials still need to show, so a change repaints the one frame. */
      needsResize = true
      draw(STILL_TIME)
      stillDials = subscribeRefraction(() => draw(STILL_TIME))
      return
    }
    raf = window.requestAnimationFrame(frame)
  }

  function restart() {
    stop()
    start()
  }

  const handleLost = (event) => {
    event.preventDefault()
    stop()
    if (onLost) onLost()
  }

  window.addEventListener('resize', markResize)
  window.addEventListener('orientationchange', markResize)
  canvas.addEventListener('webglcontextlost', handleLost)
  if (motionQuery) {
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', restart)
    else if (motionQuery.addListener) motionQuery.addListener(restart)
  }

  return {
    start,
    stop,
    /* Called when the GPU drops the context, so the caller can fall back to
       the CSS background rather than leaving a blank pane. */
    setOnLost(fn) { onLost = fn },
    destroy() {
      destroyed = true
      stop()
      window.removeEventListener('resize', markResize)
      window.removeEventListener('orientationchange', markResize)
      canvas.removeEventListener('webglcontextlost', handleLost)
      if (motionQuery) {
        if (motionQuery.removeEventListener) motionQuery.removeEventListener('change', restart)
        else if (motionQuery.removeListener) motionQuery.removeListener(restart)
      }
      /* Resources only. Forcing the context loss here would be tidier for the
         GPU but poisons the canvas: getContext hands the same lost context
         back to whoever mounts next, its program fails to link, and the
         effect never recovers. Dropping the element is enough — the context
         goes with it. */
      if (!gl.isContextLost()) {
        gl.deleteBuffer(buffer)
        gl.deleteProgram(program)
      }
    },
  }
}
