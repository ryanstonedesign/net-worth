/* The floating back control shared by every auth screen that has somewhere to
   go back to. Renders the product shell's nav fade alongside it, so a card tall
   enough to scroll dissolves under the same gradient blur the accounts page
   uses. Both are pinned to the viewport by .auth-back / .auth-shell > .top-nav-fade. */
export default function AuthBackButton({ onClick, label = 'Back' }) {
  return (
    <>
      <div className="top-nav-fade" aria-hidden="true" />
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
    </>
  )
}
