import { useEffect, useRef, useState } from 'react'
import { capableRequest, errorText, voiceWav } from './client'
import { MENTOR_COPY, type MentorOutput, type MentorTool } from './solar'

export function Mentor({ onTool }: { onTool: (tool: MentorTool) => void }) {
  const [lang, setLang] = useState<'en' | 'kn'>('en')
  const [text, setText] = useState('')
  const [result, setResult] = useState<(MentorOutput & { model: string }) | null>(null)
  const [decision, setDecision] = useState<{ choice: string; confidence: number } | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [clip, setClip] = useState<Blob | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const timer = useRef<number>(0)
  const tracks = useRef<MediaStream | null>(null)
  const active = useRef(true)

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      window.clearTimeout(timer.current)
      tracks.current?.getTracks().forEach((track) => track.stop())
      window.speechSynthesis?.cancel()
    }
  }, [])

  function speak() {
    if (!window.speechSynthesis) { setMessage('Speech playback is unavailable. The caption is shown below.'); return }
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang))
    if (!voice) { setMessage(`This device has no ${lang === 'kn' ? 'Kannada' : 'English'} voice. Read the caption below.`); return }
    const spoken = new SpeechSynthesisUtterance(result?.note ?? MENTOR_COPY[lang]); spoken.voice = voice
    spoken.onerror = () => setMessage('The installed voice could not play. Read the caption below.')
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(spoken)
  }

  async function record() {
    if (recorder.current?.state === 'recording') { recorder.current.stop(); return }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMessage('Microphone capture is unavailable here. You can type your explanation.'); return
    }
    setMessage(''); setClip(null); setBusy(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!active.current) { stream.getTracks().forEach((track) => track.stop()); return }
      tracks.current = stream
      const capture = new MediaRecorder(stream), chunks: Blob[] = []
      recorder.current = capture
      capture.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
      capture.onstop = () => {
        window.clearTimeout(timer.current)
        stream.getTracks().forEach((track) => track.stop())
        if (active.current) { setRecording(false); if (chunks.length) setClip(new Blob(chunks, { type: capture.mimeType })) }
      }
      capture.start(); setRecording(true)
      timer.current = window.setTimeout(() => { if (capture.state === 'recording') capture.stop() }, 15_000)
    } catch {
      tracks.current?.getTracks().forEach((track) => track.stop())
      setMessage('Could not open the microphone. You can type your explanation.')
    } finally { setBusy(false) }
  }

  async function ask() {
    setBusy(true); setMessage(''); setResult(null); setDecision(null)
    try {
      const media = clip ? await voiceWav(clip) : undefined
      const response = await capableRequest<MentorOutput & { model: string }>('mentor', { text, lang, media })
      setResult(response)
      if (response.transcript) setText(response.transcript)
      setClip(null)
    } catch (error) { setMessage(`${errorText(error)} The practice caption is available below.`) }
    finally { setBusy(false) }
  }

  async function classify() {
    setBusy(true); setMessage(''); setDecision(null)
    try { setDecision(await capableRequest('decision', { text, task: 'prediction' })) }
    catch (error) { setMessage(`${errorText(error)} Continue with the local FLUX practice.`) }
    finally { setBusy(false) }
  }

  const diagnosis = (choice: string) => ({ direction: 'Temperature direction may be reversed.', conflation: 'The input limit and actual voltage may be confused.',
    sound: 'The explanation appears to identify the temperature effect.', unclear: 'There is too little evidence for a useful hypothesis.' }[choice])
  return <section className="c2-mentor" aria-label="Vernacular Mentor">
    <div className="c2-section-heading"><h2>Teach it back</h2><div className="c2-segment" aria-label="Mentor language">
      <button aria-pressed={lang === 'en'} disabled={busy || recording} onClick={() => { setLang('en'); setResult(null) }}>English</button>
      <button aria-pressed={lang === 'kn'} disabled={busy || recording} onClick={() => { setLang('kn'); setResult(null) }}>ಕನ್ನಡ</button>
    </div></div>
    <label htmlFor="c2-teach">Explain why the same string reads higher voltage when it cools.</label>
    <textarea id="c2-teach" rows={3} maxLength={640} value={text} disabled={busy} onChange={(event) => { setText(event.target.value); setDecision(null) }} />
    <div className="c2-actions">
      <button className="c2-secondary" disabled={busy} onClick={() => void record()}>{recording ? 'Stop recording' : 'Record voice'}</button>
      {clip && <button className="c2-secondary" disabled={busy} onClick={() => setClip(null)}>Discard recording</button>}
      <button className="c2-primary" disabled={busy || recording || (!text.trim() && !clip)} onClick={() => void ask()}>{busy ? 'Working…' : 'Ask Hydrogen'}</button>
      <button className="c2-secondary" disabled={busy || recording || !text.trim()} onClick={() => void classify()}>Check reasoning with Decisions</button>
    </div>
    {clip && <p className="c2-small">Recording ready. Asking Hydrogen sends this clip to Google for transcription.</p>}
    {result?.transcript && <p className="c2-small">Review or edit the transcript in the box above before checking the reasoning.</p>}
    <div className="c2-caption"><p lang={lang}>{result?.note ?? MENTOR_COPY[lang]}</p>
      <div className="c2-actions"><button className="c2-secondary" onClick={speak}>Play narration</button>
        {result && result.tool !== 'explain' && <button className="c2-secondary" onClick={() => onTool(result.tool)}>Apply {result.tool === 'compare-cold' ? 'cold' : 'warm'} comparison</button>}</div>
    </div>
    {decision && <p className="c2-notice" role="status">{diagnosis(decision.choice)} · AI feedback</p>}
    {message && <p className="c2-notice" role="status">{message}</p>}
  </section>
}
