/* Greenmove — single-screen behaviour (modals + demo switch + phone steps) */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const yr = $('#yr');
  if (yr) yr.textContent = String(new Date().getFullYear());

  /* Keep the landing page within the viewport on every device. */
  const lockScroll = () => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
  };
  lockScroll();

  /* Hero phone — cycle product steps (discover → … → gate). */
  const PHONE_STEPS = [
    { step: 'discover', label: 'Find the facility' },
    { step: 'composer', label: 'Build the request' },
    { step: 'sent', label: 'Track the visit' },
    { step: 'inbox', label: 'Decide once' },
    { step: 'pass', label: 'Show the pass' },
    { step: 'gate', label: 'Gate verifies' },
  ];
  const STEP_MS = 2700;
  const screens = $$('#scr-stack .scr');
  const caption = $('#phone-caption');
  const dotsHost = $('#phone-dots');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  if (screens.length && dotsHost) {
    dotsHost.replaceChildren(
      ...PHONE_STEPS.map((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'phone__dot' + (i === 0 ? ' is-on' : '');
        return dot;
      })
    );
    const dots = $$('.phone__dot', dotsHost);
    let index = Math.max(0, screens.findIndex((el) => el.classList.contains('is-on')));
    let timer = 0;

    const showStep = (next) => {
      index = ((next % screens.length) + screens.length) % screens.length;
      screens.forEach((el, i) => el.classList.toggle('is-on', i === index));
      dots.forEach((el, i) => el.classList.toggle('is-on', i === index));
      const meta = PHONE_STEPS[index];
      if (caption && meta) caption.textContent = meta.label;
      const active = screens[index];
      if (active) {
        const step = active.getAttribute('data-step') || meta?.step || '';
        const figure = active.closest('.figure');
        if (figure) figure.setAttribute('aria-label', 'Greenmove app preview — ' + (meta?.label || step));
      }
    };

    const stopCycle = () => {
      if (timer) {
        clearInterval(timer);
        timer = 0;
      }
    };

    const startCycle = () => {
      stopCycle();
      if (reduceMotion.matches || screens.length < 2) return;
      timer = window.setInterval(() => showStep(index + 1), STEP_MS);
    };

    showStep(index);
    startCycle();
    reduceMotion.addEventListener?.('change', () => {
      showStep(index);
      startCycle();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopCycle();
      else startCycle();
    });
  }

  /* Modals */
  const modals = {
    pilot: $('#modal-pilot'),
    demo: $('#modal-demo'),
    legal: $('#modal-legal'),
  };
  const modalTriggers = new WeakMap();

  const openModal = (key, trigger) => {
    const el = modals[key];
    if (!el || el.open) return;
    modalTriggers.set(el, trigger || document.activeElement);
    if (typeof el.showModal === 'function') el.showModal();
    else {
      el.setAttribute('open', '');
      $('.modal__x', el)?.focus({ preventScroll: true });
    }
  };

  const afterClose = (el) => {
    if (el === modals.demo) $('#demo-video')?.pause();
    const trigger = modalTriggers.get(el);
    modalTriggers.delete(el);
    if (trigger?.isConnected && !Object.values(modals).some((dlg) => dlg?.open)) {
      trigger.focus({ preventScroll: true });
    }
  };

  const closeModal = (el) => {
    if (!el?.open) return;
    if (typeof el.close === 'function') el.close();
    else {
      el.removeAttribute('open');
      afterClose(el);
    }
  };

  $$('[data-open]').forEach((btn) => {
    btn.addEventListener('click', () => openModal(btn.getAttribute('data-open'), btn));
  });

  Object.values(modals).forEach((dlg) => {
    if (!dlg) return;
    dlg.addEventListener('click', (e) => {
      if (e.target !== dlg) return;
      const bounds = dlg.getBoundingClientRect();
      if (e.clientX < bounds.left || e.clientX > bounds.right ||
          e.clientY < bounds.top || e.clientY > bounds.bottom) closeModal(dlg);
    });
    dlg.addEventListener('close', () => afterClose(dlg));
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeModal(dlg);
    });
    $('.modal__close-form', dlg)?.addEventListener('submit', (e) => {
      e.preventDefault();
      closeModal(dlg);
    });
  });

  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openDialog = Object.values(modals).find((dlg) => dlg?.open);
    if (openDialog) {
      e.preventDefault();
      closeModal(openDialog);
    }
  });

  /* Pilot form → mailto */
  const form = $('#pilot-form');
  const hint = $('#pilot-hint');
  if (form) {
    form.noValidate = false;
    form.addEventListener('invalid', (e) => {
      if (!hint) return;
      hint.textContent = e.target.name === 'email'
        ? 'Enter a valid work email address.'
        : 'Enter your hospital, clinic or company.';
    }, true);
    form.addEventListener('input', (e) => {
      e.target.setCustomValidity?.('');
      if (hint) hint.textContent = 'Opens your mail client.';
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const org = String(fd.get('organisation') || '').trim();
      const email = String(fd.get('email') || '').trim();
      const role = String(fd.get('role') || '').trim();
      const organisationInput = form.elements.namedItem('organisation');
      organisationInput.setCustomValidity(org ? '' : 'Enter your hospital, clinic or company.');
      if (!form.reportValidity()) return;
      const subject = encodeURIComponent('Greenmove pilot request — ' + org);
      const body = encodeURIComponent(
        `Organisation: ${org}\nEmail: ${email}\nRole: ${role}\n\nSent from greenmove.app`
      );
      if (hint) hint.textContent = 'Opening your mail client…';
      location.href = `mailto:hello@greenmove.app?subject=${subject}&body=${body}`;
    });
  }

  /* Demo part switch */
  const video = $('#demo-video');
  const source = $('#demo-source');
  const demoPanel = $('#demo-panel');
  const tabs = $$('.demo-part');
  const selectPart = (tab) => {
    tabs.forEach((t) => {
      t.classList.toggle('is-on', t === tab);
      t.setAttribute('aria-selected', String(t === tab));
      t.tabIndex = t === tab ? 0 : -1;
    });
    if (demoPanel && tab.id) demoPanel.setAttribute('aria-labelledby', tab.id);
    if (!video || !source) return;
    const part = tab.getAttribute('data-part');
    const next = source.getAttribute(part === 'hospital' ? 'data-hospital' : 'data-rep');
    if (!next || source.getAttribute('src') === next) return;
    const wasPlaying = !video.paused && !video.ended && modals.demo?.open;
    video.pause();
    source.setAttribute('src', next);
    video.load();
    if (wasPlaying) {
      video.play().then(() => {
        if (!modals.demo?.open) video.pause();
      }).catch(() => {});
    }
  };
  tabs.forEach((tab, index) => {
    tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
    tab.addEventListener('click', () => selectPart(tab));
    tab.addEventListener('keydown', (e) => {
      let next;
      if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      e.preventDefault();
      selectPart(tabs[next]);
      tabs[next].focus({ preventScroll: true });
    });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video?.pause();
  });
})();
