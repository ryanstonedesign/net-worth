import { getRefraction, subscribeRefraction } from './refraction'

/* Procedural pearlescent pane for the Holographic theme.
 *
 * The picture is sunlight through a prism falling across a neutral surface:
 * a flat grey ground and a fan of shafts thrown from one source off the top
 * left, each blown white along its axis with the spectrum separating out
 * along its flanks.
 *
 * The colour is not painted on. Each shaft is summed from six samples of the
 * visible spectrum, offset across the beam's width the way a prism spreads
 * wavelengths by angle. Where the copies still overlap they sum to white;
 * where only one end of the range reaches, what is left is that wavelength.
 * Red on one flank and violet on the other is then a property of the
 * geometry, and it stays consistent as the shaft moves.
 *
 * Luminance and colour are built separately and joined at the end. The shafts
 * compose by screen, which can only add, so on a ground this light they can
 * only ever approach white — right for a highlight, useless for a hue. Colour
 * is accumulated instead as chroma with its luminance removed and added after
 * the blend, weighted by each shaft's own brightness so it falls away both at
 * the white core and out in the dark.
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

/* Rec.601 weights. Used to split a beam's colour into the achromatic part that
   composes by screen and the chroma that is added after it. */
const vec3 LUMA = vec3(0.299, 0.587, 0.114);

/* The visible spectrum sampled at six points, red through violet, from three
   lobes: gauss(t, 0.07, 0.17) + 0.45 * gauss(t, 0.96, 0.13) for red, then
   gauss(t, 0.43, 0.18) and gauss(t, 0.79, 0.20). Lobes rather than a hue
   rotation — a hue ramp gives every band equal weight and reads as a colour
   wheel laid on the screen, while dispersed light is dominated by the middle
   of the range with the ends falling away. The second red lobe up at the
   violet end is what gives violet its magenta cast instead of a flat blue.

   Precomputed because the weights never change, and six live evaluations would
   cost more than the beam samples they weight. SPECTRUM_SUM is their total;
   dividing by it is what makes a fully overlapped beam come out exactly white.
   Recompute the two together if either is touched. */
const vec3 SPEC_0 = vec3(0.919, 0.058, 0.000);
const vec3 SPEC_1 = vec3(0.747, 0.442, 0.013);
const vec3 SPEC_2 = vec3(0.152, 0.986, 0.149);
const vec3 SPEC_3 = vec3(0.008, 0.640, 0.637);
const vec3 SPEC_4 = vec3(0.211, 0.121, 0.999);
const vec3 SPEC_5 = vec3(0.429, 0.007, 0.576);
const vec3 SPECTRUM_SUM = vec3(2.466, 2.254, 2.374);

/* How hard the separated colour is pushed into the pane. */
const float CHROMA_GAIN = 1.0;

mat2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
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
  ) * 0.10;
}

/* A shaft of light: soft edged, brightest on its axis, no boundary anywhere. */
float beam(float d, float w) {
  float z = d / w;
  return exp(-z * z);
}

/* Multiple of a shaft's own drift, so each keeps its own period and the set
   stays incommensurate. Fractional on purpose: at a whole number the ripple
   would close on the wander every nth pass and the shaft would repeat. */
const float RIPPLE_RATIO = 9.19;

/* One shaft through the prism.

   Each wavelength leaves the glass at its own angle, so the beam is a stack of
   copies of itself offset across its width. Where they all still overlap the
   sum is white — that is the blown core — and out at the edges, where only the
   long or the short end of the range still reaches, what is left is the
   wavelength itself. The fringe is a consequence of the geometry, not a colour
   painted onto an edge, which is why the separation runs red on one flank and
   violet on the other rather than cycling through a palette.

   The dispersion has to stay well under the beam width. Push it past that and
   the wavelengths stop overlapping anywhere, the core turns green — green
   being the middle of the range and so the middle of the fan — and the shaft
   reads as a striped ribbon instead of light. */
void ray(
  vec2 p, float t, float angle, float drift, float bow, float width,
  float spread, float offset, float amp,
  inout vec3 light, inout vec3 chroma
) {
  vec2 q = rot(angle) * p;
  float ph = t * drift;

  /* Shafts stay close to straight. A beam is the path light took; curvature
     much past this reads as a bent object rather than a cast of light, so what
     moves is where the shaft falls, not how bent it is. The fast term is the
     travelling ripple that stops it drifting as one rigid piece. */
  float wander = bow * uTravel * (
      sin(q.x * 0.52 + ph)
    + 0.55 * sin(q.x * 0.19 - ph * 0.71)
    + 0.20 * sin(q.x * 1.30 - ph * RIPPLE_RATIO)
  );

  float d = q.y - offset - wander;
  float w = width * uThickness;
  float disp = spread * w;

  vec3 sum = SPEC_0 * beam(d + 0.50 * disp, w)
           + SPEC_1 * beam(d + 0.30 * disp, w)
           + SPEC_2 * beam(d + 0.10 * disp, w)
           + SPEC_3 * beam(d - 0.10 * disp, w)
           + SPEC_4 * beam(d - 0.30 * disp, w)
           + SPEC_5 * beam(d - 0.50 * disp, w);

  vec3 c = sum / SPECTRUM_SUM;
  float lum = dot(c, LUMA);

  /* Luminance composes by screen with every other shaft; colour is carried
     separately and added after that blend, so a crossing stays white instead
     of stacking two tints. Weighting chroma by the shaft's own brightness is
     what keeps colour where there is light to be split — it falls to nothing
     at the white core, where every wavelength is still present, and again out
     in the dark where none of them are. */
  light += vec3(lum) * amp;
  chroma += (c - lum) * lum * (amp * uVibrancy * CHROMA_GAIN);
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
  vec3 chroma = vec3(0.0);
  /* Angle, drift, wander, width, dispersion, offset, amplitude. The angles sit
     within a few degrees of each other so the shafts read as one cast of light
     from a single source off the top left, the way a prism throws them, rather
     than as a set of independent streaks. Widths and dispersions vary the most:
     a narrow shaft with a wide fan is the one that shows colour, a broad soft
     one is mostly the glow between them. A negative dispersion turns the fan
     over, putting violet on the flank that would otherwise be red — without a
     couple of those every shaft leans the same way and the pane reads as one
     gradient rather than as separate casts. */
  ray(w, t, -0.58, 0.00787, 0.08, 0.22,  0.42, -1.32, 0.95, light, chroma);
  ray(w, t, -0.72, 0.00541, 0.07, 0.09, -0.62, -0.58, 1.70, light, chroma);
  ray(w, t, -0.66, 0.00997, 0.10, 0.34,  0.30,  0.12, 0.70, light, chroma);
  ray(w, t, -0.80, 0.00673, 0.06, 0.13,  0.58,  0.86, 1.30, light, chroma);
  ray(w, t, -0.52, 0.00439, 0.11, 0.26,  0.38,  1.58, 0.85, light, chroma);

  /* The card stack sits in the middle of the screen, so light is pulled down
     over a tall ellipse there. It is attenuated rather than cut: the folds
     still cross the middle, they just stop competing with the numbers. */
  /* Shafts this bright and this saturated need a deeper well than the folds
     did: a rainbow running across a column of figures is the one thing the
     pane must not do. The drama stays out at the edges, which is where the
     cast reads anyway. */
  vec2 c = vec2(p.x * 0.95, p.y * 0.62);
  float calm = mix(0.42, 1.0, smoothstep(0.0, 1.0, dot(c, c)));
  light *= calm;
  chroma *= calm;

  /* Nearly white, a half step cool. The undertone deepens toward the edges so
     the pane reads as curved glass rather than flat paper.

     The exact level is what governs how legible the folds are, because they
     compose by screen: a fold can only ever lift a pixel by (1 - base), so a
     ground at 0.93 leaves seven percent of range for the entire effect no
     matter how hard the folds are driven. Dropping it a few points is worth
     far more contrast than raising amplitude, and costs nothing in calm. */
  float edge = smoothstep(0.15, 1.85, length(p * vec2(1.0, 0.62)));
  vec3 base = mix(vec3(0.862, 0.864, 0.871), vec3(0.812, 0.815, 0.826), edge);

  /* Exposure rather than a clamp: where folds pile up, a clamp flattens the
     overlap into a plate of pure white with a visible edge, while this rolls
     off asymptotically and keeps the crossing readable. */
  vec3 lit = 1.0 - exp(-light);

  /* Screen, so the folds only ever add light and can never darken the ground
     where two of them cross. */
  vec3 col = 1.0 - (1.0 - base) * (1.0 - lit);

  /* The hue goes on after the blend, not through it. */
  col += chroma;

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
