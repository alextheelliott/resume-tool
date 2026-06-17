'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// FIELD LABEL MAPS
// Keys match the JSON schema (kebab-case). Each entry lists label text patterns
// that various portals might use for that field.
// ═══════════════════════════════════════════════════════════════════════════════

const PERSONAL_LABELS = [
  { key: 'first-name',           patterns: ['first name', 'given name', 'firstname', 'first*name'] },
  { key: 'last-name',            patterns: ['last name', 'family name', 'surname', 'lastname', 'last*name'] },
  { key: 'preferred-first-name', patterns: ['preferred name', 'preferred first', 'preferred first name', 'goes by', 'nickname', 'known as'] },
  { key: 'phone',                patterns: ['phone', 'phone number', 'telephone', 'mobile', 'cell', 'contact number', 'mobile number'] },
  { key: 'ext',                  patterns: ['ext', 'extension', 'phone extension', 'phone ext'] },
  { key: 'email',                patterns: ['email', 'e-mail', 'email address', 'electronic mail'] },
  { key: 'country',              patterns: ['country', 'country of residence', 'nation'] },
  { key: 'state/province',       patterns: ['state', 'province', 'state/province', 'region', 'territory', 'state or province'] },
  { key: 'city',                 patterns: ['city', 'town', 'municipality', 'city/town', 'locality'] },
  { key: 'address',              patterns: ['address line 1', 'street address', 'address 1', 'street line 1', 'street', 'address'] },
  { key: 'address-line-2',       patterns: ['address line 2', 'address 2', 'apt', 'suite', 'unit', 'floor', 'apartment', 'po box'] },
  { key: 'zip/postal-code',      patterns: ['zip', 'postal code', 'zip code', 'post code', 'postal', 'zip/postal', 'postcode'] },
];

// Experience is the main event. Generous patterns to work across portals.
const EXPERIENCE_LABELS = [
  { key: 'company-name',   patterns: ['company', 'employer', 'organization', 'company name', 'employer name', 'business name', 'company/organization', 'workplace', 'business'] },
  { key: 'description',    patterns: ['description', 'role description', 'responsibilities', 'duties', 'summary', 'accomplishments', 'what did you do', 'tell us about', 'work description', 'job description', 'details', 'work summary', 'briefly describe'] },
  { key: 'title',          patterns: ['title', 'job title', 'position', 'role', 'designation', 'job role', 'position/title', 'your title', 'position title', 'occupation'] },
  { key: 'start-date',     patterns: ['start date', 'from date', 'date from', 'start', 'from', 'began', 'begin', 'employment from', 'start/from', 'date started', 'employment start'] },
  { key: 'end-date',       patterns: ['end date', 'to date', 'date to', 'end', 'through', 'until', 'finish', 'employment to', 'end/to', 'date ended', 'employment end', 'left'] },
  { key: 'city',           patterns: ['city', 'town', 'location city', 'job city', 'work city', 'location'] },
  { key: 'state/province', patterns: ['state', 'province', 'state/province', 'region'] },
  { key: 'country',        patterns: ['country'] },
];

const EDUCATION_LABELS = [
  { key: 'institution',    patterns: ['school', 'institution', 'university', 'college', 'academy', 'school name', 'institution name', 'school/institution', 'educational institution'] },
  { key: 'degree',         patterns: ['degree', 'qualification', 'award', 'credential', 'degree type', 'level of education', 'degree level', 'type of degree'] },
  { key: 'major',          patterns: ['major', 'field of study', 'area of study', 'concentration', 'subject', 'discipline', 'program', 'course', 'specialization', 'study field'] },
  { key: 'country',        patterns: ['country'] },
  { key: 'state/province', patterns: ['state', 'province', 'state/province', 'region'] },
  { key: 'city',           patterns: ['city', 'town'] },
  { key: 'graduated',      patterns: ['graduation date', 'graduated', 'graduation', 'completion date', 'date graduated', 'year graduated', 'year of graduation', 'end date', 'date completed'] },
];

// Specific link label patterns (ordered: most specific first)
const LINK_LABEL_MAP = [
  { key: 'linkedin',  patterns: ['linkedin', 'linked in', 'linkedin url', 'linkedin profile'] },
  { key: 'github',    patterns: ['github', 'git hub', 'github url', 'github profile'] },
  { key: 'portfolio', patterns: ['portfolio', 'personal site', 'personal website', 'portfolio url', 'personal portfolio'] },
];

// Generic link fallback labels
const GENERIC_LINK_PATTERNS = ['website', 'url', 'web address', 'web site', 'link', 'other url', 'other website', 'additional link'];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Returns true if an object has at least one non-empty string value */
function hasContent(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return Object.values(obj).some(v => typeof v === 'string' && v.trim() !== '');
}

// Month name lookup tables
const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Parse a date string into { month (zero-padded string), monthNum (int), year (string) }.
 * Accepts: "01/2022", "2022-01", "January 2022", "2022", "present", etc.
 */
function parseDate(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();

  // "present", "current", "now"
  if (/^(present|current|now|ongoing)$/i.test(s)) return { raw: s, present: true };

  // MM/YYYY or MM-YYYY
  const m1 = s.match(/^(\d{1,2})[/\-](\d{4})$/);
  if (m1) return { month: m1[1].padStart(2,'0'), monthNum: parseInt(m1[1]), year: m1[2] };

  // YYYY/MM or YYYY-MM
  const m2 = s.match(/^(\d{4})[/\-](\d{1,2})$/);
  if (m2) return { month: m2[2].padStart(2,'0'), monthNum: parseInt(m2[2]), year: m2[1] };

  // "January 2022" or "Jan 2022"
  const m3 = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (m3) {
    const full  = MONTHS_FULL.findIndex(m => m.toLowerCase().startsWith(m3[1].toLowerCase()));
    const short = MONTHS_SHORT.findIndex(m => m.toLowerCase() === m3[1].toLowerCase().slice(0,3));
    const idx   = full >= 0 ? full : short;
    if (idx >= 0) return { month: String(idx + 1).padStart(2,'0'), monthNum: idx + 1, year: m3[2] };
  }

  // YYYY only (e.g. for graduation year)
  const m4 = s.match(/^(\d{4})$/);
  if (m4) return { year: m4[1] };

  return { raw: s };
}

/** Is this SELECT a month picker? Check if options contain month names or 1-12 */
function isMonthSelect(el) {
  if (el.tagName !== 'SELECT') return false;
  const texts  = Array.from(el.options).map(o => o.text.trim().toLowerCase());
  const values = Array.from(el.options).map(o => o.value.trim());
  const hasMName = texts.some(t => MONTHS_FULL.some(m => t.includes(m.toLowerCase())));
  const hasMonthNums = values.filter(v => /^\d{1,2}$/.test(v)).length >= 6;
  return hasMName || hasMonthNums;
}

/** Is this SELECT a year picker? Check if options look like years */
function isYearSelect(el) {
  if (el.tagName !== 'SELECT') return false;
  const values = Array.from(el.options).map(o => o.value.trim());
  return values.filter(v => /^(19|20)\d{2}$/.test(v)).length >= 3;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELEMENT FILLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fill a text input or textarea. Fires both execCommand (Angular-friendly)
 * and native-value-setter (React-friendly) to maximise portal compatibility.
 */
function fillInput(el, value) {
  if (!el || !value) return false;
  const tag  = el.tagName;
  const type = (el.getAttribute('type') || '').toLowerCase();

  if (['hidden','file','submit','button','checkbox','radio','image'].includes(type)) return false;
  if (el.disabled || el.readOnly) return false;
  if (tag !== 'INPUT' && tag !== 'TEXTAREA') return false;

  try {
    el.focus();

    // Strategy 1: execCommand (works well for Angular / Workday)
    if (typeof document.execCommand === 'function') {
      el.select?.();
      if (document.execCommand('selectAll', false, null)) {
        document.execCommand('insertText', false, value);
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.blur();
        return true;
      }
    }

    // Strategy 2: Native value setter (React)
    const proto  = tag === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value);
    else el.value = value;

    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
    return true;
  } catch {
    return false;
  }
}

/**
 * Fill a SELECT element using fuzzy text/value matching.
 * For date selects, pass a parsed date object and type ('month'|'year').
 */
function fillSelect(el, value) {
  if (!el || !value || el.tagName !== 'SELECT') return false;
  const lower = String(value).toLowerCase().trim();
  const opts  = Array.from(el.options);

  let opt =
    opts.find(o => o.value.toLowerCase() === lower) ||
    opts.find(o => o.text.trim().toLowerCase() === lower) ||
    opts.find(o => o.text.trim().toLowerCase().startsWith(lower)) ||
    opts.find(o => lower.startsWith(o.text.trim().toLowerCase()) && o.text.trim().length > 1) ||
    opts.find(o => o.text.trim().toLowerCase().includes(lower));

  if (opt) {
    el.value = opt.value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    return true;
  }
  return false;
}

function fillDateSelect(el, parsed, type) {
  if (!parsed || el.tagName !== 'SELECT') return false;
  const opts = Array.from(el.options);
  let target;

  if (type === 'year' && parsed.year) {
    target = opts.find(o => o.value.trim() === parsed.year || o.text.trim() === parsed.year);
  } else if (type === 'month' && parsed.monthNum) {
    const n = parsed.monthNum;
    target = opts.find(o =>
      parseInt(o.value) === n ||
      o.value.trim() === String(n).padStart(2,'0') ||
      o.text.trim().toLowerCase() === MONTHS_FULL[n-1].toLowerCase() ||
      o.text.trim().toLowerCase() === MONTHS_SHORT[n-1].toLowerCase()
    );
  }

  if (target) {
    el.value = target.value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
}

/** Fill a contenteditable rich-text editor (used by Workday descriptions). */
function fillContentEditable(el, value) {
  if (!el || !value) return false;
  try {
    el.focus();
    el.innerHTML = '';
    document.execCommand('insertText', false, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Dispatch the right filler for a given element + schema key.
 * Handles date selects, year-only, plain text, contenteditable.
 */
function fillElementForKey(el, key, value) {
  if (!value?.trim()) return false;

  const isDateKey = ['start-date','end-date','graduated'].includes(key);

  if (el.tagName === 'SELECT') {
    if (isDateKey) {
      const parsed = parseDate(value);
      if (parsed) {
        if (isMonthSelect(el)) return fillDateSelect(el, parsed, 'month');
        if (isYearSelect(el))  return fillDateSelect(el, parsed, 'year');
      }
    }
    return fillSelect(el, value);
  }

  if (el.getAttribute('type') === 'date' && isDateKey) {
    const p = parseDate(value);
    if (p?.year && p?.month) return fillInput(el, `${p.year}-${p.month}-01`);
  }

  return fillInput(el, value);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LABEL READING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find the human-readable label for a form element.
 * Tries aria, explicit labels, ancestors, siblings, placeholder, name.
 */
function getLabelText(el) {
  // 1. aria-label
  const al = el.getAttribute('aria-label');
  if (al?.trim()) return al.trim();

  // 2. aria-labelledby
  const alby = el.getAttribute('aria-labelledby');
  if (alby) {
    const text = alby.split(/\s+/)
      .map(id => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean).join(' ');
    if (text) return text;
  }

  // 3. <label for="id">
  if (el.id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (lbl?.textContent?.trim()) return lbl.textContent.trim();
  }

  // 4. Ancestor <label>
  const anc = el.closest('label');
  if (anc) {
    const clone = anc.cloneNode(true);
    clone.querySelectorAll('input,textarea,select,button').forEach(n => n.remove());
    const t = clone.textContent.trim();
    if (t) return t;
  }

  // 5. Walk up to find a label-like sibling or child (up to 4 levels)
  let node = el.parentElement;
  for (let d = 0; d < 4 && node && node !== document.body; d++, node = node.parentElement) {
    // Look for explicit label elements inside this ancestor
    for (const sel of ['label', '[class*="label" i]', '[class*="Label"]', 'legend', '[class*="title" i]']) {
      const found = Array.from(node.querySelectorAll(sel))
        .find(e => !e.contains(el) && e.textContent.trim().length > 0 && e.textContent.trim().length < 100);
      if (found) return found.textContent.trim();
    }

    // Previous sibling text
    let prev = el.previousElementSibling;
    while (prev) {
      const t = prev.textContent.trim();
      if (t && t.length > 0 && t.length < 80 && !prev.querySelector('input,select,textarea')) return t;
      prev = prev.previousElementSibling;
    }
  }

  // 6. data-automation-id (Workday) — humanise
  const aid = el.getAttribute('data-automation-id') ||
    el.closest('[data-automation-id]')?.getAttribute('data-automation-id');
  if (aid) return aid.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').trim();

  // 7. placeholder / name
  if (el.placeholder?.trim()) return el.placeholder.trim();
  if (el.name?.trim())        return el.name.replace(/[_\-[\]]/g, ' ').trim();

  return '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// LABEL MATCHING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Match a label string against a label map.
 * Returns the schema key, or null if no match.
 */
function matchLabel(rawLabel, labelMap) {
  if (!rawLabel) return null;
  // Strip trailing asterisks, colons, bullets; collapse whitespace
  const label = rawLabel.toLowerCase()
    .replace(/[*:•()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!label || label.length < 2) return null;

  for (const { key, patterns } of labelMap) {
    for (const p of patterns) {
      if (label === p) return key;                               // exact
      if (label.includes(p)) return key;                        // label contains pattern

      // Pattern contains label (e.g. label="first", pattern="first name")
      // Require label >= 4 chars to avoid matching 'to', 'at', etc.
      if (p.includes(label) && label.length >= 4) return key;

      // Short patterns (< 4 chars): require word boundary
      if (p.length < 4) {
        const re = new RegExp(`(^|\\s)${p}(\\s|$)`);
        if (re.test(label)) return key;
      }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK DETECTION
// Experience and education portals show repeating "blocks" — one per job/degree.
// We detect blocks by finding inputs whose labels match an "anchor" pattern
// (e.g. "company name"), then finding the minimal DOM container around each one.
// ═══════════════════════════════════════════════════════════════════════════════

function allFormEls(root = document) {
  return Array.from(root.querySelectorAll(
    'input:not([type=hidden]):not([type=file]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]):not([type=image]), textarea, select'
  )).filter(el => !el.disabled && !el.readOnly);
}

/**
 * Find the tightest ancestor of `anchor` that contains at least `minInputs`
 * form elements but no more than `maxInputs` (avoids grabbing the whole form).
 */
function findMinimalBlock(anchor, minInputs = 3, maxInputs = 25) {
  let node = anchor.parentElement;
  while (node && node !== document.documentElement) {
    const n = node.querySelectorAll('input:not([type=hidden]), textarea, select').length;
    if (n >= minInputs && n <= maxInputs) return node;
    if (n > maxInputs) break; // gone too far up
    node = node.parentElement;
  }

  // Fallback: first ancestor with >= 2 inputs
  node = anchor.parentElement;
  while (node && node !== document.documentElement) {
    if (node.querySelectorAll('input:not([type=hidden]), textarea, select').length >= 2) return node;
    node = node.parentElement;
  }
  return anchor.parentElement;
}

/**
 * Find repeating block containers on the page whose anchor field labels match
 * the given patterns (e.g. 'company', 'employer' for experience blocks).
 * Returns deduplicated array of container elements.
 */
function findRepeatingBlocks(anchorPatterns) {
  const anchors = allFormEls().filter(el => {
    const label = getLabelText(el).toLowerCase();
    return anchorPatterns.some(p => label.includes(p));
  });

  const seen   = new Set();
  const blocks = [];

  for (const anchor of anchors) {
    const block = findMinimalBlock(anchor);
    if (block && !seen.has(block)) {
      seen.add(block);
      blocks.push(block);
    }
  }

  return blocks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD ENTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Try to click an "Add experience / Add education" button.
 * Scores candidates by how well their text matches the keywords.
 */
async function tryAddEntry(keywords) {
  const candidates = Array.from(document.querySelectorAll(
    'button, a, [role="button"], input[type="button"]'
  )).filter(el => {
    // Must be visible
    const rect = el.getBoundingClientRect();
    return el.offsetParent !== null || (rect.width > 0 && rect.height > 0);
  });

  const kwLower = keywords.map(k => k.toLowerCase());

  const scored = candidates.map(el => {
    const text = el.textContent.trim().toLowerCase();
    const hasAdd = /\badd\b/.test(text) || text.startsWith('+') || text === '+';
    const hasKw  = kwLower.some(k => text.includes(k));
    return { el, score: (hasAdd ? 2 : 0) + (hasKw ? 3 : 0) };
  }).filter(s => s.score >= 2);

  scored.sort((a, b) => b.score - a.score);

  // Prefer specific matches (score 5) over generic "Add" buttons (score 2)
  const best = scored.find(s => s.score >= 5) || scored[0];
  if (!best) return false;

  best.el.click();
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK FILLER
// Fills all form elements within a container using the provided label map.
// ═══════════════════════════════════════════════════════════════════════════════

function fillBlock(container, data, labelMap) {
  let filled = 0;

  // Fill standard inputs, textareas, selects
  for (const el of allFormEls(container)) {
    const label = getLabelText(el);
    const key   = matchLabel(label, labelMap);
    if (!key) continue;

    const value = data[key];
    if (!value?.trim()) continue;

    if (fillElementForKey(el, key, value)) filled++;
  }

  // Fill contenteditable rich-text editors (e.g. Workday description fields)
  const richEditors = Array.from(container.querySelectorAll('[contenteditable="true"]'));
  for (const editor of richEditors) {
    if (editor.parentElement?.contentEditable === 'true') continue; // nested editor
    const label = getLabelText(editor);
    const key   = matchLabel(label, labelMap);
    if (!key) continue;
    const value = data[key];
    if (!value?.trim()) continue;
    if (fillContentEditable(editor, value)) filled++;
  }

  return filled;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION FILLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fill personal information fields (document-wide, excluding experience/education blocks).
 */
function fillPersonal(resume) {
  const data = resume['personal-information'];
  if (!data || !hasContent(data)) return 0;

  // Get experience/education blocks to exclude from personal info scanning
  const expBlocks = findRepeatingBlocks(['company', 'employer', 'organization']);
  const eduBlocks = findRepeatingBlocks(['school', 'institution', 'university', 'college']);
  const excluded  = new Set([...expBlocks, ...eduBlocks]);

  let filled = 0;

  for (const el of allFormEls()) {
    // Skip if inside an experience or education block
    if ([...excluded].some(c => c.contains(el))) continue;

    const label = getLabelText(el);
    const key   = matchLabel(label, PERSONAL_LABELS);
    if (!key) continue;

    const value = data[key];
    if (!value?.trim()) continue;

    if (fillElementForKey(el, key, value)) filled++;
  }

  return filled;
}

/**
 * THE MAIN FUNCTION.
 * Fill a list of repeating entries (experiences or education).
 * For each item beyond what's already on the page, clicks "Add" to create a new block.
 */
async function fillRepeatingSection(items, labelMap, anchorPatterns, addKeywords) {
  const validItems = items.filter(item => hasContent(item));
  if (!validItems.length) return 0;

  let totalFilled   = 0;
  const usedBlocks  = new Set();

  for (let i = 0; i < validItems.length; i++) {
    // Find all current blocks on the page
    let blocks = findRepeatingBlocks(anchorPatterns);
    let block  = blocks.find(b => !usedBlocks.has(b));

    if (!block) {
      // No unused block available — try to add one
      const added = await tryAddEntry(addKeywords);
      if (added) {
        await sleep(700); // wait for DOM update
        blocks = findRepeatingBlocks(anchorPatterns);
        block  = blocks.find(b => !usedBlocks.has(b));
      }
    }

    if (block) {
      const count = fillBlock(block, validItems[i], labelMap);
      usedBlocks.add(block);
      if (count > 0) totalFilled++;
    } else {
      console.log(`[Resume Tool] No block found for entry ${i} — stopping`);
      break;
    }
  }

  return totalFilled;
}

/**
 * Fill link fields with smart fallback:
 * 1. Try to match LinkedIn/GitHub/portfolio to their specific labelled fields.
 * 2. Fill remaining links into generic "website / url" fields.
 * 3. If a link has no specific field and there's only a generic slot, use that.
 */
function fillLinks(resume) {
  const links = resume['links'] || {};
  if (!Object.values(links).some(v => v && (typeof v === 'string' ? v.trim() : v.length))) return 0;

  let filled    = 0;
  const usedEls = new Set();
  const usedVals = new Set();

  // All url/text inputs on the page
  const urlInputs = Array.from(document.querySelectorAll(
    'input[type="url"], input[type="text"], input:not([type])'
  )).filter(el => !el.disabled && !el.readOnly);

  // Pass 1: specific link labels
  for (const { key, patterns } of LINK_LABEL_MAP) {
    const value = links[key];
    if (!value?.trim()) continue;

    const match = urlInputs.find(el => {
      if (usedEls.has(el)) return false;
      const label = getLabelText(el).toLowerCase();
      return patterns.some(p => label.includes(p));
    });

    if (match && fillInput(match, value)) {
      usedEls.add(match);
      usedVals.add(value);
      filled++;
    }
  }

  // Pass 2: generic "website / url / link" fields for unmatched links
  const allLinkValues = [
    links['linkedin'], links['github'], links['portfolio'],
    ...(links['other'] || [])
  ].filter(v => v?.trim() && !usedVals.has(v));

  const genericInputs = urlInputs.filter(el => {
    if (usedEls.has(el)) return false;
    const label = getLabelText(el).toLowerCase();
    return GENERIC_LINK_PATTERNS.some(p => label.includes(p));
  });

  for (let i = 0; i < Math.min(allLinkValues.length, genericInputs.length); i++) {
    if (fillInput(genericInputs[i], allLinkValues[i])) {
      usedEls.add(genericInputs[i]);
      filled++;
    }
  }

  return filled;
}

/**
 * Fill a skills text field if one exists.
 * Joins skills as comma-separated text. Does not attempt tag-input UIs
 * (those are too portal-specific to automate reliably).
 */
function fillSkills(resume) {
  // Support both 'skills' and the typo 'skils' from some older schemas
  const rawSkills = resume['skills'] || resume['skils'];
  if (!Array.isArray(rawSkills) || !rawSkills.length) return 0;

  const text = rawSkills.filter(Boolean).join(', ');

  const skillsEl = allFormEls().find(el => {
    const label = getLabelText(el).toLowerCase();
    return /\bskills?\b|\btechnical skills?\b|\bcompetenc/.test(label);
  });

  return (skillsEl && fillInput(skillsEl, text)) ? 1 : 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATION
// ═══════════════════════════════════════════════════════════════════════════════

async function fillAll(resume) {
  // 1. Work experience (the main reason this tool exists)
  const expItems = (resume['experience'] || []).filter(hasContent);
  const expFilled = await fillRepeatingSection(
    expItems,
    EXPERIENCE_LABELS,
    ['company', 'employer', 'organization'],
    ['experience', 'employment', 'work history', 'position', 'job']
  );

  // 2. Education
  const eduItems = (resume['education'] || []).filter(hasContent);
  const eduFilled = await fillRepeatingSection(
    eduItems,
    EDUCATION_LABELS,
    ['school', 'institution', 'university', 'college'],
    ['education', 'school', 'degree', 'academic', 'qualification']
  );

  // 3. Personal information (after experience/education so we can exclude those blocks)
  const personalFilled = fillPersonal(resume);

  // 4. Links
  const linksFilled = fillLinks(resume);

  // 5. Skills
  const skillsFilled = fillSkills(resume);

  const totalFilled = personalFilled + linksFilled + skillsFilled;

  return {
    success:     true,
    filled:      totalFilled,
    experiences: expFilled,
    education:   eduFilled,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE LISTENER
// ═══════════════════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== 'fillForm') return false;

  fillAll(message.resume)
    .then(result  => sendResponse(result))
    .catch(err    => sendResponse({ success: false, error: err.message }));

  return true; // keep message channel open for async response
});

console.log('[Resume Tool] Filler ready');