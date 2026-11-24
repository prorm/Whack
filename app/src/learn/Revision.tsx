import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Screen, useDelivery } from '../Chrome'
import { parseCell } from '../engine/proof.ts'
import { answerReel, planReel, TEMPLATES } from '../engine/remix.ts'
import { go } from '../router'
import { useStore } from '../store'
import { PremiumScene } from './PremiumScene'
import { makeStory, type ReelPlan } from './reelStory'
import { BEATS, GATE, SHOWCASE_LENGTH } from './reelTimeline'
import { useTwin } from './twinStore'
import { useStored } from './useStored'
import './reel.css'

function useReducedMotion() {
  const [reduced, set] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => set(query.matches)
    query.addEventListener('change', read)
    return () => query.removeEventListener('change', read)
  }, [])
  return reduced
}

export function PremiumPlayer({ plan, active = true, next, skip, replay }: {
  plan: ReelPlan; active?: boolean; next: () => void; skip?: () => void; replay?: () => void
}) {
  const { twin, add } = useTwin()
  const { state } = useStore()
  const { mode, online, status } = useDelivery()
  const kn = state.lang === 'kn'
  const reduced = useReducedMotion()
  const [seconds, setSeconds] = useState(0)
  const [paused, setPaused] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [videoOK, setVideoOK] = useState(true)
  const [hasFrame, setHasFrame] = useState(false)
  const [posterOK, setPosterOK] = useState(true)
  const [sound, setSound] = useState(false)
  const [soundFailed, setSoundFailed] = useState(false)
  const playingSound = useRef<HTMLAudioElement>(null)
  const sounds = useRef<Map<string, HTMLAudioElement>>(new Map())
  const video = useRef<HTMLVideoElement>(null)
  const currentTime = useRef(0)
  const gateInput = useRef<HTMLInputElement>(null)
  const feedbackHeading = useRef<HTMLDivElement>(null)
  const { pub, key } = plan
  const prior = twin.history.find((e) => e.id === `${pub.reel_id}-ans`)
  const story = useMemo(() => makeStory(plan, twin.history, kn), [plan, twin.history, kn])
  const beat = prior ? 5 : BEATS.findLastIndex((scene) => seconds >= scene.at)
  const running = active && !paused && !reduced && seconds < GATE && !prior
  const tpl = TEMPLATES[pub.template_id]
  const clip = tpl.video ?? TEMPLATES.sheru_repair.video
  const poster = (pub.template_id === 'sheru_repair' ? '/media/sheru-boss.jpg' : tpl.poster).replace(/\.jpg$/, '.webp')
  const showVideo = active && mode === 'rich' && status !== 'caching' && !reduced && videoOK && beat < 2

  useEffect(() => {
    if (!running) return
    let last = performance.now()
    const interval = setInterval(() => {
      const now = performance.now()
      if (document.visibilityState === 'visible') {
        currentTime.current = Math.min(GATE, currentTime.current + (now - last) / 1000)
        setSeconds(currentTime.current)
      }
      last = now
    }, 70)
    return () => clearInterval(interval)
  }, [running])

  useEffect(() => {
    if (!showVideo || !video.current) return
    if (running) void video.current.play().catch(() => {})
    else video.current.pause()
  }, [showVideo, running])

  useEffect(() => {
    if (!active || !sound || !online || mode === 'offline' || paused) return
    const audio = sounds.current.get(BEATS[beat].sound)
    if (!audio) return
    playingSound.current?.pause()
    playingSound.current = audio
    audio.currentTime = 0
    void audio.play().catch(() => { setSoundFailed(true); setSound(false) })
    return () => audio.pause()
  }, [active, sound, online, mode, paused, beat])

  function toggleSound() {
    if (sound) {
      setSound(false)
      return
    }
    setSoundFailed(false)
    for (const name of new Set(BEATS.map((scene) => scene.sound))) {
      if (sounds.current.has(name)) continue
      const audio = new Audio(`/media/sfx/${name}.m4a`)
      audio.volume = name === 'boom' ? 0.45 : 0.55
      audio.preload = 'auto'
      sounds.current.set(name, audio)
    }
    const audio = sounds.current.get(BEATS[beat].sound)!
    void audio.play().then(() => setSound(true)).catch(() => { setSoundFailed(true); sounds.current.clear() })
  }

  function advance() {
    currentTime.current = Math.min(GATE, BEATS[beat + 1].at)
    setSeconds(currentTime.current)
    if (currentTime.current === GATE) requestAnimationFrame(() => gateInput.current?.focus())
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (prior || beat !== 4) return
    const numeric = parseCell(input).value
    if (numeric === null || !Number.isFinite(numeric)) {
      setError(kn ? 'ಒಂದು ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.' : 'Enter one number.')
      return
    }
    const { result } = answerReel(twin, pub, key, numeric, Date.now())
    try {
      add(result.event)
      setError('')
      requestAnimationFrame(() => feedbackHeading.current?.focus())
    } catch {
      setError('Device storage is unavailable. Free space and try again.')
    }
  }

  return <div className={`reel-player ${paused ? 'reel-paused' : ''}`} data-testid="remix-reel" data-delivery={mode} data-beat={beat} lang={kn ? 'kn' : 'en'}>
    <PremiumScene story={story} beat={beat} progress={prior ? 1 : seconds / SHOWCASE_LENGTH} correct={prior?.correct}
      media={active && mode !== 'offline' && beat <= 1 && <>
        {posterOK && <img alt="" src={poster} onError={() => setPosterOK(false)} />}
        {showVideo && <video ref={video} className={hasFrame ? 'video-ready' : ''} src={clip} muted playsInline loop preload="none"
          onPlaying={() => setHasFrame(true)} onError={() => { setVideoOK(false); setHasFrame(false) }} />}
      </>}
      gate={beat === 4 && <form className="reel-gate" onSubmit={submit}>
        <label className="field-label">{kn ? 'ನಿಮ್ಮ ಉತ್ತರ' : 'Your answer'}
          <input className="text-input" ref={gateInput} inputMode="decimal" value={input} onChange={(e) => setInput(e.target.value)} aria-invalid={!!error} />
        </label>
        <button className="btn big">{kn ? 'ಉತ್ತರ ಪರಿಶೀಲಿಸಿ' : 'Check my answer'}</button>
        {error && <p className="err" role="alert">{error}</p>}
      </form>}
      feedback={prior && <div className="reel-feedback" ref={feedbackHeading} tabIndex={-1} role="status">
        <p>{story.answerFormula}</p>
        <button className="btn big" onClick={next}>{skip ? (kn ? 'ಮುಂದಿನ ರೀಲ್' : 'Next reel') : (kn ? 'ಕೌಶಲ್ಯ ಪರೀಕ್ಷೆ' : 'Start the skill challenge')}</button>
      </div>}
    />
    <div className="reel-toolbar">
      {beat < 4 && <>
        {!reduced && <button className="btn ghost" onClick={() => setPaused(!paused)}>{paused ? (kn ? 'ಚಾಲನೆ' : 'Play') : (kn ? 'ವಿರಾಮ' : 'Pause')}</button>}
        {(reduced || paused) && <button className="btn ghost" onClick={advance}>{kn ? 'ಮುಂದೆ' : 'Next scene'}</button>}
        {!reduced && <button className="btn ghost" onClick={() => { currentTime.current = GATE; setSeconds(GATE); requestAnimationFrame(() => gateInput.current?.focus()) }}>{kn ? 'ಪ್ರಶ್ನೆಗೆ ಹೋಗಿ' : 'Go to question'}</button>}
      </>}
      {prior && replay && <button className="btn ghost" onClick={replay}>{kn ? 'ಹೊಸ ಪ್ರಶ್ನೆ' : 'Try a new recall'}</button>}
      {online && mode !== 'offline' && <button className="btn ghost" onClick={toggleSound} aria-pressed={sound}>{kn ? 'ಧ್ವನಿ' : 'Sound'}</button>}
      {skip && <button className="btn ghost" onClick={skip}>{kn ? 'ಬಿಟ್ಟುಬಿಡಿ' : 'Skip reel'}</button>}
      {soundFailed && <p className="fine" role="status">{kn ? 'ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲ.' : 'Sound unavailable. Captions are on.'}</p>}
    </div>
  </div>
}

export function Revision() {
  const { twin } = useTwin()
  const [saved, remember] = useStored<{ plannedAt: number; plan: ReelPlan | null } | null>('current-reel-v2', null)
  const create = () => {
    const plannedAt = Date.now()
    return { plannedAt, plan: planReel(twin, plannedAt, { opportunity: { title: 'Rider payouts', pay: 'practice' } }) }
  }
  const [initial] = useState(() => {
    const changed = twin.history.some((e) => e.at > (saved?.plannedAt ?? 0) && !e.correct && e.source !== 'feed' && e.conceptId.startsWith('percent'))
    const due = Object.values(twin.recall).some((item) => item.dueAt > (saved?.plannedAt ?? 0) && item.dueAt <= Date.now())
    return !saved || changed || due ? create() : saved
  })
  const [current, setCurrent] = useState(initial)
  const plan = current.plan
  useEffect(() => { remember(current) }, [current, remember])
  return <Screen title="Your revision reel" className="journey revision" contentLang="en" careerFlow>
    {plan && <PremiumPlayer key={plan.pub.reel_id} plan={plan} next={() => go('challenge')}
      replay={() => setCurrent(create())} />}
    <button className="btn ghost" onClick={() => go('path')}>Back to my path</button>
  </Screen>
}
