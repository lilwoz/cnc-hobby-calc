'use strict';

/**
 * Material presets tuned for hobby 3018-class machines (conservative vs industrial).
 * vc: cutting speed m/min, chipLoad: mm/tooth per flute count key
 */
const MATERIALS = {
  aluminum: {
    name: 'Aluminum (6061)',
    note: 'Cuts well on a 3018 with coolant or air blast and a 2-flute end mill.',
    vc: { carbide: 80, hss: 50 },
    chipLoad: { 1: 0.025, 2: 0.022, 3: 0.018, 4: 0.015 },
    maxDocRatio: 0.5,
    plungeRatio: 0.4,
    warnings: [],
  },
  brass: {
    name: 'Brass',
    note: 'Easier than aluminum; watch spindle load and heat.',
    vc: { carbide: 70, hss: 45 },
    chipLoad: { 1: 0.02, 2: 0.018, 3: 0.015, 4: 0.012 },
    maxDocRatio: 0.4,
    plungeRatio: 0.35,
    warnings: [],
  },
  softwood: {
    name: 'Softwood (pine, plywood)',
    note: 'Can run more aggressively; use dust collection.',
    vc: { carbide: 150, hss: 100 },
    chipLoad: { 1: 0.12, 2: 0.1, 3: 0.08, 4: 0.06 },
    maxDocRatio: 1.0,
    plungeRatio: 0.6,
    warnings: [],
  },
  hardwood: {
    name: 'Hardwood (oak, maple)',
    note: 'Reduce stepdown per pass; keep the tool sharp.',
    vc: { carbide: 100, hss: 70 },
    chipLoad: { 1: 0.07, 2: 0.055, 3: 0.045, 4: 0.035 },
    maxDocRatio: 0.5,
    plungeRatio: 0.5,
    warnings: [],
  },
  mdf: {
    name: 'MDF / particle board',
    note: 'Dust collection required; dulls cutters quickly.',
    vc: { carbide: 100, hss: 70 },
    chipLoad: { 1: 0.1, 2: 0.08, 3: 0.065, 4: 0.05 },
    maxDocRatio: 0.8,
    plungeRatio: 0.55,
    warnings: [],
  },
  acrylic: {
    name: 'Acrylic (PMMA)',
    note: 'Keep feed moderate and use air blast to avoid melting. Single-flute often works best.',
    vc: { carbide: 60, hss: 40 },
    chipLoad: { 1: 0.04, 2: 0.03, 3: 0.025, 4: 0.02 },
    maxDocRatio: 0.3,
    plungeRatio: 0.3,
    warnings: ['info'],
  },
  abs: {
    name: 'ABS / PLA plastic',
    note: 'Keep heat low; air blast is recommended for PLA.',
    vc: { carbide: 55, hss: 35 },
    chipLoad: { 1: 0.035, 2: 0.028, 3: 0.022, 4: 0.018 },
    maxDocRatio: 0.35,
    plungeRatio: 0.35,
    warnings: [],
  },
  delrin: {
    name: 'Delrin / POM',
    note: 'Machines easily; deburr edges if needed.',
    vc: { carbide: 80, hss: 55 },
    chipLoad: { 1: 0.05, 2: 0.04, 3: 0.032, 4: 0.025 },
    maxDocRatio: 0.5,
    plungeRatio: 0.45,
    warnings: [],
  },
  fr4: {
    name: 'FR4 (PCB)',
    note: 'Use a PCB end mill and vacuum — FR4 dust is abrasive.',
    vc: { carbide: 50, hss: 30 },
    chipLoad: { 1: 0.015, 2: 0.012, 3: 0.01, 4: 0.008 },
    maxDocRatio: 0.15,
    plungeRatio: 0.25,
    warnings: ['info'],
  },
  steel: {
    name: 'Mild steel',
    note: 'A 3018 is not built for steel. Micro passes only, if you must.',
    vc: { carbide: 20, hss: 12 },
    chipLoad: { 1: 0.01, 2: 0.008, 3: 0.006, 4: 0.005 },
    maxDocRatio: 0.1,
    plungeRatio: 0.2,
    warnings: ['danger'],
  },
};

const MIN_RPM = 3000;
const SETTINGS_VERSION = 1;

const $ = (id) => document.getElementById(id);

const els = {
  material: $('material'),
  materialNote: $('material-note'),
  toolDiameter: $('tool-diameter'),
  flutes: $('flutes'),
  toolType: $('tool-type'),
  depthOfCut: $('depth-of-cut'),
  stepover: $('stepover'),
  conservatism: $('conservatism'),
  conservatismValue: $('conservatism-value'),
  cuttingSpeed: $('cutting-speed'),
  chipLoad: $('chip-load'),
  maxRpm: $('max-rpm'),
  maxFeed: $('max-feed'),
  plungeRatio: $('plunge-ratio'),
  toggleAdvanced: $('toggle-advanced'),
  advancedPanel: $('advanced-panel'),
  resultRpm: $('result-rpm'),
  resultFeed: $('result-feed'),
  resultPlunge: $('result-plunge'),
  resultVc: $('result-vc'),
  resultFz: $('result-fz'),
  resultMrr: $('result-mrr'),
  engagementNote: $('engagement-note'),
  warnings: $('warnings'),
  presetName: $('preset-name'),
  downloadSettings: $('download-settings'),
  loadSettingsBtn: $('load-settings-btn'),
  loadSettingsFile: $('load-settings-file'),
  presetStatus: $('preset-status'),
};

let manualVc = false;
let manualFz = false;

function initMaterialSelect() {
  for (const [key, mat] of Object.entries(MATERIALS)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = mat.name;
    els.material.appendChild(opt);
  }
}

function getMaterial() {
  return MATERIALS[els.material.value];
}

function getFluteCount() {
  return parseInt(els.flutes.value, 10);
}

function getConservatismFactor() {
  return parseInt(els.conservatism.value, 10) / 100;
}

function nearestChipLoadKey(flutes) {
  if (flutes <= 1) return 1;
  if (flutes >= 4) return 4;
  return flutes;
}

function autoFillAdvanced() {
  const mat = getMaterial();
  const flutes = getFluteCount();
  const toolType = els.toolType.value;
  const factor = getConservatismFactor();
  const chipKey = nearestChipLoadKey(flutes);

  if (!manualVc) {
    els.cuttingSpeed.value = Math.round(mat.vc[toolType] * factor);
  }
  if (!manualFz) {
    els.chipLoad.value = round3(mat.chipLoad[chipKey] * factor);
  }
  if (!els.plungeRatio.dataset.manual) {
    els.plungeRatio.value = mat.plungeRatio;
  }
}

function round0(n) {
  return Math.round(n);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

/**
 * Scale base chip load for radial (ae) and axial (ap) engagement.
 * RPM is mostly unchanged by depth; feed must drop on heavy cuts.
 */
function engagementFactors(D, ap, ae) {
  const rd = Math.min(Math.max(ae / D, 0.01), 1);
  const ad = Math.max(ap / D, 0);

  let radialFactor;
  if (rd >= 0.75) {
    radialFactor = 0.55;
  } else if (rd >= 0.45) {
    radialFactor = 0.55 + ((0.75 - rd) / 0.3) * 0.4;
  } else if (rd >= 0.15) {
    radialFactor = 1.0;
  } else {
    radialFactor = Math.min(1.35, Math.sqrt(0.25 / rd));
  }

  let axialFactor;
  if (ad <= 0.25) {
    axialFactor = 1.0;
  } else if (ad <= 0.5) {
    axialFactor = 1.0 - ((ad - 0.25) / 0.25) * 0.15;
  } else if (ad <= 1.0) {
    axialFactor = 0.85 - ((ad - 0.5) / 0.5) * 0.25;
  } else {
    axialFactor = Math.max(0.45, 0.6 - (ad - 1.0) * 0.15);
  }

  return {
    rd,
    ad,
    radialFactor: round3(radialFactor),
    axialFactor: round3(axialFactor),
    combined: round3(radialFactor * axialFactor),
  };
}

function renderEngagementNote(fzBase, fzAdj, eng) {
  const pctRd = round0(eng.rd * 100);
  const pctAd = round0(eng.ad * 100);
  els.engagementNote.hidden = false;
  els.engagementNote.innerHTML = `
    <strong>Feed adjusted for engagement</strong>
    Base fz ${round3(fzBase)} → adjusted <strong>${round3(fzAdj)} mm/tooth</strong>
    <div class="engagement-note__factors">
      <span>Radial ${pctRd}% ae/D ×${eng.radialFactor}</span>
      <span>Axial ${pctAd}% ap/D ×${eng.axialFactor}</span>
      <span>Combined ×${eng.combined}</span>
    </div>`;
}

function collectSettings() {
  return {
    version: SETTINGS_VERSION,
    name: els.presetName.value.trim(),
    savedAt: new Date().toISOString(),
    params: {
      material: els.material.value,
      toolDiameter: parseFloat(els.toolDiameter.value),
      flutes: getFluteCount(),
      toolType: els.toolType.value,
      depthOfCut: parseFloat(els.depthOfCut.value),
      stepover: parseFloat(els.stepover.value),
      conservatism: parseInt(els.conservatism.value, 10),
      cuttingSpeed: parseFloat(els.cuttingSpeed.value),
      chipLoad: parseFloat(els.chipLoad.value),
      maxRpm: parseFloat(els.maxRpm.value),
      maxFeed: parseFloat(els.maxFeed.value),
      plungeRatio: parseFloat(els.plungeRatio.value),
    },
    flags: {
      manualVc,
      manualFz,
      stepoverManual: Boolean(els.stepover.dataset.manual),
      plungeRatioManual: Boolean(els.plungeRatio.dataset.manual),
    },
  };
}

function sanitizeFilename(name) {
  const base = (name || 'cnc-hobby-calc-settings')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60);
  return base || 'cnc-hobby-calc-settings';
}

function showPresetStatus(message, isError = false) {
  els.presetStatus.textContent = message;
  els.presetStatus.classList.toggle('preset-status--error', isError);
  if (!isError) {
    setTimeout(() => {
      if (els.presetStatus.textContent === message) {
        els.presetStatus.textContent = '';
      }
    }, 3000);
  }
}

function downloadSettings() {
  const settings = collectSettings();
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(settings.name)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showPresetStatus('Settings downloaded.');
}

function validateSettings(data) {
  if (!data || typeof data !== 'object') return 'Invalid file format.';
  if (!data.params || typeof data.params !== 'object') return 'Missing params section.';

  const { params } = data;
  if (!MATERIALS[params.material]) return `Unknown material: ${params.material}`;
  if (!(params.toolDiameter > 0)) return 'Invalid tool diameter.';
  if (![1, 2, 3, 4].includes(params.flutes)) return 'Invalid flute count.';
  if (!['carbide', 'hss'].includes(params.toolType)) return 'Invalid tool material.';

  return null;
}

function applySettings(data) {
  const error = validateSettings(data);
  if (error) {
    showPresetStatus(error, true);
    return false;
  }

  const { params, flags = {} } = data;

  els.material.value = params.material;
  els.toolDiameter.value = params.toolDiameter;
  els.flutes.value = String(params.flutes);
  els.toolType.value = params.toolType;
  els.depthOfCut.value = params.depthOfCut;
  els.stepover.value = params.stepover;
  els.conservatism.value = params.conservatism;
  els.conservatismValue.textContent = `${params.conservatism}%`;
  els.cuttingSpeed.value = params.cuttingSpeed;
  els.chipLoad.value = params.chipLoad;
  els.maxRpm.value = params.maxRpm;
  els.maxFeed.value = params.maxFeed;
  els.plungeRatio.value = params.plungeRatio;

  manualVc = Boolean(flags.manualVc);
  manualFz = Boolean(flags.manualFz);

  if (flags.stepoverManual) {
    els.stepover.dataset.manual = '1';
  } else {
    delete els.stepover.dataset.manual;
  }

  if (flags.plungeRatioManual) {
    els.plungeRatio.dataset.manual = '1';
  } else {
    delete els.plungeRatio.dataset.manual;
  }

  els.presetName.value = typeof data.name === 'string' ? data.name : '';

  calculate();
  showPresetStatus('Settings loaded.');
  return true;
}

function loadSettingsFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      applySettings(data);
    } catch {
      showPresetStatus('Could not parse JSON file.', true);
    }
  };
  reader.onerror = () => showPresetStatus('Could not read file.', true);
  reader.readAsText(file);
}

function calculate() {
  autoFillAdvanced();

  const mat = getMaterial();
  const D = parseFloat(els.toolDiameter.value);
  const flutes = getFluteCount();
  const ap = parseFloat(els.depthOfCut.value);
  const ae = parseFloat(els.stepover.value);
  const vc = parseFloat(els.cuttingSpeed.value);
  const fzBase = parseFloat(els.chipLoad.value);
  const maxRpm = parseFloat(els.maxRpm.value);
  const maxFeed = parseFloat(els.maxFeed.value);
  const plungeRatio = parseFloat(els.plungeRatio.value);

  const warnings = [];

  if (!D || D <= 0) {
    showWarnings([{ type: 'danger', text: 'Enter a valid tool diameter.' }]);
    clearResults();
    return;
  }

  const eng = engagementFactors(D, ap, ae);
  const fzAdj = round3(fzBase * eng.combined);

  let rpmIdeal = (vc * 1000) / (Math.PI * D);
  let rpm = Math.min(rpmIdeal, maxRpm);
  const rpmClamped = rpmIdeal > maxRpm;

  if (rpm < MIN_RPM) {
    rpm = MIN_RPM;
    warnings.push({
      type: 'caution',
      text: `Spindle speed clamped to ${MIN_RPM} RPM minimum (775 motor is inefficient below this). Actual surface speed will be lower than target.`,
    });
  }

  if (rpmClamped) {
    warnings.push({
      type: 'caution',
      text: `Calculated ${round0(rpmIdeal)} RPM exceeds machine max (${maxRpm}). Using ${round0(rpm)} RPM — surface speed is reduced.`,
    });
  }

  const actualVc = (Math.PI * D * rpm) / 1000;

  let feed = rpm * flutes * fzAdj;
  const feedClamped = feed > maxFeed;
  if (feedClamped) {
    feed = maxFeed;
    warnings.push({
      type: 'caution',
      text: `Calculated cutting feed exceeds max (${maxFeed} mm/min). Clamped to ${round0(feed)} mm/min.`,
    });
  }

  if (eng.combined < 0.85) {
    warnings.push({
      type: 'info',
      text: `Heavy engagement (stepdown ${ap} mm, stepover ${ae} mm) — feed reduced to ×${eng.combined} of base chip load.`,
    });
  } else if (eng.combined > 1.05) {
    warnings.push({
      type: 'info',
      text: `Light stepover (${round1(ae)} mm, ${round0(eng.rd * 100)}% of diameter) — chip thinning allows slightly higher feed (×${eng.combined}).`,
    });
  }

  const plunge = feed * plungeRatio;

  const maxDoc = D * mat.maxDocRatio;
  if (ap > maxDoc) {
    warnings.push({
      type: 'caution',
      text: `Stepdown ${ap} mm is high for a Ø${D} mm tool in ${mat.name}. Try ap ≤ ${round1(maxDoc)} mm.`,
    });
  }

  if (ae > D * 0.5) {
    warnings.push({
      type: 'info',
      text: `Stepover ${ae} mm is above 50% of tool diameter. OK for roughing; reduce for finishing passes.`,
    });
  }

  for (const w of mat.warnings) {
    if (w === 'danger') {
      warnings.push({
        type: 'danger',
        text: 'Steel on a 3018-PROVER is strongly discouraged. High risk of broken tools and missed steps.',
      });
    } else if (w === 'info' && mat === MATERIALS.acrylic) {
      warnings.push({
        type: 'info',
        text: 'Acrylic: single-flute cutter, climb milling with care, and constant air blast.',
      });
    } else if (w === 'info' && mat === MATERIALS.fr4) {
      warnings.push({
        type: 'info',
        text: 'PCB: coated carbide or diamond tools; vacuum extraction is mandatory.',
      });
    }
  }

  const mrr = ae * ap * feed;

  els.resultRpm.textContent = round0(rpm);
  els.resultFeed.textContent = round0(feed);
  els.resultPlunge.textContent = round0(plunge);
  els.resultVc.textContent = round1(actualVc);
  els.resultFz.textContent = round3(fzAdj);
  els.resultMrr.textContent = round1(mrr);

  els.materialNote.textContent = mat.note;
  renderEngagementNote(fzBase, fzAdj, eng);
  showWarnings(warnings);
}

function showWarnings(items) {
  els.warnings.innerHTML = '';
  for (const w of items) {
    const div = document.createElement('div');
    div.className = `warning warning--${w.type}`;
    div.textContent = w.text;
    els.warnings.appendChild(div);
  }
}

function clearResults() {
  for (const key of ['resultRpm', 'resultFeed', 'resultPlunge', 'resultVc', 'resultFz', 'resultMrr']) {
    els[key].textContent = '—';
  }
  els.engagementNote.hidden = true;
  els.engagementNote.innerHTML = '';
}

function syncStepoverDefault() {
  const D = parseFloat(els.toolDiameter.value);
  if (D > 0 && !els.stepover.dataset.manual) {
    els.stepover.value = round1(D * 0.4);
  }
}

function bindEvents() {
  const recalc = () => calculate();

  for (const el of [
    els.material, els.toolDiameter, els.flutes, els.toolType,
    els.depthOfCut, els.stepover, els.conservatism,
    els.cuttingSpeed, els.chipLoad, els.maxRpm, els.maxFeed, els.plungeRatio,
  ]) {
    el.addEventListener('input', recalc);
    el.addEventListener('change', recalc);
  }

  els.conservatism.addEventListener('input', () => {
    els.conservatismValue.textContent = `${els.conservatism.value}%`;
    manualVc = false;
    manualFz = false;
  });

  els.material.addEventListener('change', () => {
    manualVc = false;
    manualFz = false;
    els.plungeRatio.dataset.manual = '';
  });

  els.cuttingSpeed.addEventListener('input', () => {
    manualVc = true;
  });

  els.chipLoad.addEventListener('input', () => {
    manualFz = true;
  });

  els.plungeRatio.addEventListener('input', () => {
    els.plungeRatio.dataset.manual = '1';
  });

  els.stepover.addEventListener('input', () => {
    els.stepover.dataset.manual = '1';
  });

  els.toolDiameter.addEventListener('input', () => {
    syncStepoverDefault();
  });

  els.toggleAdvanced.addEventListener('click', () => {
    const expanded = els.toggleAdvanced.getAttribute('aria-expanded') === 'true';
    els.toggleAdvanced.setAttribute('aria-expanded', String(!expanded));
    els.advancedPanel.hidden = expanded;
    els.toggleAdvanced.textContent = expanded ? 'Advanced settings ▾' : 'Advanced settings ▴';
  });

  els.downloadSettings.addEventListener('click', downloadSettings);

  els.loadSettingsBtn.addEventListener('click', () => {
    els.loadSettingsFile.click();
  });

  els.loadSettingsFile.addEventListener('change', () => {
    const file = els.loadSettingsFile.files[0];
    if (file) loadSettingsFromFile(file);
    els.loadSettingsFile.value = '';
  });
}

function init() {
  initMaterialSelect();
  syncStepoverDefault();
  bindEvents();
  calculate();
}

init();
