import { useEffect, useRef, useState } from 'react'
import { useDelivery } from '../Chrome'
import { useTwin } from '../learn/twinStore'
import { useStored } from '../learn/useStored'
import { PremiumScene } from '../learn/PremiumScene'
import { BEATS } from '../learn/reelTimeline'
import { checksClosingStock, inventoryAnswer, stockResult, stockStory, variant, type Playbook, type Stock } from './domain.ts'

export function InventoryReel({ playbook, mistake, onNext }: {
  playbook: Playbook; mistake: { kind: string; submitted: number; reference: Stock } | null; onNext: () => void
}) {
  const { mode } = useDelivery()
  const { add } = useTwin()
  const [run] = useState(() => crypto.getRandomValues(new Uint32Array(1))[0] || 1)
  const [seenRun, storeRun] = useStored(`moonshot-reel-${playbook.experienceId}-${playbook.version}`, run)
  const [answer, storeAnswer] = useStored<{ attempt: number; correct: boolean } | null>(`moonshot-recall-${playbook.experienceId}-${playbook.version}`, null)
  const [reduce, setReduce] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [paused, setPaused] = useState(false)
  const [clock, setClock] = useState(0)
  const [typed, setTyped] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [poster, setPoster] = useState(true)
  const [video, setVideo] = useState(true)
  const [videoReady, setVideoReady] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const result = useRef<HTMLDivElement>(null)
  const storyStock = mistake?.reference ?? playbook.facts
  const base = stockResult(storyStock)
  const transfer = variant(seenRun)
  const challenge = stockResult(transfer).variance === 0 ? { ...transfer, counted: transfer.counted - 1 } : transfer
  const outcome = stockResult(challenge)
  const story = stockStory(storyStock, mistake?.submitted ?? -base.variance, mistake?.kind, challenge, false)
  const beat = answer ? 5 : BEATS.findLastIndex((stage) => clock >= stage.at)

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduce(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (!paused && !reduce && beat < 4) {
      const timer = setTimeout(() => setClock(BEATS[beat + 1].at), (BEATS[beat + 1].at - BEATS[beat].at) * 1000)
      return () => clearTimeout(timer)
    }
  }, [beat, paused, reduce])
  useEffect(() => { if (answer) result.current?.focus() }, [answer])

  function move(to: number) {
    setClock(BEATS[to].at)
    if (to === 4) requestAnimationFrame(() => input.current?.focus())
  }

  return <div className="reel-player mission-reel" data-inventory-beat={beat}>
    <PremiumScene beat={beat} progress={beat === 5 ? 1 : clock / 19.5} story={story} correct={answer?.correct}
      media={beat < 2 && mode !== 'offline' && <>
        {poster && <img src="/media/sheru-boss.webp" alt="" onError={() => setPoster(false)} />}
        {mode === 'rich' && !reduce && !paused && video && <video className={videoReady ? 'video-ready' : ''} autoPlay loop muted playsInline
          src="/media/remix/sheru_aviators.mp4" onPlaying={() => setVideoReady(true)} onError={() => setVideo(false)} />}
      </>}
      gate={beat === 4 && <form className="reel-gate" onSubmit={(event) => {
        event.preventDefault()
        const attempt = inventoryAnswer(typed)
        if (attempt === null) { setInvalid(true); return }
        const correct = attempt === (checksClosingStock(mistake?.kind) ? outcome.expected : outcome.variance)
        add({ id: `moon-recall-${playbook.experienceId}-${playbook.version}-${seenRun}`, type: 'answer', conceptId: 'inventory_reconciliation',
          itemId: `inventory-recall-${seenRun}`, answer: null, source: 'recall', modality: 'reel', correct })
        storeRun(seenRun)
        storeAnswer({ attempt, correct })
      }}>
        <label className="field-label">Your recall answer<input ref={input} className="text-input" value={typed} aria-invalid={invalid} onChange={(e) => setTyped(e.target.value)} /></label>
        {invalid && <p className="err" role="alert">Enter a signed whole number.</p>}
        <button className="btn big">Check my recall</button>
      </form>}
      feedback={answer && <div className="reel-feedback" role="status" ref={result} tabIndex={-1}>
        <p>{story.answerFormula}</p><button className="btn big" onClick={onNext}>Start an unseen worksheet</button>
      </div>} />
    {beat < 4 && <div className="reel-toolbar">
      {!reduce && <button className="btn ghost" onClick={() => setPaused(!paused)}>{paused ? 'Play' : 'Pause'}</button>}
      {(reduce || paused) && <button className="btn ghost" onClick={() => move(beat + 1)}>Next scene</button>}
      <button className="btn ghost" onClick={() => move(4)}>Go to recall question</button>
    </div>}
  </div>
}
