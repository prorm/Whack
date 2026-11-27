(() => {
  const easeIn = 'cubic-bezier(.2,.8,.2,1)';
  const easeMove = 'cubic-bezier(.4,0,.2,1)';

  const quoteLines = [
    '“Our junior backend developers should be capable of investigating',
    'failed payment transactions, identifying API errors, fixing bugs',
    'without introducing regressions and writing an incident report.”',
  ];

  const typedQuote = quoteLines.map((line, lineIndex) => {
    const pairs = line.match(/.{1,2}/gu);
    const cells = pairs.map((pair, index) => {
      const delay = 100 + lineIndex * 40 + index * 32;
      return `<span data-enter="fade" data-delay="${delay}" data-duration="280">${pair}</span>`;
    });
    return `<span class="compiler-quote-line" aria-hidden="true">${cells.join('')}</span>`;
  }).join('');

  const liveLabs = [
    ['codelab', 'CodeLab', 'Software incidents', 'CodeLab’s software incident workspace'],
    ['datalab', 'DataLab', 'Payout reconciliation', 'DataLab’s payout reconciliation table'],
    ['solar', 'Solar Forge', 'Rooftop solar design', 'Solar Forge’s rooftop solar design workspace'],
    ['arena', 'Practical Arena', '3D electrical bench', 'Practical Arena’s virtual circuit bench'],
  ];

  const labStrip = liveLabs.map(([file, name, use, alt], index) => `
    <figure class="lab-live lab-live--${file}" data-enter="up" data-delay="${720 + index * 110}" data-duration="520">
      <div class="lab-image shot-frame"><img src="assets/labs/${file}.webp" alt="${alt}"></div>
      <figcaption>
        <div class="lab-name">${name}</div>
        <div class="lab-use">${use}</div>
        <span class="lab-live-status"><i aria-hidden="true"></i>Live</span>
      </figcaption>
    </figure>`).join('');

  const closingWords = ['Discover.', 'Learn.', 'Practice.', 'Prove.', 'Earn.'];

  function backup(name, file, alt, caption, detail = '') {
    return {
      html: `<figure class="backup-slide backup-slide--${file}">
        <img class="backup-image" src="assets/shots/${file}.webp" alt="${alt}">
        ${detail}
        <figcaption><span>${caption}</span><span class="mono backup-code">${name} · BACKUP</span></figcaption>
      </figure>`,
    };
  }

  window.pitchSlides ??= {};
  Object.assign(window.pitchSlides, {
    '7': {
      html: `<div class="compiler-layout">
        <div class="compiler-header-row">
          <h1 class="display compiler-headline" data-enter="up" data-duration="520">The Work Compiler.</h1>
          <p class="compiler-sub" data-enter="up" data-delay="120" data-duration="520">From a job description to an <strong>executable learning experience</strong>.</p>
        </div>

        <div class="compiler-input">
          <div class="compiler-input-label" data-enter="fade" data-delay="130" data-duration="380">
            <span>Employer requirement · Paylane Fintech <span class="demo-tag">DEMO</span></span>
            <span class="compiler-input-meta">Compiled on-device · 34-capability graph</span>
          </div>
          <blockquote class="compiler-quote mono"><span class="sr-only">${quoteLines.join(' ')}</span>${typedQuote}</blockquote>
        </div>

        <svg class="compiler-trace" viewBox="0 0 1680 58" aria-hidden="true">
          <path d="M10 0v30h1660" class="compiler-trace-base"/>
          <path d="M10 0v30h413" data-enter="draw" data-delay="1140" data-duration="420"/>
          <path d="M423 30h400" data-enter="draw" data-delay="1340" data-duration="390"/>
          <path d="M823 30h406" data-enter="draw" data-delay="1460" data-duration="390"/>
          <path d="M1229 30h441m-11-8 11 8-11 8" data-enter="draw" data-delay="1580" data-duration="420"/>
          <path d="M10 30v28M423 30v28M823 30v28M1229 30v28" class="compiler-trace-branches"
            data-enter="fade" data-delay="1330" data-duration="520"/>
          <circle cx="10" cy="30" r="5" data-enter="fade" data-delay="1340" data-duration="310"/>
          <circle cx="423" cy="30" r="5" data-enter="fade" data-delay="1460" data-duration="310"/>
          <circle cx="823" cy="30" r="5" data-enter="fade" data-delay="1580" data-duration="310"/>
          <circle cx="1229" cy="30" r="5" data-enter="fade" data-delay="1700" data-duration="310"/>
        </svg>

        <div class="compiler-columns">
          <section class="compiler-column" data-enter="up" data-delay="1370" data-duration="500">
            <h2>Tasks <span>(4)</span></h2>
            <ul class="compiler-items">
              <li>Investigating failed<br>payment transactions</li>
              <li>Identifying API errors</li>
              <li>Fixing bugs without<br>introducing regressions</li>
              <li>Writing an incident report</li>
            </ul>
          </section>
          <section class="compiler-column" data-enter="up" data-delay="1490" data-duration="500">
            <h2>Capabilities <span>(5)</span></h2>
            <ul class="compiler-items">
              <li>API debugging &amp; error handling</li>
              <li>Testing without regressions</li>
              <li>Idempotent payment handling</li>
              <li>Production incident troubleshooting</li>
              <li>Incident reports</li>
            </ul>
          </section>
          <section class="compiler-column compiler-prereq" data-enter="up" data-delay="1610" data-duration="520">
            <h2>Prerequisites nobody<br>wrote down <span>(3)</span></h2>
            <ul class="compiler-items">
              <li>Programming fundamentals</li>
              <li>HTTP &amp; REST APIs</li>
              <li>Reading logs &amp; tracing failures</li>
            </ul>
          </section>
          <section class="compiler-column compiler-result" data-enter="up" data-delay="1730" data-duration="560">
            <h2>Simulation <span aria-hidden="true">→</span> CodeLab <span class="compiler-live">Live</span></h2>
            <div class="compiler-contract">
              <h3>Assessment contract</h3>
              <ul>
                <li>2 visible + 6 hidden tests</li>
                <li>Unseen incident chosen by the server</li>
                <li>Sandboxed run, 4 s limit</li>
                <li>Ed25519-signed receipt</li>
                <li>Incident report → human review</li>
              </ul>
            </div>
          </section>
        </div>

        <p class="compiler-footnote" data-enter="fade" data-delay="1900" data-duration="440">
          <span>Deterministic. Runs on-device. Unknown skills go to <strong>‘awaiting validation’</strong>, never guessed.</span>
          <span class="mono">Not an LLM wrapper</span>
        </p>
      </div>`,
    },
    '8': {
      html: `<div class="labs-layout">
        <h1 class="lab-principles">
          <span data-enter="up" data-delay="80" data-duration="540">AI generates the learning.</span>
          <span data-enter="up" data-delay="240" data-duration="540">Code verifies what’s measurable.</span>
          <span data-enter="up" data-delay="400" data-duration="540"><em>Humans</em> validate what machines can’t.</span>
        </h1>
        <div class="labs-loop-bar" data-enter="up" data-delay="560" data-duration="480">
          <span>Don’t claim it. Prove it.</span>
          <div class="labs-loop-steps">
            <span>Interactive Lessons</span><i>→</i><span>Revision Reels</span><i>→</i><span>Workplace Simulations</span><i>→</i><span>Unseen Server Tests</span><i>→</i><strong class="gold">Signed Evidence</strong>
          </div>
        </div>
        <div class="labs-live" aria-label="Live labs">${labStrip}</div>
        <div class="labs-planned" data-enter="up" data-delay="1220" data-duration="460" aria-label="Planned labs, not yet validated">
          <span class="labs-planned-status"><strong>Planned</strong><span>not yet validated</span></span>
          <span>InfraLab</span><span>PeopleLab</span><span>CreativeLab</span>
        </div>
        <p class="labs-proofline" data-enter="fade" data-delay="1480" data-duration="430">110 automated tests <span>·</span> Ed25519-signed receipts <span>·</span> one capability graph across software, data, energy and trades.</p>
      </div>`,
    },
    '13': {
      builds: 1,
      html: `<div class="close-message">
        <h1 class="display">
          <span data-enter="up" data-delay="960" data-duration="520">The market changes.</span>
          <span data-enter="up" data-delay="1140" data-duration="520">The pathway adapts.</span>
          <span data-enter="up" data-delay="1320" data-duration="540">The learner never<br>starts from zero.</span>
        </h1>
        <p class="close-ecosystem" data-enter="fade" data-delay="1540" data-duration="500">
          Universities teach. Companies hire. Educators create courses. Organizers discover talent.<br>
          CAPABLE connects them all through one shared language: <strong>human capability</strong>.
        </p>
      </div>
      <figure class="close-orbit" aria-label="Employer requirements lead to a sharper demand graph, more validated labs, more proof, and more opportunity, which informs new employer requirements.">
        <svg viewBox="0 0 760 790" class="orbit-art" aria-hidden="true">
          <circle class="orbit-rail" cx="372" cy="390" r="244"/>
          <circle class="orbit-inner" cx="372" cy="390" r="223"/>
          <g class="orbit-direction">
            <path d="M514 187l12 3-4-12M607 461l-8 10 12-1M378 634l-11-6v12M137 469l2-13-11 5M218 190l13-1-8-9"/>
          </g>
          <circle class="orbit-arc" cx="372" cy="390" r="244" pathLength="100"/>
          <g class="orbit-nodes">
            <circle cx="372" cy="146" r="8"/>
            <circle cx="604" cy="315" r="8"/>
            <circle cx="515" cy="587" r="8"/>
            <circle cx="229" cy="587" r="8"/>
            <circle cx="140" cy="315" r="8"/>
          </g>
        </svg>
        <div class="orbit-label orbit-label-1" data-enter="fade" data-delay="130" data-duration="470">Employer<br>requirements</div>
        <div class="orbit-label orbit-label-2" data-enter="fade" data-delay="240" data-duration="470">Sharper<br>demand graph</div>
        <div class="orbit-label orbit-label-3" data-enter="fade" data-delay="350" data-duration="470">More<br>validated labs</div>
        <div class="orbit-label orbit-label-4" data-enter="fade" data-delay="460" data-duration="470">More proof</div>
        <div class="orbit-label orbit-label-5" data-enter="fade" data-delay="570" data-duration="470">More<br>opportunity</div>
      </figure>
      <div class="close-finale">
        <p class="close-vision">Potential is everywhere. <span class="gold">Opportunity should be too.</span></p>
        <div class="close-brand">
          ${pitchLogo({className: 'close-mark', wordmark: false})}
          <div class="close-wordmark" aria-label="CAPABLE">${Array.from('CAPABLE', (letter) => `<span aria-hidden="true">${letter}</span>`).join('')}</div>
        </div>
        <div class="close-verbs">${closingWords.map((word) => `<span>${word}</span>`).join('')}</div>
        <p class="close-line">The capability-to-opportunity infrastructure.</p>
      </div>`,
      enter(slide, { motion, animate }) {
        if (!motion) return;
        animate(slide.querySelector('.orbit-art'), [
          { opacity: 0, transform: 'scale(.95)' },
          { opacity: 1, transform: 'scale(1)' },
        ], { duration: 610, delay: 0, easing: easeIn, fill: 'both' });
        animate(slide.querySelector('.orbit-arc'), [
          { transform: 'rotate(15deg)' },
          { transform: 'rotate(375deg)' },
        ], { duration: 900, delay: 110, easing: easeMove, fill: 'both' });
      },
      build(slide, step, { motion, animate }) {
        if (!motion || step !== 1) return;

        animate(slide.querySelector('.close-message'), [
          { opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: 'translateY(-28px)' },
        ], { duration: 380, delay: 0, easing: easeMove, fill: 'both' });

        animate(slide.querySelector('.close-orbit'), [
          { opacity: 1, transform: 'translate(0, 0) scale(1) rotate(0deg)' },
          { opacity: 0.94, transform: 'translate(-650px, -33px) scale(.30) rotate(-38deg)', offset: 0.66 },
          { opacity: 0, transform: 'translate(-1188px, -45px) scale(.08) rotate(-63deg)' },
        ], { duration: 650, delay: 0, easing: easeMove, fill: 'both' });

        const bars = slide.querySelectorAll('.close-mark rect');
        bars.forEach((bar, index) => {
          animate(bar, [
            { opacity: 0, transform: 'scaleY(.08)' },
            { opacity: 1, transform: 'scaleY(1)' },
          ], { duration: 510, delay: 510 + index * 80, easing: easeIn, fill: 'both' });
        });

        const details = [
          [slide.querySelector('.close-vision'), 460, 480],
          ...Array.from(slide.querySelectorAll('.close-wordmark span'), (element, index) => [element, 745 + index * 35, 390]),
          ...Array.from(slide.querySelectorAll('.close-verbs span'), (element, index) => [element, 1040 + index * 120, 460]),
          [slide.querySelector('.close-line'), 1590, 450],
        ];
        details.forEach(([element, delay, duration]) => {
          animate(element, [
            { opacity: 0, transform: 'translateY(17px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ], { duration, delay, easing: easeIn, fill: 'both' });
        });
      },
    },
    B1: backup('B1', 'demand-blueprint', 'Three fictional employer posts share one foundation with distinct branches.', 'Demand blueprint · Employer requirement compiled live and merged into one shared foundation.', `
      <div class="backup-inset shot-frame" data-enter="fade" data-delay="260" data-duration="430">
        <img src="assets/shots/demand-describe.webp" alt="Describe the work: Paylane Fintech requirement compiled into four tasks, five capabilities, and three prerequisites.">
      </div>`),
    B2: backup('B2', 'codelab-pass', 'The CodeLab workspace showing eight passing tests.', 'CodeLab · Arjun passes 8 of 8 visible and hidden tests with an Ed25519-signed receipt.', `
      <div class="backup-receipt shot-frame" data-enter="fade" data-delay="260" data-duration="430">
        <img src="assets/shots/codelab-receipt.webp" alt="The signed CodeLab receipt showing eight passed tests and a verified Ed25519 signature.">
      </div>`),
    B3: backup('B3', 'exchange', 'The Opportunity Exchange shows how many requirements are evidenced.', 'Opportunity Exchange · Existing evidence preserved when industry requirements change.', `
      <div class="backup-inset shot-frame" data-enter="fade" data-delay="260" data-duration="430">
        <img src="assets/shots/gps.webp" alt="Career GPS showing proven capabilities skipped and remaining steps.">
      </div>`),
  });
})();
