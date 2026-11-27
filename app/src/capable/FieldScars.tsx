import { useState } from 'react'
import { PARTS, PART_LABEL, faultFor, type Part } from './arena'
import { capableRequest, errorText, newSeed, useLocal } from './client'

type Scar = { id: string; notes: string; part: Part; seed: number }

export function FieldScars() {
  const [notes, setNotes] = useState('')
  const [part, setPart] = useState<Part | ''>('')
  const [cases, setCases] = useLocal<Scar[]>('capable:v2:scars', [])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function suggest() {
    setBusy(true); setMessage('')
    try {
      const { choice } = await capableRequest<{ choice: Part | 'unclear' }>('decision', { text: notes, task: 'scar' })
      if (choice === 'unclear') { setPart(''); setMessage('The report is ambiguous. Choose a fault after reviewing the evidence.'); return }
      setPart(choice); setMessage('Gemini Decisions suggested this template. Review it before saving.')
    } catch (error) { setMessage(`${errorText(error)} Choose the template manually.`) }
    finally { setBusy(false) }
  }

  function publish() {
    if (!part || !notes.trim()) return
    let seed = newSeed()
    while (faultFor(seed) !== part) seed = newSeed()
    setCases([{ id: crypto.randomUUID(), notes: notes.trim(), part, seed }, ...cases].slice(0, 20))
    setNotes(''); setPart(''); setMessage('Saved to this device’s practice library.')
  }

  return <>
    <div className="c2-intro"><div><h1>Lab fault notes</h1><p>Turn a technician’s fault report into a workbench practice case using a supported circuit template.</p></div></div>
    <div className="c2-challenge-grid">
      <section className="c2-review"><h2>Draft a case</h2><label className="c2-field"><span>What went wrong?</span><textarea value={notes} maxLength={850} rows={5} disabled={busy} onChange={(e) => { setNotes(e.target.value); setPart('') }} /></label>
        <button className="c2-secondary" disabled={busy || !notes.trim()} onClick={() => void suggest()}>{busy ? 'Checking…' : 'Suggest a fault with Decisions'}</button>
        <label className="c2-field"><span>Confirm the fault template</span><select value={part} onChange={(e) => setPart(e.target.value as Part | '')}><option value="">Choose a template</option>{PARTS.map((item) => <option key={item} value={item}>{PART_LABEL[item]}</option>)}</select></label>
        <button className="c2-primary" disabled={busy || !part || !notes.trim()} onClick={publish}>Save practice case</button>{message && <p className="c2-notice" role="status">{message}</p>}
      </section>
      <section className="c2-review"><h2>Your practice library</h2>{cases.length === 0 && <p>Your reviewed cases will appear here.</p>}
        {cases.map((item) => <article className="c2-scar" key={item.id}><h3>{PART_LABEL[item.part]}</h3><p>{item.notes}</p><a className="c2-secondary" href={`#/capable?practice=${item.seed}`}>Load practice case</a></article>)}
      </section>
    </div>
  </>
}
