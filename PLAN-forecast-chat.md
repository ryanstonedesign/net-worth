# Plan: Forecast chat — describing the future in plain language

## What you're asking for

Type (or say) a sentence and have the forecast change:

- "In five years I want to open a brokerage account with $10k."
- "In two years I want this Visa paid off."
- "In ten years I buy a rental property for $400k, appreciating 4% a year."

Today each of those is a manual chore: create the account, scroll the month
selector out to 2031, type a balance into that month, open the category
sheet, set a growth rate, and — for anything involving ongoing funding —
type the same contribution into every future month one at a time.

## The real blocker isn't the AI

It's tempting to read this as "add a chat box that calls the existing
mutators." That doesn't work, because **the forecast engine has no concept
of a dated future event.** Everything it knows is in `Dashboard.jsx`
(`buildAccountModels` / `generateForecast`, lines 44–112):

- an account's `base` — its most recent recorded balance
- a single `annual` growth rate that applies for all time
- a single average `contribution` that applies for all time
- per-month balance overrides in `snapshots`, and per-month contribution
  overrides in `contributions`

Check the three sentences above against that model:

| Sentence | Expressible today? |
|---|---|
| Open an account in 5 years with $10k | Partly — create the account now (it sits at $0 in every card for five years) and write a `snapshots['2031-08']` override. |
| Fund it $500/mo from then on | **No.** `generateForecast` reads `contributions[month][accId]` for that month only, falling back to the *historical average*. A plan starting in 2031 means writing 500 into all ~240 remaining months. |
| Pay off the Visa by 2028-03 | **No.** You can set a `-22%` annual decay and eyeball it, or drop a hard `0` override into 2028-03 and get a cliff in the chart. Neither is "pay this off by then." |
| Buy a property in 10 years, 4% growth | **No.** Growth is one number for all time; there's no "starts in 2036," no down payment leaving Savings, no mortgage appearing as a liability. |

So the chat feature is the front door to a capability the app doesn't have
yet. The plan below builds that capability first, as something usable on
its own, and puts the LLM on top of it as a translator.

## The core idea: the model writes plans, never numbers

One rule governs the whole design:

> **The LLM converts English into a list of typed, dated events. The
> existing deterministic engine computes every dollar.**

The model never returns a balance, a projection, or a payment amount. It
returns `{ kind: 'payoff', accountId: 'acc_123', by: '2028-03' }` and the
engine solves the payment. That buys us:

- **Auditability** — every number on screen still comes from code you can
  read and unit-test. No hallucinated arithmetic.
- **Reversibility** — events are declarative data with ids. Undo is
  deleting one. Compare that to letting the model call `addAccount` and
  `updateContributions` directly: those are irreversible, and the fact
  mutators fan out to every synced scenario (`setFactData` in
  `useData.js`), so a bad guess would corrupt your other scenarios too.
- **Privacy** — translating "this Visa" into an account id needs *names
  and ids*, not balances. The default context we send contains no money.
  See "What leaves the vault" below.
- **A non-AI fallback** — the event list gets its own plain UI, so the
  feature degrades to a normal (good) editor if you have no API key,
  and you can always fix a misunderstood request by hand.

---

## Part 1 — The event model (no AI involved)

### Storage

A new per-scenario array, alongside `categories` / `snapshots` /
`contributions` / `goal`:

```js
data.events = [
  { id: 'ev_...', createdAt, source: 'chat' | 'manual', note: 'Open brokerage', ...event },
]
```

Events are **assumptions**, not facts, in the sense
`PLAN-scenario-inheritance.md` establishes: they describe a hypothetical
future, so they live in one scenario and never fan out. They go through
plain `setData`, like `growth` and `goal`.

This forces one extension to that document's rule, worth stating
explicitly: **a planned account is an assumption, not a structural fact.**
An account created by an `open_account` event carries an `openFrom` month
and stays local to its scenario, unlike `addAccount`, which fans out.
"What if I open a rental account in 2036" must not add a $0 rental account
to your Default scenario. When that month actually arrives and you record
a real balance, the normal fact path takes over from there.

### Event kinds

| Kind | Fields | Meaning |
|---|---|---|
| `open_account` | `at`, `categoryId` \| `categoryName`+`type`+`icon`, `accountName`, `initial`, `growth?` | Account springs into existence at `at` with `initial`. Stored as a real account with `openFrom: at`. |
| `fund` | `accountId`, `from`, `to?`, `amount` | Contribute `amount`/mo over the window. Open-ended if `to` is null. |
| `payoff` | `accountId`, `by`, `from?` | Solve the monthly payment that lands the balance on $0 at `by`. |
| `lump_sum` | `accountId`, `at`, `amount` | One-off deposit (+) or withdrawal (−). |
| `transfer` | `fromAccountId`, `toAccountId`, `at`, `amount` | A `lump_sum` pair — down payments, moving cash into an investment. |
| `set_growth` | `accountId`, `from`, `growth` | Growth rate changes at a date ("market cools after 2030"). |
| `set_balance` | `accountId`, `at`, `value` | Today's future override, expressed as an event so it's listable and undoable. |
| `close_account` | `accountId`, `at`, `proceedsTo?` | Sell/close; optionally route the balance into another account. |
| `set_goal` | `amount`, `by?` | Writes `data.goal`. |

The property example decomposes into four events — `open_account`
(Property, 4% growth, $400k), `open_account` (Mortgage, liability,
$320k), `transfer` (Savings → Property, $80k down payment), and `payoff`
(Mortgage by 2066). That composability is the point: a small vocabulary
covers a wide range of sentences.

### Engine changes

**Phase 0 first: extract the engine.** Move `buildAccountModels`,
`generateForecast`, `monthIndex`, and `customForecastCount` out of
`Dashboard.jsx` into `src/lib/forecast.js`, unchanged. This is a pure
refactor with no behavior change, and it's a prerequisite for everything
else — the chat preview has to run the forecast outside the Dashboard to
show you a before/after.

Then, inside `generateForecast`'s month loop, resolve events per account
per month, in this precedence order:

1. an explicit `snapshots` override for that month (unchanged — a typed
   number always wins)
2. `set_balance` / `open_account` initial at this exact month
3. compound at the effective growth rate (base rate, or the latest
   `set_growth` in effect)
4. add the effective monthly contribution: an active `fund` window, else
   a `payoff` solve, else today's category-average behavior
5. add any `lump_sum` / `transfer` legs landing on this month

Two mechanical additions:

- **Existence windows.** An account with `openFrom` contributes 0 to net
  worth and is hidden in `CategoryCard` for months before it opens — no
  more $0 phantom rows for five years. Same for `close_account` after.
- **Payoff solve.** Default to linear (`balance / months` per month over
  the window, growth suppressed inside it) so it lands exactly on zero.
  A proper amortization needs an interest rate, and here the data model
  has a wart worth noting: for liabilities the app's `growth` field
  conflates interest *and* payment (Visa at `-22%` means "net paydown,"
  not an APR). Adding a separate per-account `apr` later lets `payoff`
  use the annuity formula; linear is honest and predictable until then.

### Edge cases this surfaces

- `lastDataMonth` is null when you have no snapshots at all, so
  `forecastCount` is 0 and *nothing* renders. A brand-new user saying
  "in five years I'll open an account" currently gets silence. Fix: fall
  back to `currentMonth` as the forecast origin when categories exist.
- The range pills top out at 1Y; a 10-year event is invisible unless you
  switch to Custom. Applying an event should auto-extend the time range
  to cover its month.
- `MAX_FORECAST_MONTHS` is 600 (50 years) — validate event dates against
  the same ceiling.

### A plain UI for events

A "Plan" list — every event as a row in plain English ("Jun 2031 · Open
Brokerage with $10,000 · 7%/yr") with edit and delete, plus small markers
at event months on the chart. Reachable from the side nav.

**This phase ships on its own.** Even with no AI, it's the feature you'd
want: dated plans instead of typing into 240 future months.

---

## Part 2 — The AI layer

### Where the call goes

`vite.config.js` locks `connect-src` to `'self'` and Supabase. Calling
`api.openai.com` from the browser is blocked today. Two ways out:

**(A) Browser → OpenAI directly, with your own key.** Add
`https://api.openai.com` to `connect-src`. The key lives on your device;
requests never touch our server. ✅ Recommended — no new infrastructure,
and it keeps the E2E story intact: *your data never reaches the app's
server in plaintext.* ⚠️ The key is readable by anything running on the
page (it's your own key, scoped and revocable, and the app ships no
third-party scripts — but it's the honest trade-off).

**(B) A Supabase Edge Function proxy.** The key sits server-side; the
`delete-account` function is the template. ⚠️ Your financial context now
passes through the server in plaintext — a bigger break of the app's
promise than (A), for a personal app. This becomes the right answer only
if Worthfolio ever offers this to users who *don't* bring a key, at which
point it's a billed feature and the proxy also carries rate limiting and
abuse controls.

Go with (A). Build the client as a thin adapter (`src/lib/ai.js`) with the
provider behind one function, so (B) — or a different provider — is a
swap, not a rewrite.

### Key storage

Two options, both fine:

- **Device-local** (`localStorage`) — simplest, nothing new syncs, but
  you re-enter the key on each device.
- **In the vault** — rides the existing E2E encryption, so it follows you
  to your phone. Costs a field on the container and means the key is in
  the encrypted blob.

Start device-local (zero schema change); vault storage is a small
follow-up if re-entering it annoys you.

### What leaves the vault

This deserves to be a deliberate, visible decision, not a footnote —
end-to-end encryption is the app's whole pitch.

**Default context sent with each message** — structure only, no money:

```json
{ "currentMonth": "2026-08",
  "categories": [ { "id": "cat_1", "name": "Credit Cards", "type": "liability",
    "accounts": [ { "id": "acc_9", "name": "Visa", "growth": "-22" } ] } ],
  "existingEvents": [ ... ] }
```

That is enough to resolve "this Visa" → `acc_9` and to emit every event
kind, because the model doesn't need the balance to say "pay this off by
March 2028" — the engine reads the balance locally and solves. Account
*names* still leave the device, so this is not zero-disclosure, and the
consent screen should say so plainly.

**Optional "include balances" toggle**, off by default, for questions
that genuinely need them ("can I afford this?", "what's realistic?").

**Also required:** a first-run consent screen naming OpenAI explicitly,
stating what is sent and that it leaves the encrypted vault; the toggle
in settings to turn the feature off entirely; and the API key never being
sent anywhere but OpenAI.

### Getting structured output

Use OpenAI Structured Outputs (`response_format: { type: 'json_schema',
strict: true }`) rather than free-form JSON. One practical note: strict
mode constrains `anyOf` and requires every property be present, so model
the events as one **wide object with nullable fields** discriminated by
`kind` rather than a union of per-kind shapes — it's far more reliable
under strict schemas, and the validator narrows it afterwards.

Response shape:

```json
{ "reply": "Added a brokerage account opening June 2031 with $10,000 at 7%.",
  "needsClarification": null,
  "events": [ { "kind": "open_account", "at": "2031-06", ... } ] }
```

`needsClarification` lets the model ask ("Visa or Amex?") instead of
guessing — chat is multi-turn, so a question is a valid turn.

Pin the model id in a setting rather than hard-coding it; verify the exact
current id against OpenAI's model list when implementing (a small,
cheap, fast model is the right class here — the task is translation, not
reasoning about money). Each turn is a couple thousand tokens: fractions
of a cent.

### Validation is a hard boundary

`src/lib/planSchema.js`, hand-written, treating model output as untrusted
input:

- `kind` in the known set; unknown → reject the event, don't crash
- months match `YYYY-MM` and fall within `[currentMonth, +600 months]`
- `accountId` resolves to a real account (except on `open_account`)
- amounts finite and within sane bounds; `growth` within ±100
- windows ordered (`from <= to`, `from < by`)

Nothing the model returns is ever executed — it's parsed into the same
event objects the manual UI produces. Account names in the context are
your own data, so prompt-injection risk is low, but the validator is the
boundary regardless.

### Chat UX

Mirror the `ImportSheet` flow, which already establishes the pattern:
**propose → review → apply.**

1. **Ask** — full-height sheet on mobile (the `Modal` primitive), right
   drawer on desktop. Scoped to the active scenario; the scenario name is
   in the header, since "this account" means something different in each.
2. **Preview** — the reply, plus each proposed event as an editable row
   (date, amount, growth, target account), plus the projected impact
   computed locally: net worth at the horizon before vs. after, and the
   chart with a ghost line.
3. **Apply** — to this scenario, or **"Create a new scenario from this"**
   (`addForecast` already forks). "What if I buy a property" is a
   textbook new-scenario request, and offering it is one button.
4. **Undo** — remove the applied event ids. Trivial because events are
   declarative.

Persist the last N messages per scenario in the container so the thread
survives a reload (it's encrypted with everything else); cap the length so
the vault blob stays small.

Voice input ("have it work when I *speak*") is the browser's
`SpeechRecognition` on the same text box — a small add-on once the text
path works, and worth deferring to the end.

---

## Phasing

| Phase | Scope | Ships value alone? | Rough effort |
|---|---|---|---|
| **0** | Extract `src/lib/forecast.js` from `Dashboard.jsx`, no behavior change | Enables everything | Half a session |
| **1** | Event model + engine support (`open_account`, `fund`, `payoff`, `lump_sum`, `set_growth`) + existence windows + origin/range edge cases | **Yes** — dated plans without the typing | 1–2 sessions |
| **2** | Plan list UI: rows in plain English, edit/delete, chart markers | Yes | 1 session |
| **3** | AI plumbing: CSP entry, key setting, consent screen, `ai.js` adapter, JSON schema, `planSchema.js` validator | No | 1 session |
| **4** | Chat sheet: transcript, propose → preview → apply → undo, apply-to-new-scenario | **The ask** | 1–2 sessions |
| **5** | Polish: `transfer`/`close_account`, multi-turn clarify, auto-range, voice input, optional balance context | Yes | ongoing |

Phases 0–2 are worth doing whether or not the AI part ever ships, which
is the main argument for this ordering: no phase is wasted if you change
your mind about sending data to OpenAI.

### Testing

There's no test infrastructure in the repo today. The forecast engine and
the validator are exactly the code that should have it — pure functions,
no DOM, and the whole trust story rests on them. Add `vitest` and cover
`forecast.js` (event application, payoff solve, existence windows) and
`planSchema.js` (malformed model output) with fixtures. No network in
tests; record a handful of real model responses as JSON.

---

## Decisions I need from you

1. **Privacy default** — ship with balances excluded from the AI context
   (my recommendation), or include them from the start for richer
   answers?
2. **Key storage** — device-local, or synced in the encrypted vault?
3. **Scope of phase 1** — is the event vocabulary above right, or is
   there a kind of plan you have in mind that it doesn't cover?
4. **Apply behavior** — should chat default to editing the current
   scenario, or default to forking a new one?
