# PLAN: What-if questions in Ask Worthfolio, with save-as-scenario

## Goal

Extend Ask Worthfolio beyond read-only questions so a user can ask
hypotheticals and get grounded, deterministic answers:

- "If I add a new account contributing $500/mo at 7% growth, what's my net
  worth in 15 years?"
- "If my brokerage's growth rate changes from 6% to 9%, what does that do?"
- "If I save $300 more each month, when do I reach my goal?"

Every what-if answer compares **baseline vs. hypothetical** and offers a
one-tap **"Save as scenario"** action that materializes the hypothetical into a
real scenario the user can keep exploring. The AI never writes data; the user
confirms the save, and the save is a local deterministic operation.

## Design principles (carried over from the v1 architecture)

1. **The model routes; the engine computes.** OpenAI's only new job is parsing
   the question into a validated, bounded `changes` spec. All simulation runs
   locally through the existing `generateForecast` engine. No numbers are ever
   produced by the LLM.
2. **The model never mutates.** Scenario creation is a client-side action
   behind an explicit user tap. The gateway stays read-only.
3. **Grounded answers only.** Hypothetical results are evidence records like
   everything else, pass through `validateStructuredAnswer`, and carry a new
   `hypothetical` kind badge plus a caveat that nothing has been saved.
4. **Parity invariant.** A scenario saved from a what-if must reproduce the
   simulated forecast exactly. This is tested, not assumed — if the saved
   scenario shows different numbers than the chat answer, user trust is gone.

---

## 1. The changes spec

A what-if is a list of 1–4 validated operations applied to a deep copy of the
active scenario's data:

```js
// add_account: a brand-new account in an existing category.
// startMonth is optional — omitted, the account opens at the forecast
// origin; set, it holds nothing until that future month, then opens at
// startingBalance and compounds from there ("starting in March 2027").
{ op: 'add_account', categoryId, name, startingBalance,
  monthlyContribution, annualGrowthPercent, startMonth? }

// set_growth: change an existing account's growth assumption
{ op: 'set_growth', accountId, annualGrowthPercent }

// set_contribution: change an existing account's monthly contribution
{ op: 'set_contribution', accountId, monthlyContribution }

// one_time_change: a windfall / sale / lump-sum payment at a future month
{ op: 'one_time_change', accountId, month, amount }
```

Validation (local, in `forecastInsights.js`, mirrored by the strict JSON
schema in the gateway tool definition):

- max 4 ops per question; ids must exist in the manifest
- `annualGrowthPercent` bounded to [-100, 100]
- `monthlyContribution` bounded to [-1_000_000, 1_000_000]; negative allowed
  only on liability-category accounts (extra debt payments)
- `startingBalance` bounded to [0, 1_000_000_000]
- `add_account.categoryId` must reference a `contributing` category when
  `monthlyContribution` is non-zero
- account `name` trimmed, length-capped (60 chars) — it enters the manifest on
  later turns, so treat it as untrusted like all other names
- `month` must be a future month within `MAX_FORECAST_MONTHS`

Out-of-bounds ops fail the whole simulation with a
`needs_clarification`-style reason; nothing is partially applied.

## 2. Engine prerequisite: explicit contribution assumption

Today `buildAccountModels` derives each account's contribution by averaging
recorded contribution months. A hypothetical (or a saved what-if scenario)
needs an explicit value that doesn't depend on history.

Add an optional per-account field `monthlyContribution` (number | null):

- `buildAccountModels`: if the category is contributing and
  `account.monthlyContribution != null`, use it directly and skip averaging.
- This is a forecasting assumption, so like `growth` and `contributing` it
  lives per-scenario and does not fan out to synced scenarios.

This one field is what makes save-as-scenario exact: both the simulation and
the saved scenario read the same assumption through the same code path.

### New-account history semantics

A hypothetical account has no recorded snapshots. Two engine tweaks keep the
coverage machinery honest instead of spamming warnings:

- Accounts with **zero recorded snapshots** are excluded from
  `incompleteMonths` / historical completeness checks — they didn't exist in
  the past, so old months aren't "incomplete" for missing them.
- The opening balance is an **assumption on the account**
  (`account.startingBalance`, consumed by `buildAccountModels` as the base when
  the account has no recorded history). What-ifs write **no snapshots at all**.

That second point is load-bearing, and the first implementation got it wrong by
seeding `snapshots[lastRecordedMonth + 1]` instead. `lastRecordedMonth + 1` is
the **current** month whenever this month is not yet recorded, so the seed
created a snapshot holding only the new account. `getHistory()` counts any
month with at least one entry as recorded, and `getNetWorth` reads absent
accounts as `|| 0` — so the current month flipped from estimated to recorded
with every other account showing $0. Worse, that fake month made `hasEdits`
true, and `clearMonthSnapshot` on a current-or-past month routes through
`setFactData`, which fans the deletion out to every linked scenario — so
resetting the bogus month destroyed real recorded data in the siblings.

Rule: a what-if must never write into `snapshots`. Assumptions live on the
account, where sync catch-up (which only replaces past months) cannot touch
them either.

## 3. New local tool: `simulate_what_if`

In `forecastInsights.js`:

```js
applyWhatIfChanges(data, changes)
// → { data: modifiedCopy, issues: [] } — pure, deep-copies, never mutates input

simulateWhatIf(context, { changes, metric, month, threshold, targetId })
// metric:   'value_at_month' (default) | 'goal_crossing'
// targetId: omitted/'portfolio' → net worth; a manifest account or category
//           id → that target compared against itself; 'new_account[:N]' → an
//           account this what-if creates, answered as a single value because
//           it has no baseline to compare against. A goal_crossing on any
//           non-portfolio target must carry its own threshold, since the
//           saved goal is a net worth figure.
```

`simulateWhatIf`:

1. Validates `changes`; on failure returns `{ status: 'unknown', reason }`.
2. Builds `hypotheticalDataset = createForecastDataset(applyWhatIfChanges(...))`
   with `scenarioId: 'whatif'`, `scenarioName: 'What-if'`.
3. Computes the same metric on **both** datasets:
   - `value_at_month`: `getValue` baseline + hypothetical at `month`, plus a
     derived **delta** evidence record (hypothetical − baseline)
   - `goal_crossing`: `findCrossing` on both against `threshold` (defaults to
     the saved goal), plus a derived **months-earlier/later** record
4. Returns `{ status, evidence: [baseline, hypothetical, delta], appliedChanges }`.

Evidence records from the hypothetical dataset get `kind: 'hypothetical'`.
The result echoes the validated `appliedChanges` so the UI can offer the save
action and replay it later — the UI never re-parses the question.

Wire into `executeAskTool` in `askWorthfolio.js` as `simulate_what_if`.

## 4. Gateway changes (`supabase/functions/ask-worthfolio/index.ts`)

- Add the `simulate_what_if` tool definition with a **strict** schema for the
  ops union (OpenAI structured outputs: use an `anyOf` of the four op shapes,
  all `additionalProperties: false`).
- `interpretInstructions` additions:
  - route hypothetical/what-if questions to `simulate_what_if`
  - copy amounts, rates, and horizons **verbatim** from the question; never
    invent defaults for missing amounts — use `respond_without_data` with
    `needs_clarification` instead
  - resolve "in N years" from `coverage.lastRecordedMonth` (existing rule)
- `answerInstructions` additions:
  - describe hypothetical evidence as "if you made this change", never as
    saved or guaranteed
  - always include the new caveat code
- Add caveat code `HYPOTHETICAL_NOT_SAVED` to `answerSchema.caveatCodes`.
- Bump interpret `max_output_tokens` 500 → 700 (the changes array is a larger
  argument payload than existing tools).
- Add `what_if_projection` to `supportedIntents` in `buildAskManifest`.

No auth, quota, CORS, or continuation changes — the two-phase flow is
untouched.

## 5. Save as scenario

### Data layer (`useData.js`)

```js
addForecastFromWhatIf(name, changes, { fromId } = {})
```

- Duplicates the source scenario (reuse `addForecast` internals), then applies
  `changes` **directly to the new scenario's slot** — never through
  `setFactData`, so nothing fans out to synced scenarios.
- Materialization per op:
  - `add_account` → real `acc_` id, account
    `{ name, growth, monthlyContribution, startingBalance }` appended to the
    category (no snapshot write — section 2)
  - `set_growth` / `set_contribution` → write `growth` /
    `monthlyContribution` on the account in this scenario only
  - `one_time_change` → future-month snapshot override for that account
- Focuses the new scenario and returns its id (matching `addForecast`).

### UI (`AskWorthfolio.jsx`)

- What-if answer cards render baseline, hypothetical, and delta evidence rows;
  `hypothetical` gets its own badge color next to `recorded`/`forecast`/`derived`.
- Below the answer: a **"Save as scenario"** action with a prefilled,
  editable, deterministic name derived from the ops locally (e.g.
  "What if: +Roth IRA $500/mo @ 7%") — no LLM call for naming.
- On save: call `addForecastFromWhatIf`, then mark the message saved
  ("Saved as *name* — now viewing it") so the button doesn't dangle. The panel
  header and thread already follow the active scenario, so focusing the new
  scenario swaps the thread per existing behavior.
- Persist `appliedChanges` (and saved-state) inside the stored message so the
  action survives reload; disable the button with a note if referenced ids no
  longer exist.
- New starter question: "What if I saved $200 more each month?" (requires at
  least one contributing account; otherwise falls to the existing
  `unavailable` path).
- Consent copy: add one line noting that hypothetical amounts in your question
  are sent to OpenAI like the rest of the question text (already true; make it
  explicit).

## 6. Guardrails recap

- All arithmetic local; LLM output is routing + prose only, still barred from
  typing currency/percent figures by `validateStructuredAnswer`.
- Changes spec double-validated: strict schema at the gateway, full semantic
  validation locally before execution.
- Simulation is pure — the active scenario's data is never touched until the
  user explicitly saves.
- Saved scenarios go through the existing scenario lifecycle (rename, delete,
  sync toggle) with zero new persistence surface.
- Bounded costs: same two calls per question; only the tool-definition and
  argument sizes grow.

## 7. Testing

- `forecast.test.js`: `buildAccountModels` honors `monthlyContribution`
  override; never-recorded accounts excluded from coverage checks.
- `forecastInsights.test.js`:
  - `applyWhatIfChanges` purity + each op + every validation bound
  - `simulateWhatIf` baseline/hypothetical/delta for both metrics
  - goal-crossing what-if with no saved goal → needs threshold
- `askWorthfolio.test.js`:
  - `executeAskTool('simulate_what_if', …)` wiring
  - **parity test**: simulate → materialize via the same changes →
    `createForecastDataset` on the saved scenario → identical forecast values
    at the queried month (the invariant in section "Design principles")
- Negative-contribution-on-asset rejected; liability extra-payment accepted
  and floors at 0 via the engine's existing `Math.max(0, …)`.

## 8. Milestones

1. **Engine** — `monthlyContribution` field, coverage tweaks, tests.
2. **Simulation** — changes spec, `applyWhatIfChanges`, `simulateWhatIf`,
   `executeAskTool` wiring, tests.
3. **Gateway** — tool definition, instructions, caveat code, manifest intent.
4. **Save-as-scenario** — `addForecastFromWhatIf`, answer-card action,
   parity test.
5. **Polish** — starter question, evidence badge styling, consent copy.

Each milestone ships independently; 1–2 are pure refactors invisible to users.

## Open questions

1. **Sync default for saved what-if scenarios.** Decided: saved what-if
   scenarios default to `linked: true` like every other scenario (balance
   updates still flow; the seed survives re-sync per section 2).
2. **Multi-turn refinement** ("okay, what about $800/mo?"). The transcript
   (last 8 messages) is already sent, so the interpreter can re-emit a full
   changes spec each turn — the spec must always be self-contained. Worth a
   dedicated instruction line and an eval question.
3. **Chart preview.** A small before/after sparkline (annual step,
   ≤ 24 points via the existing `get_series` bounds) inside the answer card
   would sell the delta visually. Suggested fast-follow, not v1.
