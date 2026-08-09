const ASSUMPTIONS = [
  ['Starting balance', '$284,920'],
  ['Time horizon', '10 years'],
]

const SCENARIOS = [
  {
    name: 'Steady path',
    contribution: '$2,000 / month',
    rate: '5.0% annual rate',
    className: 'is-primary',
  },
  {
    name: 'Higher contribution',
    contribution: '$3,000 / month',
    rate: '5.0% annual rate',
    className: 'is-secondary',
  },
]

export default function ProjectionPreview() {
  return (
    <figure className="lp-projection" aria-labelledby="lp-projection-title">
      <figcaption id="lp-projection-title">
        <span className="lp-stone-overline">Illustrative comparison</span>
        Two scenarios, one recorded starting point
      </figcaption>
      <p id="lp-projection-description" className="lp-projection__description">
        Solid lines represent recorded history. Dashed lines represent calculated
        possibilities based on the assumptions shown here.
      </p>

      <div className="lp-projection__layout">
        <div className="lp-projection__chart">
          <div className="lp-projection__legend" aria-hidden="true">
            <span><i className="is-history" />History</span>
            <span><i className="is-steady" />Steady path</span>
            <span><i className="is-higher" />Higher contribution</span>
          </div>
          <svg
            viewBox="0 0 620 228"
            role="img"
            aria-label="Recorded history leading to two dashed illustrative projection paths"
            aria-describedby="lp-projection-description"
          >
            <g className="lp-projection__grid" aria-hidden="true">
              <line x1="30" y1="42" x2="590" y2="42" />
              <line x1="30" y1="88" x2="590" y2="88" />
              <line x1="30" y1="134" x2="590" y2="134" />
              <line x1="30" y1="180" x2="590" y2="180" />
            </g>
            <line className="lp-projection__today" x1="230" y1="24" x2="230" y2="194" />
            <text className="lp-projection__today-label" x="230" y="216" textAnchor="middle">Today</text>
            <path
              className="lp-projection__history"
              d="M30 176 C72 168 94 160 126 151 S181 126 230 116"
            />
            <path
              className="lp-projection__steady"
              d="M230 116 C310 104 365 89 430 67 S531 45 590 35"
            />
            <path
              className="lp-projection__higher"
              d="M230 116 C310 101 365 78 430 49 S531 25 590 16"
            />
            <circle className="lp-projection__marker" cx="230" cy="116" r="5" />
          </svg>
          <div className="lp-projection__axis" aria-hidden="true">
            <span>Recorded months</span>
            <span>Illustrative projection horizon</span>
          </div>
        </div>

        <div className="lp-projection__assumptions">
          <p>Shared assumptions</p>
          <dl>
            {ASSUMPTIONS.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <ul>
            {SCENARIOS.map((scenario) => (
              <li key={scenario.name} className={scenario.className}>
                <i aria-hidden="true" />
                <div>
                  <strong>{scenario.name}</strong>
                  <span>{scenario.contribution}</span>
                  <span>{scenario.rate}</span>
                </div>
              </li>
            ))}
          </ul>
          <small>Illustrative inputs only. Results vary when assumptions change.</small>
        </div>
      </div>
    </figure>
  )
}
