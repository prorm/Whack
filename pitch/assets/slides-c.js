(() => {
  const arrow = '<svg class="x-arrow" viewBox="0 0 38 18" width="38" height="18" fill="none" aria-hidden="true"><path d="M1 9h34m-8-7 8 7-8 7" stroke="currentColor" stroke-width="1.6"/></svg>';
  const head = (title, sub) => `<header class="x-head">
    <h1 class="display x-title" data-enter="up" data-duration="520">${title}</h1>
    <p class="x-sub" data-enter="up" data-delay="120" data-duration="520">${sub}</p>
  </header>`;
  const chips = (items) => items.map((item) => `<span>${item}</span>`).join('');

  /* 9 · How it works */
  const flow = [
    ['01', 'Describe', 'An employer pastes the real work, in their own words.', 'Employer', 'who-employer'],
    ['02', 'Compile', 'Work Compiler maps it to tasks, capabilities and the prerequisites nobody wrote down.', 'Deterministic code', 'who-code'],
    ['03', 'Plan', 'Career GPS skips what the learner can already prove and builds only the gap.', 'Deterministic code', 'who-code'],
    ['04', 'Practise', 'Narrated lessons, revision reels and workplace simulations.', 'AI-drafted · human-checked', 'who-ai'],
    ['05', 'Prove', 'An unseen task drawn by the server, re-graded in a sandbox; judgment goes to a human.', 'Code + human reviewer', 'who-human'],
    ['06', 'Unlock', 'Ed25519-signed evidence, shared only by opt-in, matched to opportunities.', 'Learner consent', 'who-learner'],
  ];
  const flowCards = flow.map(([n, name, copy, who, cls], index) => `
    <li class="flow-step" data-enter="up" data-delay="${260 + index * 110}" data-duration="500">
      <span class="flow-n mono">${n}</span>
      <h2>${name}</h2>
      <p>${copy}</p>
      <span class="flow-who ${cls}">${who}</span>
    </li>`).join('');

  /* 10 · Tech stack */
  const stack = [
    ['Experience', 'Browser · installable PWA', ['React 19', 'TypeScript', 'Vite 8', 'Offline service worker', 'Three.js · React Three Fiber', 'SVG motion lessons', 'Web Worker practice runner']],
    ['Engine', 'Pure TypeScript · shared by browser and server', ['34-capability graph', 'Work Compiler', 'Career GPS', 'Seeded graders', 'Evidence map', 'Blueprint tests']],
    ['Trust layer', 'Node.js server', ['node:http', 'node:sqlite', 'Ed25519 receipts (node:crypto)', 'Sandboxed child process', '--permission · no eval · 4 s kill']],
    ['AI & media', 'Optional · never grades', ['Gemini on Vertex AI', 'Budget-capped, graph-limited proposals', 'Chirp 3 HD narration', 'Veo backdrops (badged)']],
    ['Quality', 'Every rule is tested', ['110 automated tests', 'node --test', 'oxlint', 'axe-core accessibility', 'Playwright walkthroughs']],
  ];
  const stackRows = stack.map(([layer, note, items], index) => `
    <div class="stack-row stack-row--${index}" data-enter="left" data-delay="${220 + index * 120}" data-duration="520">
      <div class="stack-layer"><h2>${layer}</h2><span>${note}</span></div>
      <div class="stack-items">${chips(items)}</div>
    </div>`).join('');

  /* 11 · Technical integration */
  const endpoints = [
    ['POST', '/api/capable/compile', 'job text → graph ids (AI proposal only)'],
    ['POST', '/api/capable/start', 'server draws an unseen task; seed stays server-side'],
    ['POST', '/api/capable/grade', 'sandbox re-grades raw answers → signed receipt'],
    ['GET', '/api/capable/key', 'public key so anyone can verify a receipt'],
    ['POST', '/api/proof/share · /revoke', 'learner-controlled share link'],
    ['GET', '/api/proof/public/&lt;token&gt;', 'employer view · 410 once revoked'],
  ];
  const endpointRows = endpoints.map(([method, path, what]) => `
    <li><span class="ep-method mono">${method}</span><code class="ep-path">${path}</code><span class="ep-what">${what}</span></li>`).join('');
  const plugs = [
    ['Employers & ATS', 'Paste a job post → blueprint. Verify any receipt against our public key: no account, no API contract.'],
    ['Training partners & LMS', 'Map existing lessons to graph ids. We assess; they keep teaching.'],
    ['New labs', 'A lab is a JSON blueprint with whitelisted expressions. It ships only when its tests pass.'],
    ['Low connectivity', 'Learn offline on the phone; sync attempts and evidence when back online.'],
  ];
  const plugCards = plugs.map(([name, copy], index) => `
    <article class="plug" data-enter="up" data-delay="${1100 + index * 100}" data-duration="480"><h3>${name}</h3><p>${copy}</p></article>`).join('');

  /* 12 · Feasibility */
  const feas = [
    ['Technical', 'Built and running today', [
      ['4', 'live labs: CodeLab, DataLab, Solar Forge, Practical Arena'],
      ['34', 'capabilities on one cross-industry graph'],
      ['110', 'automated tests on the rules that matter'],
      ['1', 'laptop runs the whole stack, offline-first'],
    ]],
    ['Economic', 'Marginal cost close to zero', [
      ['$0', 'AI per grade: deterministic code does the marking'],
      ['$0.25', 'reserved per optional AI call, hard budget cap'],
      ['1×', 'media generated once, cached, reused at $0'],
      ['0.1 ms', 'to compile a job post, on-device'],
    ]],
    ['Operational', 'Humans only where judgment matters', [
      ['2 of 3', 'master reviewers approve community content'],
      ['100%', 'of hazardous competencies forced to supervised sign-off'],
      ['JSON', 'blueprint = a new lab, gated by its own tests'],
      ['DEMO', 'every organization is fictional and labelled'],
    ]],
  ];
  const feasCols = feas.map(([name, line, rows], index) => `
    <section class="feas-col" data-enter="up" data-delay="${240 + index * 140}" data-duration="520">
      <h2>${name}</h2><p class="feas-line">${line}</p>
      <dl>${rows.map(([value, copy]) => `<div><dt>${value}</dt><dd>${copy}</dd></div>`).join('')}</dl>
    </section>`).join('');

  /* 13 · Business model */
  const payers = [
    ['Employers', 'Publish demand blueprints, see shared evidence per requirement, evaluate verified candidates.', 'Subscription per hiring team'],
    ['Training sponsors & CSR', 'Fund pathways and cohorts, pay for proven capability instead of attendance.', 'Per sponsored learner'],
    ['Universities & ITIs', 'License the labs and evidence layer for employer-aligned courses.', 'Per-seat institution licence'],
    ['Cohort organizers', 'Run unseen, server-graded challenges for hackathons and hiring drives.', 'Per event'],
  ];
  const payerCards = payers.map(([name, copy, unit], index) => `
    <article class="payer" data-enter="up" data-delay="${380 + index * 110}" data-duration="500">
      <h2>${name}</h2><p>${copy}</p><span class="payer-unit mono">${unit}</span>
    </article>`).join('');

  /* 14 · Ecosystem */
  const actors = [
    ['Learners', 'attempts & consent', 'a pathway, signed proof, opportunities'],
    ['Employers', 'real requirements', 'verified candidates, one shared foundation'],
    ['Universities & ITIs', 'learners & teaching', 'curriculum aligned to live demand'],
    ['Educators & masters', 'lessons, field notes, reviews', 'reach and a reviewer role'],
    ['Sponsors & skilling missions', 'funding', 'outcomes measured as evidence'],
    ['Organizers', 'challenges & cohorts', 'discovered, proven talent'],
  ];
  const actorCards = actors.map(([name, gives, gets], index) => `
    <article class="actor actor--${index}" data-enter="scale" data-delay="${320 + index * 100}" data-duration="480">
      <h2>${name}</h2>
      <p><span class="actor-k">Brings</span>${gives}</p>
      <p><span class="actor-k gold">Gets</span>${gets}</p>
    </article>`).join('');

  window.pitchSlides ??= {};
  Object.assign(window.pitchSlides, {
    '9': {
      html: `<div class="x-layout">
        ${head('How it works.', 'Six steps from an employer’s sentence to a learner’s <strong>verifiable proof</strong>.')}
        <ol class="flow">${flowCards}</ol>
        <svg class="flow-rail" viewBox="0 0 1680 20" aria-hidden="true">
          <path d="M8 10h1664m-12-8 12 8-12 8" data-enter="draw" data-delay="200" data-duration="900"/>
        </svg>
        <p class="x-rule" data-enter="fade" data-delay="1050" data-duration="460">
          <span><strong>AI</strong> proposes</span><i>·</i><span><strong>Code</strong> verifies what’s measurable</span><i>·</i><span><strong class="gold">Humans</strong> validate what machines can’t</span>
        </p>
      </div>`,
    },
    '10': {
      html: `<div class="x-layout">
        ${head('Tech stack.', 'Offline-first PWA on a <strong>pure TypeScript engine</strong>. The same grader runs in the browser and on the server.')}
        <div class="stack">${stackRows}</div>
        <p class="x-foot" data-enter="fade" data-delay="900" data-duration="440">
          <span>No AI in grading. No <code>eval</code>. AI picks are labelled proposals awaiting human validation.</span>
          <span class="mono">Not an LLM wrapper</span>
        </p>
      </div>`,
    },
    '11': {
      html: `<div class="x-layout">
        ${head('Business model.', 'The side that needs proven talent pays. <strong class="gold">Learners never pay to prove what they can do.</strong>')}
        <div class="biz">
          <div class="biz-free" data-enter="up" data-delay="240" data-duration="520">
            <span class="biz-free-k mono">FREE</span>
            <h2>Learners</h2>
            <p>Lessons, labs, unseen tests, signed evidence and the passport.</p>
          </div>
          <div class="payers">${payerCards}</div>
        </div>
        <div class="biz-why" data-enter="fade" data-delay="900" data-duration="460">
          <div><h3>Why margins hold</h3><p>Grading is deterministic code, so each extra assessment costs almost nothing.</p></div>
          <div><h3>Why it compounds</h3><p>Every employer sharpens the shared graph; every validated lab serves every industry that needs it.</p></div>
          <div><h3>What we will validate</h3><p>Price points and willingness to pay, in the pilot. No revenue claimed today.</p></div>
        </div>
      </div>`,
    },
    '12': {
      html: `<div class="x-layout">
        ${head('Ecosystem.', 'Everyone already in the skills market, connected by <strong>one shared language</strong>.')}
        <div class="eco">
          <div class="eco-core" data-enter="scale" data-delay="180" data-duration="560">
            ${pitchLogo({ className: 'eco-mark', wordmark: false })}
            <h2>Capability graph</h2>
            <p>requirements · pathways · labs · evidence</p>
          </div>
          ${actorCards}
          <svg class="eco-lines" viewBox="0 0 1680 640" preserveAspectRatio="none" aria-hidden="true">
            <path d="M840 320L235 60M840 320L235 320M840 320L235 580M840 320L1445 60M840 320L1445 320M840 320L1445 580" data-enter="fade" data-delay="300" data-duration="700"/>
          </svg>
        </div>
      </div>`,
    },
  });
})();
