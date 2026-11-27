"""CAPABLE X launch film: one Chirp3-HD clip per beat, grouped into scenes, so every animation is locked to its audio.

  python scripts/capable_x_vo.py              -> remotion/public/capx/vo/<id>.wav + remotion/src/capx/capx.json
  python scripts/capable_x_vo.py --estimate   -> manifest only, durations estimated from text (no paid calls)

Cached by (voice, rate, text) in outputs/capable_x_vo/. Every paid call goes through the CostLedger.
Aarav, Maya and every organization in the film are fictional and labelled DEMO on screen.
"""
from __future__ import annotations

import base64, hashlib, json, os, subprocess, sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

VOICE = "en-IN-Chirp3-HD-Charon"
RATE = 1.06
CACHE = ROOT / "outputs" / "capable_x_vo"
OUT = ROOT / "remotion" / "public" / "capx" / "vo"
MANIFEST = ROOT / "remotion" / "src" / "capx" / "capx.json"
USD_PER_CHAR = 30 / 1_000_000
FPS = 30
ESTIMATE = "--estimate" in sys.argv

# (id, chapter, scene, spoken text, gap_after_s)
BEATS = [
    # ---------------------------------------------------------------- COLD OPEN: the grind
    ("q1", "COLD OPEN", "grind", "If you're an engineering student, you know the drill.", 0.2),
    ("q2", "COLD OPEN", "grind", "Grind LeetCode. Memorise system design. Build the same three projects. Polish the same résumé.", 0.2),
    ("q3", "COLD OPEN", "grind", "Millions of us. The same prep. Chasing the same few jobs.", 0.6),
    ("q4", "COLD OPEN", "aiwave", "Then AI learned to do the prep.", 0.3),
    ("q5", "COLD OPEN", "aiwave", "It solves the puzzle in seconds. It writes the perfect résumé. Eight in ten candidates now use it on coding tests, even when it's banned.", 0.3),
    ("q6", "COLD OPEN", "aiwave", "The thing you spent two years grinding, a machine now does for free.", 0.8),
    ("c1", "COLD OPEN", "flood", "So now, every minute, eleven thousand job applications are sent on LinkedIn.", 0.3),
    ("c2", "COLD OPEN", "flood", "Ninety-seven out of every hundred will never reach an interview.", 0.7),
    # ---------------------------------------------------------------- TWO PEOPLE
    ("a1", "TWO PEOPLE", "aarav", "Meet Aarav. Final-year engineering student. Four hundred LeetCode problems. System design notes. Three projects on GitHub.", 0.15),
    ("a2", "TWO PEOPLE", "aarav", "He knows Python, uses AI every day, and has applied to two hundred and fourteen jobs.", 0.45),
    ("m1", "TWO PEOPLE", "maya", "Meet Maya. She leads payments engineering at a fast-growing fintech.", 0.15),
    ("m2", "TWO PEOPLE", "maya", "She needs one junior engineer who can work out why payments are failing, fix it, and explain what happened.", 0.15),
    ("m3", "TWO PEOPLE", "maya", "For that one role, she has eleven hundred applications.", 0.45),
    ("s1", "TWO PEOPLE", "apart", "Aarav needs a job. Maya needs someone capable.", 0.25),
    ("s2", "TWO PEOPLE", "apart", "On paper, they're a perfect match.", 0.3),
    ("s3", "TWO PEOPLE", "apart", "They will never meet.", 1.0),
    # ---------------------------------------------------------------- ARMS RACE
    ("r1", "THE ARMS RACE", "race", "So Maya adds filters. A degree. Three years' experience. A coding test. A take-home. One more interview.", 0.2),
    ("r2", "THE ARMS RACE", "race", "And Aarav adapts. AI rewrites his résumé. He stuffs keywords. He grinds puzzles. He applies to a hundred more.", 0.3),
    ("r3", "THE ARMS RACE", "race", "Both sides are working harder than ever. Neither side is learning anything true.", 0.6),
    # ---------------------------------------------------------------- EVIDENCE
    ("t1", "THE EVIDENCE", "evidence", "Mass fresher hiring in India fell by eighty percent in three years.", 0.35),
    ("t2", "THE EVIDENCE", "evidence", "Nine in ten employers believe they've rejected real people, because the application looked fake.", 0.35),
    ("t3", "THE EVIDENCE", "evidence", "Eighty-five percent of employers say they hire for skills. When Harvard checked real hiring records, it changed fewer than one hire in seven hundred.", 0.4),
    ("t5", "THE EVIDENCE", "evidence", "And in India, young graduates were nearly nine times more likely to be unemployed than young people who cannot read or write.", 0.7),
    ("t6", "THE EVIDENCE", "collapse", "This isn't a talent shortage.", 0.25),
    ("t7", "THE EVIDENCE", "collapse", "It's a signal collapse.", 1.1),
    # ---------------------------------------------------------------- DIAGNOSIS
    ("d1", "THE DIAGNOSIS", "pipeline", "Look at how the system is wired. A college teaches from a syllabus written years ago. The student turns it into a résumé. Software turns the résumé into keywords. And an interview guesses the rest.", 0.25),
    ("d2", "THE DIAGNOSIS", "pipeline", "Every hand-off is a different company, and every hand-off loses signal.", 0.25),
    ("d3", "THE DIAGNOSIS", "pipeline", "Not one of them ever looks at the work.", 0.6),
    ("d4", "THE DIAGNOSIS", "neither", "Education starts with content. Hiring starts with a résumé. Neither starts with the work.", 0.35),
    ("d5", "THE DIAGNOSIS", "neither", "And the work won't sit still. Thirty-nine percent of core skills will change by twenty thirty.", 0.8),
    # ---------------------------------------------------------------- REVEAL
    ("v1", "THE REVERSAL", "flip", "So we flipped it.", 0.25),
    ("v2", "THE REVERSAL", "flip", "CAPABLE.", 0.5),
    ("v3", "THE REVERSAL", "flip", "We start with the work.", 0.5),
    ("v4", "THE REVERSAL", "unit", "Not courses. Not résumés. Not job titles. Verified capability, tied to real work, becomes the unit of exchange between learning and jobs.", 0.6),
    # ---------------------------------------------------------------- THE LOOP
    ("l1", "THE MACHINE", "loop", "Here's the machine. One closed loop.", 0.2),
    ("l2", "THE MACHINE", "loop", "Compile the demand. Map it to a shared graph. Find each person's gap. Practise on real work. Prove it on work you've never seen. Carry that proof to opportunity. And when the work changes, update only what changed.", 0.6),
    # ---------------------------------------------------------------- ENGINE 1: COMPILER
    ("e1", "01 · WORK COMPILER", "compiler", "It starts with Maya. She doesn't write a job post. She describes the work, in her own words.", 0.3),
    ("e2", "01 · WORK COMPILER", "compiler", "The Work Compiler turns that into four work tasks and eight capabilities, each with the evidence it needs.", 0.25),
    ("e3", "01 · WORK COMPILER", "compiler", "It even adds the prerequisite she never wrote down: reading logs.", 0.3),
    ("e4", "01 · WORK COMPILER", "compiler", "A job description just became a curriculum.", 0.8),
    # ---------------------------------------------------------------- ENGINE 2: GRAPH
    ("g1", "02 · SHARED GRAPH", "graph", "Two more employers describe their roles. Different titles. Different words.", 0.2),
    ("g2", "02 · SHARED GRAPH", "graph", "Underneath, seven capabilities are exactly the same. CAPABLE finds that shared foundation once, and keeps each employer's own branch.", 0.25),
    ("g3", "02 · SHARED GRAPH", "graph", "Every employer who joins sharpens the graph for everyone. One capability now opens many doors.", 0.6),
    # ---------------------------------------------------------------- ENGINE 3: GPS
    ("p1", "03 · CAREER GPS", "gps", "Now CAPABLE compares that demand with what Aarav has already proven.", 0.2),
    ("p2", "03 · CAREER GPS", "gps", "He already knows how to program? He never sits through it again.", 0.25),
    ("p3", "03 · CAREER GPS", "gps", "His real gap is debugging a live payment system. So that's exactly where his path begins. The shortest credible route, from where he is, to where the work is.", 0.6),
    # ---------------------------------------------------------------- ENGINE 4: LAB
    ("w1", "04 · WORK LABS", "lab", "And he doesn't get another video about debugging. He gets the incident.", 0.2),
    ("w2", "04 · WORK LABS", "lab", "Duplicate payment webhooks are crediting orders twice. He reads the logs, runs the tests, and ships the fix.", 0.6),
    # ---------------------------------------------------------------- REVISION REELS
    ("rr1", "04 · REVISION REELS", "reels", "And when he gets something wrong, CAPABLE remembers.", 0.2),
    ("rr2", "04 · REVISION REELS", "reels", "His exact mistake comes back as a thirty-second reel, on day one, three, seven and twenty-one, until it sticks.", 0.25),
    ("rr3", "04 · REVISION REELS", "reels", "The same scroll habit that eats his evenings now does his revision.", 0.6),
    # ---------------------------------------------------------------- ENGINE 5: UNSEEN PROOF
    ("u1", "05 · UNSEEN PROOF", "unseen", "Then, the real test. The server draws an incident he has never seen. Its answer never leaves the server.", 0.2),
    ("u2", "05 · UNSEEN PROOF", "unseen", "His fix runs in a locked sandbox against six hidden checks. Same code, same result, every time.", 0.5),
    ("ai1", "05 · UNSEEN PROOF", "airoom", "And we don't pretend AI isn't in the room. We test what still matters when it is: reading a system you've never seen, fixing it without breaking anything, and explaining what happened to a human.", 0.5),
    ("ag1", "THE AI GAP", "aigap", "And there's a skill nobody teaches at all. Every field now runs on AI, and almost nobody is trained to work with it.", 0.25),
    ("ag2", "THE AI GAP", "aigap", "An electrician points an AI app at a dead circuit. Ninety-one percent sure, it says: replace the switch. It's wrong. And its plan skips the dead test.", 0.3),
    ("ag3", "THE AI GAP", "aigap", "Aarav asks his copilot to fix a production bug. The patch passes every test he can see, and quietly breaks refunds.", 0.3),
    ("ag4", "THE AI GAP", "aigap", "Vibe-coding builds a demo in an afternoon. Production needs judgement. Employers want it. Nobody proves it.", 0.7),
    ("ap1", "06 · AI PAIR", "aipair", "So every CAPABLE lab now has an AI Pair mode. You work with an assistant, and you're graded on judgement, not typing.", 0.25),
    ("ap2", "06 · AI PAIR", "aipair", "First, the brief. Give it the logs, the code, the photo. Never the keys. Never a customer's data.", 0.25),
    ("ap3", "06 · AI PAIR", "aipair", "Then it answers, fast, fluent and confident. And in every trial, one of its calls is wrong.", 0.3),
    ("ap4", "06 · AI PAIR", "aipair", "Aarav's copilot offers two patches. Both pass every visible test. One swallows refunds. He ships the other, and names the test that proves it.", 0.3),
    ("ap5", "06 · AI PAIR", "aipair", "On site, the electrician measures before trusting. The switch reads fine. The lamp reads open. The AI was wrong. The meter was right.", 0.3),
    ("ap6", "06 · AI PAIR", "aipair", "Brief it. Catch it. Prove it. AI fluency, graded by code, on a signed receipt, for software and the trades.", 0.7),
    ("u3", "05 · UNSEEN PROOF", "lanes", "Our rule is simple. AI teaches and explains. Code verifies what can be measured. Humans judge what needs judgement.", 0.3),
    ("u4", "05 · UNSEEN PROOF", "lanes", "No capability is ever awarded because an AI thought the answer looked good.", 0.7),
    # ---------------------------------------------------------------- RECEIPT
    ("k1", "07 · SIGNED RECEIPT", "receipt", "What comes out is a signed capability receipt. The exact task version. His submission. Every check that passed or failed. The conditions it ran under.", 0.25),
    ("k2", "07 · SIGNED RECEIPT", "receipt", "Aarav owns it. He chooses who sees it, and he can revoke it in one tap.", 0.5),
    ("k3", "07 · SIGNED RECEIPT", "contrast", "The résumé said Aarav could debug. This shows what happened when he actually had to.", 0.9),
    # ---------------------------------------------------------------- EXCHANGE
    ("x1", "08 · OPPORTUNITY", "exchange", "On Maya's side, there's no mystery score. She sees which requirements are proven, which are missing, and the evidence behind each one.", 0.25),
    ("x2", "08 · OPPORTUNITY", "exchange", "And because the graph is shared, the same proof counts at every employer that needs it. Prove once. Apply everywhere.", 0.7),
    # ---------------------------------------------------------------- DELTA
    ("y1", "09 · MARKET DELTA", "delta", "And then, the world changes.", 0.35),
    ("y2", "09 · MARKET DELTA", "delta", "The role now needs Docker and C I C D.", 0.25),
    ("y3", "09 · MARKET DELTA", "delta", "Most systems would send Aarav back to the start. CAPABLE recompiles the role, and adds only the delta: containers, C I C D, and the Linux they depend on.", 0.25),
    ("y4", "09 · MARKET DELTA", "delta", "Everything he already proved still counts.", 0.3),
    ("y5", "09 · MARKET DELTA", "delta", "And no lab can validate those three yet, so CAPABLE says so. Awaiting validation. It never invents competence.", 0.6),
    ("y6", "09 · MARKET DELTA", "notagain", "The market changed. The pathway changed. The learner didn't start again.", 1.1),
    # ---------------------------------------------------------------- WHY NOBODY
    ("n1", "WHY NOBODY DOES THIS", "chain", "So why doesn't this exist already?", 0.25),
    ("n2", "WHY NOBODY DOES THIS", "chain", "Because the system is a chain of separate businesses. Course platforms sell completions. Job boards sell listings. Screening software sells filters. Staffing agencies earn more when people churn.", 0.25),
    ("n3", "WHY NOBODY DOES THIS", "chain", "Each one optimises its own link. Nobody owns the loop.", 0.6),
    ("n4", "WHY NOBODY DOES THIS", "versus", "That's why everyone else verifies what people claim. CAPABLE generates the work, and lets the work speak.", 0.6),
    ("n5", "WHY NOW", "whynow", "And why now? AI made faking a signal almost free. It also made compiling demand and generating fresh work cheap. The technology that broke the signal can rebuild it, as long as it's never the judge.", 0.8),
    # ---------------------------------------------------------------- SCALE
    ("o1", "ONE INFRASTRUCTURE", "domains", "And this isn't only for software. The same graph and the same receipts already run labs for data analysts, solar technicians and electricians, built offline-first for a basic phone.", 0.4),
    ("o2", "ONE INFRASTRUCTURE", "rail", "That makes CAPABLE infrastructure. Next: auditable, name-blind verification for enterprises. Hiring in a box for small businesses with no HR. Voice-first proof for frontline workers, in their own language. And curricula that sync to live demand, for colleges and ITIs.", 0.8),
    # ---------------------------------------------------------------- BUSINESS MODEL
    ("bm1", "THE BUSINESS", "money", "And it pays for itself. Learners never pay to prove what they can do.", 0.2),
    ("bm2", "THE BUSINESS", "money", "Employers pay per verified shortlist, a fraction of the fifteen to thirty percent a recruiter charges. Enterprises license verification, and AI Pair to upskill their own teams. Colleges pay for outcome data they can finally show.", 0.25),
    ("bm3", "THE BUSINESS", "money", "And every employer who joins makes every receipt worth more. That's the moat.", 0.8),
    # ---------------------------------------------------------------- CLOSE
    ("f1", "THE CLOSE", "meet", "Today, Aarav spends two years grinding puzzles a machine can solve, and only then asks if they matter.", 0.25),
    ("f2", "THE CLOSE", "meet", "Maya spends months filtering, and still wonders if her hire can do the work.", 0.3),
    ("f3", "THE CLOSE", "meet", "Both questions arrive too late. CAPABLE asks them first.", 0.8),
    ("f4", "THE CLOSE", "mantra", "The job description becomes the curriculum.", 0.2),
    ("f5", "THE CLOSE", "mantra", "The work becomes the proof.", 0.2),
    ("f6", "THE CLOSE", "mantra", "The proof becomes opportunity.", 0.35),
    ("f7", "THE CLOSE", "mantra", "And when the world changes, the pathway changes with it.", 0.9),
    ("f8", "THE CLOSE", "end", "CAPABLE.", 4.0),
]


def synth(headers, text):
    import requests
    body = {"input": {"text": text}, "voice": {"languageCode": VOICE[:5], "name": VOICE},
            "audioConfig": {"audioEncoding": "LINEAR16", "sampleRateHertz": 24000, "speakingRate": RATE}}
    r = requests.post("https://texttospeech.googleapis.com/v1/text:synthesize", headers=headers, json=body, timeout=120)
    if r.status_code != 200:
        raise RuntimeError(f"{r.status_code} {r.text[:200]}")
    return base64.b64decode(r.json()["audioContent"])


def dur(p: Path) -> float:
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], text=True))


def main():
    for d in (CACHE, OUT, MANIFEST.parent):
        d.mkdir(parents=True, exist_ok=True)
    key = lambda t: hashlib.sha1(f"{VOICE}|{RATE}|{t}".encode()).hexdigest()[:14]
    headers, ledger = None, None
    todo = [b for b in BEATS if not (CACHE / f"{key(b[3])}.wav").exists()]
    if todo and not ESTIMATE:
        import google.auth
        from google.auth.transport.requests import Request
        from core.cost_ledger import CostLedger
        os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", str(ROOT / "google_credentials.json"))
        creds, proj = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        creds.refresh(Request())
        headers = {"Authorization": f"Bearer {creds.token}", "Content-Type": "application/json", "x-goog-user-project": proj}
        ledger = CostLedger("capable-x-vo-" + datetime.now().strftime("%Y%m%d-%H%M%S"))
        ledger.guard(sum(len(b[3]) for b in todo) * USD_PER_CHAR, f"{len(todo)} CAPABLE X VO beats")
    beats, cursor = [], 0
    for bid, chap, scene, text, gap in BEATS:
        raw = CACHE / f"{key(text)}.wav"
        out = OUT / f"{bid}.wav"
        if ESTIMATE and not raw.exists():
            sp = max(0.6, len(text.split()) / 2.75)
        else:
            if not raw.exists():
                with ledger.track(f"capable_x_{bid}", VOICE, "audio") as rec:
                    data = synth(headers, text)
                    rec.usd = len(text) * USD_PER_CHAR
                    rec.bytes_out = len(data)
                raw.write_bytes(data)
            af = ("silenceremove=start_periods=1:start_duration=0.02:start_threshold=-50dB,areverse,"
                  "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-50dB,areverse,"
                  "highpass=f=60,loudnorm=I=-16:TP=-1.5:LRA=9,aresample=48000")
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-af", af, "-ac", "2", str(out)], check=True)
            sp = dur(out)
        lead = 0.12
        frames = int(round((lead + sp + 0.12 + gap) * FPS))
        beats.append({"id": bid, "chapter": chap, "scene": scene, "text": text, "audio": f"capx/vo/{bid}.wav",
                      "speech_s": round(sp, 3), "leadFrames": round(lead * FPS), "speechFrames": round(sp * FPS),
                      "startFrame": cursor, "durationInFrames": frames})
        cursor += frames
        print(f"{bid} {scene:<9} {sp:5.2f}s  cum {cursor / FPS:6.2f}s")
    MANIFEST.write_text(json.dumps({"fps": FPS, "voice": VOICE, "estimated": ESTIMATE, "totalFrames": cursor, "beats": beats}, indent=1), encoding="utf-8")
    spent = f"  spent ${ledger.spent_this_run():.4f}" if ledger else ""
    print(f"TOTAL {cursor / FPS:.2f}s  ({cursor} frames){spent}")


if __name__ == "__main__":
    main()
