import type { CSSProperties, ReactNode } from 'react'
import type { Story } from './reelTimeline'

export function PremiumScene({ story, beat, media, correct, answer, progress, feedback, gate, impact, strike }: {
  story: Story; beat: number; media?: ReactNode; correct?: boolean; answer?: string; progress: number; feedback?: ReactNode; gate?: ReactNode;
  impact?: number; strike?: number
}) {
  const s = story
  const words = s.kn ? {
    hook: 'ಶೇಕಡಾ ಲೆಕ್ಕ', wrong: 'ಹಿಂದಿನ ಉತ್ತರ', breakdown: 'ಲೆಕ್ಕದ ವಿಧಾನ', next: 'ಈಗ ನಿಮ್ಮ ಸರದಿ',
    of: 'ನೂರರಲ್ಲಿ', nice: 'ಸರಿಯಾದ ಉತ್ತರ', close: 'ಒಮ್ಮೆ ಪರಿಶೀಲಿಸಿ', reveal: 'ಉತ್ತರ',
  } : {
    hook: s.theme === 'stock' ? 'The stock check' : 'The payout check', wrong: 'Previous answer', breakdown: 'The calculation', next: 'Your turn',
    of: 'out of 100', nice: 'Correct', close: 'Check the calculation', reveal: 'Correct answer',
  }
  return <div className={`premium-frame beat-${beat}`} style={{ '--reel-progress': progress, '--reel-impact': impact, '--reel-strike': strike } as CSSProperties}>
    <div className="premium-media" aria-hidden="true">{media}</div>
    <div className="premium-vignette" aria-hidden="true" />
    <div className="premium-safe" key={beat}>
      {beat <= 1 ? <>
        <span className="reel-stripe">{beat === 0 ? words.hook : s.wrong ? words.wrong : words.breakdown}</span>
        <div className="reel-headline">
          <div>{s.subject}</div>
          {s.wrong && <strong className="reel-wrong">{s.wrong}<span aria-hidden="true" /></strong>}
        </div>
        <p className="reel-caption">{beat === 0 ? s.hook : s.reaction}</p>
      </> : beat === 2 ? <>
        <span className="reel-stripe">{words.breakdown}</span>
        <div className="reel-math">
          <div>{s.formula}</div>
          <strong>= {s.result}</strong>
          {!s.change && <div className="reel-meter" aria-hidden="true">
            <div><i style={{ width: `${s.percent}%` }} /></div>
            <small>{s.percent} {words.of}</small>
          </div>}
        </div>
        <p className="reel-caption">{s.instruction ?? (s.kn ? (s.change ? 'ಮೂಲ ಮೌಲ್ಯದಿಂದ ಭಾಗಿಸಿ.' : 'ಗುಣಿಸಿ. 100 ರಿಂದ ಭಾಗಿಸಿ.')
          : s.change ? 'Divide the difference by the original value.' : 'Multiply, then divide by 100.')}</p>
      </> : beat < 5 ? <>
        <span className="reel-stripe">{words.next}</span>
        <div className="reel-question">{s.question}</div>
        {gate}
      </> : <>
        <span className="reel-stripe">{correct ? words.nice : words.close}</span>
        <div className="reel-answer">
          <span>{words.reveal}</span>
          <strong>{answer ?? s.answer}</strong>
        </div>
        {feedback}
      </>}
    </div>
    <div className="reel-progress" aria-hidden="true"><i /></div>
  </div>
}
