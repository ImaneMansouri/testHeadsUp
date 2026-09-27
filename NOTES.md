# Notes

## Assumptions

- Change ids are the first 16 hex characters of SHA-256 over `planId|rxcui|changeType|beforeSnapshotId|afterSnapshotId`.
- A drug's short name is the text before ` (`. A plan's short name drops a leading insurer prefix and a trailing parenthetical. SMS uses those short forms. The doctor-facing cards show the full CMS plan name, including `(HMO)` or `(PDP)`.
- The SMS month is parsed from the later file name (`2026_20260916.zip` → Sept 2026). Explanations use the later snapshot's `capturedAt` (`September 2026`).
- Watch-log counts use singular when the number is 1 (`1 change detected`, `1 patient affected`). The closing terminal line stays `Change detected. Alerting Dr. Amina Lee.` whenever at least one change exists, matching the demo script.
- Rows that exist only in the later snapshot are ignored. The rules do not define a "newly covered" type.
- A field that is null on either side is not a change. `estMonthlyCost` is never itself a change type. `removed` fires only when the earlier row is `covered: true` and the later row is missing or `covered: false`.
- `affectedPatients` returns patients only for `worsened` changes, in panel order.
- Plans watched and drugs watched are unique ids across both snapshots. Patients affected is the unique set across worsened changes. Pairs compared are the unique `(planId, rxcui)` keys in the earlier snapshot.
- Stats and the alert card stay hidden until a watch has been run. Before that, the four tiles show an en dash, not zero.
- Preview mode is used when any of `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `DOCTOR_PHONE`, or `APP_URL` is missing or blank. The link in the message falls back to `http://localhost:3000` so the bubble is still usable. A preview send counts as notified, so the gap timeline advances during the demo. A Twilio HTTP or network error does not.
- `toMasked` is the last four digits of `DOCTOR_PHONE`. When the number has fewer than four digits, the placeholder is `••••`.
- There is no login. The session is Dr. Amina Lee. Patient names are synthetic and are rendered on `/changes/[id]` with the caption "Synthetic demo patients". `/m/[id]` does not render names; that request uses `?names=0`. The default detail endpoint still returns names, as specified.
- The featured alert and the gap timeline follow the first worsened change. This dataset has one.
- Insulin copy is chosen when the drug name matches `/insulin/i`.
- Facts in `facts.json` are displayed as given. They are not recomputed. The bar chart is only the row count of the watched snapshot files, not the 1,202 Georgia-wide drops.
- The spec calls the pipeline a 5-step diagram and then lists six stages (CMS/insurer data, snapshot, compare, match doctors, SMS, action). All six are shown.
- "Add a watch" does not narrow the engine. The engine always diffs the full snapshot files, which is what the demo path needs. A saved watch pins a plan/drug pair and shows whether that pair currently has a change.
- Inbound SMS treats a trimmed body of `1` as "mark the latest notified alert reviewed". It does not overwrite an action that was already resolved. Twilio request signatures are not checked.
- Grok rephrasing uses `POST https://api.x.ai/v1/chat/completions`, model `grok-3` unless `XAI_MODEL` is set, with a 4 second timeout. The prompt is the template only. Patient names are checked locally and are never sent. Any error, empty reply, or name leak falls back to the template. A failed attempt is cached so the detail page, which polls every 3 seconds, does not stall.
- The optional notification sound is a short Web Audio tone, muted by default.
- The command center, change list, detail page, and mobile page poll every 3 seconds.
- Reset demo clears statuses, runs, watches, the last notified id, and the explanation cache, then navigates to `/?r=<timestamp>` so the command center remounts clean.
- shadcn/ui is the components in `components/ui` (button, badge, dropdown menu) plus `components.json`, not a generated CLI dump.
- Dollar figures render as `est. $47.00/mo`. Null cost renders as `Unknown`, never `0`. A removed row's later column reads `Not covered`.
- Runs kept in memory are capped at 20.

## Environment

```bash
cp .env.example .env.local
```

| Variable | Role |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | Twilio sender, E.164 |
| `DOCTOR_PHONE` | Destination for the demo text, E.164 |
| `APP_URL` | Public origin used in the SMS link, no trailing slash required |
| `XAI_API_KEY` | Optional. Rephrases the explanation. Coverage rules do not use it. |
| `XAI_MODEL` | Optional. Defaults to `grok-3`. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Optional Vercel KV / Upstash REST, for shared alert state |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Same store, alternate names |

Twilio trial accounts can only text numbers verified in the Twilio console.

Leave the Twilio and XAI variables empty to stay in preview mode. The demo path does not need them.

## Deploy to Vercel

Do not rely on a manual deploy from this environment. Import the GitHub repository in Vercel.

1. Framework preset: Next.js. Root directory: the repository root.
2. Build command: `npm run build`. Install command: `npm install`. Output: Next.js default. No custom `output` directory.
3. Node runtime is required for the route handlers (filesystem fallback and `node:crypto`). Do not force the Edge runtime.
4. Set `APP_URL` to the deployment origin, for example `https://<project>.vercel.app`, with no trailing path. The SMS link is `${APP_URL}/m/<change id>`.
5. Set the Twilio variables only when a real text is wanted. Until then the deployment stays in preview mode and the in-app phone still shows the message.
6. Set `XAI_API_KEY` only if explanation rephrasing is wanted.
7. For the phone page and the desktop dashboard to share resolved/sent state across serverless instances, set the KV or Upstash variables above. Without them, see the limitation below.
8. Redeploy after changing env vars. `data/snapshots.json`, `data/doctor.json`, and `data/facts.json` are imported into the server bundle, so they ship with the deployment. `data/state.json` is runtime-only and is not the cross-instance store on Vercel.

## Serverless state

Vercel serverless instances do not share memory, and the deployment filesystem is read-only except for per-instance `/tmp`. A resolve tapped on a phone can hit a different instance than the desktop tab that is polling.

Mitigation, in order, on every read and write:

1. In-process memory on `globalThis`, so one warm instance stays consistent.
2. `data/state.json` when that path is writable (local `next dev` / `next start`).
3. `/tmp/headsup-state.json` on the same instance.
4. Optional Upstash-compatible Redis (`KV_REST_API_*` or `UPSTASH_REDIS_REST_*`). This is the store that actually shares status across instances. The desktop poll (every 3 seconds) and the mobile resolve both read and write that key (`headsup:state`), last writer wins by `updatedAt`.

Local preview is one Node process, so memory plus `data/state.json` is enough for the demo path, including a phone and a laptop pointed at the same dev server. On Vercel, set the KV variables before relying on "tap the phone, watch the projector turn green." If those variables are absent, a resolve is visible to later requests that reach the same instance and is not guaranteed across instances.

`POST /api/demo/reset` clears every tier of the store this process can reach, including Redis when it is configured.

## Verified in this environment

- `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass.
- Preview mode, with no Twilio or XAI credentials: the command center demo (run, text, mobile prior auth, desktop timeline turns green, reset) completed three times in a row in Chrome, including after Reset demo.
- The CMS catalog fetch in the watch log returned a real modified date (`2026-09-23`) for the monthly formulary dataset.
- `/changes`, the doctor detail page (patient names, insulin judgment line, evidence files), and `/how-it-works` render.

## Not verified here

- A real Twilio delivery. No account credentials are configured; preview mode is what this environment can prove.
- A Vercel deployment and a handset opening the public SMS link. Deploy steps are above; this environment was not given Vercel access.
- A live Grok rephrase. No `XAI_API_KEY` is configured. The template fallback and the "names never leave the server" check are covered by unit tests.
