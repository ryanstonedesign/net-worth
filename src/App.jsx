import { useState } from 'react'

const noop = () => {}
import { useData } from './hooks/useData'
import { useVault } from './hooks/useVault'
import { useMediaQuery, DESKTOP_QUERY } from './hooks/useMediaQuery'
import { getCurrentMonth } from './utils'
import Dashboard from './pages/Dashboard'
import PrototypeSettings from './components/PrototypeSettings'
import StickerSheet from './components/StickerSheet'
import TopNav from './components/TopNav'
import SideNav from './components/SideNav'
import NewScenarioSheet from './components/NewScenarioSheet'
import { readonlyDashboardProps } from './components/readonlyDashboard'
import AuthScreen from './components/AuthScreen'
import LandingPage from './components/LandingPage'
import LockScreen from './components/LockScreen'
import RecoveryPhraseSetup from './components/RecoveryPhraseSetup'
import RestoreAccessScreen from './components/RestoreAccessScreen'

// Shared shell for both vaulted and legacy modes: a side nav (drawer on
// mobile, fixed sidebar on desktop), a floating top nav (menu + scenario name
// + settings on mobile; just the name on desktop), and the scenario "push"
// entrance when a new scenario is created.
function AppShell({ dataHook, settingsProps, userName }) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const [menuOpen, setMenuOpen] = useState(false)
  // Which settings view is open in the modal sheet: null (closed), 'main'
  // (full list, mobile), or a specific flow launched from the desktop popover.
  const [settingsView, setSettingsView] = useState(null)
  const [stickerOpen, setStickerOpen] = useState(false)
  // How the live stage enters when activeForecastId changes: 'push' (slide in
  // from the right) right after creating a scenario, 'fade' for ordinary
  // switches. `outgoing` holds the scenario being pushed out to the left while
  // the push plays; it's cleared when its slide-out animation finishes.
  const [enterMode, setEnterMode] = useState('fade')
  const [outgoing, setOutgoing] = useState(null)
  const [newOpen, setNewOpen] = useState(false)

  const { forecasts, activeForecastId } = dataHook
  const activeForecast = forecasts.find(f => f.id === activeForecastId)
  const barName = activeForecast?.name ?? 'Scenario'

  // Switch to a scenario from the side nav, then close the drawer.
  const handleSelect = (id) => {
    setEnterMode('fade')
    dataHook.setActiveForecast(id)
    setMenuOpen(false)
  }

  // "+" opens the creation sheet: name the scenario, pick which one to
  // duplicate, choose whether it stays synced with monthly updates.
  const handleAdd = () => {
    setMenuOpen(false)
    setNewOpen(true)
  }

  // Create + open the new scenario. The new card slides in from the right
  // while the previous one (frozen) is pushed out left.
  const handleCreate = ({ name, fromId, synced }) => {
    setNewOpen(false)
    setOutgoing({ id: activeForecastId }) // freeze the card leaving to the left
    setEnterMode('push')
    dataHook.addForecast(name, { fromId, linked: synced })
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
        desktop={isDesktop}
        scenarios={forecasts}
        activeId={activeForecastId}
        onSelect={handleSelect}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onRename={(id, name) => dataHook.renameForecast(id, name)}
        onToggleSync={(id, synced) => dataHook.setForecastSynced(id, synced)}
        userName={userName}
        onOpenSettings={() => { setMenuOpen(false); setSettingsView('main') }}
        settingsMenu={{
          scenario: dataHook.scenario,
          onScenarioChange: dataHook.setScenario,
          importDisabled: dataHook.scenario !== 'none',
          onImport: () => setSettingsView('import'),
          onOpenStickerSheet: () => setStickerOpen(true),
          onChangePassword: settingsProps.onChangePassword && (() => setSettingsView('change-password')),
          onShowRecovery: settingsProps.onGenerateRecovery && (() => setSettingsView('recovery-confirm')),
          onSignOut: settingsProps.onSignOut,
          onDeleteAccount: settingsProps.onDeleteAccount && (() => setSettingsView('delete')),
        }}
      />

      <div className={`app-shell${menuOpen ? ' nav-open' : ''}`} style={{ overflow: 'hidden' }}>
        <div className="top-nav-fade" />
        <TopNav
          name={barName}
          // Sync is only meaningful once a second scenario exists;
          // undefined hides the badge entirely.
          synced={forecasts.length > 1 ? !!activeForecast?.linked : undefined}
          onMenu={() => setMenuOpen(true)}
          onSettings={() => setSettingsView('main')}
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
        // Remount per view so a flow opened directly from the desktop popover
        // starts clean at that view.
        key={settingsView || 'closed'}
        open={!!settingsView}
        initialView={settingsView || 'main'}
        onClose={() => setSettingsView(null)}
        scenario={dataHook.scenario}
        onScenarioChange={dataHook.setScenario}
        categories={dataHook.data.categories}
        selectedMonth={selectedMonth}
        onImport={dataHook.bulkImport}
        onOpenStickerSheet={() => { setSettingsView(null); setStickerOpen(true) }}
        {...settingsProps}
      />

      {newOpen && (
        <NewScenarioSheet
          scenarios={forecasts}
          activeId={activeForecastId}
          onCreate={handleCreate}
          onClose={() => setNewOpen(false)}
        />
      )}

      {stickerOpen && <StickerSheet onClose={() => setStickerOpen(false)} />}
    </>
  )
}

function VaultedApp({
  user, initialData, onChange, onSignOut, onChangePassword, onGenerateRecovery, onDeleteAccount,
}) {
  const dataHook = useData({ initialData, onChange })
  // Accounts created before the sign-up flow captured a name fall back to
  // the email's local part.
  const userName = user?.user_metadata?.display_name
    || user?.email?.split('@')[0]
    || 'Account'
  return (
    <AppShell
      dataHook={dataHook}
      userName={userName}
      settingsProps={{ onSignOut, onChangePassword, onGenerateRecovery, onDeleteAccount }}
    />
  )
}

function LegacyApp() {
  const dataHook = useData()
  return <AppShell dataHook={dataHook} userName="Guest" settingsProps={{}} />
}

export default function App() {
  const vault = useVault()
  // While logged out we lead with the Worthfolio marketing landing page;
  // `authView` holds the mode to open the auth screen in once the visitor
  // chooses to sign in / get started (null = still on the landing page).
  const [authView, setAuthView] = useState(null) // 'signin' | 'signup' | null

  if (vault.stage === 'legacy') return <LegacyApp />
  if (vault.stage === 'loading') return <div className="app-bg" />
  if (vault.stage === 'auth') {
    return (
      <>
        <div className="app-bg" />
        {authView ? (
          <AuthScreen
            initialMode={authView}
            onSignIn={vault.signIn}
            onSignUp={vault.signUp}
            onForgotPassword={vault.requestPasswordReset}
            onBack={() => setAuthView(null)}
            error={vault.error}
          />
        ) : (
          <LandingPage
            onGetStarted={() => setAuthView('signup')}
            onSignIn={() => setAuthView('signin')}
          />
        )}
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
      user={vault.user}
      initialData={vault.initialData}
      onChange={vault.pushData}
      onSignOut={vault.signOut}
      onChangePassword={vault.changePassword}
      onGenerateRecovery={vault.generateRecovery}
      onDeleteAccount={vault.deleteAccount}
    />
  )
}
