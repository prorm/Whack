# Agent Skills Guide: How & When to Use Each Skill

This guide explains all skills currently installed in your repository under [`.agents/skills/`](./.agents/skills/), what each skill is designed for, and the exact prompts to trigger them.

---

## Quick Reference Map

| Skill Group | What It Solves | Key Skills |
|---|---|---|
| **1. Programmatic Video (Remotion)** | Building, styling, and rendering code-driven video with React | `remotion-markup`, `remotion-create`, `remotion-render`, `remotion-studio` |
| **2. Launch & Hype Videos (Brag)** | Auto-generating short promotional and teaser videos from code | `brag`, `brag-slim` |
| **3. Motion Design & Easing (Emil Kowalski)** | High-end spring curves, micro-interactions, avoiding "AI-slop" motion | `animate`, `choreograph`, `improve-animations`, `animation-vocabulary` |
| **4. Subtitles & Audio** | Transcribing, animating subtitles, and beat-syncing audio | `remotion-captions`, `remotion-multimedia` |
| **5. Codebase Intelligence** | Graph analysis of complex repositories and file connections | `graphify` |

---

## 1. Remotion Suite (React Video-as-Code)

Used when you want to build frame-accurate animations or video scenes using React, TypeScript, HTML, and CSS.

### `remotion-markup`
* **What it does:** Teaches the agent the proper Remotion animation syntax—using `spring()`, `interpolate()`, `<Sequence>`, layout constraints, and typography.
* **When to use:** Whenever writing or editing React video components.
* **Example prompt:**
  > *"Using remotion-markup, write a React component that shows an array `[2, 7, 11, 15]` and animates two pointer arrows stepping inward with smooth spring physics."*

### `remotion-create`
* **What it does:** Scaffolds brand new Remotion projects or new composition configurations (resolution, FPS, duration).
* **When to use:** When starting a fresh video project from scratch.
* **Example prompt:**
  > *"Using remotion-create, set up a new 1080x1920 vertical composition for a YouTube Short with 30 fps and a 45-second duration."*

### `remotion-studio`
* **What it does:** Manages running and previewing the live browser-based Remotion timeline player so you can scrub through frames and visually verify animations.
* **When to use:** When you want to preview the video before rendering.
* **Example prompt:**
  > *"Launch remotion-studio so I can review the Day 3 animation sequence."*

### `remotion-render`
* **What it does:** Invokes headless CLI rendering to produce final MP4s or still frame thumbnails.
* **When to use:** When your React composition is ready and you want the final video file.
* **Example prompt:**
  > *"Render the composition to `renders/final.mp4` with high quality CRF 18 using remotion-render."*

### `remotion-captions`
* **What it does:** Synchronizes transcription timestamps with animated, on-beat subtitle overlays (karaoke-style, word-by-word pop, or sentence cards).
* **When to use:** Adding animated captions to your videos or Shorts.
* **Example prompt:**
  > *"Using remotion-captions, create an animated subtitle bar that highlights each spoken word in `#FFD43B` yellow as it is spoken."*

---

## 2. Brag Suite (Automated Promo / Hype Videos)

Used when you want a fast, automated 15–25 second teaser, product reveal, or social media launch video generated directly from your codebase.

### `brag`
* **What it does:** Inspects the current project, writes a script and storyboard, choreographs scenes, adds sound effects and music, and renders a video using Hyperframes.
* **When to use:** Making full launch videos or promotional reels for Twitter/YouTube.
* **Example prompt:**
  > *"/brag make a cinematic 20-second launch video for our 22 Patterns in 22 Days series."*

### `brag-slim`
* **What it does:** Lightweight version of brag that builds and renders the entire video locally using whatever tools are already installed on your machine (Chrome headless, ffmpeg, canvas).
* **When to use:** When you want a fast local render without downloading external heavy asset packs.
* **Example prompt:**
  > *"/brag-slim --tone cinematic --duration 15"*

---

## 3. Motion Design & Animation Polish (Emil Kowalski)

Used to give your animations human-crafted polish, smooth natural deceleration, and professional visual timing.

### `animate`
* **What it does:** Determines *whether* an element should animate, what purpose it serves, which properties to animate (transform/opacity vs layout), and selects the ideal spring curve and duration.
* **When to use:** Designing any new UI transition, component entrance, or card reveal.
* **Example prompt:**
  > *"Use the animate skill to design the entry transition for the Two Sum array card."*

### `choreograph`
* **What it does:** Coordinates multiple moving elements together—prevents chaotic simultaneous motion by introducing natural staggered delays, overlaps, and hierarchy.
* **When to use:** When multiple elements appear on screen (e.g. array cells appearing one-by-one, speech bubbles popping up, badges cascading).
* **Example prompt:**
  > *"Using choreograph, sequence the entrance of our 4 feature badges so they cascade naturally without cluttering the screen."*

### `improve-animations` & `review-animations`
* **What it does:** Audits existing animation code to diagnose stiffness, awkward easing, abrupt stops, or dropped frames, and provides concrete fixes.
* **When to use:** When an animation feels "off", mechanical, or unnatural.
* **Example prompt:**
  > *"Review the pointer movement animation with improve-animations. Why does the swap feel stiff?"*

### `animation-vocabulary`
* **What it does:** Reverse-lookup glossary that converts natural language descriptions into exact mathematical motion terms (e.g., "bouncy popup" → pop-in with damping 12, overshoot 1.15).
* **When to use:** When you have a visual idea in mind and need the exact parameters for it.

### `animation-performance`
* **What it does:** Enforces 60fps frame budgets by keeping animations restricted to GPU composite-only properties (`transform`, `opacity`) and avoiding layout thrashing.
* **When to use:** When animations are dropping frames or stuttering during renders.

---

## 4. Typical Workflows for "It's Not That Hard" (DSA Channel)

### Workflow A: Creating a New Pattern Episode Visual Trace
1. **Design the layout & motion:**
   > *"Using `remotion-markup` and `choreograph`, design a 1080p scene for Day 8 Monotonic Stack. Stagger the stack elements pushing and popping with spring easing."*
2. **Review & Polish:**
   > *"Use `review-animations` to check if the stack push/pop transitions feel natural."*
3. **Add Subtitles:**
   > *"Use `remotion-captions` to sync the narration audio to word-level subtitles."*

### Workflow B: Making a YouTube Short / Promo Teaser
1. **Generate the Hype Video:**
   > *"/brag-slim --tone cinematic --duration 15"*
2. **Post to Socials:**
   > Use the generated `brag-output/share-copy.txt` and `brag-output/brag.jpg` poster.
