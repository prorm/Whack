(() => {
  const sections = (items) => items.map((item) => `<span>${item}</span>`).join('');
  const accent = (text) => `<span class="post-accent">${text}<i aria-hidden="true"></i></span>`;
  const demo = '<span class="demo-tag">DEMO</span>';
  const arrow = (className = '') => `<svg class="${className}" viewBox="0 0 38 18" width="38" height="18" fill="none" aria-hidden="true"><path d="M1 9h34m-8-7 8 7-8 7" stroke="currentColor" stroke-width="1.6"/></svg>`;
  const headings = (lines, className = '') => `<h1 class="display ${className}" data-enter="up" data-duration="520">${lines.join('<br>')}</h1>`;

  const post = (name, copy, delay) => `<article class="employer-post" data-enter="up" data-delay="${delay}" data-duration="620">
    <div class="employer-post-name"><h2>${name}</h2>${demo}</div><p>${copy}</p>
  </article>`;

  const stats = [
    [63, '%', 0, 63, 'of employers say skill gaps are their #1 barrier to transformation <span>· WEF 2025</span>'],
    [39, '%', 0, 39, 'of core skills will change by 2030 <span>· WEF 2025</span>'],
    [54.8, '%', 1, 55, 'of Indian graduates tested are rated employable <span>(so nearly half aren’t)</span>'],
    [7.4, ' s', 1, 18, 'a recruiter’s first look at a résumé <span>· Ladders eye-tracking</span>'],
    [52, '%', 0, 52, 'of people who sign up for an online course never open it <span>· Science 2019</span>'],
  ];

  const chain = (items) => items.map((item, index) => `<li>${index ? arrow('chain-arrow') : ''}<span>${item}</span></li>`).join('');
  const partners = [
    ['Northwind Cloud', ['Incident troubleshooting', 'Incident reports'], [0, 1, 2]],
    ['Helix Systems', ['Reading logs', 'Virtualization'], [0, 1]],
    ['Orbit Compute', ['Containers', 'Automation scripting'], [0, 1, 2]],
  ];
  const sharedSkills = ['Linux administration', 'Computer networking', 'Cloud services'];
  const prerequisites = ['Programming fundamentals', 'HTTP & REST APIs', 'API debugging'];
  const steps = [
    ['Programming fundamentals', 'Proven · skip', 'proven'],
    ['HTTP & REST APIs', 'Prove directly', 'direct'],
    ['API debugging & error handling', 'Learn, then prove', 'learn'],
    ['Testing without regressions', 'Learn, then prove', 'learn'],
    ['Idempotent payment handling', 'Learn, then prove', 'learn'],
    ['Production incident troubleshooting', 'Learn, then prove', 'learn'],
  ];
  const check = '<svg viewBox="0 0 28 28" width="28" height="28" fill="none" aria-hidden="true"><path d="m6 14 5 5 11-12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const move = 'cubic-bezier(.4,0,.2,1)';
  const enter = 'cubic-bezier(.2,.8,.2,1)';

  window.pitchSlides ??= {};
  Object.assign(window.pitchSlides, {
    '1': {
      builds: 1,
      html: `<div class="opening-content">
        <div class="opening-stage-zero">
          <h1 class="opening-brand" aria-label="CAPABLE">${pitchLogo({className: 'opening-wordmark', animate: true, letters: true})}</h1>
          <div class="opening-lines">
            <p data-enter="up" data-delay="460" data-duration="680">Learn the work.</p>
            <p data-enter="up" data-delay="640" data-duration="680">Prove the work.</p>
            <p data-enter="up" data-delay="820" data-duration="680">Find <span class="gold">opportunity</span>.</p>
          </div>
          <p class="opening-question" data-enter="up" data-delay="1020" data-duration="580">
            What if education <strong>started with the opportunity</strong>, instead of ending with the search for one?
          </p>
        </div>

        <div class="opening-stage-arjun" inert>
          <div class="arjun-header">
            <h2>Meet <span class="gold">Arjun</span>.</h2>
            <p class="arjun-summary">A computer science graduate doing <strong>everything the system told him to do</strong>.</p>
          </div>
          <div class="arjun-journey">
            <svg class="arjun-trace" viewBox="0 0 1680 24" fill="none" aria-hidden="true">
              <path d="M0 12h1680" stroke="var(--line-strong)" stroke-width="1.5"/>
              <path class="arjun-trace-active" d="M0 12h1250" stroke="var(--gold)" stroke-width="2"/>
              <path class="arjun-trace-wall" d="M1250 12h430" stroke="var(--danger)" stroke-width="2"/>
            </svg>
            <article class="arjun-step">
              <div class="arjun-step-num">1<span>STEP 01</span></div>
              <h3>University Degree</h3>
              <p>Four years of lectures, written exams, and textbook assignments.</p>
            </article>
            <article class="arjun-step">
              <div class="arjun-step-num">3<span>STEP 02</span></div>
              <h3>Online Courses</h3>
              <p>Video playlists completed. Three PDF attendance certificates on LinkedIn.</p>
            </article>
            <article class="arjun-step">
              <div class="arjun-step-num">300+<span>STEP 03</span></div>
              <h3>Generic Drills</h3>
              <p>LeetCode binary trees &amp; HackerRank puzzles—disconnected from real codebases.</p>
            </article>
            <article class="arjun-step arjun-step--wall">
              <div class="arjun-step-num">50<span>STEP 04</span></div>
              <h3>Job Applications</h3>
              <p>“You lack practical experience.”</p>
              <div class="arjun-verdict">Still searching.</div>
            </article>
          </div>
          <div class="arjun-takeaway">
            <span>Generic courses &amp; puzzle platforms test memory in isolation.</span>
            <strong>Employers hire for real production work.</strong>
          </div>
        </div>

        <div class="opening-team" data-enter="fade" data-delay="1120" data-duration="500">
          <div class="opening-team-names">${sections(['Pranav R Mane', 'Swastik R Phadke', 'Prajwal N', 'Harsh Tiwari'])}</div>
          <span class="opening-team-hint mono">The capability-to-opportunity infrastructure</span>
        </div>
      </div>
      <svg class="opening-outline" viewBox="0 0 663 692" width="663" height="692" fill="none" aria-hidden="true">
        <path d="M1 675h661M43 0v692M244 0v692M445 0v692M646 0v692" stroke="var(--line)"/>
        <g transform="translate(54 122) skewY(-10)">
          <rect x="0" y="254" width="160" height="252" rx="18" data-enter="draw" data-delay="300" data-duration="820"/>
          <rect x="201" y="142" width="160" height="364" rx="18" data-enter="draw" data-delay="380" data-duration="820"/>
          <rect class="outline-accent" x="402" y="2" width="160" height="504" rx="18" data-enter="draw" data-delay="460" data-duration="860"/>
        </g>
      </svg>`,
      build(slide, step, {motion, animate}) {
        const zero = slide.querySelector('.opening-stage-zero');
        const outline = slide.querySelector('.opening-outline');
        const arjun = slide.querySelector('.opening-stage-arjun');
        zero.inert = step === 1;
        arjun.inert = step === 0;
        if (step !== 1 || !motion) return;
        animate(zero, [{opacity: 1, transform: 'translateY(0)'}, {opacity: 0, transform: 'translateY(-28px)'}], {duration: 360, easing: move, fill: 'both'});
        animate(outline, [{opacity: 1, transform: 'scale(1)'}, {opacity: 0, transform: 'scale(.96)'}], {duration: 360, easing: move, fill: 'both'});
        animate(arjun, [{opacity: 0, transform: 'translateY(28px)'}, {opacity: 1, transform: 'translateY(0)'}], {delay: 240, duration: 520, easing: enter, fill: 'both'});
        arjun.querySelectorAll('.arjun-step').forEach((card, index) => {
          animate(card, [{opacity: 0, transform: 'translateY(24px)'}, {opacity: 1, transform: 'translateY(0)'}], {delay: 320 + index * 110, duration: 480, easing: enter, fill: 'both'});
        });
      },
    },
    '2': {
      html: `<div class="posts-content">
        <div class="posts-header">
          ${headings(['Both sides are searching.'])}
          <p class="posts-subhead" data-enter="up" data-delay="120" data-duration="520">Three employers.<br><strong>One kind of work.</strong></p>
        </div>

        <div class="market-chasm" data-enter="up" data-delay="180" data-duration="540">
          <div class="market-side">
            <div class="market-role">The graduate · Arjun<span>Degree · 3 courses · LeetCode &amp; certificates</span></div>
            <div class="market-status">50 applications<small>Still searching</small></div>
          </div>
          <div class="market-bridge-broken">
            <span>Two sides of the same market</span>
            <strong class="gold">No effective bridge</strong>
          </div>
          <div class="market-side market-side--right">
            <div class="market-status">Skill gaps<small>Still searching</small></div>
            <div class="market-role">The employers<span>Vacancies · Applicants · Stacks of résumés</span></div>
          </div>
        </div>

        <div class="employer-posts">
          ${post('Paylane Fintech', `Investigate failed payment transactions, identify ${accent('API errors')}, fix bugs without introducing ${accent('regressions')} and write an incident report.`, 260)}
          ${post('KiranaCart', `Build and consume ${accent('REST APIs')} in Node.js. Write ${accent('unit tests')} that catch edge cases. Debug production issues from ${accent('logs')}.`, 360)}
          ${post('Metro Ledger', `Troubleshoot ${accent('webhooks')} and duplicate charges, read ${accent('logs')}, handle retries and timeouts.`, 460)}
        </div>

        <p class="posts-convergence" data-enter="fade" data-delay="1080" data-duration="520">
          <span>All three companies need the exact same person—someone who can debug payment APIs, read logs, and prevent regressions.</span>
          <strong>Why can’t they find Arjun?</strong>
        </p>
      </div>`,
      enter(slide, {motion, animate}) {
        if (!motion) return;
        slide.querySelectorAll('.post-accent i').forEach((underline) => {
          animate(underline, [{transform: 'scaleX(0)'}, {transform: 'scaleX(1)'}], {delay: 820, duration: 580, easing: move, fill: 'both'});
        });
      },
    },
    '3': {
      html: `<div class="numbers-content">
        <div class="numbers-left">
          ${headings(['The talent', 'exists.', 'It doesn’t', 'show up.'])}
          <p class="numbers-lead" data-enter="up" data-delay="280" data-duration="540">
            The problem isn’t a lack of learners or vacancies.<br><br>
            <strong>Education and opportunity don’t speak the same language.</strong>
          </p>
        </div>
        <dl class="stat-ledger">
          ${stats.map(([number, suffix, decimals, barPct, caption], index) => `<div class="stat-ledger-row" data-enter="up" data-delay="${100 + index * 320}" data-duration="480">
            <dt class="stat-value${index === 0 ? ' gold' : ''}" data-count="${number}" data-suffix="${suffix}" data-decimals="${decimals}" data-delay="${100 + index * 320}">${number}${suffix}</dt>
            <dd>${caption}</dd>
            <div class="stat-bar" style="width:${barPct}%" data-enter="bar-x" data-delay="${260 + index * 320}" data-duration="620"></div>
          </div>`).join('')}
        </dl>
        <p class="stat-sources" data-enter="fade" data-delay="1520" data-duration="540">WEF Future of Jobs 2025 <span>·</span> Wheebox/CII India Skills Report 2025 <span>·</span> Ladders 2018 <span>·</span> Reich &amp; Ruipérez-Valiente, Science 2019</p>
      </div>`,
      enter(slide, {motion, animate}) {
        if (!motion) return;
        slide.querySelectorAll('.stat-bar').forEach((bar, index) => {
          animate(bar, [{transform: 'scaleX(0)'}, {transform: 'scaleX(1)'}], {delay: 260 + index * 320, duration: 640, easing: move, fill: 'both'});
        });
      },
    },
    '4': {
      builds: 1,
      html: `<div class="reversal-content">
        <div class="reversal-top">
          <div class="old-measures">
            <p data-enter="up" data-delay="90" data-duration="480">Courses measure attendance.</p>
            <p data-enter="up" data-delay="210" data-duration="480">Résumés measure claims.</p>
            <p data-enter="up" data-delay="330" data-duration="480">Tests measure memory.</p>
          </div>
          <div class="reversal-question-box" data-enter="up" data-delay="420" data-duration="540">
            What if, instead of learning first and searching for jobs later, we <strong>started with the opportunity and reverse-engineered the education</strong>?
          </div>
        </div>
        <h1 class="display gold" data-enter="up" data-delay="480" data-duration="640">Nobody measures the work.</h1>
        <div class="reversal-pipeline" data-enter="fade" data-delay="680" data-duration="520">
          <div class="pipeline-state pipeline-state--old">
            <div class="pipeline-model-card">
              <div class="pipeline-model-header"><span>THE TRADITIONAL MODEL · LEARN IN THE DARK</span><span>RESULT: DISCONNECT</span></div>
              <ol class="pipeline-chain">${chain(['Course', 'Résumé', 'Test', '?'])}</ol>
              <div class="pipeline-strike" aria-hidden="true"></div>
              <p class="pipeline-caption">Passive videos and generic LeetCode / HackerRank drills leave employers guessing how Arjun will handle a real incident.</p>
            </div>
          </div>
          <div class="pipeline-state pipeline-state--new" inert>
            <div class="pipeline-Ghost-old">
              <span>THE TRADITIONAL MODEL</span>
              <del>Course → Résumé → Generic Test → 50 Applications → ?</del>
            </div>
            <div class="pipeline-model-card pipeline-model-card--capable">
              <div class="pipeline-model-header"><strong>THE CAPABLE MODEL · REVERSE-ENGINEERED FROM DEMAND</strong><span>DIRECT PATHWAY</span></div>
              <ol class="pipeline-chain">${chain(['<strong class="gold">Work</strong>', 'Capabilities', 'Pathway', 'Proof', '<strong class="gold">Opportunity</strong>'])}</ol>
              <div class="pipeline-manifesto">
                <strong>Start with opportunity. Build capability. Return with proof.</strong>
                <span>We start with the work itself.</span>
              </div>
            </div>
          </div>
        </div>
      </div>`,
      build(slide, step, {motion, animate}) {
        const oldPipeline = slide.querySelector('.pipeline-state--old');
        const newPipeline = slide.querySelector('.pipeline-state--new');
        oldPipeline.inert = step === 1;
        newPipeline.inert = step === 0;
        if (step !== 1 || !motion) return;
        animate(slide.querySelector('.pipeline-strike'), [{transform: 'scaleX(0)'}, {transform: 'scaleX(1)'}], {duration: 420, easing: enter, fill: 'both'});
        animate(oldPipeline, [
          {opacity: 1, transform: 'translateY(0)', offset: 0},
          {opacity: 1, transform: 'translateY(0)', offset: .5},
          {opacity: 0, transform: 'translateY(-24px)', offset: 1},
        ], {duration: 680, easing: move, fill: 'both'});
        animate(newPipeline, [{opacity: 0, transform: 'translateY(24px)'}, {opacity: 1, transform: 'translateY(0)'}], {delay: 440, duration: 540, easing: enter, fill: 'both'});
        newPipeline.querySelectorAll('.chain-arrow path').forEach((line, index) => {
          const length = line.getTotalLength();
          line.style.strokeDasharray = length;
          animate(line, [{strokeDashoffset: length}, {strokeDashoffset: 0}], {delay: 580 + index * 80, duration: 360, easing: enter, fill: 'both'});
        });
      },
    },
    '5': {
      html: `<div class="demand-content">
        ${headings(['One shared foundation.', 'Many destinations.'])}
        <figure class="demand-diagram" aria-label="Three employer requirements converge into one shared foundation and retain three distinct branches">
          <svg class="demand-paths" viewBox="0 0 1680 510" width="1680" height="510" fill="none" aria-hidden="true">
            <path class="branch-guide" d="M260 64V192 M840 64V192 M1420 64V192" data-enter="fade" data-delay="210"/>
            <path class="branch-guide" d="M840 379v21" data-enter="fade" data-delay="1250" data-duration="470"/>
            <g class="shared-path">
              <path d="M502 286v-48a16 16 0 0 0-16-16H91a16 16 0 0 1-16-16v-142h91" data-enter="draw" data-delay="1300" data-duration="710"/>
              <path d="M840 286v-48a16 16 0 0 1 16-16h157a16 16 0 0 0 16-16v-142h-95" data-enter="draw" data-delay="1375" data-duration="710"/>
              <path d="M1178 286v-48a16 16 0 0 1 16-16h395a16 16 0 0 0 16-16v-142h-91" data-enter="draw" data-delay="1450" data-duration="710"/>
            </g>
            <g class="shared-port" data-enter="fade" data-delay="1800" data-duration="340"><circle cx="166" cy="64" r="4.5"/><circle cx="934" cy="64" r="4.5"/><circle cx="1514" cy="64" r="4.5"/></g>
          </svg>
          <div class="demand-employers">
            ${partners.map(([name, unique], index) => `<div class="demand-employer">
              <div class="demand-node" data-enter="up" data-delay="${100 + 60 * index}" data-duration="470"><h2>${name}</h2>${demo}</div>
              <div class="demand-branches" data-enter="up" data-delay="${220 + 60 * index}" data-duration="520">${sections(unique)}</div>
            </div>`).join('')}
          </div>
          <div class="merge-skills" aria-hidden="true">
            ${partners.map(([, , contributions]) => `<div class="merge-group">${contributions.map((index) => `<span data-skill="${index}">${sharedSkills[index]}</span>`).join('')}</div>`).join('')}
          </div>
          <div class="demand-layer demand-layer--shared" data-enter="scale" data-delay="1100" data-duration="620">
            <strong>Shared foundation</strong>${sharedSkills.map((skill) => `<span data-enter="fade" data-delay="1290" data-duration="430">${skill}</span>`).join('')}
          </div>
          <div class="demand-layer demand-layer--base" data-enter="up" data-delay="1175" data-duration="620">
            <strong>Base layer</strong>${sections(prerequisites)}
          </div>
          <figcaption data-enter="fade" data-delay="1490" data-duration="500">
            <span class="demand-caption-main">3 job posts ${arrow()} 1 pathway with 3 destinations.</span>
            <span>Industry Demand Graph · Arjun builds capabilities that travel across employers.</span>
          </figcaption>
        </figure>
      </div>`,
      enter(slide, {motion, animate}) {
        if (!motion) return;
        const diagram = slide.querySelector('.demand-diagram');
        const destination = [...diagram.querySelectorAll('.demand-layer--shared span')];
        diagram.querySelectorAll('[data-skill]').forEach((token) => {
          const skill = Number(token.dataset.skill);
          const to = destination[skill];
          const dx = to.parentElement.offsetLeft + to.offsetLeft + (to.offsetWidth - token.offsetWidth) / 2 - token.offsetLeft;
          const dy = to.parentElement.offsetTop + to.offsetTop + (to.offsetHeight - token.offsetHeight) / 2 - token.offsetTop;
          animate(token, [
            {opacity: 0, transform: 'translateY(-17px)', offset: 0, easing: enter},
            {opacity: 1, transform: 'translateY(0)', offset: .18},
            {opacity: 1, transform: 'translateY(0)', offset: .55, easing: move},
            {opacity: .85, transform: `translate(${dx}px, ${dy}px) scale(1.08)`, offset: .88, easing: enter},
            {opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(.92)`, offset: 1},
          ], {delay: 365 + skill * 38, duration: 900, easing: 'linear', fill: 'both'});
        });
      },
    },
    '6': {
      builds: 1,
      html: `<div class="gps-content">
        ${headings(['Don’t relearn what you know.', 'Build what’s missing.'])}
        <div class="gps-body">
          <aside class="gps-learner" data-enter="up" data-delay="140" data-duration="540">
            <div class="gps-arjun-tag">ARJUN’S CAREER GPS</div>
            <p class="gps-profile">Knows <strong>Python</strong>${arrow()}wants <strong>Backend</strong></p>
            <div class="gps-step-count" aria-label="6 steps"><span class="gps-digits" aria-hidden="true"><strong class="gps-six">6</strong><strong class="gps-five">5</strong></span><span aria-hidden="true">steps</span></div>
            <p class="gps-note"><strong>Never start from zero.</strong> Proven capabilities skip ahead so Arjun focuses only on his exact skill gap.</p>
          </aside>
          <div class="gps-route">
            <svg class="gps-rail" viewBox="0 0 38 440" width="38" height="440" fill="none" aria-hidden="true"><path d="M19 2v436" data-enter="draw" data-delay="200" data-duration="790"/></svg>
            <ol class="gps-stops">
              ${steps.map(([name, action, kind], index) => `<li class="gps-stop gps-stop--${kind}">
                <div data-enter="right" data-delay="${190 + index * 120}" data-duration="510">
                  <span class="gps-station" aria-hidden="true">${index === 0 ? check : ''}</span>
                  <span class="gps-step-name">${name}</span><span class="gps-step-action">${action}</span>
                </div>
              </li>`).join('')}
            </ol>
          </div>
        </div>
      </div>`,
      build(slide, step, {motion, animate}) {
        const [first, ...rest] = slide.querySelectorAll('.gps-stop');
        first.inert = step === 1;
        slide.querySelector('.gps-step-count').setAttribute('aria-label', `${step === 1 ? 5 : 6} steps`);
        if (step !== 1 || !motion) return;
        animate(first, [{opacity: 1, transform: 'translateX(0)'}, {opacity: 0, transform: 'translateX(-36px) scale(.98)'}], {duration: 410, easing: move, fill: 'both'});
        rest.forEach((stop) => animate(stop, [{transform: 'translateY(0)'}, {transform: 'translateY(-87px)'}], {delay: 145, duration: 540, easing: move, fill: 'both'}));
        animate(slide.querySelector('.gps-rail'), [{transform: 'scaleY(1)'}, {transform: 'scaleY(.8023)'}], {delay: 145, duration: 540, easing: move, fill: 'both'});
        animate(slide.querySelector('.gps-six'), [{opacity: 1, transform: 'translateY(0)'}, {opacity: 0, transform: 'translateY(-38px)'}], {duration: 370, easing: move, fill: 'both'});
        animate(slide.querySelector('.gps-five'), [{opacity: 0, transform: 'translateY(38px)'}, {opacity: 1, transform: 'translateY(0)'}], {delay: 100, duration: 510, easing: enter, fill: 'both'});
      },
    },
  });
})();
