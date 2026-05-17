import { useData } from './hooks/useData'
import { getCurrentMonth } from './utils'
import { useState } from 'react'
import Dashboard from './pages/Dashboard'

export default function App() {
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
    </>
  )
}
