# Plan: Forecast chat — asking questions about your numbers

## Scope

Ask questions in plain language and get answers grounded in your actual
data. **Read-only.** The chat never creates an account, never edits a
balance, never changes a growth rate, never touches a scenario.

- "What's my net worth going to be in 2036?"
- "How long until the Visa is paid off at this rate?"
- "How much did my brokerage grow last year?"
- "Which category is dragging me down?"
- "Am I on track for my goal?"

The hard requirement: **it must look up real values.** Not vibes, not
approximations — the actual balances in the vault and the actual output of
the forecast engine.

Scoping out the write side removes the entire blocker from the previous
draft of this plan. That version needed a dated-event model in the
forecast engine before chat could do anything, because the engine can't
express "start funding this in five years." Answering questions needs
none of that — the engine already computes everything a question could ask
about. What's left is plumbing.

## The core idea: your code computes, the model narrates

> **Every number the model can say is a number your code computed and
> handed to it. The model does no arithmetic.**

LLMs are unreliable at compounding a rate over 120 months and excellent at
reading a table and explaining it. So we build a **briefing payload** — a
complete, precomputed picture of the active scenario — send it with the
question, and instruct the model to answer *only* from it and to say "I
don't have that" otherwise.

This is why "look up real values" is achievable without a tool-calling
agent loop: your dataset is small enough that we can precompute the
answers to essentially every numeric question in advance, so the model is
doing lookup, not math.

---

## Part 1 — The briefing payload

### What's in it

Built fresh on each question from the active scenario:

```js
{
  asOf: '2026-08',
  scenario: { name: 'Default Scenario', synced: true },

  // Structure + assumptions
  categories: [
    { id, name, type: 'asset'|'liability', contributing: true,
      accounts: [{ id, name, growth: '7' }] },
  ],

  // Real recorded history — every month, per account, plus net worth
  history: {
    months: ['2025-09', ...],
    netWorth:   [412300, ...],
    assets:     [...], liabilities: [...],
    accounts: { acc_9: [4200, 4050, ...] },
    contributions: { acc_3: [500, 500, ...] },
  },

  // Engine output — same call the chart makes, run to the app's full ceiling
  horizon: { origin: '2026-08', end: '2076-08', months: 600 },
  forecast: {
    netWorth: { '2026-09': 415100, ... },          // monthly, all 600
    accounts: { acc_9: { '2027-08': 1200, ... } }, // annual checkpoints
  },

  // Precomputed derived facts, so the model never divides
  derived: {
    currentNetWorth, monthOverMonth, yearOverYear,
    horizons: { '1y': ..., '3y': ..., '5y': ..., '10y': ... },
    byCategory: { cat_1: { current, share, yoy } },
    goal: { amount: 500000, reachedOn: '2031-04', monthsAway: 56 },
    payoff: { acc_9: '2028-11' },   // when each liability hits zero
    biggestMover: { accountId: 'acc_3', delta: 8400, window: '12mo' },
  },

  // Other scenarios, headline only — enough to compare
  otherScenarios: [{ name: 'Market Downturn', currentNetWorth, at10y }],
}
```

The `derived` block is what does the real work. "How long until the Visa
is paid off" becomes reading `derived.payoff.acc_9` — not asking a
language model to solve for a zero crossing. Every entry there is a
function in `forecast.js` with a unit test.

### How far ahead: 600 months (50 years)

That's the app's own ceiling, and it's asserted in two independent places
in `Dashboard.jsx`: `MAX_FORECAST_MONTHS = 600` clamps the Custom range
(so typing "2200" gets you 50 years, not 174), and the goal-ETA search
uses its own `GOAL_HORIZON = 600`. The briefing must use the same number —
if it projected a different distance, the chat could disagree with the
goal label printed on the chart.

Note it's 600 months from `lastDataMonth`, not from today, so a user who
hasn't updated in six months has a horizon ending six months earlier than
they'd guess. The payload carries `horizon.end` as an absolute month, and
the model should quote absolute dates rather than "in 50 years."

### What full coverage actually costs

Measured on a representative 13-account scenario at 600 months:

| Series | Size | ~Tokens |
|---|---|---|
| Net worth, monthly, all 600 | 10.4 KB | ~3,800 |
| + assets & liabilities, monthly | 19.6 KB | ~7,200 |
| All accounts × annual checkpoints (50 pts) | 10.7 KB | ~3,900 |
| **All accounts × all 600 months** | **126.6 KB** | **~46,300** |

That last row is the finding. Complete per-account monthly detail across
50 years can't ride along in every request — not mainly for cost, but
because recall over 46k tokens of near-identical numeric rows is exactly
where models start reading the wrong line, which defeats the point.

So: **tier it.**

**Eager, in every request (~8k tokens):**
- Net worth monthly, all 600 months — the headline series, complete
- Every account at annual checkpoints, all 50 years — shape and context
- The `derived` block and the structure (both small)
- History: full monthly for the last 36 months, quarterly before that

**On demand, via tools (see below):** any account at any single month, any
window at any granularity, any crossing.

One encoding detail that matters: **key every point by its month string,
never send bare arrays.** `{"2041-03": 812400}` costs ~30% more than a
flat array but makes lookup a string match instead of counting to the
183rd element — and counting offsets is precisely the thing to keep away
from a language model.

Recompute the payload per turn (data may have changed) but keep it out of
the stored transcript. Put it at the *front* of the prompt with the
question last, so OpenAI's automatic prefix caching hits on every turn
after the first in a conversation.

### Where it comes from

**Phase 0 is a pure refactor:** move `buildAccountModels`,
`generateForecast`, `monthIndex`, and `customForecastCount` out of
`Dashboard.jsx` (lines 15–112) into `src/lib/forecast.js`, unchanged.
Right now the engine only exists inside the Dashboard's render, and the
chat panel is a sibling in `AppShell` — it needs to run projections
independently. `src/lib/briefing.js` then builds the payload on top of
`forecast.js` plus the pure helpers already in `utils.js`
(`netWorthAt`, `dataHistory`, `dataTotals`).

Two edge cases the extraction should fix while we're in there:

- `lastDataMonth` is null when there are no snapshots at all, so
  `forecastCount` is 0 and the forecast is empty. A new user asking "what
  will I be worth in ten years?" gets nothing. Fall back to
  `currentMonth` as the origin when categories exist.
- The Dashboard caps the horizon at the selected range; the briefing
  should always project the full 600 months regardless of which range
  pill is active, so answers don't depend on invisible UI state.

---

## Part 2 — The AI plumbing

### Where the call goes

`vite.config.js` locks `connect-src` to `'self'` and Supabase, so
`api.openai.com` is blocked today. Add it to the CSP and call OpenAI
**directly from the browser with your own key**. No proxy, no Edge
Function, nothing passing through the app's server — which keeps the E2E
story as intact as it can be for a feature that by definition sends your
data somewhere.

Build it as a thin adapter (`src/lib/ai.js`) with one `ask()` function
behind which the provider lives, so switching providers or moving to a
server-side proxy later is a swap rather than a rewrite.

Key storage: `localStorage`, device-local. Zero schema change, and
re-entering it on a second device is a small price. Moving it into the
encrypted vault so it syncs is a later one-field follow-up.

### The privacy call — stated plainly

Answering questions about real values means **the real values go to
OpenAI**: balances, account names, history, projections. There's no clever
way around it — a model can't tell you your brokerage grew 12% without
seeing the brokerage. My previous draft could keep amounts on-device
because a plan-writing model only needs ids and names; a question-
answering model needs the numbers themselves.

So the mitigations are honest ones, not technical sleight of hand:

- **Off until you turn it on.** No key, no feature — the panel shows a
  setup CTA and nothing is sent.
- **A consent screen that names OpenAI**, lists exactly what the payload
  contains, and says it leaves the encrypted vault. Shown once, revisitable
  in settings.
- **A kill switch** in settings that clears the key and hides the panel.
- **Your key, your account** — requests go browser → OpenAI, revocable at
  any time, never through our server, and the app ships no third-party
  scripts that could read it.
- **Optional name redaction** (worth building only if it bothers you):
  replace account names with generic labels — `Brokerage A`, `Card B` —
  keeping types and categories, which is most of what the model needs for
  context. Un-map them in the displayed answer. OpenAI then sees numbers
  without institution names attached.

### Lookup tools — now required, not optional

An earlier draft of this plan deprioritized tool calling as a v1 nicety.
Requiring answers across every month the app supports reverses that: the
table above shows complete per-account monthly detail is ~46k tokens, so
it can't be eager, and the annual checkpoints that *are* eager leave gaps
between them. Without tools, "what's my brokerage worth in March 2041?"
falls between checkpoints and the model interpolates — arithmetic, which
is the one thing this design forbids.

Four tools close the gap completely. Each is a thin wrapper over
`forecast.js`, executed **locally in the browser** against data already in
memory:

| Tool | Returns |
|---|---|
| `get_month(month)` | Full per-account + category breakdown at any one of the 600 months |
| `get_series(target, from, to, step)` | Any account or total, any window, monthly/quarterly/annual |
| `find_crossing(target, value)` | When a balance crosses a threshold — payoff dates, goal dates, "when do I hit $1M" |
| `compare_scenarios(month)` | Every scenario's net worth at a month |

Together with the eager series, that's genuine complete coverage: any
month, any account, exact engine values, zero model arithmetic. It also
gets the privacy property back that the eager payload gives up — a
question about one account pulls one account.

Cost is a 2–4 round-trip agent loop on the questions that need it, versus
one round trip for anything the eager briefing already answers. Streaming
plus a "checking your 2041 balances…" status line covers the latency.

### The hallucination guard

Two layers, both cheap:

1. **System prompt discipline** — answer only from the payload; never
   compute a figure that isn't in it; if the answer isn't there, say so;
   always name the month and account a figure came from.
2. **A number check.** After the reply comes back, extract every currency
   figure and percentage from it and verify each against the set of values
   actually in the payload (with rounding tolerance). Anything unmatched
   gets flagged inline — a subtle marker rather than a hidden lie.

That second one is the difference between "probably right" and
"verifiably grounded," and it's maybe 40 lines. It's also the thing that
tells you, in real use, whether the briefing has gaps worth closing with
tools.

### Chat UX

Deliberately small, since there's no propose/preview/apply flow to build:

- Full-height sheet on mobile (the existing `Modal` primitive), right-hand
  drawer on desktop. Entry point beside the month selector or in the side
  nav.
- **Scoped to the active scenario**, with its name in the header — "how am
  I doing" means something different in Market Downturn than in Default.
  Switching scenarios starts a fresh thread.
- Streaming the reply token-by-token, since a grounded answer over a 5k
  payload takes a couple of seconds.
- A few starter chips on the empty state ("What's my net worth in 10
  years?", "When do I hit my goal?") — the fastest way to teach the
  feature's range without documentation.
- Transcript persisted per scenario in the container so it survives a
  reload (encrypted with everything else), capped at ~20 turns. The
  briefing is never stored in the transcript, only the messages.

Voice input is `SpeechRecognition` on the same text box — a small add-on
once the text path works.

---

## Phasing

| Phase | Scope | Effort |
|---|---|---|
| **0** | Extract `src/lib/forecast.js` from `Dashboard.jsx`; fix the empty-history origin and horizon caps | Half a session |
| **1** | `src/lib/briefing.js` — tiered payload builder + the `derived` block, with tests | 1 session |
| **2** | AI plumbing: CSP entry, key setting, consent screen, `ai.js` adapter, streaming | 1 session |
| **3** | The four lookup tools + the local execution loop | 1 session |
| **4** | Chat sheet: transcript, per-scenario scoping, starter chips, number check | 1 session |
| **5** | Polish: name redaction, voice input, tool-status affordances | ongoing |

Phase 0 and most of phase 1 are useful regardless — extracting the engine
and getting `payoff` / `goal ETA` / `biggestMover` as tested pure
functions is groundwork the app wants either way.

### Testing

No test infrastructure exists in the repo today, and `forecast.js` and
`briefing.js` are exactly the code that should have it: pure functions, no
DOM, and the entire trust story rests on them being right. Add `vitest`
and cover the engine plus every `derived` metric. The number-check
verifier gets tests too, against a handful of recorded model replies. No
network in tests.

---

## Deliberately out of scope

No writes of any kind. Worth naming the two that will be tempting:

- **Navigation** ("show me March 2033" jumping the month selector) is
  non-destructive and a natural first extension, but it's still the model
  driving the UI. Left out of v1 on purpose.
- **Taking actions** — creating accounts, planning payoffs, applying
  what-ifs — needs a dated-event model in the forecast engine before it
  can work at all. That design is written up in the first commit on this
  branch if it ever comes back.

## Decisions I need from you

1. **Redaction** — ship with real account names in the payload (simpler,
   better answers), or generic labels from the start?
2. **Transcript persistence** — keep threads in the encrypted vault so
   they follow you across devices, or ephemeral per session?
3. **The 50-year ceiling itself** — 600 months is the app's current limit,
   and the briefing now matches it exactly. If you want answers past 2076,
   that's a one-constant change in `forecast.js` and the eager net worth
   series grows ~6 tokens per extra month. Worth raising, or is 50 years
   already past the point of meaning?
