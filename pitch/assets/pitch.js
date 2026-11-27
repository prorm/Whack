'use strict';

(() => {
  const slides = window.pitchSlides;
  const notes = window.pitchNotes;
  const TOTAL = 13;
  const mainSlides = Array.from({ length: TOTAL }, (_, index) => String(index + 1));
  const backupSlides = ['B1', 'B2', 'B3'];
  const sections = [
    { name: 'Pranav R Mane', short: 'Pranav', role: 'The Disconnect & Reversal', start: 0, end: 60, last: 4 },
    { name: 'Swastik R Phadke', short: 'Swastik', role: 'Demand Graph & Career GPS', start: 60, end: 100, last: 6 },
    { name: 'Prajwal N', short: 'Prajwal', role: 'Compiler, Labs, How it works & Tech Stack', start: 100, end: 200, last: 10 },
    { name: 'Harsh Tiwari', short: 'Harsh', role: 'Business Model, Ecosystem & Vision', start: 200, end: 300, last: 13 }
  ];
  const titles = {
    1: 'Meet Arjun', 2: 'Both sides are searching', 3: 'The system is disconnected', 4: 'What if we reversed education?',
    5: 'One shared foundation', 6: 'Never start from zero', 7: 'The Work Compiler', 8: 'Don’t claim it. Prove it.',
    9: 'How it works', 10: 'Tech stack', 11: 'Business model',
    12: 'Ecosystem', 13: 'Potential is everywhere', B1: 'Demand blueprint', B2: 'CodeLab verdict', B3: 'Exchange coverage'
  };
  const byId = (id) => document.getElementById(id);
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const easeIn = 'cubic-bezier(.2,.8,.2,1)';
  const easeMove = 'cubic-bezier(.4,0,.2,1)';
  const presenterSession = new URLSearchParams(location.search).get('presenter');
  const isPresenter = Boolean(presenterSession);
  const session = presenterSession || makeId();
  let peer = isPresenter ? window.opener : null;
  let channel;
  let connected = false;
  let previousMain = { slide: '1', build: 0 };
  let typedNumber = '';
  let typingTimeout;
  let activeSlide;
  let slideLife;
  let slideAnimations = [];
  let buildAnimations = [];
  let notesKey = '';
  let previewKey = '';
  let lastSchedule = -1;
  const handledCommands = new Set();
  let state = {
    slide: readHash(),
    build: 0,
    black: false,
    startedAt: null,
    revision: 0
  };

  function makeId() {
    const values = crypto.getRandomValues(new Uint32Array(3));
    return Array.from(values, (value) => value.toString(36)).join('-');
  }

  function readHash() {
    const id = location.hash.slice(1);
    return mainSlides.includes(id) || backupSlides.includes(id) ? id : '1';
  }

  function updateHash(id) {
    if (location.hash === '#' + id) return;
    history.replaceState(null, '', '#' + id);
  }

  function fitStage() {
    const area = byId('projection');
    const ratio = Math.min(area.clientWidth / 1920, area.clientHeight / 1080);
    byId('stage').style.setProperty('--scale', ratio);
  }

  function makeSlide(id, build) {
    const element = document.createElement('section');
    element.className = 'slide slide--' + id;
    element.dataset.slide = id;
    element.dataset.build = build;
    element.setAttribute('aria-label', titles[id]);
    element.innerHTML = slides[id].html;
    return element;
  }

  function animationContext(animations, motion = !motionQuery.matches) {
    const signal = slideLife.signal;
    return {
      motion,
      signal,
      animate(element, keyframes, options = {}) {
        if (!element || signal.aborted || !motion || motionQuery.matches) return null;
        const animation = element.animate(keyframes, {
          duration: 440,
          easing: easeIn,
          fill: 'both',
          ...options
        });
        animations.push(animation);
        return animation;
      }
    };
  }

  const entrances = {
    up: [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }],
    down: [{ opacity: 0, transform: 'translateY(-24px)' }, { opacity: 1, transform: 'translateY(0)' }],
    letter: [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }],
    left: [{ opacity: 0, transform: 'translateX(28px)' }, { opacity: 1, transform: 'translateX(0)' }],
    right: [{ opacity: 0, transform: 'translateX(-28px)' }, { opacity: 1, transform: 'translateX(0)' }],
    scale: [{ opacity: 0, transform: 'scale(.95)' }, { opacity: 1, transform: 'scale(1)' }],
    bar: [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
    fade: [{ opacity: 0 }, { opacity: 1 }]
  };

  function playEntrance(element, context) {
    if (context.motion) {
      for (const item of element.querySelectorAll('[data-enter]')) {
        const name = item.dataset.enter;
        let frames = entrances[name];
        if (name === 'draw' && typeof item.getTotalLength === 'function') {
          const length = item.getTotalLength() + 1;
          item.style.strokeDasharray = length;
          frames = [{ strokeDashoffset: length }, { strokeDashoffset: 0 }];
        }
        if (frames) {
          const duration = Math.max(280, Math.min(900, Number(item.dataset.duration) || 440));
          const delay = Math.min(2500 - duration, Number(item.dataset.delay) || 0);
          context.animate(item, frames, { duration, delay });
        }
      }
      for (const counter of element.querySelectorAll('[data-count]')) {
        playCounter(counter, context);
      }
    }
    slides[state.slide].enter?.(element, context);
  }

  function playCounter(element, context) {
    const target = Number(element.dataset.count);
    const decimals = Number(element.dataset.decimals) || 0;
    const suffix = element.dataset.suffix || '';
    const delay = Math.min(1600, Number(element.dataset.delay) || 0);
    const clock = context.animate(element, [], { duration: 900, delay });
    if (!clock) return;
    const paint = () => {
      if (context.signal.aborted) return;
      const progress = clock.effect.getComputedTiming().progress ?? 0;
      element.textContent = (target * progress).toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(paint);
    };
    paint();
  }

  function sectionIndexForSlide(slideId) {
    if (backupSlides.includes(slideId)) return sections.length - 1;
    const id = Number(slideId);
    return sections.findIndex((section) => id <= section.last);
  }

  function updateFooter() {
    const index = mainSlides.indexOf(state.slide);
    byId('stage-footer').hidden = index < 0;
    if (index < 0) return;
    byId('stage-index').textContent = String(index + 1).padStart(2, '0') + ' / ' + TOTAL;
    const buildEl = byId('stage-build');
    if (buildEl) {
      const maxBuild = slides[state.slide].builds || 0;
      buildEl.textContent = maxBuild > 0 ? `STEP ${state.build + 1}/${maxBuild + 1}` : '';
    }
    for (const [barIndex, bar] of Array.from(byId('stage-progress').querySelectorAll('rect')).entries()) {
      const starts = [0, 4, 8];
      const ends = [4, 8, TOTAL - 1];
      bar.classList.toggle('is-current', index >= starts[barIndex] && index < ends[barIndex]);
      bar.classList.toggle('is-complete', index >= ends[barIndex]);
    }
  }

  function renderProjection() {
    const slot = byId('slide-slot');
    const changedSlide = activeSlide?.dataset.slide !== state.slide;
    if (changedSlide) {
      slot.querySelector('.is-leaving')?.remove();
      const outgoing = activeSlide;
      if (outgoing) {
        outgoing.classList.add('is-leaving');
        outgoing.setAttribute('aria-hidden', 'true');
        const fade = outgoing.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: motionQuery.matches ? 280 : 340,
          easing: easeMove,
          fill: 'forwards'
        });
        fade.onfinish = () => outgoing.remove();
      }
      slideLife?.abort();
      for (const animation of [...slideAnimations, ...buildAnimations]) animation.cancel();
      slideAnimations = [];
      buildAnimations = [];
      slideLife = new AbortController();
      activeSlide = makeSlide(state.slide, state.build);
      slot.prepend(activeSlide);
      playEntrance(activeSlide, animationContext(slideAnimations));
      slides[state.slide].build?.(activeSlide, state.build, animationContext(buildAnimations, false));
      updateFooter();
      byId('slide-announcement').textContent = 'Slide ' + state.slide + '. ' + titles[state.slide];
    } else if (Number(activeSlide.dataset.build) !== state.build) {
      for (const animation of buildAnimations) animation.cancel();
      buildAnimations = [];
      activeSlide.dataset.build = state.build;
      slides[state.slide].build?.(activeSlide, state.build, animationContext(buildAnimations));
      updateFooter();
    }
    byId('blackout').classList.toggle('is-on', state.black);
  }

  function send(message) {
    const packet = { ...message, session, from: isPresenter ? 'presenter' : 'deck' };
    channel?.postMessage(packet);
    if (peer && !peer.closed) peer.postMessage(packet, '*');
  }

  function publish() {
    send({ type: 'state', state });
  }

  function commit(patch) {
    state = { ...state, ...patch, revision: state.revision + 1 };
    updateHash(state.slide);
    renderProjection();
    publish();
  }

  function adjacent(id, direction) {
    const list = backupSlides.includes(id) ? backupSlides : mainSlides;
    return list[list.indexOf(id) + direction];
  }

  function step(direction) {
    const maxBuild = slides[state.slide].builds || 0;
    const build = state.build + direction;
    const startedAt = direction > 0 ? state.startedAt ?? Date.now() : state.startedAt;
    if (build >= 0 && build <= maxBuild) {
      commit({ build, startedAt });
      return;
    }
    const id = adjacent(state.slide, direction);
    if (!id) return;
    commit({
      slide: id,
      build: direction < 0 ? slides[id].builds || 0 : 0,
      startedAt
    });
  }

  function jump(id) {
    if (!mainSlides.includes(id) && !backupSlides.includes(id)) return;
    commit({ slide: id, build: 0, black: false });
  }

  function elapsedSeconds() {
    return state.startedAt === null ? 0 : Math.max(0, (Date.now() - state.startedAt) / 1000);
  }

  function runCommand(action, value) {
    if (action === 'next') step(1);
    if (action === 'back') step(-1);
    if (action === 'jump') jump(value);
    if (action === 'black') commit({ black: !state.black });
    if (action === 'unblack' && state.black) commit({ black: false });
    if (action === 'timer' && state.startedAt === null) commit({ startedAt: Date.now() });
    if (action === 'backup') {
      if (backupSlides.includes(state.slide)) {
        commit(previousMain);
      } else {
        previousMain = { slide: state.slide, build: state.build };
        commit({ slide: 'B1', build: 0, black: false });
      }
    }
  }

  function command(action, value) {
    if (isPresenter) {
      if (connected) send({ type: 'command', id: makeId(), action, value });
    } else {
      runCommand(action, value);
    }
  }

  function receive(packet) {
    if (!packet || packet.session !== session || packet.from !== (isPresenter ? 'deck' : 'presenter')) return;
    if (isPresenter && packet.type === 'state') {
      if (connected && packet.state.revision <= state.revision) return;
      connected = true;
      state = packet.state;
      byId('sync-status').textContent = '';
      renderPresenter();
    } else if (!isPresenter && packet.type === 'hello') {
      publish();
    } else if (!isPresenter && packet.type === 'command') {
      if (handledCommands.has(packet.id)) return;
      handledCommands.add(packet.id);
      if (handledCommands.size > 128) handledCommands.delete(handledCommands.values().next().value);
      runCommand(packet.action, packet.value);
    }
  }

  function connect() {
    try {
      channel = new BroadcastChannel('capable-pitch-' + session);
      channel.onmessage = ({ data }) => receive(data);
    } catch {
      // Fallback via window.opener postMessage when file: origin isolates BroadcastChannel.
    }
    window.addEventListener('message', (event) => {
      if (event.source === peer) receive(event.data);
    });
    window.addEventListener('pagehide', () => channel?.close(), { once: true });
  }

  function openPresenter() {
    if (isPresenter) return;
    if (peer && !peer.closed) {
      peer.focus();
      publish();
      return;
    }
    const url = new URL(location.href);
    url.searchParams.set('presenter', session);
    url.hash = '';
    peer = window.open(url.href, 'capable-presenter-' + session, 'popup,width=1320,height=870');
    peer?.focus();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }

  function clearNumber() {
    clearTimeout(typingTimeout);
    typedNumber = '';
  }

  function handleKey(event) {
    if (event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target instanceof HTMLElement && event.target.matches('input,textarea,select,[contenteditable]')) return;
    const key = event.key.toLowerCase();
    const movements = {
      arrowright: 'next', arrowdown: 'next', pagedown: 'next', ' ': 'next',
      arrowleft: 'back', arrowup: 'back', pageup: 'back',
      b: 'black', escape: 'unblack', t: 'timer'
    };
    if ((key === ' ' || key === 'enter') && event.target instanceof HTMLButtonElement && !typedNumber) return;
    if (/^[0-9]$/.test(key)) {
      event.preventDefault();
      if (typedNumber === '1' && Number(key) <= TOTAL - 10) {
        typedNumber = '1' + key;
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(clearNumber, 2200);
      } else if (key === '0') {
        clearNumber();
        command('backup');
      } else {
        typedNumber = key;
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(clearNumber, 2200);
      }
      return;
    }
    if (key === 'enter' && typedNumber) {
      event.preventDefault();
      command('jump', typedNumber);
      clearNumber();
      return;
    }
    clearNumber();
    if (key in movements) {
      event.preventDefault();
      command(movements[key]);
    } else if (key === 'home') {
      event.preventDefault();
      command('jump', '1');
    } else if (key === 'f') {
      event.preventDefault();
      toggleFullscreen();
    } else if (key === 'p') {
      event.preventDefault();
      openPresenter();
    }
  }

  function timeString(seconds) {
    const whole = Math.max(0, Math.floor(seconds));
    return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0');
  }

  function sectionIndex() {
    return sectionIndexForSlide(state.slide);
  }

  function updateTiming() {
    if (!connected) return;
    const elapsed = elapsedSeconds();
    const clock = byId('time-elapsed');
    clock.value = timeString(elapsed);
    clock.parentElement.classList.toggle('is-over', elapsed >= 300);
    byId('time-limit').textContent = elapsed >= 300 ? 'Hard stop' : '/ 5:00';
    const index = sectionIndex();
    const segment = sections[index];
    const remaining = segment.end - elapsed;
    const used = Math.min(1, Math.max(0, (elapsed - segment.start) / (segment.end - segment.start)));
    const budgetLeft = byId('budget-left');
    const budget = budgetLeft.closest('.budget');
    budget.classList.toggle('is-near', used >= .8 && remaining > 0);
    budget.classList.toggle('is-over', remaining <= 0);
    budgetLeft.value = remaining > 0 ? timeString(Math.ceil(remaining)) + ' left' : timeString(-remaining) + ' over';
    byId('budget-fill').style.setProperty('--used', used);
    byId('budget-track').setAttribute('aria-valuenow', Math.floor(used * 100));
    if (index !== lastSchedule) {
      byId('speaker-name').textContent = segment.name + ' · ' + segment.role;
      Array.from(byId('budget-schedule').children).forEach((node, scheduleIndex) => {
        if (scheduleIndex === index) node.setAttribute('aria-current', 'step');
        else node.removeAttribute('aria-current');
      });
      lastSchedule = index;
    }
    renderNotes();
  }

  function addFormattedText(element, text) {
    for (const part of text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g)) {
      const tags = part.startsWith('**') ? ['strong', 2] : part.startsWith('*') ? ['em', 1] : part.startsWith('`') ? ['code', 1] : null;
      if (tags) {
        const child = document.createElement(tags[0]);
        child.textContent = part.slice(tags[1], -tags[1]);
        element.append(child);
      } else {
        element.append(part);
      }
    }
  }

  function renderNotes() {
    const key = state.slide;
    if (notesKey === key) return;
    notesKey = key;
    const area = byId('speaker-notes');
    area.replaceChildren();
    for (const line of (notes[state.slide] || '').split('\n')) {
      const paragraph = document.createElement('p');
      addFormattedText(paragraph, line);
      area.append(paragraph);
    }
  }

  function renderPreview(frame, id, build, black = false) {
    frame.replaceChildren();
    frame.setAttribute('aria-label', id ? titles[id] : 'End of deck');
    if (!id || black) {
      frame.style.background = black ? 'black' : '';
      if (black) frame.setAttribute('aria-label', 'Black screen');
      return;
    }
    frame.style.background = '';
    const mini = document.createElement('div');
    mini.className = 'mini-stage';
    mini.setAttribute('aria-hidden', 'true');
    mini.append(makeSlide(id, build));
    frame.append(mini);
  }

  function renderPresenter() {
    const id = state.slide;
    const maxBuild = slides[id].builds || 0;
    const hasNextBuild = state.build < maxBuild;
    const nextSlideId = hasNextBuild ? id : adjacent(id, 1);
    const nextBuild = hasNextBuild ? state.build + 1 : 0;
    const key = [id, state.build, state.black].join('/');
    if (key !== previewKey) {
      previewKey = key;
      renderPreview(byId('current-preview'), id, state.build, state.black);
      renderPreview(byId('next-preview'), nextSlideId, nextBuild);
      byId('current-label').textContent = state.black
        ? 'Black screen'
        : id + (maxBuild ? ` (Build ${state.build}/${maxBuild})` : '') + ' · ' + titles[id];
      byId('next-label').textContent = nextSlideId
        ? nextSlideId + (hasNextBuild ? ` (Build ${nextBuild}/${maxBuild})` : '') + ' · ' + titles[nextSlideId]
        : 'End';
    }
    byId('back-button').disabled = !adjacent(id, -1) && state.build === 0;
    byId('next-button').disabled = !nextSlideId;
    byId('timer-button').disabled = state.startedAt !== null;
    byId('timer-button').textContent = state.startedAt === null ? 'Start clock' : 'Clock running';
    byId('black-button').setAttribute('aria-pressed', String(state.black));
    updateTiming();
  }

  function initPresenter() {
    byId('projection').hidden = true;
    byId('presenter').hidden = false;
    byId('presenter-brand').innerHTML = pitchLogo();
    const schedule = byId('budget-schedule');
    for (const part of sections) {
      const item = document.createElement('span');
      item.textContent = part.short + ' ' + timeString(part.start);
      schedule.append(item);
    }
    const controls = { 'back-button': 'back', 'next-button': 'next', 'timer-button': 'timer', 'black-button': 'black' };
    for (const [id, action] of Object.entries(controls)) byId(id).addEventListener('click', () => command(action));
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) entry.target.style.setProperty('--scale', entry.contentRect.width / 1920);
    });
    observer.observe(byId('current-preview'));
    observer.observe(byId('next-preview'));
    send({ type: 'hello' });
    const handshake = setInterval(() => {
      if (connected) clearInterval(handshake);
      else send({ type: 'hello' });
    }, 500);
    setTimeout(() => {
      if (!connected) byId('sync-status').textContent = 'Open this window from the audience deck with P to connect.';
    }, 2800);
    setInterval(updateTiming, 120);
  }

  function initProjection() {
    byId('stage-progress').innerHTML = pitchLogo({ wordmark: false });
    fitStage();
    window.addEventListener('resize', fitStage);
    window.addEventListener('hashchange', () => jump(readHash()));
    byId('projection').addEventListener('click', (event) => {
      if (event.button !== 0) return;
      clearNumber();
      step(1);
    });
    motionQuery.addEventListener('change', () => {
      if (!motionQuery.matches) return;
      for (const animation of [...slideAnimations, ...buildAnimations]) animation.finish();
    });
    updateHash(state.slide);
    renderProjection();
  }

  connect();
  document.addEventListener('keydown', handleKey);
  if (isPresenter) initPresenter();
  else initProjection();
})();
