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

// Apply any saved design-system token overrides before the first paint.
initTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
