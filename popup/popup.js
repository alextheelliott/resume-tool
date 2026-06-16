'use strict';

// ── Config ─────────────────────────────────────────────────────────────────────
const GITHUB_URL = 'https://github.com/alexelliott/resume-tool';
const AUTHOR_URL = 'https://github.com/alexelliott';

// ── Storage ────────────────────────────────────────────────────────────────────

function loadResumes() {
  return new Promise(resolve =>
    chrome.storage.local.get('resumes', d => resolve(d.resumes || []))
  );
}

function saveResumes(resumes) {
  return new Promise(resolve =>
    chrome.storage.local.set({ resumes }, resolve)
  );
}

// ── Site Detection (informational only, not a gate) ────────────────────────────

async function detectCurrentSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return null;
    const url = tab.url;
    if (url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('chrome-extension://')) return null;
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function updatePlatformBar(hostname) {
  const bar = document.getElementById('platform-bar');
  bar.innerHTML = '';

  if (!hostname) {
    bar.classList.add('hidden');
    return;
  }

  const dot  = document.createElement('span');
  dot.className = 'platform-dot';

  const text = document.createElement('span');
  text.textContent = `Active: ${hostname}`;

  bar.className = 'platform-bar supported';
  bar.appendChild(dot);
  bar.appendChild(text);
  bar.classList.remove('hidden');
}

// ── Status Bar ─────────────────────────────────────────────────────────────────

let statusTimeout;

function showStatus(message, type = 'info', duration = 5000) {
  const bar  = document.getElementById('status-bar');
  const text = document.getElementById('status-text');
  const icon = document.getElementById('status-icon');

  const icons = { success: '✓', error: '✕', info: '↻' };
  icon.textContent = icons[type] || '';
  text.textContent = message;

  bar.className = `status-bar ${type}`;
  bar.classList.remove('hidden');

  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => bar.classList.add('hidden'), duration);
}

function hideStatus() {
  clearTimeout(statusTimeout);
  document.getElementById('status-bar').classList.add('hidden');
}

// ── Render Resume List ──────────────────────────────────────────────────────────

function renderList(resumes) {
  const list  = document.getElementById('resume-list');
  const empty = document.getElementById('empty-state');

  list.innerHTML = '';

  if (resumes.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  resumes.forEach((resume, index) => {
    list.appendChild(buildResumeCard(resume, index, resumes));
  });
}

function buildResumeCard(resume, index, resumes) {
  const item = document.createElement('div');
  item.className = 'resume-item';
  item.setAttribute('role', 'listitem');

  // ── Clickable name area
  const nameWrap = document.createElement('div');
  nameWrap.className = 'resume-name-wrap';
  nameWrap.title = 'Click to fill form';

  const nameEl = document.createElement('div');
  nameEl.className = 'resume-name';
  nameEl.textContent = resume.meta?.name || `Resume ${index + 1}`;

  const hint = document.createElement('div');
  hint.className = 'resume-fill-hint';
  hint.textContent = 'Click to fill form';

  nameWrap.appendChild(nameEl);
  nameWrap.appendChild(hint);
  nameWrap.addEventListener('click', () => fillForm(resume));

  // ── Edit button
  const editBtn = document.createElement('button');
  editBtn.className = 'icon-btn edit';
  editBtn.title = 'Rename';
  editBtn.setAttribute('aria-label', 'Rename resume');
  editBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>`;
  editBtn.addEventListener('click', e => {
    e.stopPropagation();
    startRename(item, nameWrap, resumes, index);
  });

  // ── Delete button (inline confirm)
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'icon-btn delete';
  deleteBtn.title = 'Delete';
  deleteBtn.setAttribute('aria-label', 'Delete resume');
  deleteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>`;
  deleteBtn.addEventListener('click', e => {
    e.stopPropagation();
    showDeleteConfirm(item, deleteBtn, editBtn, resumes, index);
  });

  item.appendChild(nameWrap);
  item.appendChild(editBtn);
  item.appendChild(deleteBtn);
  return item;
}

// ── Inline Rename ──────────────────────────────────────────────────────────────

function startRename(item, nameWrap, resumes, index) {
  const currentName = resumes[index].meta?.name || `Resume ${index + 1}`;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'resume-name-input';
  input.value = currentName;

  item.replaceChild(input, nameWrap);
  input.focus();
  input.select();

  async function commit() {
    const newName = input.value.trim() || currentName;
    resumes[index].meta      = resumes[index].meta || {};
    resumes[index].meta.name = newName;
    await saveResumes(resumes);
    renderList(resumes);
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { renderList(resumes); }
  });
  input.addEventListener('blur', () => setTimeout(commit, 80));
}

// ── Inline Delete Confirm ──────────────────────────────────────────────────────

function showDeleteConfirm(item, deleteBtn, editBtn, resumes, index) {
  editBtn.classList.add('hidden');
  deleteBtn.classList.add('hidden');

  const confirmEl = document.createElement('div');
  confirmEl.className = 'delete-confirm';

  const label  = document.createElement('span');
  label.textContent = 'Delete?';

  const yesBtn = document.createElement('button');
  yesBtn.className = 'confirm-yes';
  yesBtn.textContent = 'Yes';

  const noBtn = document.createElement('button');
  noBtn.className = 'confirm-no';
  noBtn.textContent = 'No';

  confirmEl.appendChild(label);
  confirmEl.appendChild(yesBtn);
  confirmEl.appendChild(noBtn);
  item.appendChild(confirmEl);

  yesBtn.addEventListener('click', async () => {
    resumes.splice(index, 1);
    await saveResumes(resumes);
    renderList(resumes);
  });

  noBtn.addEventListener('click', () => {
    confirmEl.remove();
    editBtn.classList.remove('hidden');
    deleteBtn.classList.remove('hidden');
  });
}

// ── Add New Resume ─────────────────────────────────────────────────────────────

document.getElementById('add-btn').addEventListener('click', () => {
  document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const data = JSON.parse(ev.target.result);

      if (typeof data !== 'object' || Array.isArray(data)) {
        showStatus('Invalid JSON: expected an object at root level', 'error');
        return;
      }

      if (!data.meta)      data.meta      = {};
      if (!data.meta.name) data.meta.name = file.name.replace(/\.json$/i, '') || 'New Resume';

      const resumes = await loadResumes();
      resumes.push(data);
      await saveResumes(resumes);
      renderList(resumes);
      showStatus(`"${data.meta.name}" saved`, 'success', 3000);
    } catch {
      showStatus('Could not parse file — check it is valid JSON', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ── Fill Form ──────────────────────────────────────────────────────────────────

async function fillForm(resume) {
  hideStatus();
  showStatus('Filling…', 'info', 30000);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) { showStatus('No active tab found', 'error'); return; }

    const url = tab.url || '';
    if (url.startsWith('chrome://') || url.startsWith('about:')) {
      showStatus('Cannot fill on this page — navigate to a job application', 'error');
      return;
    }

    const response = await injectAndFill(tab.id, resume);

    if (response?.success) {
      const { filled = 0, experiences = 0, education = 0 } = response;
      const parts = [];
      if (filled > 0)      parts.push(`${filled} personal field${filled !== 1 ? 's' : ''}`);
      if (experiences > 0) parts.push(`${experiences} experience entr${experiences !== 1 ? 'ies' : 'y'}`);
      if (education > 0)   parts.push(`${education} education entr${education !== 1 ? 'ies' : 'y'}`);
      const summary = parts.length ? parts.join(' · ') : 'No fields matched on this page';
      showStatus(`✓ ${summary}`, 'success', 7000);
    } else {
      showStatus(response?.error || 'Could not fill — try refreshing the page', 'error');
    }

  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
  }
}

async function injectAndFill(tabId, resume) {
  // Try messaging an already-injected content script
  const direct = await sendFillMessage(tabId, resume).catch(() => null);
  if (direct) return direct;

  // Not injected yet — inject the filler script and retry
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content/filler.js'] });
  await new Promise(r => setTimeout(r, 300));
  return sendFillMessage(tabId, resume);
}

function sendFillMessage(tabId, resume) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action: 'fillForm', resume }, resp => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(resp);
    });
  });
}

// ── Download Template ──────────────────────────────────────────────────────────

document.getElementById('template-btn').addEventListener('click', () => {
  // Schema matches the user's uploaded format with a meta extension for naming
  const template = {
    "meta": {
      "name": "My Resume"
    },
    "personal-information": {
      "first-name":           "Alex",
      "last-name":            "Elliott",
      "preferred-first-name": "",
      "phone":                "416-555-0100",
      "ext":                  "",
      "email":                "alex@example.com",
      "country":              "Canada",
      "state/province":       "Ontario",
      "city":                 "Newmarket",
      "address":              "123 Main Street",
      "address-line-2":       "",
      "zip/postal-code":      "L3Y 1A1"
    },
    "experience": [
      {
        "company-name":   "Acme Technologies",
        "title":          "Software Engineer",
        "description":    "Developed and maintained scalable microservices using Python and Go. Led a team of 3 engineers to ship a real-time data pipeline processing 1M events/day. Reduced deployment time by 40% through CI/CD improvements.",
        "country":        "Canada",
        "state/province": "Ontario",
        "city":           "Toronto",
        "start-date":     "01/2022",
        "end-date":       "12/2023"
      },
      {
        "company-name":   "Startup Inc.",
        "title":          "Junior Developer",
        "description":    "Built React frontend features and contributed to a Node.js REST API serving 50K daily active users. Implemented OAuth 2.0 authentication and improved test coverage from 40% to 85%.",
        "country":        "",
        "state/province": "",
        "city":           "Remote",
        "start-date":     "06/2020",
        "end-date":       "12/2021"
      }
    ],
    "education": [
      {
        "institution":    "University of Toronto",
        "degree":         "Bachelor of Science",
        "major":          "Computer Science",
        "country":        "Canada",
        "state/province": "Ontario",
        "city":           "Toronto",
        "graduated":      "2020"
      }
    ],
    "skills": [
      "Python", "JavaScript", "TypeScript", "React",
      "Node.js", "Go", "SQL", "Docker", "Kubernetes", "AWS"
    ],
    "languages": [
      "English"
    ],
    "links": {
      "linkedin":  "https://linkedin.com/in/alexelliott",
      "github":    "https://github.com/alexelliott",
      "portfolio": "https://alexelliott.dev",
      "other":     []
    }
  };

  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'resume-template.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showStatus('Template downloaded — fill it in and use Add Resume', 'success', 4000);
});

// ── Header Links ───────────────────────────────────────────────────────────────

document.getElementById('github-link').addEventListener('click', e => {
  e.preventDefault();
  chrome.tabs.create({ url: GITHUB_URL });
});

document.getElementById('author-link').addEventListener('click', e => {
  e.preventDefault();
  chrome.tabs.create({ url: AUTHOR_URL });
});

// ── Init ───────────────────────────────────────────────────────────────────────

(async () => {
  const [resumes, hostname] = await Promise.all([loadResumes(), detectCurrentSite()]);
  renderList(resumes);
  updatePlatformBar(hostname);
})();