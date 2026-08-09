export default function LandingSection({ id, className = '', labelledBy, children }) {
  return (
    <section
      id={id}
      className={`lp-stone-section${className ? ` ${className}` : ''}`}
      aria-labelledby={labelledBy}
    >
      <div className="lp-stone-shell">{children}</div>
    </section>
  )
}
