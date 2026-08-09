import { useEffect, useState } from 'react'

export default function ResponsiveArtwork({
  avif,
  webp,
  alt,
  width,
  height,
  className = '',
  priority = false,
}) {
  const [reduceData, setReduceData] = useState(() => (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-data: reduce)').matches
  ))

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const query = window.matchMedia('(prefers-reduced-data: reduce)')
    const updatePreference = () => setReduceData(query.matches)
    updatePreference()
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', updatePreference)
      return () => query.removeEventListener('change', updatePreference)
    }
    query.addListener?.(updatePreference)
    return () => query.removeListener?.(updatePreference)
  }, [])

  if (reduceData) {
    return (
      <span
        className={`lp-stone-artwork lp-stone-artwork--reduced-data${className ? ` ${className}` : ''}`}
        role="img"
        aria-label={alt}
      >
        <span aria-hidden="true">Artwork omitted in low-data mode</span>
      </span>
    )
  }

  return (
    <picture className={`lp-stone-artwork${className ? ` ${className}` : ''}`}>
      <source srcSet={avif} type="image/avif" />
      <source srcSet={webp} type="image/webp" />
      <img
        src={webp}
        width={width}
        height={height}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
      />
    </picture>
  )
}
