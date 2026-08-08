import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  STARTER_QUESTIONS,
  answerStarterQuestion,
  askWorthfolio,
  clearAskThread,
  deriveWhatIfName,
  hasAskConsent,
  loadAskThread,
  saveAskThread,
  setAskConsent,
} from '../lib/askWorthfolio'
import { formatMonthDisplay } from '../utils'

// Height the compose box grows to before it starts scrolling instead.
const MAX_COMPOSE_HEIGHT = 160

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3z" />
      <path d="M18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
      <path d="M5 13l.7 1.8 1.8.7-1.8.7L5 18l-.7-1.8-1.8-.7 1.8-.7L5 13z" />
    </svg>
  )
}

function messageText(result) {
  const facts = result.evidence.map(record => `${record.targetName}: ${record.display} (${record.month})`).join('; ')
  return [result.answer.intro, facts, result.answer.explanation].filter(Boolean).join(' ')
}

function AnswerResult({ result }) {
  const evidenceById = useMemo(
    () => new Map((result.evidence || []).map(record => [record.id, record])),
    [result.evidence],
  )
  const facts = (result.answer.facts || [])
    .map(fact => evidenceById.get(fact.evidenceId))
    .filter(Boolean)

  return (
    <div className="ask-answer">
      <p>{result.answer.intro}</p>
      {facts.length > 0 && (
        <div className="ask-evidence-list">
          {facts.map(record => (
            <div className="ask-evidence" key={record.id}>
              <div className="ask-evidence-main">
                <span className="ask-evidence-name">{record.targetName}</span>
                <strong>{record.display}</strong>
              </div>
              <div className="ask-evidence-meta">
                <span className={`ask-kind ask-kind--${record.kind}`}>{record.kind}</span>
                <span>{formatMonthDisplay(record.month)}</span>
                {record.scenarioName && <span>{record.scenarioName}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {result.answer.explanation && <p className="ask-answer-explanation">{result.answer.explanation}</p>}
    </div>
  )
}

// Follow-up action under a what-if answer: an editable prefilled name and a
// save button. Saving replays the validated changes spec locally — no AI call.
function SaveWhatIf({ message, onSave }) {
  const [name, setName] = useState(() => deriveWhatIfName(message.result.whatIf.changes))

  if (message.savedScenario) {
    return <div className="ask-whatif-saved">Saved as “{message.savedScenario.name}” — now viewing it.</div>
  }

  return (
    <div className="ask-whatif">
      <div className="ask-whatif-hint">Keep exploring this? Save it as a scenario.</div>
      <div className="ask-whatif-row">
        <input
          value={name}
          maxLength={80}
          aria-label="Scenario name"
          onChange={event => setName(event.target.value)}
        />
        <button className="btn btn-primary" onClick={() => onSave(message, name)}>Save as scenario</button>
      </div>
      {message.saveError && <div className="ask-whatif-error">{message.saveError}</div>}
    </div>
  )
}

function Consent({ onEnable, onClose }) {
  return (
    <div className="ask-consent">
      <div className="ask-consent-icon"><SparkleIcon /></div>
      <h2>Ask questions about your numbers</h2>
      <p>
        Worthfolio calculates answers from your recorded balances and forecast assumptions, then uses OpenAI to help understand and explain your question.
      </p>
      <div className="ask-consent-card">
        <strong>Before you continue</strong>
        <ul>
          <li>Your question, relevant account names, and only the financial values needed for the answer leave your encrypted vault. Amounts you type into what-if questions travel with the question.</li>
          <li>Requests pass through Worthfolio’s secure gateway to OpenAI.</li>
          <li>OpenAI may retain API content for up to 30 days for abuse monitoring, depending on Worthfolio’s account controls. API data is not used to train models by default.</li>
          <li>Answers explain your data and are not financial advice.</li>
        </ul>
      </div>
      <div className="ask-consent-actions">
        <button className="btn btn-secondary" onClick={onClose}>Not now</button>
        <button className="btn btn-primary" onClick={onEnable}>Enable Ask Worthfolio</button>
      </div>
    </div>
  )
}

export default function AskWorthfolio({ onClose, context, userKey, signedIn, onSaveWhatIf }) {
  const scenarioId = context.activeScenario.id
  const [enabled, setEnabled] = useState(() => hasAskConsent(userKey))
  const [messages, setMessages] = useState(() => loadAskThread(userKey, scenarioId))
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  useEffect(() => {
    setMessages(loadAskThread(userKey, scenarioId))
  }, [scenarioId, userKey])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, status])

  // Desktop docks the panel beside the page instead of over it; the shell
  // reads this class to make room. Harmless on mobile, where the CSS ignores it.
  useEffect(() => {
    document.body.classList.add('ask-docked')
    return () => document.body.classList.remove('ask-docked')
  }, [])

  // Grow the compose box with its content, then scroll past the ceiling.
  useEffect(() => {
    const field = inputRef.current
    if (!field) return
    field.style.height = 'auto'
    field.style.height = `${Math.min(field.scrollHeight, MAX_COMPOSE_HEIGHT)}px`
  }, [draft, enabled])

  const persist = next => {
    const saved = saveAskThread(userKey, scenarioId, next)
    setMessages(saved)
  }

  const appendResult = (question, result) => {
    const now = Date.now()
    persist([
      ...messages,
      { id: `u_${now}`, role: 'user', text: question },
      { id: `a_${now}`, role: 'assistant', text: messageText(result), result },
    ])
  }

  const runStarter = starter => {
    if (busy) return
    const result = answerStarterQuestion(starter.id, context)
    appendResult(starter.label, result)
  }

  const submit = async event => {
    event?.preventDefault()
    const question = draft.trim()
    if (!question || busy) return
    if (!signedIn) {
      const result = {
        answer: {
          status: 'unsupported',
          intro: 'Sign in to ask a custom question. The starter questions still calculate locally on this device.',
          facts: [], explanation: '', caveatCodes: [], evidenceIds: [],
        },
        evidence: [],
      }
      setDraft('')
      appendResult(question, result)
      return
    }

    const before = messages
    const pendingUser = { id: `u_${Date.now()}`, role: 'user', text: question }
    setMessages([...before, pendingUser])
    setDraft('')
    setBusy(true)
    setStatus('Choosing the right calculation…')
    try {
      const result = await askWorthfolio(question, context, before)
      setStatus('Verifying the answer…')
      const next = [
        ...before,
        pendingUser,
        { id: `a_${Date.now()}`, role: 'assistant', text: messageText(result), result },
      ]
      persist(next)
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Ask Worthfolio is temporarily unavailable.'
      persist([...before, pendingUser, { id: `e_${Date.now()}`, role: 'assistant', text, error: true }])
    } finally {
      setBusy(false)
      setStatus('')
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  // Persist the saved/error marker into this (pre-switch) scenario's thread
  // before the save flips the active scenario and the panel swaps threads.
  const saveWhatIf = (message, name) => {
    const clean = (name || '').trim() || deriveWhatIfName(message.result.whatIf.changes)
    const id = onSaveWhatIf?.(clean, message.result.whatIf.changes)
    persist(messages.map(existing => existing.id === message.id
      ? (id
          ? { ...existing, savedScenario: { name: clean }, saveError: null }
          : { ...existing, saveError: 'This what-if no longer matches your accounts, so it could not be saved.' })
      : existing))
  }

  const clear = () => {
    clearAskThread(userKey, scenarioId)
    setMessages([])
  }

  return createPortal(
    <div className="ask-overlay" onClick={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section className="ask-panel" role="dialog" aria-modal="true" aria-label="Ask Worthfolio">
        <header className="ask-head">
          <div>
            <div className="ask-title"><SparkleIcon /> Ask Worthfolio</div>
            <div className="ask-scenario">{context.activeScenario.name}</div>
          </div>
          <div className="ask-head-actions">
            {enabled && messages.length > 0 && <button onClick={clear}>Clear</button>}
            <button className="btn-icon" onClick={onClose} aria-label="Close Ask Worthfolio">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </header>

        {!enabled ? (
          <div className="ask-scroll"><Consent onClose={onClose} onEnable={() => { setAskConsent(userKey, true); setEnabled(true) }} /></div>
        ) : (
          <>
            <div className="ask-scroll" aria-live="polite">
              {messages.length === 0 && (
                <div className="ask-empty">
                  <div className="ask-empty-mark"><SparkleIcon /></div>
                  <h2>What would you like to understand?</h2>
                  <p>Choose a question or ask your own. Worthfolio calculates the numbers before explaining them.</p>
                  <div className="ask-starters">
                    {STARTER_QUESTIONS.map(starter => (
                      <button key={starter.id} onClick={() => runStarter(starter)}>{starter.label}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="ask-messages">
                {messages.map(message => (
                  <div className={`ask-message ask-message--${message.role}${message.error ? ' ask-message--error' : ''}`} key={message.id}>
                    {message.role === 'assistant' && message.result
                      ? (
                          <>
                            <AnswerResult result={message.result} />
                            {message.result.whatIf?.changes?.length > 0
                              && message.result.answer.status === 'answered'
                              && onSaveWhatIf
                              && <SaveWhatIf message={message} onSave={saveWhatIf} />}
                          </>
                        )
                      : <p>{message.text}</p>}
                  </div>
                ))}
                {busy && (
                  <div className="ask-message ask-message--assistant ask-message--thinking">
                    <span className="ask-thinking-dot" /><span className="ask-thinking-dot" /><span className="ask-thinking-dot" />
                    <span>{status}</span>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            </div>

            <footer className="ask-compose">
              <form onSubmit={submit}>
                <textarea
                  ref={inputRef}
                  value={draft}
                  maxLength={500}
                  rows={1}
                  placeholder="Ask about your forecast…"
                  disabled={busy}
                  onChange={event => setDraft(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      submit()
                    }
                  }}
                />
                <button type="submit" disabled={busy || !draft.trim()} aria-label="Ask question">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </form>
            </footer>
          </>
        )}
      </section>
    </div>,
    document.body,
  )
}
