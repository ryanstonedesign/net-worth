# Design rules

Conventions for the Net Worth app's visual system. Read before adding new UI.

## No inset containers for prose

**Do not** wrap text blurbs, help copy, or warnings in an inset card style
(`background: #edf1f5`, `box-shadow: var(--shadow-neu-in)`, rounded corners).
That treatment is reserved for **inputs and interactive surfaces** where the
"pressed in" affordance signals a place the user can type or act.

Using it for prose makes copy feel like a UI control and clutters the page
with nested boxes inside boxes. It also competes with real inputs for visual
attention.

**Instead, separate prose with whitespace.** A muted text color
(`var(--c-ink-mute)`), generous `margin-top`, and a clear hierarchy via font
weight is enough.

```jsx
// ✗ Don't
<div style={{ background: '#edf1f5', boxShadow: 'var(--shadow-neu-in)', ... }}>
  Some help text…
</div>

// ✓ Do
<p style={{ marginTop: 20, fontSize: 13, color: 'var(--c-ink-mute)' }}>
  Some help text…
</p>
```
