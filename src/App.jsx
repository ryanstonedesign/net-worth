import { useState } from 'react'
import { useData } from './hooks/useData'
import { useVault } from './hooks/useVault'
import { getCurrentMonth, formatMonthDisplay } from './utils'
import Dashboard from './pages/Dashboard'
import PrototypeSettings from './components/PrototypeSettings'
import ScenarioBar from './components/ScenarioBar'
import ScenarioCarousel from './components/ScenarioCarousel'
import AuthScreen from './components/AuthScreen'
import LockScreen from './components/LockScreen'
import RecoveryPhraseSetup from './components/RecoveryPhraseSetup'
import RestoreAccessScreen from './components/RestoreAccessScreen'

// Shared shell for both vaulted and legacy modes: the dark scenario bar over the
// page content (or the scenario-switching carousel), plus the settings FAB.
function AppShell({ dataHook, settingsProps }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const [switching, setSwitching] = useState(false)
  const [centerId, setCenterId] = useState(dataHook.activeForecastId)
  // Bumped to tell the scenario bar to focus its name field — used right after
  // creating a scenario so it can be renamed immediately.
  const [focusNameSignal, setFocusNameSignal] = useState(0)
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

  // Create + open a new scenario straight away (no naming modal), then focus the
  // name field so the default "New scenario" can be typed over.
  const handleAdd = () => {
    dataHook.addForecast('New scenario') // forks + focuses the new scenario
    setSwitching(false)
    setFocusNameSignal(n => n + 1)
  }

  const handleDelete = () => {
    if (forecasts.length <= 1) return
    const idx = forecasts.findIndex(f => f.id === centerId)
    const neighbour = forecasts[idx + 1] || forecasts[idx - 1]
    dataHook.deleteForecast(centerId)
    if (neighbour) setCenterId(neighbour.id)
  }

  const barProps = {
    name: barName,
    switching,
    focusNameSignal,
    onToggleSwitch: toggleSwitch,
    onAdd: handleAdd,
    onDelete: handleDelete,
    canDelete: forecasts.length > 1,
    onRename: (name) => dataHook.renameForecast(switching ? centerId : activeForecastId, name),
    onSettings: () => setSettingsOpen(true),
  }

  return (
    <>
      <div className="app-bg" />
      {/* While switching, the bar floats fixed over the carousel. In the normal
          view it lives inside the scroll content (below) so it scrolls out of
          sight as you scroll, while staying tappable on load. */}
      {switching && <ScenarioBar {...barProps} />}

      <div className="app-shell has-scenario-bar" style={{ overflow: 'hidden' }}>
        {switching ? (
          <>
            <ScenarioCarousel
              key={forecasts.map(f => f.id).join('|')}
              scenarios={forecasts}
              centerId={centerId}
              selectedMonth={selectedMonth}
              getForecastData={dataHook.getForecastData}
              onCenterChange={setCenterId}
              onFocus={focusScenario}
            />
            <div className="scenario-switch-month">{formatMonthDisplay(selectedMonth)}</div>
          </>
        ) : (
          <div className="page-content">
            <ScenarioBar {...barProps} />
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
