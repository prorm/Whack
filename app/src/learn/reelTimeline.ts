export const BEATS = [
  { at: 0, sound: 'boom' },
  { at: 1.8, sound: 'buzz' },
  { at: 4.6, sound: 'whoosh' },
  { at: 9.5, sound: 'tick' },
  { at: 13, sound: 'tick' },
  { at: 17, sound: 'ding' },
] as const
export const GATE = 13
export const SHOWCASE_LENGTH = 19.5

export type Story = {
  subject: string; wrong: string | null; result: string; formula: string; question: string;
  answer: string; answerFormula: string; percent: number; change: boolean; kn: boolean; hook: string; reaction: string;
  theme?: 'stock'; instruction?: string;
}

export const SHOWCASE_STORY: Story = {
  subject: '20% of ₹350', wrong: '₹370', result: '₹70', formula: '₹350 × 20 ÷ 100',
  question: 'What is 15% of ₹200?', answer: '₹30', answerFormula: '₹200 × 15 ÷ 100', percent: 20, change: false, kn: false,
  hook: 'Sheru checks your maths.', reaction: 'The calculator filed a complaint.',
}
