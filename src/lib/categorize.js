// Offline, heuristic categorisation. No network, no AI — keyword rules map a
// raw account name to a suggested category + asset/liability type so the
// importer can pre-fill the review step. Every guess is user-overridable.

// Order matters: more specific / liability rules come before broad asset ones
// so e.g. "auto loan" matches Loans before any generic vehicle rule.
export const CATEGORY_RULES = [
  { category: 'Credit Cards', type: 'liability', icon: '💳',
    keywords: ['visa', 'mastercard', 'amex', 'american express', 'discover', 'credit card', 'creditcard', 'cc '] },
  { category: 'Loans', type: 'liability', icon: '🎓',
    keywords: ['loan', 'student', 'mortgage', 'heloc', 'line of credit', 'financing', 'owe', 'liability'] },
  { category: 'Retirement', type: 'asset', icon: '💰',
    keywords: ['401k', '401(k)', '403b', 'ira', 'roth', 'pension', 'retirement', 'tsp'] },
  { category: 'Investments', type: 'asset', icon: '📈',
    keywords: ['brokerage', 'stock', 'etf', 'mutual fund', 'vanguard', 'fidelity', 'schwab', 'robinhood', 'invest', 'securities', 'shares'] },
  { category: 'Crypto', type: 'asset', icon: '💎',
    keywords: ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'coinbase', 'binance', 'wallet', 'solana'] },
  { category: 'Real Estate', type: 'asset', icon: '🏠',
    keywords: ['home', 'house', 'property', 'real estate', 'condo', 'apartment', 'land', 'rental'] },
  { category: 'Vehicles', type: 'asset', icon: '🚗',
    keywords: ['car', 'vehicle', 'auto', 'truck', 'motorcycle', 'boat'] },
  { category: 'Cash', type: 'asset', icon: '🏦',
    keywords: ['checking', 'savings', 'cash', 'money market', 'chase', 'wells fargo', 'bank of america', 'citi', 'ally', 'capital one', 'bank', 'hsa', 'cd'] },
  { category: 'Business', type: 'asset', icon: '🏪',
    keywords: ['business', 'llc', 'company', 'payroll', 'merchant'] },
]

function norm(s) { return String(s ?? '').trim().toLowerCase() }

// Find an existing category whose name appears in the account text, or whose
// name equals the given name. Returns the category object or null.
function findExistingByName(name, existingCategories) {
  const n = norm(name)
  if (!n) return null
  // Exact name match first.
  let hit = existingCategories.find(c => norm(c.name) === n)
  if (hit) return hit
  // Then: account text contains an existing category's name (longest first).
  const byLen = [...existingCategories].sort((a, b) => b.name.length - a.name.length)
  return byLen.find(c => c.name.length >= 3 && n.includes(norm(c.name))) || null
}

/**
 * Suggest a category for an account name.
 * @returns {{ category: string, type: 'asset'|'liability', icon: string,
 *             existingId: string|null, confidence: 'high'|'medium'|'low' }}
 */
export function suggestCategory(accountName, existingCategories = []) {
  const n = norm(accountName)

  // 1) Match the rules to get a candidate category + type.
  let ruleHit = null
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => n.includes(k))) { ruleHit = rule; break }
  }

  // 2) If an existing category fits (by name), prefer merging into it.
  const existing = findExistingByName(accountName, existingCategories)
  if (existing) {
    return {
      category: existing.name,
      type: existing.type,
      icon: existing.icon,
      existingId: existing.id,
      confidence: 'high',
    }
  }

  // 3) If a rule matched, see whether its suggested category already exists.
  if (ruleHit) {
    const sameName = existingCategories.find(c => norm(c.name) === norm(ruleHit.category))
    if (sameName) {
      return {
        category: sameName.name, type: sameName.type, icon: sameName.icon,
        existingId: sameName.id, confidence: 'high',
      }
    }
    return {
      category: ruleHit.category, type: ruleHit.type, icon: ruleHit.icon,
      existingId: null, confidence: 'medium',
    }
  }

  // 4) Nothing matched — leave it Uncategorized for the user to fix.
  return {
    category: 'Uncategorized', type: 'asset', icon: '📊',
    existingId: null, confidence: 'low',
  }
}
