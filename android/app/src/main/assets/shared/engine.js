/* ============================================================
   LabMat Suite v2.0 — Motor de cálculo compartido
   Todas las funciones son globales para usarse desde cualquier
   capítulo HTML.
   ============================================================ */

// ============ UTILIDADES ============
const $ = id => document.getElementById(id);
const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

function saveState(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.error('Error guardando:', e); return false; }
}
function loadState(key, def = null) {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : def; }
    catch (e) { return def; }
}
function safeDiv(n, d) {
    if (d === 0 || isNaN(n) || isNaN(d) || n === null || d === null) return 0;
    return n / d;
}
function convertToBase(value, unit) {
    if (value === '' || value === null || isNaN(value)) return 0;
    value = parseFloat(value);
    switch (unit) {
        case 'mm': case 'mm2': case 'mm²': return value;
        case 'cm': case 'cm2': case 'cm²': return value * 10;
        case 'm': case 'm2': case 'm²': return value * 1000;
        case 'in': case 'in2': return value * 25.4;
        case 'kN': return value * 1000;
        case 'kg': return value * 9.80665;
        case 'lb': return value * 4.44822;
        case 'Pa': return value / 1000000;
        case 'GPa': return value * 1000;
        case 'MPa': return value;
        case 'kg/cm2': case 'kg/cm²': return value * 0.0980665;
        case 'psi': return value * 0.00689476;
        case 'N.m': return value * 1000;
        case 'kN.m': return value * 1000000;
        default: return value;
    }
}
function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
}
function setSvg(containerId, viewBox, body, maxH) {
    const el = document.getElementById(containerId);
    if (!el) return false;
    el.innerHTML = `<svg viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block;max-height:${maxH || 320}px;">${body}</svg>`;
    return true;
}

// ============ TOAST ============
let _toastTimeout = null;
function showToast(message, isError = false, duration = 2000) {
    const el = $('saveIndicator');
    if (!el) { if (window.Android && Android.toast) Android.toast(message); return; }
    el.textContent = message;
    el.classList.toggle('error', isError);
    el.classList.add('show');
    clearTimeout(_toastTimeout);
    _toastTimeout = setTimeout(() => el.classList.remove('show'), duration);
}

// ============ CONSTANTES ============
const SIEVE_MM = {'3"':75,'2"':50,'1 1/2"':37.5,'1"':25,'3/4"':19,'1/2"':12.5,'3/8"':9.5,'No. 4':4.75,'No. 8':2.36,'No. 16':1.18,'No. 30':0.6,'No. 50':0.3,'No. 100':0.15,'No. 200':0.075,'Fondo':0.01};

const K_TEMP_TABLE = {15:1.0011,16:1.0007,17:1.0003,18:1.0000,19:0.9996,20:0.9993,21:0.9989,22:0.9985,23:0.9981,24:0.9977,25:0.9973,26:0.9969,27:0.9965,28:0.9961,29:0.9957,30:0.9953};
function getKFactor(T) {
    const keys = Object.keys(K_TEMP_TABLE).map(Number).sort((a, b) => a - b);
    const minT = keys[0], maxT = keys[keys.length - 1];
    if (T <= minT) return K_TEMP_TABLE[minT];
    if (T >= maxT) return K_TEMP_TABLE[maxT];
    for (let i = 0; i < keys.length - 1; i++) {
        const t1 = keys[i], t2 = keys[i + 1];
        if (T >= t1 && T <= t2) {
            const k1 = K_TEMP_TABLE[t1], k2 = K_TEMP_TABLE[t2];
            return k1 + (k2 - k1) * (T - t1) / (t2 - t1);
        }
    }
    return 1.0000;
}
const CBR_STD_254 = 6.90, CBR_STD_508 = 10.35;

// ============ NAVEGACIÓN DE HERRAMIENTAS ============
function showTool(toolId) {
    $$('.tool-view').forEach(v => v.classList.toggle('active', v.dataset.tool === toolId));
    const toolView = document.querySelector(`.tool-view[data-tool="${toolId}"]`);
    if (toolView) {
        const fnName = toolView.dataset.fn;
        if (fnName && typeof window[fnName] === 'function') {
            try { window[fnName]('prueba1'); } catch (e) { console.warn(e); }
        }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function showChapterMenu() {
    $$('.tool-view').forEach(v => v.classList.remove('active'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.onAndroidBack = function() {
    const openTool = document.querySelector('.tool-view.active');
    if (openTool) { showChapterMenu(); return true; }
    return false;
};

// ============ TABS INTERNAS ============
function initTabs(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const parent = container.closest('.card') || container.parentNode;
            parent.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            const t = document.getElementById(btn.dataset.tab);
            if (t) t.classList.add('active');
        });
    });
}
function duplicateTabContent(srcId, tgtId, prefix) {
    const src = $(srcId), tgt = $(tgtId);
    if (!src || !tgt) return;
    tgt.innerHTML = src.innerHTML;
    tgt.querySelectorAll('[id]').forEach(el => { el.id = el.id.replace(/_1(?=[a-z]?$|_)/g, '_' + prefix); });
    tgt.querySelectorAll('label[for]').forEach(el => { el.htmlFor = el.htmlFor.replace(/_1(?=[a-z]?$|_)/g, '_' + prefix); });
    tgt.querySelectorAll('.clear-btn').forEach(btn => {
        btn.textContent = btn.textContent.replace(/Prueba\s+1/, 'Prueba ' + prefix);
        btn.dataset.prueba = prefix;
    });
    tgt.querySelectorAll('.send-report-btn').forEach(btn => { btn.dataset.prueba = prefix; });
}

// ============ CAP 1 — GRANULOMETRÍA ============
function calcGranulometria(prueba) {
    const idx = prueba.slice(-1);
    const table = document.getElementById(`m2_gran_table_${idx}`);
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    const pesos = [];
    rows.forEach(r => pesos.push(parseFloat(r.querySelector('.m2_peso_retenido').value) || 0));
    const total = pesos.reduce((a, b) => a + b, 0);
    const stdSeries = ['3/8"','No. 4','No. 8','No. 16','No. 30','No. 50','No. 100'];
    let acum = 0, mfSum = 0, tm = null, tmn = null, tmnFound = false;
    rows.forEach((row, i) => {
        const tamiz = row.cells[0].textContent.trim();
        const ap = row.cells[1].textContent.trim();
        const pctRet = total > 0 ? (pesos[i] / total) * 100 : 0;
        acum += pctRet;
        const pctPasa = 100 - acum;
        row.cells[5].textContent = pctRet.toFixed(2);
        row.cells[6].textContent = acum.toFixed(2);
        row.cells[7].textContent = pctPasa.toFixed(2);
        if (stdSeries.includes(tamiz)) mfSum += acum;
        if (total > 0 && tamiz !== 'Fondo' && Math.abs(pctPasa - 100) < 0.005) tm = { tamiz, ap };
        if (!tmnFound && total > 0 && tamiz !== 'Fondo' && pctPasa >= 90 && pctPasa < 100) { tmn = { tamiz, ap }; tmnFound = true; }
    });
    const MF = mfSum / 100;
    const mfR = document.getElementById(`m2_mf_result_${idx}`);
    if (mfR) mfR.textContent = `Módulo de Finura = ${MF.toFixed(2)}`;
    const ptR = document.getElementById(`m2_peso_total_${idx}`);
    if (ptR) ptR.textContent = `${total.toFixed(1)} g`;
    const tmR = document.getElementById(`m2_tm_${idx}`);
    if (tmR) tmR.textContent = tm ? `${tm.tamiz} (${tm.ap} mm)` : 'No determinado';
    const tmnR = document.getElementById(`m2_tmn_${idx}`);
    if (tmnR) tmnR.textContent = tmn ? `${tmn.tamiz} (${tmn.ap} mm)` : 'No determinado';
    const estadoRet = {}, estadoVacio = {}, estadoMuestra = {};
    rows.forEach(row => {
        const t = row.cells[0].textContent.trim();
        estadoRet[t] = parseFloat(row.querySelector('.m2_peso_retenido').value) || 0;
        const v = row.querySelector('.m2_peso_vacio').value;
        const m = row.querySelector('.m2_peso_muestra').value;
        if (v !== '') estadoVacio[t] = v;
        if (m !== '') estadoMuestra[t] = m;
    });
    saveState(`m2_granulometria_${prueba}`, estadoRet);
    saveState(`m2_gran_vacio_${prueba}`, estadoVacio);
    saveState(`m2_gran_muestra_${prueba}`, estadoMuestra);
    drawGranulometriaChart(prueba);
}
function loadGranulometria(prueba) {
    const idx = prueba.slice(-1);
    const eR = loadState(`m2_granulometria_${prueba}`, {});
    const eV = loadState(`m2_gran_vacio_${prueba}`, {});
    const eM = loadState(`m2_gran_muestra_${prueba}`, {});
    const table = document.getElementById(`m2_gran_table_${idx}`);
    if (!table) return;
    table.querySelectorAll('tbody tr').forEach(row => {
        const t = row.cells[0].textContent.trim();
        row.querySelector('.m2_peso_retenido').value = eR.hasOwnProperty(t) ? eR[t] : '';
        row.querySelector('.m2_peso_vacio').value = eV.hasOwnProperty(t) ? eV[t] : '';
        row.querySelector('.m2_peso_muestra').value = eM.hasOwnProperty(t) ? eM[t] : '';
    });
    calcGranulometria(prueba);
}
function drawGranulometriaChart(prueba) {
    const idx = prueba.slice(-1);
    const container = document.getElementById(`viz_m2_gran_${idx}`);
    if (!container) return;
    const table = document.getElementById(`m2_gran_table_${idx}`);
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    const points = [];
    let hasData = false;
    rows.forEach(row => {
        const t = row.cells[0].textContent.trim();
        const p = parseFloat(row.querySelector('.m2_peso_retenido').value) || 0;
        if (p > 0) hasData = true;
        const pasa = parseFloat(row.cells[7].textContent) || 0;
        const mm = SIEVE_MM[t];
        if (mm !== undefined) points.push({ mm, pasa, tamiz: t });
    });
    if (!hasData) { container.innerHTML = '<div class="viz-empty">Ingresa pesos para ver la curva</div>'; return; }
    points.sort((a, b) => b.mm - a.mm);
    const W = 600, H = 340, mL = 55, mR = 20, mT = 22, mB = 60;
    const plotW = W - mL - mR, plotH = H - mT - mB;
    const logMin = Math.log10(0.01), logMax = Math.log10(100);
    const xPos = mm => mL + ((Math.log10(mm) - logMin) / (logMax - logMin)) * plotW;
    const yPos = p => mT + (1 - p / 100) * plotH;
    const cGrid = cssVar('--border','#e2e8f0'), cText = cssVar('--text-muted','#64748b');
    const cLine = cssVar('--secondary','#2563eb'), cPrimary = cssVar('--primary','#1e3a5f'), cCard = cssVar('--card','#fff');
    let body = '';
    for (let p = 0; p <= 100; p += 10) {
        const y = yPos(p);
        body += `<line x1="${mL}" y1="${y}" x2="${mL+plotW}" y2="${y}" stroke="${cGrid}" stroke-width="${p===0||p===100?1.5:.5}"/>`;
        body += `<text x="${mL-6}" y="${y+4}" text-anchor="end" font-size="10" fill="${cText}">${p}</text>`;
    }
    points.forEach(pt => {
        const x = xPos(pt.mm);
        body += `<line x1="${x}" y1="${mT}" x2="${x}" y2="${mT+plotH}" stroke="${cGrid}" stroke-width=".5"/>`;
        body += `<text x="${x}" y="${mT+plotH+14}" text-anchor="end" font-size="9" fill="${cText}" transform="rotate(-50 ${x} ${mT+plotH+14})">${pt.tamiz}</text>`;
    });
    body += `<line x1="${mL}" y1="${mT}" x2="${mL}" y2="${mT+plotH}" stroke="${cPrimary}" stroke-width="1.5"/>`;
    body += `<line x1="${mL}" y1="${mT+plotH}" x2="${mL+plotW}" y2="${mT+plotH}" stroke="${cPrimary}" stroke-width="1.5"/>`;
    body += `<text x="${mL+plotW/2}" y="${H-8}" text-anchor="middle" font-size="11" fill="${cText}">Abertura (mm) — log</text>`;
    body += `<text x="14" y="${mT+plotH/2}" text-anchor="middle" font-size="11" fill="${cText}" transform="rotate(-90 14 ${mT+plotH/2})">% que pasa</text>`;
    const lp = points.map(pt => `${xPos(pt.mm)},${yPos(pt.pasa)}`).join(' ');
    body += `<polyline points="${lp}" fill="none" stroke="${cLine}" stroke-width="2.5" stroke-linejoin="round"/>`;
    points.forEach(pt => { body += `<circle cx="${xPos(pt.mm)}" cy="${yPos(pt.pasa)}" r="4" fill="${cCard}" stroke="${cLine}" stroke-width="2"/>`; });
    setSvg(`viz_m2_gran_${idx}`, `0 0 ${W} ${H}`, body, 360);
}

// ============ CAP 2 — ESTADÍSTICA ============
let statsValues = [];
function loadStatsValues() {
    statsValues = loadState('stats_values', []);
    renderStats();
}
function renderStats() {
    const tbody = $('m6_stats_body');
    if (!tbody) return;
    tbody.innerHTML = '';
    statsValues.forEach((val, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i+1}</td><td>${val}</td><td><button onclick="deleteStat(${i})" class="danger">Eliminar</button></td>`;
        tbody.appendChild(tr);
    });
    const n = statsValues.length;
    if (n > 0) {
        const mean = statsValues.reduce((a, b) => a + b, 0) / n;
        const variance = n > 1 ? statsValues.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
        const s = Math.sqrt(variance);
        const cv = mean !== 0 ? (s / mean) * 100 : 0;
        const disp = cv < 10 ? 'Excelente' : cv <= 15 ? 'Bueno' : 'Deficiente';
        const e = $('m6_stats_result');
        if (e) e.textContent = `n=${n}, Media=${mean.toFixed(3)}, s=${s.toFixed(3)}, CV=${cv.toFixed(2)}% (${disp})`;
        // Extras
        const xmin = Math.min(...statsValues), xmax = Math.max(...statsValues);
        const range = xmax - xmin;
        const R = $('m6_range'); if (R) R.textContent = `${range.toFixed(3)}`;
        const S2 = $('m6_var'); if (S2) S2.textContent = `${variance.toFixed(4)}`;
        const k = 1 + 3.322 * Math.log10(n);
        const KE = $('m6_sturges'); if (KE) KE.textContent = `${Math.round(k)}`;
    } else {
        const e = $('m6_stats_result');
        if (e) e.textContent = 'n=0, Media=0, s=0, CV=0%';
    }
    saveState('stats_values', statsValues);
    drawControlChart();
}
window.addStatValue = function() {
    const val = parseFloat($('m6_nuevo_valor').value);
    if (!isNaN(val)) { statsValues.push(val); $('m6_nuevo_valor').value = ''; renderStats(); }
};
window.deleteStat = function(i) { statsValues.splice(i, 1); renderStats(); };
window.clearStats = function() { statsValues = []; renderStats(); };

// Curva normal estándar (aprox Zelen & Severo, precisión 7.5e-8)
function normCDF(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (z > 0) p = 1 - p;
    return p;
}
function calcFrequencies() {
    const n = statsValues.length;
    const kE = $('m6_freq_k'), tbody = $('m6_freq_body');
    if (!tbody) return;
    if (n < 2) { tbody.innerHTML = '<tr><td colspan="5" class="viz-empty">Agrega al menos 2 valores en la Estadística Descriptiva</td></tr>'; return; }
    const k = Math.round(1 + 3.322 * Math.log10(n));
    if (kE) kE.textContent = k;
    const xmin = Math.min(...statsValues), xmax = Math.max(...statsValues);
    const range = xmax - xmin;
    const amp = range / k;
    const bins = Array.from({ length: k }, () => 0);
    statsValues.forEach(v => {
        let i = Math.floor((v - xmin) / amp);
        if (i >= k) i = k - 1;
        bins[i]++;
    });
    tbody.innerHTML = '';
    bins.forEach((f, i) => {
        const inf = xmin + i * amp;
        const sup = inf + amp;
        const fr = f / n;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i+1}</td><td>${inf.toFixed(3)} – ${sup.toFixed(3)}</td><td>${f}</td><td>${fr.toFixed(4)}</td><td>${(fr*100).toFixed(2)}%</td>`;
        tbody.appendChild(tr);
    });
    drawHistogram(bins, xmin, amp, k, n);
}
function drawHistogram(bins, xmin, amp, k, n) {
    const container = document.getElementById('viz_m6_hist');
    if (!container) return;
    const W = 600, H = 300, mL = 60, mR = 30, mT = 30, mB = 50;
    const plotW = W - mL - mR, plotH = H - mT - mB;
    const maxF = Math.max(...bins, 1);
    const barW = plotW / k;
    const cGrid = cssVar('--border','#e2e8f0'), cText = cssVar('--text-muted','#64748b');
    const cBar = cssVar('--secondary','#2563eb'), cPrimary = cssVar('--primary','#1e3a5f');
    let body = '';
    for (let i = 0; i <= 5; i++) {
        const y = mT + (1 - i / 5) * plotH;
        body += `<line x1="${mL}" y1="${y}" x2="${mL+plotW}" y2="${y}" stroke="${cGrid}" stroke-width=".5"/>`;
        body += `<text x="${mL-6}" y="${y+4}" text-anchor="end" font-size="10" fill="${cText}">${Math.round(maxF * i / 5)}</text>`;
    }
    bins.forEach((f, i) => {
        const h = (f / maxF) * plotH;
        const x = mL + i * barW + 4;
        const y = mT + plotH - h;
        body += `<rect x="${x}" y="${y}" width="${barW-8}" height="${h}" fill="${cBar}" opacity=".85" rx="3"/>`;
        body += `<text x="${x + (barW-8)/2}" y="${y - 4}" text-anchor="middle" font-size="10" fill="${cText}">${f}</text>`;
    });
    body += `<line x1="${mL}" y1="${mT+plotH}" x2="${mL+plotW}" y2="${mT+plotH}" stroke="${cPrimary}" stroke-width="1.5"/>`;
    body += `<line x1="${mL}" y1="${mT}" x2="${mL}" y2="${mT+plotH}" stroke="${cPrimary}" stroke-width="1.5"/>`;
    body += `<text x="${mL+plotW/2}" y="${H-8}" text-anchor="middle" font-size="11" fill="${cText}">Valor</text>`;
    body += `<text x="${W/2}" y="18" text-anchor="middle" font-size="12" font-weight="600" fill="${cPrimary}">Histograma · k=${k} clases (Sturges)</text>`;
    setSvg('viz_m6_hist', `0 0 ${W} ${H}`, body, 320);
}
function calcZScore() {
    const n = statsValues.length;
    if (n < 2) { showToast('Necesitas al menos 2 valores', true); return; }
    const x = parseFloat($('m6_z_x').value);
    if (isNaN(x)) { showToast('Introduce un valor x', true); return; }
    const mean = statsValues.reduce((a, b) => a + b, 0) / n;
    const s = Math.sqrt(statsValues.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
    if (s === 0) { showToast('s=0, no se puede calcular Z', true); return; }
    const z = (x - mean) / s;
    const pLess = normCDF(z);
    const pGreater = 1 - pLess;
    const e1 = $('m6_z_result'); if (e1) e1.textContent = `Z = ${z.toFixed(4)}`;
    const e2 = $('m6_z_pl'); if (e2) e2.textContent = `${(pLess*100).toFixed(2)}%`;
    const e3 = $('m6_z_pg'); if (e3) e3.textContent = `${(pGreater*100).toFixed(2)}%`;
    drawNormalCurve(mean, s, x, z);
}
function drawNormalCurve(mean, s, xVal, z) {
    const container = document.getElementById('viz_m6_norm');
    if (!container) return;
    const W = 600, H = 280, mL = 50, mR = 30, mT = 30, mB = 40;
    const plotW = W - mL - mR, plotH = H - mT - mB;
    const xmin = mean - 4 * s, xmax = mean + 4 * s;
    const xPos = v => mL + ((v - xmin) / (xmax - xmin)) * plotW;
    const yPos = p => mT + (1 - p / 0.45) * plotH;
    const cGrid = cssVar('--border','#e2e8f0'), cText = cssVar('--text-muted','#64748b');
    const cCurve = cssVar('--secondary','#2563eb'), cPrimary = cssVar('--primary','#1e3a5f');
    const cAccent = cssVar('--accent','#f59e0b');
    let body = '';
    for (let i = -3; i <= 3; i++) {
        const xx = xPos(mean + i * s);
        body += `<line x1="${xx}" y1="${mT}" x2="${xx}" y2="${mT+plotH}" stroke="${cGrid}" stroke-width=".5"/>`;
        body += `<text x="${xx}" y="${mT+plotH+16}" text-anchor="middle" font-size="9" fill="${cText}">${i >= 0 ? '+' : ''}${i}s</text>`;
    }
    let pts = [];
    for (let i = 0; i <= 100; i++) {
        const v = xmin + (xmax - xmin) * (i / 100);
        const zz = (v - mean) / s;
        const p = Math.exp(-zz * zz / 2) / (s * Math.sqrt(2 * Math.PI));
        pts.push(`${xPos(v)},${yPos(p)}`);
    }
    body += `<polyline points="${pts.join(' ')}" fill="none" stroke="${cCurve}" stroke-width="2.5"/>`;
    const xv = xPos(xVal);
    body += `<line x1="${xv}" y1="${mT}" x2="${xv}" y2="${mT+plotH}" stroke="${cAccent}" stroke-width="2" stroke-dasharray="5 3"/>`;
    body += `<text x="${xv}" y="${mT-8}" text-anchor="middle" font-size="11" font-weight="700" fill="${cAccent}">x = ${xVal.toFixed(2)} (Z=${z.toFixed(2)})</text>`;
    body += `<line x1="${mL}" y1="${mT+plotH}" x2="${mL+plotW}" y2="${mT+plotH}" stroke="${cPrimary}" stroke-width="1.5"/>`;
    body += `<line x1="${mL}" y1="${mT}" x2="${mL}" y2="${mT+plotH}" stroke="${cPrimary}" stroke-width="1.5"/>`;
    body += `<text x="${W/2}" y="18" text-anchor="middle" font-size="12" font-weight="600" fill="${cPrimary}">Curva Normal · x̄=${mean.toFixed(2)} · s=${s.toFixed(2)}</text>`;
    setSvg('viz_m6_norm', `0 0 ${W} ${H}`, body, 300);
}
function drawControlChart() {
    const container = document.getElementById('viz_m6_chart');
    if (!container) return;
    const n = statsValues.length;
    if (n === 0) { container.innerHTML = '<div class="viz-empty">Agrega valores para ver la carta de control</div>'; return; }
    const mean = statsValues.reduce((a, b) => a + b, 0) / n;
    const variance = n > 1 ? statsValues.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
    const s = Math.sqrt(variance);
    const dataMin = Math.min(...statsValues), dataMax = Math.max(...statsValues);
    let yMin = Math.min(dataMin, mean - 2 * s), yMax = Math.max(dataMax, mean + 2 * s);
    if (!isFinite(yMin)) yMin = mean - 1;
    if (!isFinite(yMax)) yMax = mean + 1;
    if (yMax === yMin) { yMin -= 1; yMax += 1; }
    const rng = yMax - yMin;
    yMin -= rng * 0.12; yMax += rng * 0.12;
    const W = 600, H = 300, mL = 58, mR = 30, mT = 30, mB = 42;
    const plotW = W - mL - mR, plotH = H - mT - mB;
    const xPos = i => n === 1 ? mL + plotW / 2 : mL + (i / (n - 1)) * plotW;
    const yPos = v => mT + (1 - (v - yMin) / (yMax - yMin)) * plotH;
    const cGrid = cssVar('--border','#e2e8f0'), cText = cssVar('--text-muted','#64748b');
    const cMean = cssVar('--secondary','#2563eb'), cBand1 = cssVar('--success','#16a34a');
    const cBand2 = cssVar('--danger','#dc2626'), cCard = cssVar('--card','#fff');
    const cTextStrong = cssVar('--text','#0f172a');
    let body = '';
    if (s > 0) {
        const y2t = yPos(mean + 2 * s), y2b = yPos(mean - 2 * s);
        body += `<rect x="${mL}" y="${y2t}" width="${plotW}" height="${y2b-y2t}" fill="${cBand2}" opacity=".08"/>`;
        const y1t = yPos(mean + s), y1b = yPos(mean - s);
        body += `<rect x="${mL}" y="${y1t}" width="${plotW}" height="${y1b-y1t}" fill="${cBand1}" opacity=".14"/>`;
    }
    const yM = yPos(mean);
    body += `<line x1="${mL}" y1="${yM}" x2="${mL+plotW}" y2="${yM}" stroke="${cMean}" stroke-width="1.6" stroke-dasharray="6 4"/>`;
    if (n >= 2) {
        const lp = statsValues.map((v, i) => `${xPos(i)},${yPos(v)}`).join(' ');
        body += `<polyline points="${lp}" fill="none" stroke="${cMean}" stroke-width="2"/>`;
    }
    statsValues.forEach((v, i) => {
        let color = cssVar('--success','#16a34a');
        if (s > 0) {
            const dev = Math.abs(v - mean) / s;
            if (dev > 2) color = cssVar('--danger','#dc2626');
            else if (dev > 1) color = '#f59e0b';
        }
        body += `<circle cx="${xPos(i)}" cy="${yPos(v)}" r="4.5" fill="${color}" stroke="${cCard}" stroke-width="1.5"/>`;
    });
    const cv = mean !== 0 ? (s / mean) * 100 : 0;
    body += `<text x="${W/2}" y="16" text-anchor="middle" font-size="12" font-weight="600" fill="${cTextStrong}">Carta de control · n=${n} · x̄=${mean.toFixed(2)} · s=${s.toFixed(2)} · CV=${cv.toFixed(2)}%</text>`;
    setSvg('viz_m6_chart', `0 0 ${W} ${H}`, body, 320);
}

// ============ CAP 3 — AGLOMERANTES (Marshall) ============
function calcModulo5(prueba) {
    const idx = prueba.slice(-1);
    const A = parseFloat(document.getElementById(`m5_A_${idx}`)?.value) || 0;
    const B = parseFloat(document.getElementById(`m5_B_${idx}`)?.value) || 0;
    const C = parseFloat(document.getElementById(`m5_C_${idx}`)?.value) || 0;
    const Gmm = parseFloat(document.getElementById(`m5_Gmm_${idx}`)?.value) || 0;
    const Gsb = parseFloat(document.getElementById(`m5_Gsb_${idx}`)?.value) || 0;
    const Ps = parseFloat(document.getElementById(`m5_Ps_${idx}`)?.value) || 0;
    const Gmb = safeDiv(A, B - C);
    const ge = document.getElementById(`m5_grav_result_${idx}`);
    if (ge) ge.textContent = `Gmb = ${Gmb.toFixed(3)}, Gmm = ${Gmm.toFixed(3)}`;
    const VTM = safeDiv(Gmm - Gmb, Gmm) * 100;
    const VMA = 100 - safeDiv(Gmb * Ps, Gsb);
    const VFA = safeDiv(VMA - VTM, VMA) * 100;
    const ve = document.getElementById(`m5_vol_result_${idx}`);
    if (ve) ve.textContent = `VTM = ${VTM.toFixed(2)}%, VMA = ${VMA.toFixed(2)}%, VFA = ${VFA.toFixed(2)}%`;
    drawMarshallBar(prueba, VTM, VMA, VFA, Gmb, Gmm);
}
function drawMarshallBar(prueba, VTM, VMA, VFA, Gmb, Gmm) {
    const idx = prueba.slice(-1);
    const container = document.getElementById(`viz_m5_vol_${idx}`);
    if (!container) return;
    if (!Gmm || !Gmb) { container.innerHTML = '<div class="viz-empty">Completa los datos</div>'; return; }
    const pctAgr = Math.max(0, 100 - VMA), pctAsf = Math.max(0, VMA - VTM), pctVac = VTM;
    const W = 600, H = 210, barX = 30, barY = 58, barW = 540, barH = 62;
    const cAgr = cssVar('--text-muted','#94a3b8'), cAsf = cssVar('--primary','#1e3a5f');
    const cVac = cssVar('--accent','#f59e0b'), cText = cssVar('--text','#0f172a');
    const cTextMuted = cssVar('--text-muted','#64748b'), cBorder = cssVar('--border-strong','#cbd5e1');
    let body = '', x = barX;
    [{p:pctAgr,c:cAgr},{p:pctAsf,c:cAsf},{p:pctVac,c:cVac}].forEach(s => {
        const w = (s.p / 100) * barW;
        if (w > 0.5) {
            body += `<rect x="${x}" y="${barY}" width="${w}" height="${barH}" fill="${s.c}" opacity=".88"/>`;
            if (w > 44) body += `<text x="${x+w/2}" y="${barY+barH/2+5}" text-anchor="middle" font-size="13" fill="#fff" font-weight="600">${s.p.toFixed(1)}%</text>`;
            x += w;
        }
    });
    body += `<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" fill="none" stroke="${cBorder}" stroke-width="1" rx="4"/>`;
    body += `<text x="${W/2}" y="32" text-anchor="middle" font-size="14" font-weight="600" fill="${cText}">Composición volumétrica</text>`;
    body += `<text x="${barX}" y="${barY+barH+26}" font-size="11" fill="${cTextMuted}">Agregado: ${pctAgr.toFixed(1)}%</text>`;
    body += `<text x="${barX+160}" y="${barY+barH+26}" font-size="11" fill="${cTextMuted}">Asfalto: ${pctAsf.toFixed(1)}%</text>`;
    body += `<text x="${barX+320}" y="${barY+barH+26}" font-size="11" fill="${cTextMuted}">Vacíos: ${pctVac.toFixed(1)}%</text>`;
    setSvg(`viz_m5_vol_${idx}`, `0 0 ${W} ${H}`, body, 230);
}

// ============ CAP 4 — HORMIGÓN ============
function calcModulo3(prueba) {
    const idx = prueba.slice(-1);
    const P_N = convertToBase(parseFloat(document.getElementById(`m3_P_${idx}`)?.value) || 0, document.getElementById(`m3_P_unit_${idx}`)?.value || 'kN');
    const dim = parseFloat(document.getElementById(`m3_dim_${idx}`)?.value) || 0;
    const dimU = document.getElementById(`m3_dim_unit_${idx}`)?.value || 'mm';
    const dim_mm = convertToBase(dim, dimU);
    const shape = document.getElementById(`m3_shape_${idx}`)?.value || 'cilindro';
    const area = shape === 'cilindro' ? Math.PI * dim_mm * dim_mm / 4 : dim_mm * dim_mm;
    const fcE = document.getElementById(`m3_fc_result_${idx}`);
    if (fcE) fcE.textContent = `f'c = ${safeDiv(P_N, area).toFixed(2)} MPa`;

    const Pt_N = convertToBase(parseFloat(document.getElementById(`m3_traccion_P_${idx}`)?.value) || 0, document.getElementById(`m3_traccion_P_unit_${idx}`)?.value || 'kN');
    const d = parseFloat(document.getElementById(`m3_traccion_d_${idx}`)?.value) || 0;
    const L = parseFloat(document.getElementById(`m3_traccion_L_${idx}`)?.value) || 0;
    const te = document.getElementById(`m3_traccion_result_${idx}`);
    if (te) te.textContent = `T = ${safeDiv(2 * Pt_N, Math.PI * L * d).toFixed(2)} MPa`;

    const Pf_N = convertToBase(parseFloat(document.getElementById(`m3_flex_P_${idx}`)?.value) || 0, document.getElementById(`m3_flex_P_unit_${idx}`)?.value || 'kN');
    const Lf = parseFloat(document.getElementById(`m3_flex_L_${idx}`)?.value) || 0;
    const bf = parseFloat(document.getElementById(`m3_flex_b_${idx}`)?.value) || 0;
    const df = parseFloat(document.getElementById(`m3_flex_d_${idx}`)?.value) || 0;
    const re = document.getElementById(`m3_flex_result_${idx}`);
    if (re) re.textContent = `R = ${safeDiv(Pf_N * Lf, bf * df * df).toFixed(2)} MPa`;

    const fc_espec = parseFloat(document.getElementById(`m3_fc_espec_${idx}`)?.value) || 0;
    const s = parseFloat(document.getElementById(`m3_s_${idx}`)?.value) || 0;
    let fcr1 = fc_espec + 1.34 * s;
    let fcr2 = fc_espec <= 35 ? fc_espec + 2.33 * s - 3.45 : 0.90 * fc_espec + 2.33 * s;
    const fcrE = document.getElementById(`m3_fcr_result_${idx}`);
    if (fcrE) fcrE.textContent = `f'cr = ${Math.max(fcr1, fcr2).toFixed(2)} MPa`;

    const Pb_N = convertToBase(parseFloat(document.getElementById(`m3_bloque_P_${idx}`)?.value) || 0, document.getElementById(`m3_bloque_P_unit_${idx}`)?.value || 'kN');
    const largo = parseFloat(document.getElementById(`m3_bloque_largo_${idx}`)?.value) || 0;
    const ancho = parseFloat(document.getElementById(`m3_bloque_ancho_${idx}`)?.value) || 0;
    const huecos = parseFloat(document.getElementById(`m3_bloque_huecos_${idx}`)?.value) || 0;
    const areaB = largo * ancho, areaN = areaB - huecos;
    const be = document.getElementById(`m3_bloque_result_${idx}`);
    if (be) be.textContent = `σ bruto = ${safeDiv(Pb_N, areaB).toFixed(2)} MPa, σ neto = ${safeDiv(Pb_N, areaN).toFixed(2)} MPa`;
}

// ============ CAP 5 — METÁLICOS ============
function calcModulo4(prueba) {
    const idx = prueba.slice(-1);
    const L0 = parseFloat(document.getElementById(`m4_L0_${idx}`)?.value) || 0;
    const Lf = parseFloat(document.getElementById(`m4_Lf_${idx}`)?.value) || 0;
    const A0 = parseFloat(document.getElementById(`m4_A0_${idx}`)?.value) || 0;
    const Af = parseFloat(document.getElementById(`m4_Af_${idx}`)?.value) || 0;
    const te = document.getElementById(`m4_traccion_result_${idx}`);
    if (te) te.textContent = `%Elongación = ${(safeDiv(Lf-L0, L0)*100).toFixed(2)}%, %Reducción = ${(safeDiv(A0-Af, A0)*100).toFixed(2)}%`;

    const T_Nmm = convertToBase(parseFloat(document.getElementById(`m4_T_${idx}`)?.value) || 0, document.getElementById(`m4_T_unit_${idx}`)?.value || 'N.m');
    const d = parseFloat(document.getElementById(`m4_d_${idx}`)?.value) || 0;
    const L = parseFloat(document.getElementById(`m4_L_${idx}`)?.value) || 0;
    const theta = parseFloat(document.getElementById(`m4_theta_${idx}`)?.value) || 0;
    const J = Math.PI * Math.pow(d, 4) / 32;
    const tau = safeDiv(16 * T_Nmm, Math.PI * Math.pow(d, 3));
    const G = safeDiv(T_Nmm * L, J * theta);
    const toe = document.getElementById(`m4_torsion_result_${idx}`);
    if (toe) toe.textContent = `τ_max = ${tau.toFixed(2)} MPa, G = ${G.toFixed(2)} MPa`;
    drawTorsionAnimation(prueba);
}
function drawTorsionAnimation(prueba) {
    const idx = prueba.slice(-1);
    const container = document.getElementById(`viz_m4_tors_${idx}`);
    if (!container) return;
    const theta = parseFloat(document.getElementById(`m4_theta_${idx}`)?.value) || 0;
    const degVisual = theta === 0 ? 0 : Math.max(-60, Math.min(60, theta * 8 * 180 / Math.PI));
    if (!container.dataset.init) {
        container.innerHTML = `<div class="tor-viz"><div class="tor-circle"><div class="tor-needle"></div></div><div class="tor-info">θ = <strong class="tor-theta">0</strong> rad · <span class="tor-deg">0°</span></div></div>`;
        container.dataset.init = '1';
    }
    container.querySelector('.tor-needle').style.transform = `rotate(${degVisual}deg)`;
    container.querySelector('.tor-theta').textContent = theta.toFixed(3);
    container.querySelector('.tor-deg').textContent = ((theta * 180 / Math.PI)).toFixed(1) + '°';
}

// ============ CAP 6 — MADERA Y PLÁSTICOS ============
function calcMadera(prueba) {
    const idx = prueba.slice(-1);
    const P = parseFloat(document.getElementById(`m4_mad_P_${idx}`)?.value) || 0;
    const L = parseFloat(document.getElementById(`m4_mad_L_${idx}`)?.value) || 0;
    const b = parseFloat(document.getElementById(`m4_mad_b_${idx}`)?.value) || 0;
    const h = parseFloat(document.getElementById(`m4_mad_h_${idx}`)?.value) || 0;
    const MOR = safeDiv(3 * P * L, 2 * b * h * h);
    const e = document.getElementById(`m4_madera_result_${idx}`);
    if (e) e.textContent = `MOR = ${MOR.toFixed(2)} MPa`;
    drawMaderaBeam(prueba, P, L, b, h, MOR);
}
function drawMaderaBeam(prueba, P, L, b, h, MOR) {
    const idx = prueba.slice(-1);
    const container = document.getElementById(`viz_m4_mad_${idx}`);
    if (!container) return;
    const hasData = P > 0 && L > 0 && b > 0 && h > 0;
    const W = 600, H = 230, beamX = 70, beamW = 460, beamY = 95, beamH = 18;
    const sup1X = beamX + 20, sup2X = beamX + beamW - 20, centerX = beamX + beamW / 2;
    const cBeam = cssVar('--primary','#1e3a5f'), cLoad = cssVar('--danger','#dc2626');
    const cDefl = cssVar('--accent','#f59e0b'), cText = cssVar('--text-muted','#64748b');
    let body = '';
    body += `<rect x="${beamX}" y="${beamY}" width="${beamW}" height="${beamH}" fill="${cBeam}" opacity=".9" rx="2"/>`;
    const triH = 22, triW = 26;
    body += `<polygon points="${sup1X-triW/2},${beamY+beamH} ${sup1X+triW/2},${beamY+beamH} ${sup1X},${beamY+beamH+triH}" fill="${cBeam}" opacity=".65"/>`;
    body += `<polygon points="${sup2X-triW/2},${beamY+beamH} ${sup2X+triW/2},${beamY+beamH} ${sup2X},${beamY+beamH+triH}" fill="${cBeam}" opacity=".65"/>`;
    const aTop = 26, aBot = beamY - 4;
    body += `<line x1="${centerX}" y1="${aTop}" x2="${centerX}" y2="${aBot}" stroke="${cLoad}" stroke-width="2.5"/>`;
    body += `<polygon points="${centerX-7},${aBot-9} ${centerX+7},${aBot-9} ${centerX},${aBot}" fill="${cLoad}"/>`;
    body += `<text x="${centerX}" y="${aTop-8}" text-anchor="middle" font-size="13" fill="${cLoad}" font-weight="600">P = ${hasData ? P.toFixed(1) : '?'}</text>`;
    let pts = [];
    for (let i = 0; i <= 20; i++) {
        const t = i / 20, x = sup1X + t * (sup2X - sup1X);
        const u = (x - centerX) / ((sup2X - sup1X) / 2);
        pts.push(`${x},${beamY+beamH+12+30*(1-u*u)}`);
    }
    body += `<polyline points="${pts.join(' ')}" fill="none" stroke="${cDefl}" stroke-width="2" stroke-dasharray="5 3"/>`;
    body += `<text x="${centerX}" y="${H-6}" text-anchor="middle" font-size="13" font-weight="600" fill="${cBeam}">MOR = ${MOR.toFixed(2)} MPa</text>`;
    setSvg(`viz_m4_mad_${idx}`, `0 0 ${W} ${H}`, body, 250);
}

// ============ CONECTOR → INFORME ============
function enviarAInforme(ensayo, prueba) {
    let reporteData = null;
    if (ensayo === 'granulometria') reporteData = packGranulometria(prueba);
    else if (ensayo === 'estadistica') reporteData = packEstadistica();
    else if (ensayo === 'marshall') reporteData = packMarshall(prueba);
    else if (ensayo === 'compresion') reporteData = packCompresion(prueba);
    else if (ensayo === 'traccion') reporteData = packTraccion(prueba);
    else if (ensayo === 'madera') reporteData = packMadera(prueba);
    if (!reporteData) { showToast('⚠️ Nada que enviar', true); return; }
    try {
        localStorage.setItem('datosInformeActual', JSON.stringify(reporteData));
        showToast('✅ Datos guardados. Ve a Informes.', false, 2800);
    } catch (e) { console.error(e); showToast('⚠️ Error al guardar', true); }
}
function packGranulometria(prueba) {
    const idx = prueba.slice(-1);
    const table = document.getElementById(`m2_gran_table_${idx}`);
    if (!table) return null;
    const tablaDatos = [];
    table.querySelectorAll('tbody tr').forEach(row => {
        const t = row.cells[0].textContent.trim();
        const apTexto = row.cells[1].textContent.trim();
        let ap = parseFloat(apTexto);
        if (isNaN(ap)) ap = SIEVE_MM[t] || null;
        tablaDatos.push({
            tamiz: t, abertura: ap, apertura: ap, aperturaMm: ap, aperturaTexto: apTexto,
            pesoRetenido: parseFloat(row.querySelector('.m2_peso_retenido').value) || 0,
            pctRetenido: parseFloat(row.cells[5].textContent) || 0,
            pctAcumulado: parseFloat(row.cells[6].textContent) || 0,
            pctPasa: parseFloat(row.cells[7].textContent) || 0
        });
    });
    const mf = parseFloat((document.getElementById(`m2_mf_result_${idx}`)?.textContent || '').replace('Módulo de Finura = ', '')) || 0;
    const pesoTotal = parseFloat((document.getElementById(`m2_peso_total_${idx}`)?.textContent || '0 g').replace(' g', '')) || 0;
    const datosX = tablaDatos.filter(f => f.abertura !== null && !isNaN(f.abertura)).map(f => f.abertura);
    const datosY = tablaDatos.filter(f => f.abertura !== null && !isNaN(f.abertura)).map(f => f.pctPasa);
    return {
        tipoEnsayo: "Granulometría ASTM C136", norma: "ASTM C136",
        fecha: new Date().toISOString(),
        metadatosAcademicos: { prueba },
        tablaDatos,
        resultadosFinales: { pesoTotal_g: pesoTotal, moduloFinura: mf },
        grafica: { requiereGrafica: true, tipoEjeX: "logarithmic", titulo: "Curva Granulométrica",
            etiquetaX: "Abertura (mm)", etiquetaY: "% que pasa", datosX, datosY, animation: false }
    };
}
function packEstadistica() {
    const n = statsValues.length;
    if (n < 1) return null;
    const mean = statsValues.reduce((a, b) => a + b, 0) / n;
    const variance = n > 1 ? statsValues.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
    const s = Math.sqrt(variance);
    const cv = mean !== 0 ? (s / mean) * 100 : 0;
    return {
        tipoEnsayo: "Análisis Estadístico", norma: "ASTM E2586",
        fecha: new Date().toISOString(),
        metadatosAcademicos: { numDeterminaciones: n },
        tablaDatos: statsValues.map((v, i) => ({ index: i + 1, valor: v })),
        resultadosFinales: { n, media: mean, varianza: variance, desviacionEstandar: s, cv_pct: cv,
            rango: Math.max(...statsValues) - Math.min(...statsValues),
            sturges_k: Math.round(1 + 3.322 * Math.log10(n)) },
        grafica: { requiereGrafica: true, tipoEjeX: "linear", titulo: "Carta de Control",
            datosX: statsValues.map((_, i) => i + 1), datosY: statsValues, animation: false }
    };
}
function packMarshall(prueba) { return { tipoEnsayo: "Marshall", norma: "ASTM D6927", fecha: new Date().toISOString(), metadatosAcademicos: { prueba }, tablaDatos: [], resultadosFinales: {}, grafica: { requiereGrafica: false, datosX: [], datosY: [], animation: false } }; }
function packCompresion(prueba) { return { tipoEnsayo: "Compresión", norma: "ASTM C39", fecha: new Date().toISOString(), metadatosAcademicos: { prueba }, tablaDatos: [], resultadosFinales: {}, grafica: { requiereGrafica: false, datosX: [], datosY: [], animation: false } }; }
function packTraccion(prueba) { return { tipoEnsayo: "Tracción", norma: "ASTM E8", fecha: new Date().toISOString(), metadatosAcademicos: { prueba }, tablaDatos: [], resultadosFinales: {}, grafica: { requiereGrafica: false, datosX: [], datosY: [], animation: false } }; }
function packMadera(prueba) { return { tipoEnsayo: "Flexión Madera", norma: "ASTM D143", fecha: new Date().toISOString(), metadatosAcademicos: { prueba }, tablaDatos: [], resultadosFinales: {}, grafica: { requiereGrafica: false, datosX: [], datosY: [], animation: false } }; }

// ============ EXPORTAR / IMPORTAR ============
function exportData() {
    const all = {};
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        all[k] = localStorage.getItem(k);
    }
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labmat_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Respaldo exportado', false, 2000);
}
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                for (const k in data) localStorage.setItem(k, data[k]);
                alert('Datos importados. Recargando…');
                location.reload();
            } catch (err) { alert('Archivo inválido'); }
        };
        reader.readAsText(file);
    };
    input.click();
}
