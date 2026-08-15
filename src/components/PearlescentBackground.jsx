import { useEffect, useRef, useState } from 'react'
import { createPearlescentRenderer } from '../lib/pearlescent'

/* The Holographic theme's background pane. Mounted once at the root, outside
 * the routing in App, so it survives every screen change without restarting
 * the animation — the pane is meant to feel like one continuous piece of glass
 * behind the whole product, not something that reloads per view.
 *
 * It renders nothing for other themes, and nothing if WebGL is unavailable; in
 * both cases the CSS atmosphere in holographic.css is what shows. The
 * data-holo-bg flag on the root is how the stylesheet knows which of the two
 * it is drawing behind.
 */
export default function PearlescentBackground() {
  const canvasRef = useRef(null)
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme)
  // Set once the context is confirmed live, and cleared if the GPU takes it
  // away, which re-hides the canvas and brings the CSS gradients back.
  const [live, setLive] = useState(true)

  // The theme is written straight onto the root by lib/prototypeTheme, from
  // both the settings sheet and the pre-paint bootstrap, so watching the
  // attribute is what keeps this in step with either of them.
  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => setTheme(root.dataset.theme))
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const holographic = theme === 'holographic'

  useEffect(() => {
    if (!holographic || !live) return
    const renderer = createPearlescentRenderer(canvasRef.current)
    if (!renderer) {
      setLive(false)
      return
    }
    renderer.setOnLost(() => setLive(false))
    document.documentElement.dataset.holoBg = 'live'
    renderer.start()
    return () => {
      renderer.destroy()
      delete document.documentElement.dataset.holoBg
    }
  }, [holographic, live])

  if (!holographic || !live) return null
  return <canvas ref={canvasRef} className="holo-bg" aria-hidden="true" />
}
