import { getRefraction, subscribeRefraction } from './refraction'

/* Procedural pearlescent pane for the Holographic theme.
 *
 * A handful of soft blobs drifting behind the product in the colour of its
 * primary button, at an opacity low enough that they read as a tint on the
 * pane rather than as shapes on it.
 *
 * Each blob is a circle whose radius varies with angle, with those angular
 * terms drifting on periods of their own — so what moves is the shape, not
 * just its position. Coverage and colour accumulate separately, which is what
 * lets an overlap blend the colours of the blobs making it.
 *
 * Every rate is mutually incommensurate, so the arrangement never returns to
 * one it has held before — there is no loop to notice.
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
uniform float uBlobFade[6];

/* Sampled from --holo-primary, the gradient the primary button is painted
   with: its teal, its blue, its violet and the indigo it settles into. The
   blobs are that colour and nothing else — they are the product's accent
   drifting behind it, not a separate palette. Follow the button if it moves. */
const vec3 STOP_0 = vec3(0.357, 1.000, 0.945);
const vec3 STOP_1 = vec3(0.208, 0.682, 1.000);
const vec3 STOP_2 = vec3(0.663, 0.639, 1.000);
const vec3 STOP_3 = vec3(0.282, 0.325, 0.949);

/* How far a blob is allowed to pull the ground toward its own colour at full
   coverage. Low on purpose: these are a tint on the pane, not shapes on it. */
const float BLOB_OPACITY = 0.19;

mat2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

/* Position along the button gradient. Cycles, and smoothstepped at each stop
   so the ramp is continuous in its first derivative — a linear mix creases at
   every stop, and a crease across something this soft is visible as a band. */
vec3 accent(float phase) {
  float t = fract(phase) * 4.0;
  float i = floor(t);
  float f = smoothstep(0.0, 1.0, t - i);
  vec3 a = i < 0.5 ? STOP_0 : (i < 1.5 ? STOP_1 : (i < 2.5 ? STOP_2 : STOP_3));
  vec3 b = i < 0.5 ? STOP_1 : (i < 1.5 ? STOP_2 : (i < 2.5 ? STOP_3 : STOP_0));
  return mix(a, b, f);
}

/* One blob.

   The outline is a circle whose radius varies with angle, and those angular
   terms drift on their own periods — which is what makes this a shape that
   changes rather than a circle that moves. The angular frequencies are whole
   numbers so the outline closes on itself: at any other value the seam where
   atan wraps would show as a crease running out from the centre.

   The profile is a plateau with a soft shoulder rather than a gaussian. A
   gaussian has no body — it is all falloff, so six of them at this size melt
   into one wash and the shapes stop being shapes. Holding the middle flat and
   spending the whole gradient on the last third of the radius gives each blob
   a form you can read while leaving no edge anywhere to catch the eye. */
float blob(vec2 p, vec2 centre, float radius, float t, float seed) {
  vec2 v = p - centre;
  float a = atan(v.y, v.x);
  float wobble = 1.0
    + 0.30 * sin(a * 2.0 + t * 0.0413 + seed)
    + 0.19 * sin(a * 3.0 - t * 0.0291 + seed * 2.3)
    + 0.11 * sin(a * 5.0 + t * 0.0177 + seed * 3.7);
  float d = length(v) / max(radius * wobble, 0.001);
  return 1.0 - smoothstep(0.32, 1.06, d);
}

/* Drift, breathe and colour a blob, and fold it into the running totals.

   Coverage and colour are accumulated separately: the weighted mean is what
   makes two overlapping blobs blend their colours instead of the later one
   painting over the earlier. */
void place(
  vec2 p, float t, vec2 home, float radius, float driftX, float driftY,
  float phase, float tintPhase, float tintRate, float seed, float visibility,
  inout vec3 tint, inout float cover
) {
  /* The original rates took 11–30 minutes to complete one positional orbit,
     which made a running pane look still. Keep the same paths and their
     incommensurate relationship, but bring the default into a calm 1–4 minute
     range. Shape and colour remain slower than position so the pane does not
     become busy. */
  const float DRIFT_RATE = 8.0;
  const float SHAPE_RATE = 2.5;
  const float TINT_RATE = 3.0;
  vec2 centre = home + uTravel * vec2(
    0.46 * sin(t * driftX * DRIFT_RATE + phase),
    0.38 * cos(t * driftY * DRIFT_RATE + phase * 1.7)
  );
  /* Breathing on a period of its own, so size and position never come round
     together and the blob is never twice the same shape in the same place. */
  float r = radius * uThickness * (1.0 + 0.22 * sin(t * driftX * DRIFT_RATE * 2.31 + seed));

  /* visibility is supplied by an independent randomized cadence on the JS
     side. Multiplying coverage here makes the blob truly disappear at zero;
     uVibrancy remains the peak opacity selected in settings. */
  float m = blob(p, centre, r, t * SHAPE_RATE, seed) * visibility;
  tint += accent(tintPhase + t * tintRate * TINT_RATE) * m;
  cover += m;
}

void main() {
  vec2 frag = gl_FragCoord.xy;

  /* Normalised on the short edge, so a blob stays round rather than being
     stretched into an ellipse by the viewport's aspect. */
  vec2 p = (frag * 2.0 - uResolution) / min(uResolution.x, uResolution.y);
  float t = uTime;

  /* Blobs are placed in a vertically compressed copy of the pane. On a phone
     the tall axis is more than twice the short one, and at 1:1 the same set
     would leave most of the height empty; squashing y spreads their homes over
     the whole screen while each blob itself stays round. */
  vec2 f = vec2(p.x, p.y * 0.62);

  /* The whole field turns a few degrees over about ten minutes, under the
     blobs' own drift, so the arrangement never settles into an axis. */
  vec2 g = rot(0.09 * sin(t * 0.01039)) * f;

  vec3 tint = vec3(0.0);
  float cover = 0.0;

  /* Home, radius, drift rates, path phase, colour phase, colour rate, seed.
     Every rate is mutually incommensurate, so the set never returns to an
     arrangement it has held before — there is no loop to notice. */
  place(g, t, vec2(-0.62, -0.78), 0.62, 0.00731, 0.00519, 0.00, 0.00, 0.00317, 1.7, uBlobFade[0], tint, cover);
  place(g, t, vec2( 0.58, -0.34), 0.48, 0.00463, 0.00817, 1.90, 0.28, 0.00211, 3.1, uBlobFade[1], tint, cover);
  place(g, t, vec2(-0.34,  0.41), 0.71, 0.00907, 0.00371, 3.70, 0.55, 0.00409, 5.2, uBlobFade[2], tint, cover);
  place(g, t, vec2( 0.67,  0.92), 0.54, 0.00587, 0.00673, 5.10, 0.79, 0.00173, 0.9, uBlobFade[3], tint, cover);
  place(g, t, vec2(-0.12,  1.24), 0.44, 0.00349, 0.00941, 2.40, 0.13, 0.00283, 4.4, uBlobFade[4], tint, cover);
  place(g, t, vec2( 0.24, -1.18), 0.58, 0.00659, 0.00427, 4.60, 0.66, 0.00361, 2.6, uBlobFade[5], tint, cover);

  /* Soft union. Adding coverage outright would clip flat wherever three blobs
     meet; this approaches full without ever reaching it, so an overlap reads
     as deeper colour rather than as a plateau with an outline. */
  float alpha = 1.0 - exp(-cover);

  /* Weighted mean of the colours present, so an overlap is the blend of the
     blobs making it rather than whichever was accumulated last. */
  vec3 blobColor = cover > 0.0001 ? tint / cover : vec3(1.0);

  /* The card stack sits in the middle of the screen. The blobs still cross it
     — they are faint enough to — but they are held back over that ellipse so
     they never compete with the figures. */
  vec2 c = vec2(p.x * 0.95, p.y * 0.62);
  alpha *= mix(0.62, 1.0, smoothstep(0.0, 1.0, dot(c, c)));

  /* Nearly white, a half step cool: the pane the blobs tint. */
  float edge = smoothstep(0.15, 1.85, length(p * vec2(1.0, 0.62)));
  vec3 base = mix(vec3(0.973, 0.980, 0.996), vec3(0.941, 0.949, 0.973), edge);

  vec3 col = mix(base, blobColor, alpha * BLOB_OPACITY * uVibrancy);

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
/* Time to freeze at when motion is not wanted: far enough in that the blobs
   have drifted into an interesting arrangement rather than their t=0 one. */
const STILL_TIME = 137.0

export const BLOB_COUNT = 6

const FADE_PHASES = ['fade-in', 'visible', 'fade-out', 'hidden']
const FADE_DURATION = {
  'fade-in': [7, 15],
  visible: [4, 12],
  'fade-out': [8, 17],
  hidden: [2, 8],
}

function randomBetween(random, min, max) {
  return min + (max - min) * random()
}

function phaseDuration(phase, random) {
  const [min, max] = FADE_DURATION[phase]
  return randomBetween(random, min, max)
}

function nextPhase(phase) {
  return FADE_PHASES[(FADE_PHASES.indexOf(phase) + 1) % FADE_PHASES.length]
}

function smoothUnit(value) {
  const t = Math.min(1, Math.max(0, value))
  return t * t * (3 - 2 * t)
}

/* Each blob owns an independent four-part cadence. Durations are chosen again
   at every phase boundary rather than once at startup, so the fades do not
   settle into six repeating metronomes. The index offset guarantees the first
   frame is a mix of states even if a deterministic random source returns the
   same value for every blob. */
export function createBlobFadeStates(random = Math.random) {
  return Array.from({ length: BLOB_COUNT }, (_, index) => {
    const phase = FADE_PHASES[(index + Math.floor(random() * FADE_PHASES.length)) % FADE_PHASES.length]
    const duration = phaseDuration(phase, random)
    return { phase, duration, elapsed: random() * duration }
  })
}

export function blobFadeOpacity(state) {
  const progress = state.duration > 0 ? state.elapsed / state.duration : 1
  if (state.phase === 'fade-in') return smoothUnit(progress)
  if (state.phase === 'visible') return 1
  if (state.phase === 'fade-out') return 1 - smoothUnit(progress)
  return 0
}

/* Mutates the small renderer-owned state array and returns the six values the
   shader consumes. Delta is already scaled by the speed setting, which means
   speed zero freezes movement and fades together. */
export function advanceBlobFadeStates(states, delta, random = Math.random) {
  const step = Number.isFinite(delta) ? Math.max(0, delta) : 0
  for (const state of states) {
    state.elapsed += step
    while (state.elapsed >= state.duration) {
      state.elapsed -= state.duration
      state.phase = nextPhase(state.phase)
      state.duration = phaseDuration(state.phase, random)
    }
  }
  return Float32Array.from(states, blobFadeOpacity)
}

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
  const uBlobFade = gl.getUniformLocation(program, 'uBlobFade[0]')

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
  const blobFadeStates = createBlobFadeStates()
  let blobFadeValues = Float32Array.from(blobFadeStates, blobFadeOpacity)

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
    gl.uniform1fv(uBlobFade, blobFadeValues)
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
       accumulated and snapping the blobs to a new arrangement. The same
       scaled delta drives their fade cadence, so speed zero holds both. */
    const scaledDt = dt * getRefraction().speed
    clock += scaledDt
    blobFadeValues = advanceBlobFadeStates(blobFadeStates, scaledDt)
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
