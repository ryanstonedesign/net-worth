import { useState } from 'react'
import { useData } from './hooks/useData'
import { useVault } from './hooks/useVault'
import { getCurrentMonth } from './utils'
import Dashboard from './pages/Dashboard'
import PrototypeSettings from './components/PrototypeSettings'
import ScenarioBar from './components/ScenarioBar'
import ScenarioCarousel from './components/ScenarioCarousel'
import Modal from './components/Modal'
import AuthScreen from './components/AuthScreen'
import LockScreen from './components/LockScreen'
import RecoveryPhraseSetup from './components/RecoveryPhraseSetup'
import RestoreAccessScreen from './components/RestoreAccessScreen'

function NewScenarioModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const valid = name.trim().length > 0
  return (
    <Modal title="New Scenario" onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--c-ink-mute)', marginBottom: 20, lineHeight: 1.5 }}>
        Forks the scenario you're viewing so you can tweak categories and values
        to explore a different future. Your other scenarios stay untouched.
      </p>
      <div className="form-group">
        <label className="form-label">Scenario name</label>
        <input
          className="input"
          autoFocus
          placeholder="e.g. Buy a house"
          value={name}
          maxLength={40}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && valid) onSave(name) }}
        />
      </div>
      <button
        className="btn btn-primary btn-full"
        style={{ marginTop: 8 }}
        disabled={!valid}
        onClick={() => valid && onSave(name)}
      >
        Save
      </button>
    </Modal>
  )
}

// Shared shell for both vaulted and legacy modes: the dark scenario bar over the
// page content (or the scenario-switching carousel), plus the settings FAB.
function AppShell({ dataHook, settingsProps }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const [switching, setSwitching] = useState(false)
  const [centerId, setCenterId] = useState(dataHook.activeForecastId)
  const [createOpen, setCreateOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { forecasts, activeForecastId } = dataHook
  const nameOf = (id) => forecasts.find(f => f.id === id)?.name ?? 'Scenario'
  const barName = switching ? nameOf(centerId) : nameOf(activeForecastId)

  const toggleSwitch = () => {
    setSwitching(s => {
      if (!s) setCenterId(activeForecastId) // open centred on the focused scenario
      return !s
    })
  }

  const focusScenario = (id) => {
    dataHook.setActiveForecast(id)
    setSwitching(false)
  }

  const handleAdd = (name) => {
    dataHook.addForecast(name) // focuses the new scenario
    setCreateOpen(false)
    setSwitching(false)
  }

  const handleDelete = () => {
    if (forecasts.length <= 1) return
    const idx = forecasts.findIndex(f => f.id === centerId)
    const neighbour = forecasts[idx + 1] || forecasts[idx - 1]
    dataHook.deleteForecast(centerId)
    if (neighbour) setCenterId(neighbour.id)
  }

  return (
    <>
      <div className="app-bg" />
      <ScenarioBar
        name={barName}
        switching={switching}
        onToggleSwitch={toggleSwitch}
        onAdd={() => setCreateOpen(true)}
        onDelete={handleDelete}
        canDelete={forecasts.length > 1}
        onRename={(name) => dataHook.renameForecast(centerId, name)}
        onSettings={() => setSettingsOpen(true)}
      />

      <div className="app-shell has-scenario-bar" style={{ overflow: 'hidden' }}>
        {switching ? (
          <ScenarioCarousel
            key={forecasts.map(f => f.id).join('|')}
            scenarios={forecasts}
            centerId={centerId}
            getForecastData={dataHook.getForecastData}
            onCenterChange={setCenterId}
            onFocus={focusScenario}
          />
        ) : (
          <div className="page-content">
            <div className="scenario-stage" key={activeForecastId}>
              <Dashboard
                {...dataHook}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
              />
            </div>
          </div>
        )}
      </div>

      <PrototypeSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        scenario={dataHook.scenario}
        onScenarioChange={dataHook.setScenario}
        categories={dataHook.data.categories}
        selectedMonth={selectedMonth}
        onImport={dataHook.bulkImport}
        {...settingsProps}
      />

      {createOpen && (
        <NewScenarioModal onSave={handleAdd} onClose={() => setCreateOpen(false)} />
      )}
    </>
  )
}

function VaultedApp({
  initialData, onChange, onSignOut, onChangePassword, onGenerateRecovery, onDeleteAccount,
}) {
  const dataHook = useData({ initialData, onChange })
  return (
    <AppShell
      dataHook={dataHook}
      settingsProps={{ onSignOut, onChangePassword, onGenerateRecovery, onDeleteAccount }}
    />
  )
}

function LegacyApp() {
  const dataHook = useData()
  return <AppShell dataHook={dataHook} settingsProps={{}} />
}

export default function App() {
  const vault = useVault()

  if (vault.stage === 'legacy') return <LegacyApp />
  if (vault.stage === 'loading') return <div className="app-bg" />
  if (vault.stage === 'auth') {
    return (
      <>
        <div className="app-bg" />
        <AuthScreen
          onSignIn={vault.signIn}
          onSignUp={vault.signUp}
          onForgotPassword={vault.requestPasswordReset}
          error={vault.error}
        />
      </>
    )
  }
  if (vault.stage === 'recovery-reset') {
    return (
      <>
        <div className="app-bg" />
        <RestoreAccessScreen
          email={vault.user?.email}
          onRestore={vault.restoreAccess}
          onSignOut={vault.signOut}
        />
      </>
    )
  }
  if (vault.stage === 'lock') {
    return (
      <>
        <div className="app-bg" />
        <LockScreen
          email={vault.user?.email}
          onUnlock={vault.unlock}
          onSignOut={vault.signOut}
          onRecoveryUnlock={vault.unlockWithRecovery}
          error={vault.error}
        />
      </>
    )
  }
  // Right after signup we have a one-shot recovery phrase to show.
  if (vault.pendingRecoveryPhrase) {
    return (
      <>
        <div className="app-bg" />
        <RecoveryPhraseSetup
          phrase={vault.pendingRecoveryPhrase}
          onDone={vault.clearPendingRecoveryPhrase}
        />
      </>
    )
  }
  return (
    <VaultedApp
      initialData={vault.initialData}
      onChange={vault.pushData}
      onSignOut={vault.signOut}
      onChangePassword={vault.changePassword}
      onGenerateRecovery={vault.generateRecovery}
      onDeleteAccount={vault.deleteAccount}
    />
  )
}
