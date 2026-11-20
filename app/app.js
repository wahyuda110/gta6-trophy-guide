// Vice Got a Price! — offline GTA VI trophy guide and tracker.
// Loads the trophy list and roadmap from this app's own data files, keeps earned
// trophies in localStorage, and never makes a network request of its own.
const STORE_KEY = 'gta6-trophy-guide-v1';
const SPOILER_KEY = 'gta6-trophy-guide-spoilers';

const listEl = document.getElementById('trophyList');
const emptyNote = document.getElementById('emptyNote');
const progressText = document.getElementById('progressText');
const progressPct = document.getElementById('progressPct');
const progressFill = document.getElementById('progressFill');
const progressDetail = document.getElementById('progressDetail');
const searchInput = document.getElementById('search');
const gradeSelect = document.getElementById('grade');
const spoilerBox = document.getElementById('spoilers');
const filterNote = document.getElementById('filterNote');
const detailEl = document.getElementById('detail');

let trophies = [];
let roadmap = null;
let earned = new Set();
let kindFilter = 'all';
let selectedId = null;

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]');
    if (Array.isArray(raw)) earned = new Set(raw.filter((n) => typeof n === 'string'));
  } catch {
    earned = new Set();
  }
  spoilerBox.checked = localStorage.getItem(SPOILER_KEY) === '1';
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned]));
  localStorage.setItem(SPOILER_KEY, spoilerBox.checked ? '1' : '0');
}

function isSpoilerHidden(t) {
  return spoilerBox.checked && t.kind === 'story' && !earned.has(t.name);
}

function gradeLabel(t) {
  return t.grade.charAt(0).toUpperCase() + t.grade.slice(1);
}

function kindLabel(kind) {
  return { story: 'Story', collectibles: 'Collectibles', activities: 'Activities', online: 'Online', platinum: 'Platinum', completion: '100%' }[kind] ?? kind;
}

function matchesKind(t) {
  if (kindFilter === 'all') return true;
  if (kindFilter === 'missable') return t.missable === true;
  if (kindFilter === 'online') return false; // No online trophies: the game is single-player.
  return t.kind === kindFilter;
}

function visibleTrophies() {
  const q = searchInput.value.trim().toLowerCase();
  return trophies.filter((t) => {
    if (!matchesKind(t)) return false;
    if (gradeSelect.value !== 'all' && t.grade !== gradeSelect.value) return false;
    if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderProgress() {
  const total = trophies.length;
  const n = earned.size;
  progressText.textContent = `${n} of ${total} earned`;
  const pct = total ? Math.round((n / total) * 100) : 0;
  progressPct.textContent = `${pct}%`;
  progressFill.style.width = `${pct}%`;
  const byGrade = {};
  for (const t of trophies) if (earned.has(t.name)) byGrade[t.grade] = (byGrade[t.grade] ?? 0) + 1;
  const parts = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `${byGrade[g] ?? 0} ${g}`)
    .join(' · ');
  progressDetail.textContent = total ? `${parts} — ${total - n} to go. The platinum pops when all 54 others are earned.` : '';
}

function renderList() {
  const shown = visibleTrophies();
  listEl.replaceChildren();
  for (const t of shown) {
    const li = document.createElement('li');
    li.className = 'trophy' + (earned.has(t.name) ? ' earned' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', `Earned: ${t.name}`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name);
      else earned.delete(t.name);
      saveState();
      renderAll();
    });
    const body = document.createElement('div');
    const nameRow = document.createElement('div');
    nameRow.className = 'trophy-name';
    const hidden = isSpoilerHidden(t);
    if (hidden) {
      const span = document.createElement('span');
      span.textContent = 'Hidden story trophy — earn it to reveal';
      nameRow.append(span);
    } else {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = t.name;
      btn.addEventListener('click', () => showDetail(t.id));
      nameRow.append(btn);
    }
    const desc = document.createElement('div');
    desc.className = 'trophy-desc';
    desc.textContent = hidden ? 'Hidden until earned. Turn off “Hide story spoilers” to see it.' : t.description;
    const snippet = document.createElement('div');
    snippet.className = 'trophy-guide-snippet';
    snippet.textContent = hidden ? '' : t.guide;
    const meta = document.createElement('div');
    meta.className = 'trophy-meta';
    const gradePill = document.createElement('span');
    gradePill.className = `pill ${t.grade}`;
    gradePill.textContent = gradeLabel(t);
    meta.append(gradePill);
    const kindPill = document.createElement('span');
    kindPill.className = 'pill';
    kindPill.textContent = kindLabel(t.kind);
    if (t.kind !== 'platinum') meta.append(kindPill);
    if (t.hidden) {
      const h = document.createElement('span');
      h.className = 'pill hidden-flag';
      h.textContent = 'Hidden on PSN';
      meta.append(h);
    }
    if (t.missable) {
      const m = document.createElement('span');
      m.className = 'pill missable';
      m.textContent = '⚠ Possibly missable';
      meta.append(m);
    }
    if (earned.has(t.name)) {
      const e = document.createElement('span');
      e.className = 'pill earned-flag';
      e.textContent = '✓ Earned';
      meta.append(e);
    }
    body.append(nameRow, desc, snippet, meta);
    const gradeCell = document.createElement('div');
    gradeCell.className = 'trophy-grade';
    gradeCell.textContent = '';
    li.append(box, body, gradeCell);
    listEl.append(li);
  }
  if (shown.length === 0) {
    emptyNote.hidden = false;
    emptyNote.textContent = kindFilter === 'online'
      ? 'No online trophies. GTA VI launched as a single-player game with no online mode, and all 55 trophies are offline (PowerPyx trophy roadmap; EGamers trophy list).'
      : 'No trophies match these filters. Clear the search or pick another kind.';
  } else {
    emptyNote.hidden = true;
  }
  const kindText = kindFilter === 'all' ? 'all kinds' : kindLabel(kindFilter);
  filterNote.textContent = `Showing ${shown.length} of ${trophies.length} trophies (${kindText}${gradeSelect.value !== 'all' ? `, ${gradeSelect.value}` : ''}${spoilerBox.checked ? ', story spoilers hidden' : ''}).`;
}

function sourceListHTML(sources) {
  const ul = document.createElement('ul');
  for (const s of sources ?? []) {
    const li = document.createElement('li');
    if (s.url) {
      const a = document.createElement('a');
      a.href = s.url;
      a.textContent = s.name;
      a.target = '_blank';
      a.rel = 'noopener';
      li.append(a);
    } else {
      li.textContent = s.name;
    }
    ul.append(li);
  }
  return ul;
}

function showDetail(id) {
  const t = trophies.find((x) => x.id === id);
  if (!t) return;
  selectedId = id;
  detailEl.hidden = false;
  detailEl.replaceChildren();
  const h = document.createElement('h2');
  h.textContent = isSpoilerHidden(t) ? 'Hidden story trophy' : t.name;
  const official = document.createElement('p');
  official.className = 'official';
  if (isSpoilerHidden(t)) {
    official.textContent = 'Spoiler protection is on. Earn this trophy to see its name, description and guide.';
  } else {
    official.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = 'Official description: ';
    official.append(strong, document.createTextNode(`${t.description} `));
    const grade = document.createElement('span');
    grade.className = `pill ${t.grade}`;
    grade.textContent = gradeLabel(t);
    official.append(grade);
  }
  detailEl.append(h, official);
  if (!isSpoilerHidden(t)) {
    if (t.missable) {
      const warn = document.createElement('p');
      warn.className = 'missable-warning';
      warn.textContent = '⚠ Possibly missable — the only trophy PowerPyx and GTABase flag. Read the guide before you play past Chapter 1.';
      detailEl.append(warn);
    }
    const guide = document.createElement('p');
    guide.className = 'guide-text';
    guide.textContent = t.guide;
    const srcTitle = document.createElement('h3');
    srcTitle.textContent = 'Sources for this guide';
    const srcNote = document.createElement('p');
    srcNote.textContent = 'Every fact above comes from one of these. The guide is written in this entry’s own words — sources are cited, never copied.';
    const srcWrap = document.createElement('div');
    srcWrap.className = 'sources';
    srcWrap.append(srcTitle, srcNote, sourceListHTML(t.sources));
    detailEl.append(guide, srcWrap);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'close-detail';
  close.textContent = 'Close guide';
  close.addEventListener('click', () => {
    detailEl.hidden = true;
    selectedId = null;
  });
  detailEl.append(close);
  // In the deterministic guide screenshot the list is hidden, so the detail
  // already sits in view; in normal use, bring it into view for the reader.
  if (!document.body.classList.contains('shot-guide')) {
    detailEl.scrollIntoView({ behavior: 'instant', block: 'nearest' });
  }
}

function renderRoadmap() {
  if (!roadmap) return;
  document.getElementById('roadmapTitle').textContent = roadmap.title;
  document.getElementById('roadmapSummary').textContent = roadmap.summary;
  const ol = document.getElementById('roadmapStages');
  ol.replaceChildren();
  for (const stage of roadmap.stages) {
    const li = document.createElement('li');
    const h = document.createElement('h3');
    h.textContent = `Stage ${stage.stage}: ${stage.title}`;
    const time = document.createElement('span');
    time.className = 'stage-time';
    time.textContent = stage.time;
    h.append(time);
    const p = document.createElement('p');
    p.textContent = stage.text;
    const chips = document.createElement('div');
    chips.className = 'stage-trophies';
    for (const id of stage.trophyIds) {
      const t = trophies.find((x) => x.id === id);
      if (!t) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = (earned.has(t.name) ? '✓ ' : '') + (isSpoilerHidden(t) ? 'Hidden story trophy' : t.name);
      if (earned.has(t.name)) b.classList.add('earned');
      b.addEventListener('click', () => {
        switchView('checklist');
        showDetail(t.id);
      });
      chips.append(b);
    }
    li.append(h, p, chips);
    ol.append(li);
  }
  const src = document.getElementById('roadmapSources');
  src.replaceChildren();
  src.append(document.createTextNode('Roadmap built from the official trophy descriptions. Order and timing: '));
  src.append(sourceListHTML(roadmap.sources));
}

function renderProgressView() {
  const grid = document.getElementById('statsGrid');
  grid.replaceChildren();
  const groups = [
    ['Earned', `${earned.size} / ${trophies.length}`],
    ['Story', `${trophies.filter((t) => t.kind === 'story' && earned.has(t.name)).length} / ${trophies.filter((t) => t.kind === 'story').length}`],
    ['Collectibles', `${trophies.filter((t) => t.kind === 'collectibles' && earned.has(t.name)).length} / ${trophies.filter((t) => t.kind === 'collectibles').length}`],
    ['Activities', `${trophies.filter((t) => t.kind === 'activities' && earned.has(t.name)).length} / ${trophies.filter((t) => t.kind === 'activities').length}`],
    ['Missable done', earned.has('Positive Mental Attitude') ? 'Yes ✓' : 'Not yet'],
    ['Platinum', earned.size === trophies.length ? 'Earned! 🏆' : `${trophies.length - earned.size} to go`],
  ];
  for (const [label, value] of groups) {
    const div = document.createElement('div');
    div.className = 'stat';
    const b = document.createElement('b');
    b.textContent = value;
    const s = document.createElement('span');
    s.textContent = label;
    div.append(b, s);
    grid.append(div);
  }
  const ul = document.getElementById('earnedList');
  ul.replaceChildren();
  const done = trophies.filter((t) => earned.has(t.name));
  if (done.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Nothing earned yet — tick a trophy on the checklist to start.';
    ul.append(li);
  } else {
    for (const t of done) {
      const li = document.createElement('li');
      li.textContent = `${t.name} — ${gradeLabel(t)}`;
      ul.append(li);
    }
  }
}

function switchView(name) {
  for (const tab of document.querySelectorAll('.view-tab')) {
    tab.classList.toggle('active', tab.dataset.view === name);
  }
  for (const v of ['checklist', 'roadmap', 'progress']) {
    document.getElementById(`view-${v}`).hidden = v !== name;
  }
  if (name === 'roadmap') renderRoadmap();
  if (name === 'progress') renderProgressView();
}

function exportProgress() {
  const payload = {
    app: 'gta6-trophy-guide',
    version: 1,
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
  const msg = document.getElementById('ioMessage');
  if (msg) msg.textContent = `Exported ${earned.size} earned trophies to gta6-trophy-progress.json.`;
}

function applyImportedProgress(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return 'That file is not valid JSON.';
  }
  const names = Array.isArray(data) ? data : data.earned;
  if (!Array.isArray(names)) return 'That file does not hold an earned-trophy list.';
  const known = new Set(trophies.map((t) => t.name));
  const good = names.filter((n) => typeof n === 'string' && known.has(n));
  const bad = names.filter((n) => typeof n !== 'string' || !known.has(n));
  earned = new Set(good);
  saveState();
  renderAll();
  return `Imported ${good.length} earned trophies${bad.length ? ` (${bad.length} unknown names ignored)` : ''}.`;
}

async function handleImportFile(file, messageEl) {
  if (!file) return;
  const result = applyImportedProgress(await file.text());
  if (messageEl) messageEl.textContent = result;
}

function renderAll() {
  renderProgress();
  renderList();
  if (selectedId !== null) showDetail(selectedId);
  if (!document.getElementById('view-progress').hidden) renderProgressView();
  if (!document.getElementById('view-roadmap').hidden) renderRoadmap();
}

async function init() {
  const [trophyDoc, roadmapDoc] = await Promise.all([
    (await fetch('data/trophies.json')).json(),
    (await fetch('data/roadmap.json')).json(),
  ]);
  trophies = trophyDoc.trophies;
  roadmap = roadmapDoc;
  loadState();

  // Deterministic screenshot states: ?shot=checklist|guide|roadmap|progress,
  // &id=<trophy id>, &earned=2,3,8 (seeds those trophies as earned), &spoilers=on.
  const params = new URLSearchParams(location.search);
  if (params.has('earned')) {
    const known = new Set(trophies.map((t) => t.name));
    for (const id of params.get('earned').split(',')) {
      const t = trophies.find((x) => String(x.id) === id.trim());
      if (t && known.has(t.name)) earned.add(t.name);
    }
    saveState();
  }
  if (params.get('spoilers') === 'on') {
    spoilerBox.checked = true;
    saveState();
  }

  for (const tab of document.querySelectorAll('.view-tab')) {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  }
  for (const chip of document.querySelectorAll('#kindChips .chip')) {
    chip.addEventListener('click', () => {
      kindFilter = chip.dataset.kind;
      for (const c of document.querySelectorAll('#kindChips .chip')) c.classList.toggle('active', c === chip);
      renderList();
    });
  }
  searchInput.addEventListener('input', renderList);
  gradeSelect.addEventListener('change', renderList);
  spoilerBox.addEventListener('change', () => { saveState(); renderAll(); });
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('exportBtn2').addEventListener('click', exportProgress);
  document.getElementById('importFile').addEventListener('change', (e) => handleImportFile(e.target.files[0], document.getElementById('ioMessage')));
  document.getElementById('importFile2').addEventListener('change', (e) => handleImportFile(e.target.files[0], document.getElementById('ioMessage')));
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (window.confirm('Clear all earned trophies?')) {
      earned = new Set();
      saveState();
      renderAll();
      document.getElementById('ioMessage').textContent = 'Progress cleared.';
    }
  });

  renderAll();
  const shot = params.get('shot');
  if (shot === 'guide') document.body.classList.add('shot-guide');
  if (shot === 'roadmap') switchView('roadmap');
  else if (shot === 'progress') switchView('progress');
  else if (shot === 'guide' && params.get('id')) showDetail(Number(params.get('id')));
}

init();
