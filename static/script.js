// Loading Overlay Management
let loadingCount = 0;
function showLoading() {
    loadingCount++;
    document.getElementById('loadingOverlay').classList.add('active');
}
function hideLoading() {
    loadingCount--;
    if (loadingCount <= 0) {
        loadingCount = 0;
        document.getElementById('loadingOverlay').classList.remove('active');
    }
}

// Modal Management
function initHelpModal() {
    const hideHelp = localStorage.getItem('hide_help_modal');
    if (!hideHelp) {
        document.getElementById('helpModal').classList.add('active');
    }
}

function closeHelpModal() {
    const hideCheck = document.getElementById('hideHelpCheck').checked;
    if (hideCheck) {
        localStorage.setItem('hide_help_modal', 'true');
    }
    document.getElementById('helpModal').classList.remove('active');
}

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    document.getElementById('themeToggle').innerText = savedTheme === 'dark' ? '☀️' : '🌙';
    updateChartColors();
}

function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    document.getElementById('themeToggle').innerText = newTheme === 'dark' ? '☀️' : '🌙';
    updateChartColors();
}

function updateChartColors() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#e0e0e0' : '#666';
    const gridColor = isDark ? '#333333' : '#e5e5e5';

    Chart.defaults.color = textColor;
    Chart.defaults.scale.grid.color = gridColor;

    Object.values(charts).forEach(chart => {
        if(chart.options.scales.x) {
            chart.options.scales.x.ticks.color = textColor;
            chart.options.scales.x.grid.color = gridColor;
        }
        if(chart.options.scales.y) {
            chart.options.scales.y.ticks.color = textColor;
            chart.options.scales.y.grid.color = gridColor;
        }
        if(chart.options.plugins.title) {
            chart.options.plugins.title.color = textColor;
        }
        chart.update();
    });
}

// Global State
let tracks = [];
let charts = {}; 
let isPlaying = false;
let globalTime = 0;
let maxDuration = 0;
let hoverTime = null;
let referenceTrackId = null; 
let xAxisMode = 'time'; // 'time' or 'distance'
const PALETTE = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#000075'];
let colorIdx = 0;

// Token Handling & Login Button Logic
const urlParams = new URLSearchParams(window.location.hash.replace('#', '?'));
let stravaToken = urlParams.get('access_token');

if(stravaToken) {
    document.getElementById('loginContainer').innerHTML = '<button class="btn-primary" onclick="handleLoginToggle()">Strava trennen</button>';
}

function handleLoginToggle() {
    if (stravaToken) {
        window.location.href = window.location.pathname;
    } else {
        window.location.href = '/login';
    }
}

// Map Setup
const map = L.map('map').setView([47.26, 11.40], 12);

const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

osmLayer.addTo(map);
const baseMaps = { "OpenStreetMap": osmLayer, "OpenTopoMap": topoLayer };
L.control.layers(baseMaps).addTo(map);

// Settings Functions
function setXAxis(mode) {
    xAxisMode = mode;
    recalcMaxDuration();
    updateAllCharts();
    resetZoom();
    syncGlobal();
}

function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.chart-box').forEach(box => box.classList.remove('active'));
    
    btnElement.classList.add('active');
    document.getElementById(`box-${tabId}`).classList.add('active');
    
    if (charts[tabId]) {
        charts[tabId].resize();
    }
}

function getDistanceAtTime(tr, targetTime) {
    if (!tr.stream.distance) return 0;
    const times = tr.stream.time.data;
    const dists = tr.stream.distance.data;
    if (targetTime <= times[0]) return dists[0];
    if (targetTime >= times[times.length - 1]) return dists[dists.length - 1];
    for (let i = 0; i < times.length - 1; i++) {
        if (targetTime >= times[i] && targetTime <= times[i+1]) {
            const r = (targetTime - times[i]) / (times[i+1] - times[i]);
            return dists[i] + r * (dists[i+1] - dists[i]);
        }
    }
    return 0;
}

function getActiveX() {
    let t = hoverTime !== null ? hoverTime : globalTime;
    if (xAxisMode === 'time') return t;
    
    const tr = tracks.find(x => x.visible);
    if (tr && tr.stream.distance) {
        const adjustedT = t + tr.cropStart;
        const distAtCropStart = getDistanceAtTime(tr, tr.cropStart);
        const currentDist = getDistanceAtTime(tr, adjustedT);
        return currentDist - distAtCropStart;
    }
    return t;
}

// Sync Plugin
const syncPlugin = {
    id: 'syncPlugin',
    afterDraw: (chart) => {
        const activeX = getActiveX();
        const {ctx, scales: {x, y}} = chart;
        
        if (!x || !y) return;

        const xPixel = x.getPixelForValue(activeX);
        if (xPixel >= x.left && xPixel <= x.right) {
            ctx.save();
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = hoverTime !== null ? 'rgba(150,150,150,0.8)' : '#fc4c02';
            ctx.beginPath();
            ctx.moveTo(xPixel, y.top);
            ctx.lineTo(xPixel, y.bottom);
            ctx.stroke();
            ctx.restore();
        }
        updateValueLegend(chart, activeX);
    }
};

function formatPace(decimalMin) {
    if (!decimalMin || decimalMin === Infinity) return "0:00";
    const isNegative = decimalMin < 0;
    const absVal = Math.abs(decimalMin);
    const mins = Math.floor(absVal);
    const secs = Math.round((absVal - mins) * 60);
    return `${isNegative ? '-' : ''}${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateValueLegend(chart, activeX) {
    const id = chart.canvas.id.split('Chart')[0];
    const legendDiv = document.getElementById(`vals-${id}`);
    if (!legendDiv) return;
    
    const units = { altitude: 'm', speed: 'min/km', cadence: 'spm', hr: 'bpm' };
    const unit = units[id] || '';
    
    let html = "";
    const xLabel = xAxisMode === 'time' ? 'Zeit' : 'Distanz';
    const xUnit = xAxisMode === 'time' ? 's' : 'm';
    const xValDisplay = activeX.toFixed(0);
    
    html += `<div style="font-weight:bold; margin-bottom:4px;">${xLabel}: ${xValDisplay}${xUnit}</div>`;

    chart.data.datasets.forEach(ds => {
        if (ds.hidden || ds.data.length === 0) return;
        
        let closest = ds.data[0];
        let minDiff = Math.abs(closest.x - activeX);
        for(let i=1; i<ds.data.length; i++) {
            let diff = Math.abs(ds.data[i].x - activeX);
            if(diff < minDiff) {
                minDiff = diff;
                closest = ds.data[i];
            }
        }
        
        const threshold = xAxisMode === 'distance' ? 100 : 5;
        if (minDiff < threshold) {
            let valStr = id === 'speed' ? formatPace(closest.y) : closest.y.toFixed(1);
            const prefix = referenceTrackId ? 'Δ ' : '';
            html += `<div style="color:${ds.borderColor}">● ${ds.label}: ${prefix}${valStr} ${unit}</div>`;
        }
    });
    legendDiv.innerHTML = html;
}

function createChart(id, title) {
    return new Chart(document.getElementById(id), {
        type: 'line',
        data: { datasets: [] },
        plugins: [syncPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { 
                title: { display: true, text: title, font: {size: 12} }, 
                legend: { display: false },
                tooltip: { enabled: false },
                zoom: {
                    pan: { enabled: true, mode: 'x' },
                    zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x', onZoomComplete: syncZoom }
                }
            },
            scales: { 
                x: { 
                    type: 'linear', 
                    ticks: { 
                        display: true,
                        callback: function(value) {
                            if (xAxisMode === 'time') {
                                const absVal = Math.abs(value);
                                const h = Math.floor(absVal / 3600);
                                const m = Math.floor((absVal % 3600) / 60);
                                const s = Math.floor(absVal % 60);
                                const sign = value < 0 ? '-' : '';
                                if (h > 0) return `${sign}${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                                return `${sign}${m}:${s.toString().padStart(2, '0')}`;
                            } else {
                                return (value / 1000).toFixed(1) + ' km';
                            }
                        }
                    } 
                } 
            },
            onHover: (e, el, chart) => {
                if (isPlaying) return;
                if (Object.keys(charts).length === 4) {
                    const canvasPosition = Chart.helpers.getRelativePosition(e, chart);
                    const hoveredX = chart.scales.x.getValueForPixel(canvasPosition.x);
                    
                    if (xAxisMode === 'time') {
                        hoverTime = hoveredX;
                    } else {
                        const tr = tracks.find(t => t.visible);
                        if (tr && tr.stream.distance) {
                            const dists = tr.stream.distance.data;
                            const times = tr.stream.time.data;
                            const distAtCropStart = getDistanceAtTime(tr, tr.cropStart);
                            const targetDist = hoveredX + distAtCropStart;
                            
                            let tVal = times[0];
                            for (let i = 0; i < dists.length - 1; i++) {
                                if (targetDist >= dists[i] && targetDist <= dists[i+1]) {
                                    const r = (targetDist - dists[i]) / (dists[i+1] - dists[i]);
                                    tVal = times[i] + r * (times[i+1] - times[i]);
                                    break;
                                }
                            }
                            hoverTime = tVal - tr.cropStart;
                        } else {
                            hoverTime = hoveredX;
                        }
                    }
                    syncGlobal();
                }
            }
        }
    });
}

charts = {
    altitude: createChart('altitudeChart', 'Altitude (m)'),
    speed: createChart('speedChart', 'Pace (min/km)'),
    cadence: createChart('cadenceChart', 'Cadence (spm)'),
    hr: createChart('hrChart', 'Heart Rate (bpm)')
};

function syncZoom({chart}) {
    const min = chart.scales.x.min;
    const max = chart.scales.x.max;
    Object.values(charts).forEach(c => {
        if(c !== chart) {
            c.options.scales.x.min = min;
            c.options.scales.x.max = max;
            c.update('none');
        }
    });
}

function resetZoom() {
    Object.values(charts).forEach(c => {
        c.resetZoom();
        c.options.scales.x.min = undefined;
        c.options.scales.x.max = undefined;
        c.update();
    });
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('collapsed'); }

function recalcMaxDuration() {
    maxDuration = 0;
    let maxDistance = 0;
    
    tracks.forEach(t => {
        if (t.visible) {
            maxDuration = Math.max(maxDuration, t.cropEnd - t.cropStart);
            if (t.stream.distance) {
                const dStart = getDistanceAtTime(t, t.cropStart);
                const dEnd = getDistanceAtTime(t, t.cropEnd);
                maxDistance = Math.max(maxDistance, dEnd - dStart);
            }
        }
    });
    
    const slider = document.getElementById('globalSlider');
    if (xAxisMode === 'time') {
        slider.max = maxDuration;
        if (globalTime > maxDuration) {
            globalTime = maxDuration;
        }
    } else {
        slider.max = maxDistance;
    }
}

function calculateCenteredMovingAverage(data, times, windowSeconds) {
    const smoothed = new Array(data.length);
    const halfWindow = windowSeconds / 2;
    for (let i = 0; i < data.length; i++) {
        let sum = 0;
        let count = 0;
        const targetTime = times[i];
        
        for (let j = i; j >= 0; j--) {
            if (targetTime - times[j] > halfWindow) break;
            sum += data[j];
            count++;
        }
        for (let j = i + 1; j < data.length; j++) {
            if (times[j] - targetTime > halfWindow) break;
            sum += data[j];
            count++;
        }
        smoothed[i] = sum / count;
    }
    return smoothed;
}

async function fetchTrack(id = null, cropStart = null, cropEnd = null, isBatch = false) {
    const actId = id || document.getElementById('actIdIn').value;
    if (!actId || !stravaToken) return alert("Bitte verbinde zuerst Strava.");
    
    if (!isBatch) showLoading();

    try {
        const headers = {
            'Authorization': `Bearer ${stravaToken}`
        };
        const [sRes, iRes] = await Promise.all([
            fetch(`/stream/${actId}`, { headers }),
            fetch(`/activity-info/${actId}`, { headers })
        ]);
        
        if (!sRes.ok || !iRes.ok) {
            const errorMsg = !sRes.ok ? await sRes.text() : await iRes.text();
            throw new Error(`Aktivität konnte nicht geladen werden (${sRes.status}). Details: ${errorMsg || 'Möglicherweise ist sie privat oder gehört einem anderen Nutzer.'}`);
        }

        const stream = await sRes.json();
        const info = await iRes.json();
        
        if (stream.time && stream.time.data) {
            if (stream.velocity_smooth && stream.velocity_smooth.data) {
                stream.velocity_smooth.data = calculateCenteredMovingAverage(stream.velocity_smooth.data, stream.time.data, 15);
            }
            if (stream.cadence && stream.cadence.data) {
                stream.cadence.data = calculateCenteredMovingAverage(stream.cadence.data, stream.time.data, 10);
            }
        }
        
        const color = PALETTE[colorIdx++ % PALETTE.length];
        
        let athleteName = 'Unknown';
        if (info.athlete && info.athlete.firstname) {
            athleteName = `${info.athlete.firstname} ${info.athlete.lastname || ''}`.trim();
        } else if (info.athlete && info.athlete.id) {
            athleteName = `Athlete ID: ${info.athlete.id}`;
        }

        const maxTime = stream.time.data[stream.time.data.length - 1];

        const track = {
            id: actId, name: info.name, athlete: athleteName,
            date: new Date(info.start_date).toLocaleDateString(), 
            stream, color, 
            cropStart: cropStart !== null ? parseFloat(cropStart) : 0,
            cropEnd: cropEnd !== null ? parseFloat(cropEnd) : maxTime,
            visible: true,
            marker: L.circleMarker([0,0], { color: 'white', fillColor: color, fillOpacity: 1, radius: 7 })
                .bindTooltip(info.name, { permanent: false, direction: 'top' })
                .addTo(map),
            poly: L.polyline(stream.latlng.data, { color, weight: 3, opacity: 0.5 }).addTo(map)
        };
        tracks.push(track);
        
        recalcMaxDuration();
        renderTrackItem(track);
        updateAllCharts();
        map.fitBounds(track.poly.getBounds());
        syncGlobal();
        document.getElementById('actIdIn').value = '';
    } catch (e) { 
        alert(e.message); 
    } finally {
        if (!isBatch) hideLoading();
    }
}

function renderTrackItem(t) {
    const div = document.createElement('div');
    div.className = 'track-item';
    div.id = `item-${t.id}`;
    div.style.borderLeft = `5px solid ${t.color}`;
    
    const trackDuration = t.stream.time.data[t.stream.time.data.length - 1];
    
    div.innerHTML = `
        <h4 style="margin:0; display:flex; justify-content:space-between; align-items:flex-start;">
            <span style="flex:1">${t.name}</span>
            <button onclick="removeTrack('${t.id}')" style="border:none; background:none; cursor:pointer; font-size:1rem; padding:0 0 0 10px; color:var(--text-color)">✕</button>
        </h4>
        <div style="font-size:0.75rem; color:var(--text-muted); font-weight:bold; margin:2px 0">${t.athlete}</div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.7rem; color:var(--text-muted)">${t.date}</span>
            <a href="https://www.strava.com/activities/${t.id}" target="_blank" style="font-size:0.7rem; color:var(--strava-orange); text-decoration:none;">View on Strava ↗</a>
        </div>
        <div style="margin-top:8px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <button onclick="toggleVisibility('${t.id}')" id="vis-${t.id}" style="border:none; background:none; cursor:pointer; font-size:1.1rem; padding:0" title="Sichtbarkeit umschalten">👁️</button>
                <button onclick="setReference('${t.id}')" id="ref-${t.id}" style="border:none; background:none; cursor:pointer; font-size:1.1rem; padding:0; opacity:0.3" title="Als Referenz setzen">🎯</button>
            </div>
            <div style="display:flex; align-items:center; gap:8px; width:100%; margin-top: 5px;">
                <span id="startval-${t.id}" style="font-size:0.7rem; font-weight:bold; width:35px; text-align:right;">${t.cropStart}s</span>
                <div class="dual-range" style="flex:1;">
                    <div class="dual-range-track"></div>
                    <input type="range" id="cropStart-${t.id}" min="0" max="${trackDuration}" value="${t.cropStart}" oninput="updateCrop('${t.id}', 'start', this.value)">
                    <input type="range" id="cropEnd-${t.id}" min="0" max="${trackDuration}" value="${t.cropEnd}" oninput="updateCrop('${t.id}', 'end', this.value)">
                </div>
                <span id="endval-${t.id}" style="font-size:0.7rem; font-weight:bold; width:35px; text-align:left;">${t.cropEnd}s</span>
            </div>
        </div>
    `;
    document.getElementById('trackList').appendChild(div);
}

function setReference(id) {
    if (referenceTrackId === id) {
        referenceTrackId = null;
    } else {
        referenceTrackId = id;
    }
    
    tracks.forEach(t => {
        const btn = document.getElementById(`ref-${t.id}`);
        if (btn) btn.style.opacity = (referenceTrackId === t.id) ? "1" : "0.3";
    });
    
    updateAllCharts();
}

function toggleVisibility(id) {
    const t = tracks.find(x => x.id === id);
    t.visible = !t.visible;
    document.getElementById(`vis-${id}`).style.opacity = t.visible ? "1" : "0.3";
    if (t.visible) { t.marker.addTo(map); t.poly.addTo(map); } else { map.removeLayer(t.marker); map.removeLayer(t.poly); }
    recalcMaxDuration();
    updateAllCharts();
    syncGlobal();
}

function removeTrack(id) {
    const idx = tracks.findIndex(t => t.id === id);
    if (idx > -1) {
        map.removeLayer(tracks[idx].marker); map.removeLayer(tracks[idx].poly);
        tracks.splice(idx, 1);
        document.getElementById(`item-${id}`).remove();
        if (referenceTrackId === id) referenceTrackId = null;
        recalcMaxDuration();
        updateAllCharts();
        syncGlobal();
    }
}

function updateCrop(id, type, val) {
    const t = tracks.find(x => x.id === id);
    if (!t) return;
    
    let numVal = parseFloat(val);
    if (type === 'start') {
        t.cropStart = Math.min(numVal, t.cropEnd);
        document.getElementById(`cropStart-${id}`).value = t.cropStart;
        document.getElementById(`startval-${id}`).innerText = t.cropStart + 's';
    } else {
        t.cropEnd = Math.max(numVal, t.cropStart);
        document.getElementById(`cropEnd-${id}`).value = t.cropEnd;
        document.getElementById(`endval-${id}`).innerText = t.cropEnd + 's';
    }
    
    recalcMaxDuration();
    updateAllCharts();
    syncGlobal();
}

function updateAllCharts() {
    const refTrack = referenceTrackId ? tracks.find(t => t.id === referenceTrackId) : null;

    const getRefValue = (key, globalTime) => {
        if (!refTrack || !refTrack.stream[key]) return 0;
        const refLocalTime = globalTime + refTrack.cropStart;
        if (refLocalTime < refTrack.cropStart || refLocalTime > refTrack.cropEnd) return 0;
        
        const times = refTrack.stream.time.data;
        let closestIdx = 0;
        let minDiff = Infinity;
        for (let i = 0; i < times.length; i++) {
            let diff = Math.abs(times[i] - refLocalTime);
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = i;
            }
        }
        
        let val = refTrack.stream[key].data[closestIdx];
        if (key === 'velocity_smooth') {
            val = val > 0.5 ? (1000 / (val * 60)) : 0;
        }
        return val;
    };

    const createDs = (t, key) => {
        const distAtCropStart = xAxisMode === 'distance' ? getDistanceAtTime(t, t.cropStart) : 0;
        const filteredData = [];
        
        for (let i = 0; i < t.stream.time.data.length; i++) {
            const time = t.stream.time.data[i];
            if (time >= t.cropStart && time <= t.cropEnd) {
                let val = t.stream[key] ? t.stream[key].data[i] : 0;
                if (key === 'velocity_smooth') {
                    val = val > 0.5 ? (1000 / (val * 60)) : 0;
                }
                
                const globalTime = time - t.cropStart;
                
                if (refTrack) {
                    const refVal = getRefValue(key, globalTime);
                    val = val - refVal;
                }
                
                let xVal = globalTime;
                if (xAxisMode === 'distance' && t.stream.distance) {
                    xVal = t.stream.distance.data[i] - distAtCropStart;
                }
                
                filteredData.push({ x: xVal, y: val });
            }
        }
        
        return {
            label: t.name,
            data: filteredData,
            borderColor: t.color, borderWidth: 1.5, pointRadius: 0, tension: 0.1, hidden: !t.visible
        };
    };

    charts.altitude.data.datasets = tracks.map(t => createDs(t, 'altitude'));
    charts.cadence.data.datasets = tracks.map(t => createDs(t, 'cadence'));
    charts.hr.data.datasets = tracks.map(t => createDs(t, 'heartrate'));
    charts.speed.data.datasets = tracks.map(t => createDs(t, 'velocity_smooth'));
    
    const suffix = refTrack ? ' (Delta zur Referenz)' : '';
    const xSuffix = xAxisMode === 'distance' ? ' [Distanz]' : ' [Zeit]';
    
    charts.altitude.options.plugins.title.text = 'Altitude (m)' + suffix + xSuffix;
    charts.cadence.options.plugins.title.text = 'Cadence (spm)' + suffix + xSuffix;
    charts.hr.options.plugins.title.text = 'Heart Rate (bpm)' + suffix + xSuffix;
    charts.speed.options.plugins.title.text = 'Pace (min/km)' + suffix + xSuffix;

    Object.values(charts).forEach(c => c.update());
}

function syncGlobal() {
    const t = hoverTime !== null ? hoverTime : globalTime;
    tracks.forEach(tr => {
        if (!tr.visible) return;
        const adjustedT = t + tr.cropStart;
        const clampedT = Math.max(tr.cropStart, Math.min(tr.cropEnd, adjustedT));
        
        const times = tr.stream.time.data;
        const latlngs = tr.stream.latlng.data;
        for (let i = 0; i < times.length - 1; i++) {
            if (clampedT >= times[i] && clampedT <= times[i+1]) {
                const r = (clampedT - times[i]) / (times[i+1] - times[i]);
                tr.marker.setLatLng([
                    latlngs[i][0] + r * (latlngs[i+1][0] - latlngs[i][0]),
                    latlngs[i][1] + r * (latlngs[i+1][1] - latlngs[i][1])
                ]);
                break;
            }
        }
    });
    
    const slider = document.getElementById('globalSlider');
    const disp = document.getElementById('timeDisp');
    
    if (xAxisMode === 'time') {
        slider.value = globalTime;
        disp.innerText = new Date(globalTime * 1000).toISOString().substr(14, 5);
    } else {
        const tr = tracks.find(x => x.visible);
        let currentDist = 0;
        if (tr && tr.stream.distance) {
            const adjustedT = globalTime + tr.cropStart;
            const distAtCropStart = getDistanceAtTime(tr, tr.cropStart);
            currentDist = getDistanceAtTime(tr, adjustedT) - distAtCropStart;
        }
        slider.value = currentDist;
        disp.innerText = (currentDist / 1000).toFixed(2) + ' km';
    }
    
    if (Object.keys(charts).length === 4) {
        Object.values(charts).forEach(c => c.draw());
    }
}

// Storage logic
function saveCurrentSet() {
    const title = document.getElementById('setNameIn').value || "Set " + new Date().toLocaleDateString();
    const set = { title, tracks: tracks.map(t => ({ id: t.id, cropStart: t.cropStart, cropEnd: t.cropEnd })) };
    let saved = JSON.parse(localStorage.getItem('strava_sets') || '[]');
    
    const existingIndex = saved.findIndex(s => s.title === title);
    if (existingIndex !== -1) {
        if (!confirm(`Ein Set mit dem Namen "${title}" existiert bereits. Möchtest du es überschreiben?`)) {
            return;
        }
        saved[existingIndex] = set;
    } else {
        saved.push(set);
    }
    
    localStorage.setItem('strava_sets', JSON.stringify(saved));
    loadSavedSetsList();
    
    const newIndex = saved.findIndex(s => s.title === title);
    document.getElementById('setsSelect').value = newIndex;
}

function deleteCurrentSet() {
    const sel = document.getElementById('setsSelect');
    const idx = sel.value;
    if (idx === "") {
        alert("Bitte wähle zuerst ein Set aus, das gelöscht werden soll.");
        return;
    }
    
    let saved = JSON.parse(localStorage.getItem('strava_sets') || '[]');
    const title = saved[idx].title;
    
    if (confirm(`Möchtest du das Set "${title}" wirklich löschen?`)) {
        saved.splice(idx, 1);
        localStorage.setItem('strava_sets', JSON.stringify(saved));
        loadSavedSetsList();
        document.getElementById('setNameIn').value = "";
    }
}

function loadSavedSetsList() {
    const sel = document.getElementById('setsSelect');
    sel.innerHTML = '<option value="">-- Load Set --</option>';
    const saved = JSON.parse(localStorage.getItem('strava_sets') || '[]');
    saved.forEach((s, i) => {
        const opt = document.createElement('option'); opt.value = i; opt.innerText = s.title; sel.appendChild(opt);
    });
}

async function loadSet(idx) {
    if (idx === "") return;
    showLoading();
    try {
        const set = JSON.parse(localStorage.getItem('strava_sets'))[idx];
        document.getElementById('setNameIn').value = set.title;
        [...tracks].forEach(t => removeTrack(t.id));
        for (const t of set.tracks) {
            await fetchTrack(t.id, t.cropStart, t.cropEnd, true);
        }
    } finally {
        hideLoading();
    }
}

function playLoop() {
    if (!isPlaying) return;
    globalTime += (0.5 * parseFloat(document.getElementById('speedMult').value));
    if (globalTime > maxDuration) globalTime = 0;
    syncGlobal();
    setTimeout(() => requestAnimationFrame(playLoop), 500);
}

document.getElementById('playBtn').onclick = () => {
    isPlaying = !isPlaying;
    document.getElementById('playBtn').innerText = isPlaying ? 'Pause' : 'Play';
    if (isPlaying) { hoverTime = null; playLoop(); }
};

document.getElementById('globalSlider').oninput = (e) => {
    const val = parseFloat(e.target.value);
    if (xAxisMode === 'time') {
        globalTime = val;
    } else {
        const tr = tracks.find(x => x.visible);
        if (tr && tr.stream.distance) {
            const dists = tr.stream.distance.data;
            const times = tr.stream.time.data;
            const distAtCropStart = getDistanceAtTime(tr, tr.cropStart);
            const targetDist = val + distAtCropStart;
            
            let tVal = times[0];
            for (let i = 0; i < dists.length - 1; i++) {
                if (targetDist >= dists[i] && targetDist <= dists[i+1]) {
                    const r = (targetDist - dists[i]) / (dists[i+1] - dists[i]);
                    tVal = times[i] + r * (times[i+1] - times[i]);
                    break;
                }
            }
            globalTime = tVal - tr.cropStart;
        } else {
            globalTime = val;
        }
    }
    hoverTime = null;
    syncGlobal();
};

// NEUE Funktion: Lade Version vom Backend
async function loadVersion() {
    try {
        const response = await fetch('/version');
        if (response.ok) {
            const data = await response.json();
            document.getElementById('versionDisplay').textContent = 
                data.version.substring(0, 7); // Kürze auf 7 Zeichen
        } else {
            document.getElementById('versionDisplay').textContent = "unbekannt";
        }
    } catch (error) {
        document.getElementById('versionDisplay').textContent = "Fehler";
        console.error("Version load error:", error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initHelpModal();
    loadSavedSetsList();
    loadVersion();
});
