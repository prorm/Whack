"""Compositor: storyboard + layers -> playable outputs.

1. synth_tts()        per-scene edge-tts mp3s (free test TTS)
2. render_mp4()       ffmpeg 720x1280 reel: background (plate / keyframe / colour) + ASS kinetic captions + TTS
3. build_preview()    zero-dependency outputs/preview_player.html: swipe feed, live captions, 6 s Cortisol Lock,
                      Unseen Job Twin card. Works from file:// on a phone or laptop.
"""
from __future__ import annotations

import asyncio
import json
import shutil
import subprocess
import time
from pathlib import Path

from schemas.storyboard import ReelStoryboard

from .settings import settings

OUT = settings().outputs_dir
VOICES = {"english": "en-IN-NeerjaNeural", "hinglish": "en-IN-PrabhatNeural", "kanglish": "en-IN-PrabhatNeural"}


def ffmpeg_path() -> str | None:
    return shutil.which("ffmpeg")


# ----------------------------------------------------------------------------- TTS
def synth_tts(sb: ReelStoryboard, name: str) -> dict:
    import edge_tts

    voice = VOICES.get(sb.language_mode, "en-IN-NeerjaNeural")
    adir = OUT / "audio" / name
    adir.mkdir(parents=True, exist_ok=True)
    files, t0 = [], time.perf_counter()

    async def run():
        for s in sb.scenes:
            p = adir / f"{s.scene_id}.mp3"
            budget = (s.end_ms - s.start_ms) / 1000
            words = max(1, len(s.tts_script.split()))
            rate = "+25%" if words / budget > 2.6 else "+10%"  # squeeze dense lines into their window
            await edge_tts.Communicate(s.tts_script, voice, rate=rate).save(str(p))
            files.append({"scene_id": s.scene_id, "path": str(p), "start_ms": s.start_ms, "end_ms": s.end_ms})

    try:
        asyncio.run(run())
        ok, err = True, ""
    except Exception as e:  # network TTS can fail; reel still works silent with captions
        ok, err = False, f"{type(e).__name__}: {e}"[:200]
    return {"ok": ok, "error": err, "voice": voice, "files": files, "latency_ms": int((time.perf_counter() - t0) * 1000)}


# ----------------------------------------------------------------------------- ASS captions
def _ts(ms: int) -> str:
    cs = max(0, ms) // 10
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def _esc(t: str) -> str:
    return t.replace("\\", "/").replace("{", "(").replace("}", ")").replace("\n", "\\N")


def write_ass(sb: ReelStoryboard, path: Path) -> None:
    font = "Nirmala UI"  # ships with Windows; covers Latin, Devanagari and Kannada
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{font},64,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,6,2,2,40,40,300,1
Style: Card,Consolas,34,&H00111111,&H00111111,&H00F0F0F0,&H00F0F0F0,1,0,0,0,100,100,0,0,3,14,0,8,60,60,120,1
Style: Meme,{font},40,&H0000E1FF,&H0000E1FF,&H00000000,&H00000000,1,0,0,0,100,100,0,-4,1,4,0,8,40,40,330,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    for s in sb.scenes:
        if s.code_overlay and s.code_overlay.lower() != "none":
            ev.append(f"Dialogue: 1,{_ts(s.start_ms)},{_ts(s.end_ms)},Card,,0,0,0,,{_esc(s.code_overlay)}")
        if s.meme_overlay and s.meme_overlay.lower() != "none":
            ev.append(f"Dialogue: 2,{_ts(s.start_ms)},{_ts(min(s.end_ms, s.start_ms + 1600))},Meme,,0,0,0,,"
                      f"{{\\fad(80,200)}}{_esc(s.meme_overlay.upper())}")
        words = s.caption_words
        for i, w in enumerate(words):
            chunk = words[(i // 3) * 3:(i // 3) * 3 + 3]
            end = words[i + 1].start_ms if i + 1 < len(words) else max(w.end_ms, s.end_ms - 40)
            parts = []
            for c in chunk:
                txt = _esc(c.word)
                if c is w:
                    col = "&H0000E1FF&" if (c.emphasis) else "&H0050FF7A&"
                    parts.append(f"{{\\c{col}\\fscx118\\fscy118}}{txt}{{\\c&H00FFFFFF&\\fscx100\\fscy100}}")
                else:
                    parts.append(txt)
            ev.append(f"Dialogue: 3,{_ts(w.start_ms)},{_ts(max(end, w.start_ms + 120))},Cap,,0,0,0,,{' '.join(parts)}")
    path.write_text(head + "\n".join(ev) + "\n", encoding="utf-8")


# ----------------------------------------------------------------------------- MP4
def render_mp4(sb: ReelStoryboard, name: str, *, plate: Path | None = None, keyframe: Path | None = None,
               tts: dict | None = None, plate_audio_volume: float = 0.35) -> dict:
    ff = ffmpeg_path()
    if not ff:
        return {"ok": False, "error": "ffmpeg not on PATH"}
    rdir = OUT / "reels"
    rdir.mkdir(parents=True, exist_ok=True)
    ass = rdir / f"{name}.ass"
    write_ass(sb, ass)
    dur = sb.duration_ms / 1000
    args = [ff, "-y", "-hide_banner", "-loglevel", "error"]
    if plate and plate.exists():
        args += ["-stream_loop", "-1", "-i", str(plate)]
        bg = "[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1"
        has_plate_audio = _has_audio(plate)
    elif keyframe and keyframe.exists():
        args += ["-loop", "1", "-framerate", "30", "-i", str(keyframe)]
        frames = int(dur * 30)
        bg = (f"[0:v]scale=1440:2560:force_original_aspect_ratio=increase,crop=1440:2560,"
              f"zoompan=z='min(1.0+0.0009*on,1.15)':d={frames}:s=720x1280:fps=30,setsar=1")
        has_plate_audio = False
    else:
        args += ["-f", "lavfi", "-i", f"color=c=0x1b1f3a:s=720x1280:r=30:d={dur}"]
        bg = "[0:v]setsar=1"
        has_plate_audio = False
    audio_inputs = []
    for f in (tts or {}).get("files", []):
        if Path(f["path"]).exists():
            args += ["-i", f["path"]]
            audio_inputs.append(f)
    filt = [f"{bg},ass={ass.name}[v]"]
    mix = []
    for i, f in enumerate(audio_inputs, start=1):
        filt.append(f"[{i}:a]atrim=0:{(f['end_ms'] - f['start_ms']) / 1000 + 0.3},adelay={f['start_ms']}|{f['start_ms']}[a{i}]")
        mix.append(f"[a{i}]")
    if has_plate_audio:
        filt.append(f"[0:a]volume={plate_audio_volume}[pa]")
        mix.append("[pa]")
    if mix:
        filt.append(f"{''.join(mix)}amix=inputs={len(mix)}:normalize=0:duration=longest[a]")
    args += ["-filter_complex", ";".join(filt), "-map", "[v]"]
    if mix:
        args += ["-map", "[a]", "-c:a", "aac", "-b:a", "128k"]
    out = rdir / f"{name}.mp4"
    args += ["-t", f"{dur}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
             "-movflags", "+faststart", out.name]
    t0 = time.perf_counter()
    p = subprocess.run(args, cwd=rdir, capture_output=True, text=True)
    ms = int((time.perf_counter() - t0) * 1000)
    if p.returncode != 0:
        return {"ok": False, "error": p.stderr[-600:], "latency_ms": ms}
    return {"ok": True, "path": str(out), "bytes": out.stat().st_size, "latency_ms": ms}


def _has_audio(path: Path) -> bool:
    probe = shutil.which("ffprobe")
    if not probe:
        return False
    p = subprocess.run([probe, "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0",
                        str(path)], capture_output=True, text=True)
    return bool(p.stdout.strip())


# ----------------------------------------------------------------------------- HTML preview player
def build_preview(reels: list[dict], out_path: Path | None = None) -> Path:
    """reels: [{name, title, tier, storyboard: ReelStoryboard, plate?, keyframe?, tts?, mp4?, cost_usd, latency_ms}]"""
    out_path = out_path or OUT / "preview_player.html"
    data = []
    for r in reels:
        sb: ReelStoryboard = r["storyboard"]
        rel = lambda p: Path(p).resolve().relative_to(out_path.parent.resolve()).as_posix() if p else None  # noqa: E731
        data.append({
            "name": r["name"], "title": r.get("title", r["name"]), "tier": r.get("tier", sb.render_tier),
            "cost_usd": r.get("cost_usd"), "latency_ms": r.get("latency_ms"),
            "plate": rel(r.get("plate")), "keyframe": rel(r.get("keyframe")), "mp4": rel(r.get("mp4")),
            "audio": [{"src": rel(f["path"]), "start_ms": f["start_ms"]} for f in (r.get("tts") or {}).get("files", [])],
            "sb": json.loads(sb.model_dump_json()),
        })
    html = PLAYER_HTML.replace("/*__DATA__*/[]", json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))
    out_path.write_text(html, encoding="utf-8")
    return out_path


PLAYER_HTML = r"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>CAPABLE - Feasibility Preview Player</title>
<style>
:root{--y:#ffd43b;--g:#51cf66;--r:#ff6b6b;--ink:#0d0f1a}
*{box-sizing:border-box;margin:0}
html,body{height:100%;background:#000;color:#fff;font-family:system-ui,"Segoe UI","Nirmala UI",sans-serif}
#feed{height:100dvh;overflow-y:scroll;scroll-snap-type:y mandatory}
.reel{position:relative;height:100dvh;scroll-snap-align:start;overflow:hidden;display:flex;justify-content:center;background:#111}
.stage{position:relative;height:100%;aspect-ratio:9/16;max-width:100vw;overflow:hidden;background:linear-gradient(160deg,#1b1f3a,#3b1d4a 60%,#0b3b3a)}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.kb{animation:kb 15s linear forwards}@keyframes kb{to{transform:scale(1.15)}}
.canvasbg{position:absolute;inset:0}
.shade{position:absolute;inset:0;background:linear-gradient(#0008,#0000 30%,#0000 55%,#000c)}
.meta{position:absolute;top:10px;left:10px;right:10px;display:flex;gap:6px;flex-wrap:wrap;font-size:12px;z-index:5}
.pill{background:#000a;border:1px solid #fff4;border-radius:99px;padding:4px 10px}
.card{position:absolute;top:13%;left:6%;right:6%;background:#f4f4f4;color:#111;font:600 17px/1.35 Consolas,monospace;padding:12px 14px;border-radius:12px;white-space:pre-wrap;box-shadow:0 8px 30px #0008;transform:scale(.9);opacity:0;transition:.2s}
.card.on{opacity:1;transform:none}
.meme{position:absolute;top:34%;left:0;right:0;text-align:center;font-weight:900;font-size:26px;color:var(--y);text-shadow:0 3px 0 #000,0 0 12px #000;opacity:0}
.meme.on{animation:pop .5s ease-out forwards}@keyframes pop{0%{opacity:0;transform:scale(.4) rotate(-6deg)}60%{opacity:1;transform:scale(1.15)}100%{opacity:1;transform:none}}
.cap{position:absolute;bottom:20%;left:5%;right:5%;text-align:center;font-weight:900;font-size:clamp(24px,7.5vw,38px);line-height:1.15;text-shadow:0 4px 0 #000,0 0 10px #000}
.cap b{color:var(--g);display:inline-block;transform:scale(1.15)}.cap b.em{color:var(--y)}
.tap{position:absolute;inset:0;display:grid;place-items:center;background:#0007;z-index:6;border:0;color:#fff;font-size:20px;font-weight:800;cursor:pointer}
.tap span{background:var(--y);color:#111;padding:16px 26px;border-radius:99px}
.lock,.twin{position:absolute;inset:0;z-index:7;background:#0d0f1af2;padding:22px;display:none;flex-direction:column;gap:12px;justify-content:center}
.lock.on,.twin.on{display:flex}
.lock h3{font-size:22px}.timer{height:8px;background:#333;border-radius:9px;overflow:hidden}.timer i{display:block;height:100%;background:var(--r);width:100%}
.opt{min-height:52px;border-radius:12px;border:2px solid #fff3;background:#1d2138;color:#fff;font-size:17px;font-weight:700;text-align:left;padding:10px 14px;cursor:pointer}
.opt.ok{border-color:var(--g);background:#1e3b26}.opt.bad{border-color:var(--r);background:#3b1e1e}
.fb{font-size:16px;min-height:44px}
.twin pre{background:#f4f4f4;color:#111;padding:12px;border-radius:10px;white-space:pre-wrap;font:14px/1.4 Consolas,monospace}
.twin li{margin-left:18px;font-size:15px}
.btn{min-height:48px;border-radius:12px;border:0;background:var(--y);color:#111;font-weight:800;font-size:16px;cursor:pointer}
.hint{position:fixed;bottom:10px;right:12px;font-size:12px;opacity:.6;z-index:9}
@media (prefers-reduced-motion:reduce){.kb,.meme.on{animation:none;opacity:1}}
</style></head><body>
<div id="feed"></div>
<div class="hint">Swipe / wheel / arrow keys - feasibility preview, generated by scripts/run_feasibility.py</div>
<script>
const REELS = /*__DATA__*/[];
const feed = document.getElementById('feed');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
REELS.forEach((r, idx) => {
  const sec = document.createElement('section'); sec.className = 'reel'; sec.dataset.i = idx;
  let bg = '';
  if (r.plate) bg = `<video class="bg" src="${r.plate}" muted loop playsinline preload="auto"></video>`;
  else if (r.keyframe) bg = `<img class="bg" src="${r.keyframe}" alt="">`;
  else bg = `<canvas class="canvasbg"></canvas>`;
  const cost = r.cost_usd != null ? `$${Number(r.cost_usd).toFixed(4)}/reel` : '';
  sec.innerHTML = `<div class="stage">${bg}<div class="shade"></div>
    <div class="meta"><span class="pill">${esc(r.title)}</span><span class="pill">Tier: ${esc(r.tier)}</span>
    <span class="pill">${esc(r.sb.language_mode)}</span>${cost ? `<span class="pill">${cost}</span>` : ''}</div>
    <div class="card"></div><div class="meme"></div><div class="cap" aria-live="polite"></div>
    <button class="tap"><span>Tap to play</span></button>
    <div class="lock"></div><div class="twin"></div></div>`;
  feed.appendChild(sec);
});
let active = null;
function stopAll(){ document.querySelectorAll('video').forEach(v => v.pause()); if (active) { active.stop(); active = null; } }
function play(sec){
  stopAll();
  const r = REELS[sec.dataset.i], sb = r.sb, st = sec.querySelector('.stage');
  const card = st.querySelector('.card'), meme = st.querySelector('.meme'), cap = st.querySelector('.cap');
  const vid = st.querySelector('video'), img = st.querySelector('img.bg'), cv = st.querySelector('canvas');
  st.querySelector('.tap').style.display = 'none';
  st.querySelector('.lock').classList.remove('on'); st.querySelector('.twin').classList.remove('on');
  if (vid) { vid.currentTime = 0; vid.play().catch(()=>{}); }
  if (img) { img.classList.remove('kb'); void img.offsetWidth; img.classList.add('kb'); }
  const audios = r.audio.map(a => ({...a, el: new Audio(a.src), fired: false}));
  const t0 = performance.now(); let raf, lastScene = null, ctx = cv && cv.getContext('2d');
  function frame(){
    const t = performance.now() - t0;
    audios.forEach(a => { if (!a.fired && t >= a.start_ms) { a.fired = true; a.el.play().catch(()=>{}); } });
    const sc = sb.scenes.find(s => t >= s.start_ms && t < s.end_ms);
    if (sc && sc !== lastScene) {
      lastScene = sc;
      const has = sc.code_overlay && sc.code_overlay.toLowerCase() !== 'none';
      card.textContent = has ? sc.code_overlay : ''; card.classList.toggle('on', !!has);
      const m = sc.meme_overlay && sc.meme_overlay.toLowerCase() !== 'none';
      meme.textContent = m ? sc.meme_overlay : ''; meme.classList.remove('on'); void meme.offsetWidth; if (m) meme.classList.add('on');
    }
    if (sc) {
      const ws = sc.caption_words; let i = ws.findIndex((w, k) => t >= w.start_ms && (k + 1 >= ws.length || t < ws[k + 1].start_ms));
      if (i < 0) i = 0;
      const c0 = Math.floor(i / 3) * 3;
      cap.innerHTML = ws.slice(c0, c0 + 3).map((w, k) => c0 + k === i ? `<b class="${w.emphasis ? 'em' : ''}">${esc(w.word)}</b>` : esc(w.word)).join(' ');
    }
    if (ctx) { const W = cv.width = cv.clientWidth, H = cv.height = cv.clientHeight; const p = t / sb.duration_ms;
      const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, `hsl(${230 + p * 80},45%,18%)`); g.addColorStop(1, `hsl(${170 + p * 60},50%,14%)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let k = 0; k < 14; k++) { ctx.fillStyle = `hsla(${(k * 40 + t / 20) % 360},80%,60%,.10)`; ctx.beginPath();
        ctx.arc((k * 97 + t / 9) % W, (k * 151) % H, 30 + k * 4, 0, 7); ctx.fill(); } }
    if (t >= sb.duration_ms) { showLock(sec); return; }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  active = { idx: +sec.dataset.i, stop(){ cancelAnimationFrame(raf); audios.forEach(a => a.el.pause()); if (vid) vid.pause(); } };
}
function showLock(sec){
  const r = REELS[sec.dataset.i], L = r.sb.cortisol_lock, box = sec.querySelector('.lock');
  box.innerHTML = `<div class="pill" style="align-self:flex-start">CORTISOL LOCK - ${L.time_limit_sec}s</div><h3>${esc(L.prompt)}</h3>
   <div class="timer"><i></i></div>${L.options.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join('')}<div class="fb"></div>`;
  box.classList.add('on');
  const bar = box.querySelector('.timer i'), fb = box.querySelector('.fb'); const t0 = performance.now(); let done = false, raf;
  const tick = () => { const p = 1 - (performance.now() - t0) / (L.time_limit_sec * 1000); bar.style.width = Math.max(0, p * 100) + '%';
    if (p <= 0 && !done) { finish(-1); return; } if (!done) raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  function finish(i){
    done = true; cancelAnimationFrame(raf);
    box.querySelectorAll('.opt').forEach(b => { b.disabled = true; if (+b.dataset.i === L.correct_index) b.classList.add('ok'); else if (+b.dataset.i === i) b.classList.add('bad'); });
    const ok = i === L.correct_index;
    fb.innerHTML = (ok ? '<b style="color:var(--g)">Locked in.</b> ' : `<b style="color:var(--r)">${i < 0 ? 'Time up.' : esc(L.fast_wrong_roast)}</b> `) + esc(L.explanation) +
      `<br><br><button class="btn" style="width:100%">Open the Unseen Job Twin</button>`;
    fb.querySelector('.btn').onclick = () => showTwin(sec);
  }
  box.querySelectorAll('.opt').forEach(b => b.onclick = () => !done && finish(+b.dataset.i));
}
function showTwin(sec){
  const T = REELS[sec.dataset.i].sb.unseen_job_twin_task, box = sec.querySelector('.twin');
  box.innerHTML = `<div class="pill" style="align-self:flex-start">UNSEEN JOB TWIN - ${esc(T.artifact_type)}</div><h3>${esc(T.title)}</h3>
    <p>${esc(T.scenario)}</p><pre>${esc(T.starter_artifact)}</pre><b>Graded on</b><ul>${T.rubric.map(x => `<li>${esc(x.criterion)} (${x.points} pts)</li>`).join('')}</ul>
    <button class="btn">Replay reel</button>`;
  box.classList.add('on'); box.querySelector('.btn').onclick = () => play(sec);
}
document.querySelectorAll('.tap').forEach(b => b.onclick = e => play(e.target.closest('.reel')));
feed.addEventListener('scroll', () => { const i = Math.round(feed.scrollTop / feed.clientHeight);
  if (active && active.idx !== i) { const old = feed.children[active.idx]; stopAll(); old.querySelector('.tap').style.display = ''; } }, {passive: true});
addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); feed.scrollBy({top: (e.key === 'ArrowDown' ? 1 : -1) * innerHeight, behavior: 'smooth'}); } });
</script></body></html>
"""
