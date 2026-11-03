(() => {
  'use strict';
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const settings = document.getElementById('display-menu');
  const themeButton = document.getElementById('theme-toggle');
  const motionButton = document.getElementById('motion-toggle');
  const cards = [...document.querySelectorAll('.project-card')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const grid = document.querySelector('.project-grid');
  const navLinks = [...document.querySelectorAll('.desktop-nav a, .mobile-dock a')];
  const canAnimate = () => !reducedMotion.matches && root.dataset.motion !== 'off';

  function syncPreferences() {
    const dark = root.classList.contains('dark');
    themeButton.textContent = dark ? 'Use light theme' : 'Use dark theme';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#17122c' : '#eee9ff';
    motionButton.textContent = reducedMotion.matches ? 'Reduced motion enabled' : canAnimate() ? 'Pause animations' : 'Resume animations';
    motionButton.setAttribute('aria-pressed', String(!canAnimate()));
    motionButton.disabled = reducedMotion.matches;
  }
  function storePreference(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }
  themeButton.addEventListener('click', () => {
    root.classList.toggle('dark');
    storePreference('portfolio-theme', root.classList.contains('dark') ? 'dark' : 'light');
    syncPreferences();
  });
  motionButton.addEventListener('click', () => {
    root.dataset.motion = canAnimate() ? 'off' : 'on';
    storePreference('portfolio-motion', root.dataset.motion);
    syncPreferences();
  });
  reducedMotion.addEventListener('change', syncPreferences);
  syncPreferences();
  document.addEventListener('click', event => { if (!settings.contains(event.target)) settings.open = false; });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && settings.open) {
      settings.open = false;
      settings.querySelector('summary').focus();
    }
  });

  function setFilter(category) {
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
    let count = 0;
    cards.forEach(card => {
      card.hidden = category !== 'all' && card.dataset.category !== category;
      if (!card.hidden) count++;
    });
    grid.classList.toggle('is-filtered', category !== 'all');
    document.getElementById('filter-status').textContent = count + (count === 1 ? ' project shown' : ' projects shown');
  }
  filters.forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
  function revealHashTarget() {
    const target = document.getElementById(location.hash.slice(1));
    if (target?.matches('.project-card') && target.hidden) {
      setFilter('all');
      target.scrollIntoView({ behavior: canAnimate() ? 'smooth' : 'auto', block: 'start' });
    }
  }
  addEventListener('hashchange', revealHashTarget);
  revealHashTarget();

  if ('IntersectionObserver' in window) {
    const visible = new Set();
    const sections = [...document.querySelectorAll('main > section')];
    const navigation = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target.id) : visible.delete(entry.target.id));
      const current = sections.filter(section => visible.has(section.id)).pop();
      navLinks.forEach(link => {
        if (current && link.hash === '#' + current.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-80px 0px -45% 0px' });
    sections.forEach(section => navigation.observe(section));
    const artwork = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-outside', !entry.isIntersecting));
    }, { rootMargin: '100px' });
    document.querySelectorAll('.project-card').forEach(element => artwork.observe(element));
  }
  document.addEventListener('visibilitychange', () => { root.dataset.pageHidden = String(document.hidden); });

  document.querySelectorAll('[data-tilt]').forEach(surface => {
    let frame = 0;
    surface.addEventListener('pointermove', event => {
      if (!canAnimate() || !pointer.matches || event.pointerType === 'touch') return;
      const rect = surface.getBoundingClientRect();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        surface.style.setProperty('--ry', ((event.clientX - rect.left) / rect.width * 8 - 4).toFixed(2) + 'deg');
        surface.style.setProperty('--rx', (4 - (event.clientY - rect.top) / rect.height * 8).toFixed(2) + 'deg');
      });
    }, { passive: true });
    surface.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      surface.style.setProperty('--rx', '0deg');
      surface.style.setProperty('--ry', '0deg');
    });
  });

  const toast = document.getElementById('toast');
  let toastTimer;
  function notify(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }
  async function copy(value) {
    let copied = false;
    try { await navigator.clipboard.writeText(value); copied = true; }
    catch (_) {
      const previous = document.activeElement;
      const field = document.createElement('textarea');
      field.value = value;
      field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(field);
      field.select();
      try { copied = document.execCommand('copy'); } catch (_) {}
      field.remove();
      previous?.focus({ preventScroll: true });
    }
    notify(copied ? 'Copied to clipboard' : 'Could not copy. Select and copy the text directly.');
    return copied;
  }
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    if (await copy(button.dataset.copy)) {
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = 'Copy'; }, 2200);
    }
  }));

  const dialog = document.getElementById('quick-jump');
  const input = document.getElementById('search-input');
  const list = document.getElementById('search-results');
  const status = document.getElementById('search-status');
  let opener;
  const go = id => () => {
    if (id.startsWith('project-')) setFilter('all');
    const target = document.getElementById(id);
    opener = target;
    target.setAttribute('tabindex', '-1');
    location.hash = id;
    target.scrollIntoView({ behavior: canAnimate() ? 'smooth' : 'auto', block: 'start' });
    target.focus({ preventScroll: true });
  };
  const open = selector => () => window.open(document.querySelector(selector).href, '_blank', 'noopener');
  const actions = [
    ...['projects', 'about', 'experience', 'skills', 'contact'].map(id => ({ label: 'Go to ' + id, type: 'Section', run: go(id) })),
    ...cards.map(card => ({ label: card.querySelector('h3').textContent, type: 'Project', run: go(card.id) })),
    { label: 'View resume', type: 'Link', run: open('.resume-link') },
    { label: 'View CV', type: 'Link', run: open('.cv-link') },
    { label: 'Open GitHub', type: 'Link', run: open('.github-link') },
    { label: 'Copy email address', type: 'Action', run: () => copy('quintinronald7@gmail.com') },
    { label: 'Copy phone number', type: 'Action', run: () => copy('0928 298 1473') },
  ];
  let results = [];
  let selected = 0;
  function run(index) {
    const action = results[index];
    if (!action) return;
    dialog.close();
    action.run();
  }
  function select(index) {
    if (!results.length) return;
    selected = (index + results.length) % results.length;
    [...list.querySelectorAll('button')].forEach((button, i) => {
      button.classList.toggle('selected', i === selected);
      if (i === selected) button.scrollIntoView({ block: 'nearest' });
    });
    status.textContent = results[selected].label + ', ' + (selected + 1) + ' of ' + results.length;
  }
  function render() {
    results = actions.filter(action => action.label.toLowerCase().includes(input.value.trim().toLowerCase()));
    list.replaceChildren();
    selected = 0;
    status.textContent = results.length + ' results';
    if (!results.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-result';
      empty.textContent = 'No matches. Try a project name, resume, or contact.';
      list.appendChild(empty);
    }
    results.forEach((action, index) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.toggle('selected', index === 0);
      const label = document.createElement('span');
      label.textContent = action.label;
      const hint = document.createElement('small');
      hint.textContent = action.type;
      button.append(label, hint);
      button.addEventListener('click', () => run(index));
      item.appendChild(button);
      list.appendChild(item);
    });
  }
  function openSearch() {
    settings.open = false;
    opener = document.activeElement;
    input.value = '';
    render();
    if (!dialog.open) dialog.showModal();
    input.focus();
  }
  document.getElementById('search-trigger').addEventListener('click', openSearch);
  document.getElementById('close-search').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
  input.addEventListener('input', render);
  input.addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) event.preventDefault();
    if (event.key === 'ArrowDown') select(selected + 1);
    if (event.key === 'ArrowUp') select(selected - 1);
    if (event.key === 'Enter') run(selected);
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.open) dialog.close(); else openSearch();
    }
  });
  document.querySelectorAll('.screenshot-link img').forEach(image => {
    image.addEventListener('error', () => {
      image.hidden = true;
      const label = document.createElement('span');
      label.className = 'media-error';
      label.textContent = 'Screenshot unavailable. Try opening the original image.';
      image.parentElement.prepend(label);
    }, { once: true });
  });
  document.getElementById('year').textContent = new Date().getFullYear();
})();
