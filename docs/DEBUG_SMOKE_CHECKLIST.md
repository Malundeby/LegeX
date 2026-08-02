# LegeX Runtime Smoke Checklist

Use this checklist after architecture or data-layer changes.

## Preconditions

1. Run `npm install` if dependencies changed.
2. Run `npm test -- --run`.
3. Run `npm run build`.
4. Start app with `npm run dev` and open http://localhost:3001.

## Route Checks

1. Home route `/` loads without hydration warnings.
2. Widgets route `/widgets` loads modern dashboard and allows adding note, todo, and bookmark widgets.
3. Dynamic route `/madrs` opens tool view directly.
4. Dynamic route `/fib-4` opens calculator view directly.
5. Unknown route `/unknown-tool` shows not-found page.

## Widget Persistence Checks

1. Create one note and one todo on `/widgets`.
2. Reload page and confirm both widgets persist.
3. Reorder widgets and reload again to confirm layout persistence.
4. Verify localStorage contains `legex_modern_widgets_v2`.

## Legacy Migration Check

1. In browser console, clear only modern key: `localStorage.removeItem("legex_modern_widgets_v2")`.
2. Ensure legacy keys exist: `legex_widget_dashboard`, `legex_notes`, `legex_todos`.
3. Reload `/widgets` and confirm content appears.
4. Verify `legex_modern_widgets_v2` is recreated after reload.

## Tool Registry Checks

1. `/gad7` resolves to GAD-7.
2. `/act-voksne` resolves to ACT voksne.
3. `/norrisk-2` is rejected as unknown.

## PDF Checks

1. Open MADRS tool and trigger PDF generation.
2. Confirm downloaded file name is `madrs-pasientskjema.pdf`.
3. Confirm PDF contains all 10 MADRS questions.

## Build Exit Criteria

1. Tests pass.
2. Build passes.
3. No console errors during above manual flow (except expected extension noise).