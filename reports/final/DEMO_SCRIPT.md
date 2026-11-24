# CAPABLE recording script

**Target runtime** 3:00. Follow one learner, one mistake, and one work sample from the lab to the employer seat.

## Set up the take

1. Use a fresh browser profile or private window at 100% zoom. Prefer a 1280 × 800 viewport or larger. Use the same tab throughout. Switch to full screen before recording and keep the cursor still between clicks.
2. Load the demo learner once using [Seed the learner](http://localhost:4173/#/home?demo=seed). It returns to the homepage with lessons 1–4 complete, two of four in-app skills proven, and a prior sizing mistake. The script calls out this starting point. This link replaces CAPABLE progress on the browser you use.
3. Record screen and microphone. Use the lesson and reel sound controls to keep your voice clear. If you edit the video, use cuts between routes and keep the slider movement, grading and employer evidence inspection continuous. Keep the **DEMO** labels in frame.

## Voiceover and exact clicks

### 0:00–0:18 · Open on the fault

**Say** “Ravi wants his first job in solar. He’s finished a course, but here’s a question an installer actually faces. This rooftop worked yesterday. Why does the inverter trip when the panels get colder?”

**Show** [Home](http://localhost:4173/#/home). Start at **45 °C / 563.1 V**. On “colder,” drag **Cell temperature** left to **4 °C / 628.9 V**. Pause for one beat on **Inverter trips**. Keep the **600 V inverter limit** in frame.

### 0:18–0:46 · Learn by making a prediction

**Say** “In FLUX Learn, Ravi makes a prediction first. Fewer volts sounds reasonable. Watch what happens when he tests it. The voltage rises as the panels cool, and twelve panels cross the inverter’s limit. Now the datasheet rule explains something he just saw happen.”

**Show** Click **Open full lesson**. Click **Skip →** on the intro if needed. Choose **Fewer volts**, then **See why →**. Move the lesson’s **Cell temperature** slider left until **INVERTER TRIPS** appears. Use **Skip →** during the success narration, or **Continue →** once it finishes, to land on the line-by-line datasheet trace. Hold briefly on the highlighted calculation.

### 0:46–1:06 · Revise the mistake

**Say** “We’ve loaded Ravi’s earlier practice for this demo. He rounded a maximum up. CAPABLE brings that specific mistake back in a short reel and asks him to make the decision again.”

**Show** Open [Revision for Ravi’s goal](http://localhost:4173/#/flux-reels?goal=job-solar-apprentice). Scroll down one card to **REPAIR**. On the cliff question, pick **12** to show the overflow and correction. Hold on the explanation that a maximum rounds down. The reel enters its question after the intro.

### 1:06–1:24 · Make a design decision

**Say** “Now Ravi has a customer’s roof and fourteen panels. Splitting them into two strings solves one problem. The first inverter still fails the array-size check. He switches inverter, sees the checks pass, and explains his design.”

**Show** Open the [Rooftop project](http://localhost:4173/#/fl-project). Use **Inverter A**, **Strings = 2**, **Panels per string = 7**. Point to the failed array-size check. Switch to **Inverter B**. Paste the explanation below and click **Submit project**.

> Two strings of seven stay below the cold voltage limit, and Inverter B can carry the full array.

### 1:24–1:50 · Test whether the skill transfers

**Say** “Here’s the test that matters. We change the city, the panel and the inverter. Ravi has to apply the rule somewhere he hasn’t practised it. He rounds the cold maximum down and the hot minimum up. The grader applies the same rules every time.”

**Show** Open the [fixed recording work order](http://localhost:4173/#/sp-assess?c=solar.cold-max&back=job-solar-apprentice&demo=work-order). Hold on **WO-CHENNAI-9301**. Enter **23** for maximum panels and **7** for minimum panels. Click **Submit for grading**. Hold on **PROVEN · system-assessed**. The variant is fixed and labeled for recording. The ordinary assessment link generates fresh variants.

### 1:50–2:08 · Show what proof looks like

**Say** “This is his Proof Passport. You can open the actual task, see what he submitted and compare it with the grading key. A trainer can review that exact attempt. Ravi decides which records to share.”

**Show** Click **Inspect evidence**. Hold on the first table with answers **23** and **7**, then briefly show the task details or **Trainer review** below. For the next cut, click **See my job match →** at the top of the record.

### 2:08–2:43 · Follow the evidence across to hiring

**Say** “The apprentice role started at two out of four in-app skills. The work order and the project get Ravi to four. He chooses what to share. Let’s switch seats. The hiring team can inspect those same answers and invite him to a supervised practical. This is a simulated employer workflow, and the practical is the next step for a safety-critical role.”

**Show** Hold on **4/4** and **Eligible for a supervised practical assessment**. In **Show my evidence to…**, select all three records and the consent checkbox, then click **Share 3 records**. Click **See what the employer sees (demo) →**. Under **Learner on this device**, use **inspect** on the **Cold-morning string sizing** row. Hold on the same **23** and **7**. Close it, click **Shortlist**, then **Invite to supervised practical** and **Send invite (DEMO)**. If you need a shorter take, end the beat with the answers visible.

### 2:43–3:00 · Close on the platform

**Say** “AI helps us create lessons faster. Code grades the work. With Field Scars, experienced workers can turn a mistake into someone’s first lesson. Learn it, remember it, prove you can use it. That’s CAPABLE.”

**Show** Cut briefly to [Teach](http://localhost:4173/#/sp-teach) with **Capture a Field Scar** and **Master review queue** visible. Return to the homepage for the last sentence. The learner’s demo invite is visible above the hero if you sent it.

## If a take needs a reset

- Load [Seed the learner](http://localhost:4173/#/home?demo=seed) again in the recording window to restore Ravi’s baseline. Reapply any audio settings you want.
- If the lesson audio is quiet, use captions and keep recording. **Skip →** is available during narrated sections and after the temperature goal.
- If the third evidence checkbox is missing, confirm **Project passed every check** and **PROVEN · system-assessed** on the fixed work order. Then reopen [the apprentice role](http://localhost:4173/#/sp-job?id=job-solar-apprentice).
- The [CAPABLE launch film](../../docs/media/capable-launch.mp4) shows the full pitch cut and live product walkthrough.
