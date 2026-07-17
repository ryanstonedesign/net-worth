import { useState } from 'react'
import Modal from './Modal'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../hooks/useData'

const rowChevron = (
  <svg className="settings-row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

export default function EditCategorySheet({
  category,
  onSave,
  onDelete,
  onClose,
  addAccount,
  deleteAccount,
  renameAccount,
  setAccountGrowth,
}) {
  const isNew = !category
  const [name, setName] = useState(category?.name ?? '')
  const [type, setType] = useState(category?.type ?? 'asset')
  const [contributing, setContributing] = useState(category?.contributing ?? false)
  // Color/icon are no longer user-editable, but kept in the data model.
  const color = category?.color ?? CATEGORY_COLORS[0]
  const icon = category?.icon ?? CATEGORY_ICONS[0]
  // New-category flow: accounts stay local until the category is created.
  const [localAccounts, setLocalAccounts] = useState([])

  // Account sub-view: null (main view), { mode: 'new' } or { mode: 'edit', id }.
  // Name and growth edits are staged here and only written back on save.
  const [accountView, setAccountView] = useState(null)
  const [accName, setAccName] = useState('')
  const [accSign, setAccSign] = useState('+')
  const [accMag, setAccMag] = useState('')

  const accounts = isNew ? localAccounts : (category?.accounts ?? [])
  const viewedAccount = accountView?.mode === 'edit'
    ? accounts.find(a => a.id === accountView.id)
    : null

  const openNewAccount = () => {
    setAccName('')
    setAccSign('+')
    setAccMag('')
    setAccountView({ mode: 'new' })
  }

  const openAccount = (acc) => {
    const growth = acc.growth ?? 0
    setAccName(acc.name)
    setAccSign(growth < 0 ? '-' : '+')
    setAccMag(String(Math.abs(growth)))
    setAccountView({ mode: 'edit', id: acc.id })
  }

  const stagedGrowth = () => {
    const num = parseFloat(accMag)
    return (isNaN(num) ? 0 : num) * (accSign === '-' ? -1 : 1)
  }

  const commitAccount = () => {
    const n = accName.trim()
    if (!n) return
    const growth = stagedGrowth()
    if (accountView.mode === 'new') {
      if (isNew) {
        setLocalAccounts(a => [...a, { id: `tmp_${Date.now()}`, name: n, growth }])
      } else {
        // Growth is a per-scenario forecasting lever, so it goes through
        // setAccountGrowth rather than riding along in the fact write.
        const id = addAccount(category.id, { name: n })
        if (growth !== 0) setAccountGrowth(category.id, id, growth)
      }
    } else if (isNew) {
      setLocalAccounts(list => list.map(a =>
        a.id === accountView.id ? { ...a, name: n, growth } : a
      ))
    } else if (viewedAccount) {
      if (n !== viewedAccount.name) renameAccount(category.id, viewedAccount.id, n)
      if (growth !== (viewedAccount.growth ?? 0)) setAccountGrowth(category.id, viewedAccount.id, growth)
    }
    setAccountView(null)
  }

  const deleteViewedAccount = () => {
    if (isNew) {
      setLocalAccounts(a => a.filter(x => x.id !== accountView.id))
    } else {
      if (viewedAccount && !confirm(`Delete "${viewedAccount.name}" and its balance history?`)) return
      deleteAccount(category.id, accountView.id)
    }
    setAccountView(null)
  }

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), type, color, icon, contributing }, localAccounts)
  }

  return (
    <Modal
      title={
        accountView
          ? (accountView.mode === 'new' ? 'Add Account' : 'Edit Account')
          : (isNew ? 'New Category' : 'Edit Category')
      }
      onBack={accountView ? () => setAccountView(null) : undefined}
      onClose={onClose}
      footer={accountView ? (
        <div className="modal-actions">
          {accountView.mode === 'edit' && (
            <button className="btn btn-destructive" onClick={deleteViewedAccount}>
              Delete account
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={commitAccount}
            disabled={!accName.trim()}
          >
            {accountView.mode === 'new' ? 'Add account' : 'Save changes'}
          </button>
        </div>
      ) : (
        <div className="modal-actions">
          {!isNew && (
            <button
              className="btn btn-destructive"
              onClick={() => {
                if (confirm(`Delete "${category.name}" and all its accounts?`)) {
                  onDelete()
                  onClose()
                }
              }}
            >
              Delete category
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            {isNew ? 'Create category' : 'Save changes'}
          </button>
        </div>
      )}
    >
      {accountView ? (
        <>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              className="input"
              placeholder="e.g. Checking"
              value={accName}
              autoFocus={accountView.mode === 'new'}
              onChange={e => setAccName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitAccount() }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Annual growth</label>
            <div className="growth-editor">
              <div className="type-toggle sign-toggle" data-pos={accSign === '-' ? 1 : 0}>
                <span className="type-toggle-thumb" aria-hidden="true" />
                <button
                  type="button"
                  className={`type-toggle-btn${accSign === '+' ? ' active' : ''}`}
                  aria-label="Positive growth"
                  onClick={() => setAccSign('+')}
                >+</button>
                <button
                  type="button"
                  className={`type-toggle-btn${accSign === '-' ? ' active' : ''}`}
                  aria-label="Negative growth"
                  onClick={() => setAccSign('-')}
                >−</button>
              </div>
              <input
                className="input growth-rate-input"
                inputMode="decimal"
                placeholder="0"
                value={accMag}
                onChange={e => setAccMag(e.target.value.replace(/[^0-9.]/g, ''))}
                onKeyDown={e => { if (e.key === 'Enter') commitAccount() }}
              />
              <span className="growth-suffix">%/yr</span>
            </div>
            <p className="growth-hint">
              Estimated annual growth, used for future estimates. Choose − for
              depreciating assets.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              className="input"
              placeholder="e.g. Retirement"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Type</label>
            <div className="type-toggle" data-pos={type === 'liability' ? 1 : 0}>
              <span className="type-toggle-thumb" aria-hidden="true" />
              <button type="button" className={`type-toggle-btn${type === 'asset' ? ' active' : ''}`} onClick={() => setType('asset')}>Asset</button>
              <button type="button" className={`type-toggle-btn${type === 'liability' ? ' active' : ''}`} onClick={() => setType('liability')}>Liability</button>
            </div>
            <label className="checkbox-row" style={{ marginTop: 14 }}>
              <input
                type="checkbox"
                className="checkbox-input"
                checked={contributing}
                onChange={e => setContributing(e.target.checked)}
              />
              <span className="checkbox-label">Contributing monthly</span>
            </label>
          </div>

          {/* Accounts — a settings-style table of rows that each open the
              account sub-view; just a full-width add button when empty. */}
          <div className="form-group">
            <label className="form-label">Accounts</label>
            {accounts.length > 0 && (
              <div className="settings-card">
                {accounts.map(acc => (
                  <button
                    key={acc.id}
                    type="button"
                    className="settings-row"
                    onClick={() => openAccount(acc)}
                  >
                    <span className="settings-row-lead">{acc.name}</span>
                    {rowChevron}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              className="btn btn-secondary add-account-btn"
              onClick={openNewAccount}
            >
              Add account
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
