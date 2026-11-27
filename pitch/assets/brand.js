'use strict';

function pitchLogo({ className = '', animate = false, letters = false, wordmark = true } = {}) {
  const bars = [9, 13, 18].map((height, index) => {
    const entrance = animate ? ` data-enter="bar" data-delay="${index * 80}" data-duration="560"` : '';
    return `<rect class="pitch-logo__bar" x="${2 + index * 9}" y="${23 - height}" width="6" height="${height}" rx="1.2"${entrance}/>`;
  }).join('');
  const word = letters
    ? [...'CAPABLE'].map((letter, index) =>
        `<span class="pitch-logo__letter" data-enter="letter" data-delay="${380 + index * 30}" data-duration="420">${letter}</span>`
      ).join('')
    : 'CAPABLE';
  return `<span class="pitch-logo ${className}" role="img" aria-label="${wordmark ? 'CAPABLE' : 'Three rising gold bars'}">
    <svg class="pitch-logo__mark" viewBox="0 0 28 26" aria-hidden="true" focusable="false">
      <g fill="currentColor" transform="skewY(-10)">${bars}</g>
    </svg>
    ${wordmark ? `<span class="pitch-logo__word" aria-hidden="true">${word}</span>` : ''}
  </span>`;
}
