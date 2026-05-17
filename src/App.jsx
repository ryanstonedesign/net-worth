import { useState } from 'react'
import { useData } from './hooks/useData'
import { getCurrentMonth } from './utils'
import Dashboard from './pages/Dashboard'
import UpdateMonth from './pages/UpdateMonth'
import Manage from './pages/Manage'
import BottomNav from './components/BottomNav'

export default function App() {
  const [page, setPage] = useState('home')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const dataHook = useData()

  const sharedProps = { ...dataHook, selectedMonth, onMonthChange: setSelectedMonth }

  return (
    <>
      <div className="app-bg" />
      <div className="app-shell">
        <div className="page-content">
          {page === 'home' && (
            <Dashboard {...sharedProps} onNavigate={setPage} />
          )}
          {page === 'update' && (
            <UpdateMonth {...sharedProps} />
          )}
          {page === 'manage' && (
            <Manage {...dataHook} />
          )}
        </div>
        <BottomNav current={page} onChange={setPage} />
      </div>
    </>
  )
}
