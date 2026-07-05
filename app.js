const RATE = 0.60;
const ENTRY_KEY = 'spesenrechner_data';
const SETTINGS_KEY = 'spesenrechner_settings';

let currentDate = new Date();
let entries = {};
let settings = {
    employee: '',
    company: { line1: '', line2: '', zip: '', city: '' }
};

function loadEntries() {
    try {
        entries = JSON.parse(localStorage.getItem(ENTRY_KEY) || '{}');
    } catch { entries = {}; }
}

function saveEntries() {
    localStorage.setItem(ENTRY_KEY, JSON.stringify(entries));
}

function loadSettings() {
    try {
        const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
        if (s) settings = { ...settings, ...s };
    } catch {}
    // populate inputs
    document.getElementById('employeeInput').value = settings.employee || '';
    document.getElementById('companyLine1').value = settings.company.line1 || '';
    document.getElementById('companyLine2').value = settings.company.line2 || '';
    document.getElementById('companyZip').value = settings.company.zip || '';
    document.getElementById('companyCity').value = settings.company.city || '';
}

function saveSettings() {
    settings.employee = document.getElementById('employeeInput').value.trim();
    settings.company = {
        line1: document.getElementById('companyLine1').value.trim(),
        line2: document.getElementById('companyLine2').value.trim(),
        zip:   document.getElementById('companyZip').value.trim(),
        city:  document.getElementById('companyCity').value.trim()
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.getElementById('settingsPanel').classList.add('hidden');
}

function monthKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function getEntries() {
    return entries[monthKey(currentDate)] || [];
}

function setEntries(arr) {
    entries[monthKey(currentDate)] = arr;
    saveEntries();
}

function fmt(n) {
    return n.toFixed(2).replace('.', ',') + ' CHF';
}

function fmtDate(iso) {
    const d = new Date(iso+'T00:00:00');
    return d.toLocaleDateString('de-CH', { weekday:'short', day:'2-digit', month:'short' });
}

function render() {
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
                <div>
                    <div class="entry-date">${fmtDate(e.date)}</div>
                    <div class="entry-route">${e.from || ''} → ${e.to || ''}</div>
                </div>
                <span class="entry-km">${e.km.toLocaleString('de-CH')} km</span>
                <span class="entry-amount">${fmt(e.km * RATE)}</span>
                <button class="entry-delete" data-index="${i}" aria-label="Löschen">×</button>
            `;
            ul.appendChild(li);
        });
    }

    const totalKm = list.reduce((s,e)=>s+e.km, 0);
    document.getElementById('totalKm').textContent = totalKm.toLocaleString('de-CH') + ' km';
    document.getElementById('totalAmount').textContent = fmt(totalKm * RATE);
}

// Add entry
document.getElementById('addBtn').addEventListener('click', () => {
    const date = document.getElementById('dateInput').value;
    const from = document.getElementById('fromInput').value.trim();
    const to   = document.getElementById('toInput').value.trim();
    const km = parseInt(document.getElementById('kmInput').value, 10);
    if (!date || isNaN(km) || km < 0) {
        alert('Bitte gültiges Datum und positive Kilometerzahl eingeben.');
        return;
    }
    const list = getEntries();
    list.push({ date, from, to, km });
    setEntries(list);
    document.getElementById('kmInput').value = '';
    document.getElementById('fromInput').value = '';
    document.getElementById('toInput').value = '';
    render();
});

// Delete
document.getElementById('entriesList').addEventListener('click', (e) => {
    const btn = e.target.closest('.entry-delete');
    if (!btn) return;
    const idx = parseInt(btn.dataset.index, 10);
    const list = getEntries();
    list.splice(idx, 1);
    setEntries(list);
    render();
});

// Month nav
document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    render();
});
document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    render();
});

// Clear month
document.getElementById('clearMonth').addEventListener('click', () => {
    if (!confirm('Alle Einträge dieses Monats wirklich löschen?')) return;
    setEntries([]);
    render();
});

// Settings toggle
document.getElementById('settingsToggle').addEventListener('click', () => {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('hidden');
});

document.getElementById('saveSettings').addEventListener('click', saveSettings);

// PDF Export
document.getElementById('exportPdf').addEventListener('click', () => {
    const list = getEntries();
    if (list.length === 0) {
        alert('Keine Einträge zum Exportieren.');
        return;
    }
    const totalKm = list.reduce((s,e)=>s+e.km, 0);
    const monthLabel = currentDate.toLocaleDateString('de-CH',{ month:'long', year:'numeric' });
    const companyAddr = [
        settings.company.line1,
        settings.company.line2,
        [settings.company.zip, settings.company.city].filter(Boolean).join(' ')
    ].filter(Boolean).join('<br>');

    const rows = list.map((e,i) =>
        `<tr>
            <td>${i+1}</td>
            <td>${fmtDate(e.date)}<br><small style="color:#666">${e.from || ''} → ${e.to || ''}</small></td>
            <td style="text-align:right">${e.km.toLocaleString('de-CH')}</td>
            <td style="text-align:right">${fmt(e.km * RATE)}</td>
        </tr>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Spesen ${monthLabel}</title><style>
body{font-family:-apple-system,system-ui,sans-serif;margin:40px;color:#111;line-height:1.5;}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;}
.company{text-align:right;font-size:0.9rem;color:#555;}
h1{font-size:1.5rem;margin-bottom:4px;}
.meta{color:#666;margin-bottom:20px;}
table{width:100%;border-collapse:collapse;margin-top:16px;}
th,td{padding:10px 10px;text-align:left;border-bottom:1px solid #ddd;}
th{background:#f5f5f5;font-weight:600;font-size:0.85rem;}
td:nth-child(n+3),th:nth-child(n+3){text-align:right;}
.route{color:#666;font-size:0.85rem;}
.total{margin-top:20px;font-weight:700;text-align:right;font-size:1.1rem;}
.footer{margin-top:40px;font-size:0.75rem;color:#888;}
</style></head><body>
<div class="header">
    <div>
        <h1>Spesenabrechnung</h1>
        <p class="meta">${monthLabel} · Rate: ${RATE.toFixed(2)} CHF/km</p>
        ${settings.employee ? `<p><strong>Mitarbeiter:</strong> ${settings.employee}</p>` : ''}
    </div>
    ${companyAddr ? `<div class="company"><strong>${settings.company.line1}</strong><br>${settings.company.line2}<br>${settings.company.zip} ${settings.company.city}</div>` : ''}
</div>
<table><thead><tr>
    <th style="width:40px">#</th>
    <th>Datum / Route</th>
    <th style="width:100px">Kilometer</th>
    <th style="width:120px">Betrag</th>
</tr></thead><tbody>${rows}</tbody></table>
<p class="total">Total: ${totalKm.toLocaleString('de-CH')} km · ${fmt(totalKm * RATE)}</p>
<p class="footer">Erstellt mit Spesenrechner · ${new Date().toLocaleDateString('de-CH')}</p>
</body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 300);
});

// Init
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('dateInput').valueAsDate = new Date();
    loadEntries();
    loadSettings();
    render();
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
}
