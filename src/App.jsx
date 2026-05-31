import { useState, useCallback } from 'react'
import { useData } from './hooks/useData'
import { useVault } from './hooks/useVault'
import { getCurrentMonth } from './utils'
import Dashboard from './pages/Dashboard'
import PrototypeSettings from './components/PrototypeSettings'
import AuthScreen from './components/AuthScreen'
import LockScreen from './components/LockScreen'

function VaultedApp({ initialData, onChange, onSignOut }) {
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
  const handleChange = useCallback((data) => vault.pushData(data), [vault])

  if (vault.stage === 'legacy') return <LegacyApp />
  if (vault.stage === 'loading') return <div className="app-bg" />
  if (vault.stage === 'auth') {
    return (
      <>
        <div className="app-bg" />
        <AuthScreen onSignIn={vault.signIn} onSignUp={vault.signUp} error={vault.error} />
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
          error={vault.error}
        />
      </>
    )
  }
  return (
    <VaultedApp
      initialData={vault.initialData}
      onChange={handleChange}
      onSignOut={vault.signOut}
    />
  )
}
