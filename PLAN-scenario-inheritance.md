# Plan: Scenario inheritance — letting monthly edits propagate

## The problem

Every forecast scenario is a complete deep-forked copy of the data
(`addForecast` in `src/hooks/useData.js` clones `{ categories, snapshots,
contributions, goal }`). That contradicts the intent already written in the
code (`useData.js`, comment above `applyVariant`): *"every scenario starts
from the same past and diverges only in its forecast."*

Concretely: you create "Market Downturn" in March. In July you open Update
and type in July's real balances. Only the active scenario receives them —
every other scenario's history is now stale, and its forecast launches from
a months-old snapshot. There is no way to propagate the edit, and no way to
even see that scenarios have diverged.

What we want: monthly edits (real balances and contributions) flow to other
scenarios by default, with a way to exempt a scenario when its whole point
is a different history ("what if I'd sold the house last year"). And the
90% user — who never thinks about any of this — should never see a control.

## The guiding rule: facts propagate, assumptions don't

Whatever mechanism we pick, the routing rule stays the same, because it's
the rule users already intuitively hold:

- **Facts** — recorded monthly balances (`snapshots`), recorded monthly
  contributions (`contributions`), and the account/category structure
  itself. These describe reality and should be shared: typing July's
  checking balance is true in every scenario.
- **Assumptions** — per-account `growth`, forward contribution behavior,
  the `goal`. These are *what a scenario is*. They never propagate.

And one uniform time gate: **only the past can contain facts.** A balance
or contribution entered for a month up to and including the current
calendar month is a record of reality and propagates. The same entry for a
*future* month is a forecasting lever and stays local to the scenario it
was typed in — a future balance is a hypothetical outcome ("what if
brokerage bottoms at $20k in December"), and a future contribution is a
hypothetical plan ("what if I save $1,500/mo from January"). Keeping both
local is what lets linked scenarios forecast genuinely different futures
while sharing one real history: Default can plan $1,500/mo from January
while another linked scenario plans $400/mo.

The gate is evaluated at write-time. A future entry never retroactively
propagates just because its month arrived; instead, when the user records
that month's actual balances/contributions, that save is now a
current-month fact and fans out, overwriting each linked scenario's stale
guess for that month (actuals trump hypotheses — a permanently fabricated
timeline is what unlinking is for). From the following month onward, each
scenario's remaining future overrides resume shaping its own forecast.
Known consequence: a future plan typed in Default and never re-confirmed
reaches linked scenarios only at the next current-month save — which is the
app's natural monthly rhythm anyway.

This rule is what makes the feature invisible: users never choose where an
edit goes; the kind and timing of the edit decides.

---

## Option A — Linked scenarios (write fan-out) · recommended

Keep the current storage model (each scenario owns a full data copy). Add
one boolean per scenario: `linked` (default `true`; the Default scenario is
always linked). When a **fact** edit happens in any linked scenario, apply
the same write to every other linked scenario. Assumption edits — and any
edit targeting a future month — stay local, as today. The month-based fact
mutators (`updateCategorySnapshot`, `updateContributions`,
`clearMonthSnapshot`, `bulkImport` rows) all receive the month explicitly,
so the fan-out helper applies the past-only gate with a single
`month <= getCurrentMonth()` check per write.

### Data shape

```js
// container.scenarios[i]
{ id, name, linked: true, data: { categories, snapshots, contributions, goal } }
```

Migration is trivial: `migrate()` stamps `linked: true` on any scenario
missing the flag. No version bump needed (additive field), though bumping
to `version: 3` documents intent.

### Implementation sketch (all in `useData.js`)

Add a sibling to `setData`:

```js
// Applies updater to the active scenario and, when the active scenario is
// linked, to every other linked scenario as well.
const setFactData = (updater) => setContainer(c => {
  const act = activeOf(c)
  const fanOut = act.linked !== false
  return { ...c, scenarios: c.scenarios.map(s =>
    (s.id === act.id || (fanOut && s.linked !== false))
      ? { ...s, data: updater(s.data) } : s) }
})
```

Route the fact mutators through it: `updateCategorySnapshot`,
`updateContributions`, `clearMonthSnapshot`, `bulkImport`, and the
structural ones (`addCategoryWithAccounts`, `addAccount`, `deleteAccount`,
`deleteCategory`, `renameAccount`, the name/icon/color parts of
`updateCategory`). Structural edits must fan out too, otherwise an account
added after a fork never exists in sibling scenarios and its balances
silently don't count there. Because forks copy ids verbatim, account ids
already align across scenarios — the fan-out is a plain replay, no mapping
table. (`addCategoryWithAccounts`/`addAccount` mint ids with `Date.now()`;
mint the id once outside the updater so all scenarios get the same id.)

Assumption mutators (`setAccountGrowth`, `setGoal`, `updateCategory`'s
`contributing` flag) keep using plain `setData`.

Edits are symmetric among linked scenarios: typing July's balances while
"Market Downturn" is active updates Default too — actuals are actuals no
matter which tab you typed them in. Edits made *inside an unlinked
scenario* stay local (it opted out of the club in both directions).

### UX (as built)

- Nothing new by default. Every scenario is synced; monthly updates just
  work everywhere.
- Creating a scenario opens a sheet (`NewScenarioSheet`): name it, pick
  which existing scenario to duplicate, and a "Sync monthly updates"
  toggle (default on) with a plain-words explanation of what unsyncing
  means.
- Synced scenarios show a small circular-arrows glyph beside their name in
  the top nav and in the side nav list; unsynced scenarios show nothing.
- Each scenario row's action menu carries Sync/Unsync (above Delete),
  labeled by current state. Both directions confirm before acting:
  unsyncing explains that monthly updates stop copying in and existing
  data is kept as-is; re-syncing explains that current-and-past months are
  replaced right away with the latest saved balances and contributions
  (growth rates and future plans untouched).

### Trade-offs

- ✅ Smallest diff by far; no read-path changes; no storage migration.
- ✅ Maps exactly to the ask: propagate to select scenarios, opt out per
  scenario.
- ⚠️ History is still stored N times (fine at this data size).
- ⚠️ Divergence is possible again the moment someone unlinks — but that's
  the feature, and the badge makes it legible.

**Effort:** ~1 focused session. Touches `useData.js`, `SideNav.jsx`,
migration stamp.

---

## Option B — Shared base + per-scenario overlay (copy-on-write)

Restructure the container so facts live once, in a shared `base`, and each
scenario stores only what it overrides:

```js
{
  version: 3,
  activeId,
  base: { categories, snapshots, contributions, goal },
  scenarios: [
    { id, name, overlay: {
        growth: { [accId]: '7' },       // assumption overrides
        goal: 950000,
        snapshots: { '2025-03': {...} } // only if this scenario pinned a month
    } },
  ],
}
```

`useData` composes `merge(base, overlay)` into the same flat `data` shape
the app already consumes (memoized), so pages/components don't change.
Edit routing: fact edits write to `base` (propagating to everyone by
construction); assumption edits write to the active overlay; a fact edit
made deliberately divergent (rare) pins that month into the overlay, which
then shadows base forever — copy-on-write.

- ✅ The conceptually "right" model — propagation isn't a sync mechanism,
  it's the absence of duplication. Impossible for scenarios to drift by
  accident. Zero toggles: editing inside a scenario is itself the opt-out,
  scoped to exactly what you touched.
- ✅ Storage shrinks; scenario creation is O(1) instead of a deep clone.
- ⚠️ Real migration required (adopt Default's data as `base`, diff each
  other scenario into an overlay — or coarsely keep whole diverged
  sections). Riskier for existing vault data.
- ⚠️ Structural what-ifs ("what if I sell the house") need overlay
  add/remove semantics (tombstones for deleted accounts), which is where
  overlay models earn their complexity.
- ⚠️ Every mutator in `useData.js` needs a routing decision; the composed
  read path needs care around memoization and the debounced cloud push.

**Effort:** several sessions + migration testing against real vault data.

## Option C — Scenarios as pure assumption sets

Go further: a scenario stores *only* named assumptions — growth overrides,
contribution multipliers, goal — and everything else (structure, history)
is single-sourced. This is exactly what `applyVariant()` already does for
the demo variants, promoted to the real data model.

- ✅ Simplest possible mental model and storage; propagation isn't even a
  concept anymore.
- ❌ Kills structural hypotheticals entirely (no per-scenario accounts, no
  alternate histories). Given `addForecast` currently promises a full
  fork, this is a capability regression, not just a refactor.

Listed for completeness; not recommended as the end state, but it's the
degenerate case of Option B (an overlay that only ever holds assumptions).

## Non-option — manual "pull latest actuals" button

A per-scenario "Sync from Default" action with no automatic behavior. Cheap
to build, but it makes the user responsible for remembering to sync N
scenarios every month — the opposite of "barely need to care." Rejected as
the primary mechanism; its one-shot copy *does* reappear as the re-link
helper in Option A.

---

## Recommendation & phasing

**Ship Option A now.** It delivers the requested behavior (propagate by
default, per-scenario opt-out) with a small, low-risk diff and no
migration. The "facts propagate, assumptions don't" routing split it
introduces in `useData.js` is precisely the seam Option B needs later — if
scenario count or data size ever makes duplication painful, the fan-out
mutators become base-writers and the storage model can move to overlays
without touching the UI again.

Phase 1 (core): `linked` flag + `setFactData` fan-out for snapshots,
contributions, `clearMonthSnapshot`, `bulkImport`; migration stamp.
Phase 2 (structure): fan out category/account CRUD with pre-minted ids.
Phase 3 (UI): SideNav toggle + unlinked badge + "copy balances" helper.
Phase 4 (optional, later): a per-scenario contribution *multiplier* knob
(what `applyVariant`'s `contribMult` does for demo variants) as an
ergonomic shortcut for "Save More"-style what-ifs. Future-month
contribution overrides already stay per-scenario under the time gate, so
this is convenience only — one dial instead of typing amounts into each
future month.

**Status:** Phases 1–3 are implemented (sync flag + fan-out with the time
gate, structural CRUD fan-out with pre-minted ids, creation sheet + sync
badges + sync/unsync confirm flow). Phase 4 remains optional future work.
