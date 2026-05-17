import { formatCompact } from '../utils'

export default function CategoryCard({ category, total, netWorth }) {
  const pct = netWorth !== 0 ? Math.round((total / Math.abs(netWorth)) * 100) : 0
  const iconBg = category.color + '22'

  return (
    <div className="card cat-card">
      <div className="cat-card-icon-wrap" style={{ background: iconBg }}>
        {category.icon}
      </div>
      <div className="cat-card-label">{category.name}</div>
      <div className="cat-card-amount">{formatCompact(total)}</div>
      {netWorth !== 0 && (
        <div className="cat-card-pct">{Math.abs(pct)}% of net worth</div>
      )}
    </div>
  )
}
