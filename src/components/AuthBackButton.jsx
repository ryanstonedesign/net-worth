/* The floating back control shared by every auth screen that has somewhere to
   go back to. Pinned to the viewport by .auth-back, so it stays put while a
   card tall enough to scroll passes under it. */
export default function AuthBackButton({ onClick, label = 'Back' }) {
  return (
    <button
      type="button"
      className="btn-icon auth-back"
      onClick={onClick}
      aria-label={label}
    >
      <svg
        width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  )
}
