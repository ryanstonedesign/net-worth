import { useEffect, useState } from 'react'

// Breakpoint where the scenario sidebar becomes permanently visible and the
// app switches to the desktop layout. Keep in sync with the 900px media
// queries in index.css.
export const DESKTOP_QUERY = '(min-width: 900px)'

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    setMatches(mql.matches)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}
