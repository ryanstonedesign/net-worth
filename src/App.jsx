import { useState } from 'react'

const noop = () => {}
import { useData } from './hooks/useData'
import { useVault } from './hooks/useVault'
import { getCurrentMonth } from './utils'
import Dashboard from './pages/Dashboard'
import PrototypeSettings from './components/PrototypeSettings'
import StickerSheet from './components/StickerSheet'
import TopNav from './components/TopNav'
import SideNav from './components/SideNav'
import { readonlyDashboardProps } from './components/readonlyDashboard'
import AuthScreen from './components/AuthScreen'
import LockScreen from './components/LockScreen'
import RecoveryPhraseSetup from './components/RecoveryPhraseSetup'
import RestoreAccessScreen from './components/RestoreAccessScreen'

// Shared shell for both vaulted and legacy modes: a side nav drawer behind the
// page content, a floating top nav (menu + scenario name + settings), and the
// scenario "push" entrance when a new scenario is created.
function AppShell({ dataHook, settingsProps }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const [menuOpen, setMenuOpen] = useState(false)
  // Bumped to tell the top nav to focus its name field — used right after
  // creating a scenario so it can be renamed immediately.
  const [focusNameSignal, setFocusNameSignal] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [stickerOpen, setStickerOpen] = useState(false)
  // How the live stage enters when activeForecastId changes: 'push' (slide in
  // from the right) right after creating a scenario, 'fade' for ordinary
  // switches. `outgoing` holds the scenario being pushed out to the left while
  // the push plays; it's cleared when its slide-out animation finishes.
  const [enterMode, setEnterMode] = useState('fade')
  const [outgoing, setOutgoing] = useState(null)

  const { forecasts, activeForecastId } = dataHook
  const nameOf = (id) => forecasts.find(f => f.id === id)?.name ?? 'Scenario'
  const barName = nameOf(activeForecastId)

  // Switch to a scenario from the side nav, then close the drawer.
  const handleSelect = (id) => {
    setEnterMode('fade')
    dataHook.setActiveForecast(id)
    setMenuOpen(false)
  }

  // Create + open a new scenario straight away (no naming modal), then focus the
  // name field so the default "New scenario" can be typed over. The new card
  // slides in from the right while the previous one (frozen) is pushed out left.
  const handleAdd = () => {
    setOutgoing({ id: activeForecastId }) // freeze the card leaving to the left
    setEnterMode('push')
    dataHook.addForecast('New scenario') // forks + focuses the new scenario
    setMenuOpen(false)
    setFocusNameSignal(n => n + 1)
  }

  const handleDelete = (id) => {
    if (forecasts.length <= 1) return
    dataHook.deleteForecast(id)
  }

  return (
    <>
      <div className="app-bg" />

      <SideNav
        open={menuOpen}
        scenarios={forecasts}
        activeId={activeForecastId}
        onSelect={handleSelect}
        onAdd={handleAdd}
        onDelete={handleDelete}
      />

      <div className={`app-shell${menuOpen ? ' nav-open' : ''}`} style={{ overflow: 'hidden' }}>
        <TopNav
          name={barName}
          focusNameSignal={focusNameSignal}
          onMenu={() => setMenuOpen(true)}
          onRename={(name) => dataHook.renameForecast(activeForecastId, name)}
          onSettings={() => setSettingsOpen(true)}
        />
        <div className="page-content">
          <div className="scenario-stage-track">
            {/* The scenario being left behind, frozen, sliding out to the
                left. Cleared once its slide finishes. */}
            {outgoing && (
              <div
                key={outgoing.id}
                className="scenario-stage scenario-stage--out"
                // animationend bubbles — only react to the slide-out itself,
                // not to any animation inside the frozen Dashboard.
                onAnimationEnd={(e) => { if (e.animationName === 'stagePushOut') setOutgoing(null) }}
              >
                <Dashboard
                  {...readonlyDashboardProps(dataHook.getForecastData(outgoing.id))}
                  selectedMonth={selectedMonth}
                  onMonthChange={noop}
                />
              </div>
            )}
            <div
              key={activeForecastId}
              className={
                'scenario-stage' +
                (enterMode === 'push' ? ' scenario-stage--push' : '') +
                (outgoing ? ' scenario-stage--transitioning' : '')
              }
            >
              <Dashboard
                {...dataHook}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
              />
            </div>
          </div>
        </div>
        {/* Tap the slid-aside content to close the drawer. */}
        {menuOpen && (
          <button
            className="nav-scrim"
            onClick={() => setMenuOpen(false)}
            aria-label="Close scenarios menu"
          />
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
        onOpenStickerSheet={() => { setSettingsOpen(false); setStickerOpen(true) }}
        {...settingsProps}
      />

      {stickerOpen && <StickerSheet onClose={() => setStickerOpen(false)} />}
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
