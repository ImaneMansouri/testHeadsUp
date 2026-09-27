# Heads Up

Heads Up watches Medicare plan formularies. When a drug is dropped, raised a tier, or newly restricted, it texts the doctor whose patients are affected and gives them a plan to act.

Coverage decisions are deterministic diffs of CMS Part D files. The SMS never includes patient names. Dollar amounts are estimates; missing prices stay "Unknown".

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Twilio credentials the app runs in preview mode: **Send text to doctor** still reveals the exact message in the phone mockup.

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Copy `.env.example` to `.env.local` when you have credentials. See `NOTES.md` for assumptions, Vercel, and the serverless state limit.

## Demo

1. Open `/`. The gap timeline says "No notification".
2. **Run watch now**. The log should end with a change for Dr. Amina Lee.
3. The alert is NovoLog FlexPen dropped from Kaiser Permanente Senior Advantage Enhanced 1.
4. **Send text to doctor**. The SMS slides into the phone. The timeline moves to "Alerted by text".
5. Open the link (`/m/[id]`) and tap **Prior auth started**. The command center turns node 2 green.
6. Open **Impact** (or the strip on the Command Center). Session counts move after the watch, the text, and prior auth, then return to zero on reset. File counts and the est. prior monthly cost stay.
7. Avatar menu → **Reset demo**, then run it again.
