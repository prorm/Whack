# CAPABLE

Use Node 22.18 or later, with Node 22.20 used in verification.

```sh
npm ci
npm run build
npm start
```

Open [CAPABLE](http://127.0.0.1:4173/). The built app and sync API run on the same origin. The browser saves the lesson and exercise pack after the first successful load. Use localhost or an HTTPS deployment for service workers.

## Practical labs

The labs live inside the main app: Learn → Practical labs (CodeLab, DataLab, [Practical Arena](http://127.0.0.1:4173/#/capable), Solar Forge). Signed receipts are under Proof, lab fault notes under Teach.

1. **Arena.** Open a practice case or start a server-issued trial. Orbit and tap the 3D hardware, select two meter points, isolate the circuit, diagnose the open component, and test the repair. A TypeScript nodal solver calculates AC-equivalent voltages, resistance and lamp power for four seeded faults. The server independently replays the trace and checks isolation, diagnosis and the final load test.
2. **Forge & Lens.** Pick either fictional label, cover a field, and scan with Robotics ER 2. The missing value blocks the lab until someone confirms it. Reveal the field and compare the source with the extracted values. Prepared labels and manual entry also work offline.
3. **Solar lab.** Predict that voltage falls and choose **Very sure**, then check the prediction to trigger a FLUX contrast reel. Move the cell temperature and see the voltage cross the limit. The Mentor accepts typed or recorded teach-back, offers English and Kannada captions, and uses the device's installed voice for narration. Hydrogen can suggest an allowlisted simulator comparison for the learner to apply.
4. **Counterfactual and proof.** Start a verified work order while online, then submit the changed-constraint exercise offline if needed. Reconnect to re-grade and sign it. The Proof Passport shows recorded evidence, exposes a revocable link and QR by request, and maps the solar work order to a demo role requirement. Use HTTPS and a reachable hostname when sharing to another device. Site work still requires supervised assessment.
5. **Field Scars.** Review a field note, select one of the supported faults, and save it to the device's practice library. Gemini Decisions can suggest a template when its key is authorized.

### Gemini credentials and budget

The server reads the repository `.env`. Set the project with `GCP_PROJECT` or `GOOGLE_CLOUD_PROJECT`. Set the Vertex key with `CAPABLE_VERTEX_API_KEY`, `GOOGLE_CLOUD_API_KEY`, or the demo's `GC_KEY`. The project-scoped Vertex route serves `gemini-robotics-er-2-preview` and `gemini-4-hydrogen`. `CAPABLE_VERTEX_AUTH=project` uses the configured service-account JSON instead. API keys and raw Gemini requests stay on the server.

`gemini-decision-1` uses the separate [Gemini Decisions API](https://aistudio.google.com/docs/decisions-api). Set `CAPABLE_DECISIONS_API_KEY` to a key authorized for `generativelanguage.googleapis.com`. The demo key passed the Vertex tests and returned `403 API_KEY_SERVICE_BLOCKED` on Decisions. Learners can complete the deterministic workflows and manually review Field Scars with the current key.

The app and live smoke script share a persistent SQLite reservation ledger at `app/.data/capable-gemini.sqlite`. It reserves $0.25 before each inference and rejects requests that would put total reservations above $4.75. Calls have capped input and output, a timeout, and zero automatic retries. Set `CAPABLE_GEMINI_ENABLED=0` to disable live inference. Google Cloud billing tracks activity outside this app separately.

### Verify CAPABLE 2.0

Run `npm run test:all` and `npm run build` in `app/`. From the repository root, run `node scripts/verify_capable.mjs` with Playwright and installed Chrome. The browser suite starts its own server with Gemini disabled, exercises offline completion and reconnection, and saves desktop and mobile screenshots under `outputs/capable-qa/`.

Run `node scripts/capable_live_smoke.mjs` from the repository root to invoke the configured models against the fictional fixtures. Pass `lens`, `decision`, `mentor`, or `audio` to run individual groups. The `audio` check uses FFmpeg with Flite to generate a short synthetic voice sample. The smoke script uses real credits and the same $4.75 cap.

## Verify

```sh
npm run test:all     # 65 tests: FLUX engine + curriculum, capability layer + AI Pair, server trials and signatures
npm run lint
npm run build
```

From the repository root, `node scripts/verify_learn.mjs` walks the course with Playwright, and `node scripts/verify_capable.mjs` checks the labs and signed receipts.
