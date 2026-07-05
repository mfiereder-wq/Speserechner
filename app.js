const RATE = 0.60;
const STORAGE_KEY = 'spesenrechner_data';

let currentDate = new Date();
let entries = {};

// Load data
function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        entries = raw ? JSON.parse(raw) : {};
    } catch { entries = {}; }
}

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function monthKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function getEntries() {
    return entries[monthKey(currentDate)] || [];
}

function setEntries(arr) {
    entries[monthKey(currentDate)] = arr;
    save();
}

function fmt(n) {
    return n.toFixed(2).replace('.', ',') + ' CHF';
}

function fmtDate(iso) {
    const d = new Date(iso+'T00:00:00');
    return d.toLocaleDateString('de-CH', { weekday:'short', day:'2-digit', month:'short' });
}

function render() {
    const key = monthKey(currentDate);
    document.getElementById('currentMonth').textContent =
        currentDate.toLocaleDateString('de-CH', { month:'long', year:'numeric' });

    const list = getEntries();
    const ul = document.getElementById('entriesList');
    const empty = document.getElementById('emptyState');
    const badge = document.getElementById('entryCount');

    ul.innerHTML = '';
    badge.textContent = list.length;

    if (list.length === 0) {
        empty.style.display = 'block';
    } else {
        empty.style.display = 'none';
        list.forEach((e, i) => {
            const li = document.createElement('li');
            li.className = 'entry-item';
            li.innerHTML = `
                <span class="entry-date">${fmtDate(e.date)}</span>
                <span class="entry-km">${e.km.toLocaleString('de-CH')} km</span>
                <span class="entry-amount">${fmt(e.km * RATE)}</span>
                <button class="entry-delete" data-index="${i}" aria-label="Löschen">×</button>
            `;
            ul.appendChild(li);
        });
    }

    // Summary
    const totalKm = list.reduce((s,e)=>s+e.km, 0);
    document.getElementById('totalKm').textContent = totalKm.toLocaleString('de-CH') + ' km';
    document.getElementById('totalAmount').textContent = fmt(totalKm * RATE);
}

// Events
document.getElementById('addBtn').addEventListener('click', () => {
    const date = document.getElementById('dateInput').value;
    const km = parseInt(document.getElementById('kmInput').value, 10);
    if (!date || isNaN(km) || km < 0) {
        alert('Bitte gültiges Datum und positive Kilometerzahl eingeben.');
        return;
    }
    const list = getEntries();
    list.push({ date, km });
    setEntries(list);
    document.getElementById('kmInput').value = '';
    render();
});

document.getElementById('entriesList').addEventListener('click', (e) => {
    const btn = e.target.closest('.entry-delete');
    if (!btn) return;
    const idx = parseInt(btn.dataset.index, 10);
    const list = getEntries();
    list.splice(idx, 1);
    setEntries(list);
    render();
});

document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    render();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    render();
});

document.getElementById('clearMonth').addEventListener('click', () => {
    if (!confirm('Alle Einträge dieses Monats wirklich löschen?')) return;
    setEntries([]);
    render();
});

// PDF Export via print stylesheet
document.getElementById('exportPdf').addEventListener('click', () => {
    const list = getEntries();
    if (list.length === 0) {
        alert('Keine Einträge zum Exportieren.');
        return;
    }
    const totalKm = list.reduce((s,e)=>s+e.km, 0);
    const monthLabel = currentDate.toLocaleDateString('de-CH',{ month:'long', year:'numeric' });
    const rows = list.map((e,i) =>
        `<tr>
            <td>${i+1}</td>
            <td>${fmtDate(e.date)}</td>
            <td style="text-align:right">${e.km.toLocaleString('de-CH')}</td>
            <td style="text-align:right">${fmt(e.km * RATE)}</td>
        </tr>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Spesen ${monthLabel}</title>
<style>
body{font-family:-apple-system,system-ui,sans-serif;margin:40px;color:#111;}
h1{font-size:1.4rem;margin-bottom:4px;}
.meta{color:#666;margin-bottom:20px;}
table{width:100%;border-collapse:collapse;margin-top:16px;}
th,td{padding:8px 10px;text-align:left;border-bottom:1px solid #ddd;}
th{background:#f5f5f5;font-weight:600;font-size:0.85rem;}
td:nth-child(n+3),th:nth-child(n+3){text-align:right;}
.total{margin-top:20px;font-weight:700;text-align:right;font-size:1.1rem;}
.footer{margin-top:40px;font-size:0.75rem;color:#888;}
</style></head><body>
<h1>Spesenabrechnung</h1>
<p class="meta">${monthLabel} · Rate: ${RATE.toFixed(2)} CHF/km</p>
<table><thead><tr>
    <th>#</th><th>Datum</th><th>Kilometer</th><th>Betrag</th>
</tr></thead><tbody>${rows}</tbody></table>
<p class="total">Total: ${totalKm.toLocaleString('de-CH')} km · ${fmt(totalKm * RATE)}</p>
<p class="footer">Erstellt mit Spesenrechner · ${new Date().toLocaleDateString('de-CH')}</p>
</body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 300);
});

// Init
document.getElementById('dateInput').valueAsDate = new Date();
load();
render();

// PWA service worker registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
}
