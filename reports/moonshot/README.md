# Reproduce CAPABLE X

From the workspace root with Node 22.18+ and the installed app dependencies:

```powershell
npm --prefix app run build
node scripts/capable_server.mjs --port 4177 --data app/.data/moonshot.sqlite
```

Open [Moonshot](http://127.0.0.1:4177/#/mission). Click **Load the stock-count demo** and **Extract worksheet facts**. Accept the four demo counts. At **Review the demonstration**, inspect 0:04 and 0:08. Change Instruction 3 to **Use C4 for receipts on the same item row.** Mark all five steps Checked, add the scripted contributor answer, enable local educational derivatives and approve. In the lesson, use Expert replay and ask **Why C4 instead of C5?** Try expected **132** and signed difference **4** in Practice to see the repair. Complete the new worksheet, opt into review and use the same-device preview if you choose. Default server reviews are marked demo. Configure `CAPABLE_TRAINER_CODE` to exercise the trainer authorization boundary.

The demo uses an actual cached extraction from a synthetic source. Private files stay in the browser. The deliberately wrong draft cell is a labelled rehearsal test. The alternative creative previews and model trials live under `moonshot/media/`.

## Continue the experiments

```powershell
.venv/Scripts/python.exe -m moonshot.scripts.run
.venv/Scripts/python.exe -m moonshot.scripts.run --repair
npm --prefix app run test:engine
npm --prefix app run test:moonshot
node moonshot/benchmarks/local.mjs
node moonshot/benchmarks/browser.mjs
```

The first command is a dry run. The repair command operates on saved raw responses. The browser command needs Playwright and Chromium. Set `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_CHROMIUM` when they live outside the workspace. Media reproduction uses Pillow and FFmpeg via `python -m moonshot.scripts.media` and `python -m moonshot.scripts.reels`, using the preserved English narration asset. Run `python -m moonshot.scripts.demo` after the browser benchmark to recreate the walkthrough.

To refresh project metadata, run `.venv/Scripts/python.exe -m moonshot.scripts.discover` followed by `.venv/Scripts/python.exe -m moonshot.scripts.atlas`. To resume the metered queue under the original high-level authorization, verify current provider rates and run the dry plan before `.venv/Scripts/python.exe -m moonshot.scripts.run --paid`. The runner reuses completed outputs, keeps all durable reservations and leaves unresolved or failed calls for inspection. It excludes async generation and resource provisioning. Manifest PASSED for a provider request means it produced an inspectable output. Task accuracy and human approval have separate evidence. See [ledger](COST_LEDGER.jsonl), [manifest](EXPERIMENT_MANIFEST.json) and [journal](RESEARCH_JOURNAL.md).

Start with the [final report](FINAL_MOONSHOT_REPORT.md), [founder specification](15_IMPLEMENTATION_RECOMMENDATION.md) or [evaluation](EVALUATION_REPORT.md).
