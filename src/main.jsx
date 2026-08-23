import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import PearlescentBackground from './components/PearlescentBackground.jsx'
import './index.css'
import './styles/limestone-tokens.css'
import './styles/limestone-base.css'
import './styles/limestone-app.css'
import './styles/limestone-secondary.css'
import './styles/limestone-landing.css'
import './styles/limestone-preferences.css'
import './styles/holographic.css'
import { initTheme } from './lib/theme'
import { applyGrain, readGrain } from './lib/grainOpacity'
import { applyRefraction, readRefraction } from './lib/refraction'
import { applyHoloMotion, readHoloMotion } from './lib/holoBackground'
import { applyPrototypeTheme, readPrototypeTheme } from './lib/prototypeTheme'

// Apply any saved design-system token overrides before the first paint.
initTheme()
// Mark the active prototype theme before paint. Holographic is the first-run
// default; Stone remains available as the preserved original design.
applyPrototypeTheme(readPrototypeTheme())
// Same for the prototype grain dials — the landing and auth surfaces wear the
// texture too, so this has to happen outside the signed-in shell.
applyGrain(readGrain())
// And the background pane's dials, so the shader's first frame is already the
// arrangement the user left it on rather than the default snapping over.
applyRefraction(readRefraction())
// Whether that pane runs its loop at all, applied before it mounts so a pane
// left switched off never starts one.
applyHoloMotion(readHoloMotion())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    {/* After App, not before: the background canvas and App's own .app-bg both
        sit on z-index 0, so DOM order is what puts the canvas on top of the
        flat fill while every shell (z-index 1 and up) still paints above it. */}
    <PearlescentBackground />
  </React.StrictMode>
)
