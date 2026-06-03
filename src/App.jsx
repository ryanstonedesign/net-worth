import { useState } from 'react'
import { useData } from './hooks/useData'
import { useVault } from './hooks/useVault'
import { getCurrentMonth } from './utils'
import Dashboard from './pages/Dashboard'
import PrototypeSettings from './components/PrototypeSettings'
import AuthScreen from './components/AuthScreen'
import LockScreen from './components/LockScreen'
import RecoveryPhraseSetup from './components/RecoveryPhraseSetup'
import SetNewPasswordScreen from './components/SetNewPasswordScreen'

function VaultedApp({ initialData, onChange, onSignOut, onChangePassword, onGenerateRecovery }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const dataHook = useData({ initialData, onChange })

  return (
    <>
      <div className="app-bg" />
      <div className="app-shell" style={{ overflow: 'hidden' }}>
        <div className="page-content">
          <Dashboard
            {...dataHook}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        </div>
      </div>
      <PrototypeSettings
        scenario={dataHook.scenario}
        onScenarioChange={dataHook.setScenario}
        onSignOut={onSignOut}
        onChangePassword={onChangePassword}
        onGenerateRecovery={onGenerateRecovery}
      />
    </>
  )
}

function LegacyApp() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const dataHook = useData()

  return (
    <>
      <div className="app-bg" />
      <div className="app-shell" style={{ overflow: 'hidden' }}>
        <div className="page-content">
          <Dashboard
            {...dataHook}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        </div>
      </div>
      <PrototypeSettings scenario={dataHook.scenario} onScenarioChange={dataHook.setScenario} />
    </>
  )
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
        <SetNewPasswordScreen
          email={vault.user?.email}
          onSubmit={vault.completePasswordReset}
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
          onResetVault={vault.resetVault}
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
    />
  )
}
