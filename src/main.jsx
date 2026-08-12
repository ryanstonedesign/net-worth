import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/limestone-tokens.css'
import './styles/limestone-base.css'
import './styles/limestone-app.css'
import './styles/limestone-secondary.css'
import './styles/limestone-landing.css'
import './styles/limestone-preferences.css'
import { initTheme } from './lib/theme'
import { applyGrain, readGrain } from './lib/grainOpacity'

// Apply any saved design-system token overrides before the first paint.
initTheme()
// Same for the prototype grain dials — the landing and auth surfaces wear the
// texture too, so this has to happen outside the signed-in shell.
applyGrain(readGrain())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
