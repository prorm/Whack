# ScrollProof

Use Node 22.18 or later, with Node 22.20 used in verification.

```sh
npm ci
npm run build
npm start
```

Open [ScrollProof](http://127.0.0.1:4173/). The built app and sync API run on the same origin. The browser saves the lesson and exercise pack after the first successful load. Use localhost or an HTTPS deployment for service workers.

## Walk through the demo

1. Open **Explore roles**, choose **Dispatch & Payout Assistant**, and select **Start learning for this role**. Review the prefilled goal and start the diagnostic.
2. To see a misconception repair, answer the commission question with **100**, the percentage question with **415**, and the fraction question with **0.75**.
3. Start the recommended lesson. Switch to **Read**, then try **370** for the question about 20% of 350.
4. Open your revision reel. It pauses on a fresh question. Submit an answer to see the calculation and continue.
5. Submit the payout worksheet. With the server reachable, check the worksheet in **Trainer review** and approve it in demo mode.
6. Open the Skill Passport. Give consent before opening the same-device employer preview. Clearing consent closes and hides the preview.

Open **Data & offline settings** for Automatic, Rich, Lite, Offline and Data Saver. Offline mode uses saved lessons and exercises. The app retries queued learning events and worksheets when connectivity returns, even when Offline remains selected. Job text and employer preview consent stay in the browser.

## Review and sync

By default, reviews are labelled as demo. Set `SCROLLPROOF_TRAINER_CODE` in the server environment to require a trainer code for payout review. The app stores each server review against the submitted worksheet. The Skill Passport records reviewed evidence with identity unverified. The employer preview stays on the same device.

The server stores progress in `app/.data/progress.sqlite`. The browser's generated device token scopes uploads. Starting a new worksheet detaches the previous review from the current Passport. Use `npm start -- --port 4176` for an alternate port or `--data <path>` for a different database.

## Verify

```sh
npm run test:engine
npm run test:moonshot
npm run lint
npm run build
```

From the workspace root, run `node scripts/verify_experience.mjs` with Playwright and Chromium installed. Set `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_CHROMIUM` to explicit paths when using tools outside the workspace. The script starts disposable servers and saves screenshots and measurements under `outputs/experience_sprint/`.

To verify the career screens, start the app with `npm start -- --port 4178`, then run `node scripts/verify_careers.mjs` from the repository root. Set `SCROLLPROOF_CAREERS_URL` if the server uses a different address. Screenshots and results are saved under `outputs/career-experience/`.

Render the vertical showcase from `reel/` with `npx remotion render PayoutCheck ../outputs/experience_sprint/scrollproof-payout-check.mp4`.
