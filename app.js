// DOM Elements
const glucoseFileInput = document.getElementById('glucoseFile');
const notesFileInput = document.getElementById('notesFile');
const parseBtn = document.getElementById('parseBtn');
const downloadBtn = document.getElementById('downloadBtn');
const output = document.getElementById('output');
const glucoseFileName = document.getElementById('glucoseFileName');
const notesFileName = document.getElementById('notesFileName');

// DTOs
class GlucoseRawData {
    constructor(timestamp, rate) {
        this.timestamp = timestamp;
        this.rate = rate;
    }
}

class NoteData {
    constructor(timestamp, note, details) {
        this.timestamp = timestamp;
        this.note = note;
        this.details = details;
    }
}

class GlucoseFullData {
    constructor(timestamp, glucoseData = null, noteData = null) {
        this.timestamp = timestamp;
        this.glucoseRate = glucoseData ? glucoseData.rate : null;
        this.note = noteData ? noteData.note : null;
        this.details = noteData ? noteData.details : null;
    }
}

// Event Listeners
glucoseFileInput.addEventListener('change', handleFileSelect);
notesFileInput.addEventListener('change', handleFileSelect);
parseBtn.addEventListener('click', handleParse);
downloadBtn.addEventListener('click', handleDownload);

// Level configuration elements
const saveLevelsBtn = document.getElementById('saveLevelsBtn');
const resetLevelsBtn = document.getElementById('resetLevelsBtn');
const hypoLevelInput = document.getElementById('hypoLevel');
const targetLevelInput = document.getElementById('targetLevel');
const mediumLevelInput = document.getElementById('mediumLevel');
const hyperLevelInput = document.getElementById('hyperLevel');

saveLevelsBtn.addEventListener('click', saveLevels);
resetLevelsBtn.addEventListener('click', resetLevels);

// Track selected files and parsed data
let glucoseFile = null;
let notesFile = null;
let joinedData = null;

// Default glucose level settings (mmol/L)
const DEFAULT_LEVELS = {
    hypo: 3.9,    // Hypoglycemia threshold
    target: 5.5,  // Target level
    medium: 7.8,  // Medium threshold (not more than 1 hour in a day)
    hyper: 10.0   // Hyperglycemia threshold
};

// Current glucose levels (loaded from localStorage or defaults)
let currentLevels = { ...DEFAULT_LEVELS };

function handleFileSelect(event) {
    const file = event.target.files[0];

    if (event.target.id === 'glucoseFile') {
        if (file) {
            glucoseFile = file;
            glucoseFileName.textContent = file.name;
        } else {
            // User cancelled file selection - keep previous file if any
            if (!glucoseFile) {
                glucoseFileName.textContent = 'No file chosen';
            }
        }
    } else {
        if (file) {
            notesFile = file;
            notesFileName.textContent = file.name;
        } else {
            // User cancelled file selection - keep previous file if any
            if (!notesFile) {
                notesFileName.textContent = 'No file chosen';
            }
        }
    }

    // Enable parse button only when both files are selected
    if (glucoseFile && notesFile) {
        parseBtn.disabled = false;
    } else {
        parseBtn.disabled = true;
    }
}

async function handleParse() {
    if (!glucoseFile || !notesFile) return;

    try {
        parseBtn.disabled = true;
        parseBtn.textContent = 'Parsing...';

        // Parse both files in parallel
        const [glucoseData, notesData] = await Promise.all([
            parseGlucoseCSV(glucoseFile),
            parseNotesCSV(notesFile)
        ]);

        // Join the data by timestamp
        joinedData = joinDataByTimestamp(glucoseData, notesData);

        // Display results (hidden by default)
        output.textContent = JSON.stringify(joinedData, null, 2);

        // Render the chart
        renderChart(joinedData);

        // Enable download button
        downloadBtn.disabled = false;

    } catch (error) {
        console.error('Error parsing files:', error);
        output.textContent = `Error: ${error.message}`;
    } finally {
        parseBtn.textContent = 'Parse Files';
        parseBtn.disabled = false;
    }
}

async function parseGlucoseCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const csv = event.target.result;
                const lines = csv.split('\n');
                const headers = lines[1].split(',').map(h => h.trim());
                console.log("headers", headers.join('\n'));

                const timestampIndex = headers.indexOf('Device Timestamp');

                // Check for both mmol/L and mg/dL units
                let historicGlucoseIndex = headers.indexOf('Historic Glucose mmol/L');
                let scanGlucoseIndex = headers.indexOf('Scan Glucose mmol/L');
                let isMgDl = false;

                if (historicGlucoseIndex === -1 && scanGlucoseIndex === -1) {
                    // Try mg/dL units
                    historicGlucoseIndex = headers.indexOf('Historic Glucose mg/dL');
                    scanGlucoseIndex = headers.indexOf('Scan Glucose mg/dL');
                    isMgDl = true;
                }

                console.log("parsed indexes: ", timestampIndex, historicGlucoseIndex, scanGlucoseIndex, "isMgDl:", isMgDl);

                if (timestampIndex === -1 || (historicGlucoseIndex === -1 && scanGlucoseIndex === -1)) {
                    throw new Error('Invalid CSV format for glucose data. Expected columns: Device Timestamp and either Historic/Scan Glucose in mmol/L or mg/dL');
                }

                // Deduplicate by timestamp, keeping the first Historic Glucose mmol/L if available
                const resultMap = new Map();

                for (let i = 2; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;

                    const values = lines[i].split(',').map(v => v.trim());
                    const timestampStr = values[timestampIndex];
                    if (!timestampStr) continue;
                    const timestamp = toDate(timestampStr);

                    // If already have a value for this timestamp, skip unless this is the first Historic Glucose
                    if (resultMap.has(timestamp.getTime())) continue;

                    let rate = null;
                    if (values[historicGlucoseIndex]) {
                        rate = parseFloat(values[historicGlucoseIndex]);
                    } else if (values[scanGlucoseIndex]) {
                        rate = parseFloat(values[scanGlucoseIndex]);
                    }
                    if (rate === null || isNaN(rate)) continue;

                    // Convert mg/dL to mmol/L if needed (mg/dL × 0.0555 = mmol/L)
                    if (isMgDl) {
                        rate = rate * 0.0555;
                    }

                    resultMap.set(timestamp.getTime(), new GlucoseRawData(timestamp, rate));
                }

                resolve(Array.from(resultMap.values()));
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsText(file);
    });
}

async function parseNotesCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const csv = event.target.result;
                const lines = csv.split('\n');
                const headers = lines[0].split(';').map(h => h.trim());
                console.log("notes headers", headers.join('\n'));

                const timestampIndex = headers.indexOf('timestamp');
                const noteIndex = headers.indexOf('note');
                const detailsIndex = headers.indexOf('details');
                console.log("parsed indexes: ", timestampIndex, noteIndex, detailsIndex);

                if (timestampIndex === -1 || noteIndex === -1 || detailsIndex === -1) {
                    throw new Error('Invalid CSV format for notes data');
                }

                const result = [];

                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;

                    // Handle quoted values that might contain semicolons
                    const values = lines[i].match(/[^;]+|([^;]*"[^"]*"[^;]*)/g) || [];
                    const timestamp = values[timestampIndex]?.trim();
                    const note = values[noteIndex]?.trim();
                    const details = values[detailsIndex]?.trim();

                    if (timestamp && (note || details)) {
                        result.push(new NoteData(toDate(timestamp), note, details));
                    }
                }

                resolve(result);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsText(file);
    });
}

function joinDataByTimestamp(glucoseData, notesData) {
    // Create a map to store data by timestamp (using timestamp as milliseconds for proper key comparison)
    const resultMap = new Map();

    // Add all glucose data to the map
    for (const glucose of glucoseData) {
        const timeKey = glucose.timestamp.getTime();
        resultMap.set(timeKey, new GlucoseFullData(glucose.timestamp, glucose, null));
    }

    // Add or update with notes data
    for (const note of notesData) {
        const timeKey = note.timestamp.getTime();
        if (resultMap.has(timeKey)) {
            // Update existing entry with notes
            const existing = resultMap.get(timeKey);
            resultMap.set(timeKey, new GlucoseFullData(
                existing.timestamp, // Use existing timestamp to maintain consistency
                { rate: existing.glucoseRate },
                note
            ));
        } else {
            // Add new entry with just notes
            resultMap.set(timeKey, new GlucoseFullData(note.timestamp, null, note));
        }
    }

    // Convert map to array and sort by timestamp
    return Array.from(resultMap.values())
        .sort((a, b) => a.timestamp - b.timestamp);
}

function renderChart(data) {
    // Create the chart
    const chartElement = document.getElementById('chart');
    chartElement.innerHTML = ''; // Clear previous chart if any

    // Add chart title
    const titleElement = document.createElement('div');
    titleElement.style.cssText = 'text-align: center; margin-bottom: 15px; color: #2c3e50; font-size: 20px; font-weight: bold;';
    titleElement.innerHTML = '📊 Glucose Level Chart';
    chartElement.appendChild(titleElement);

    const chart = LightweightCharts.createChart(chartElement, {
        width: chartElement.clientWidth,
        height: 500,
        layout: {
            backgroundColor: '#ffffff',
            textColor: '#333',
        },
        grid: {
            vertLines: {
                color: '#f0f0f0',
            },
            horzLines: {
                color: '#f0f0f0',
            },
        },
        rightPriceScale: {
            borderColor: '#e0e0e0',
        },
        timeScale: {
            borderColor: '#e0e0e0',
            timeVisible: true,
            secondsVisible: false,
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
    });

    // Add glucose line series
    const glucoseSeries = chart.addLineSeries({
        color: '#4a90e2',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        lastValueVisible: true,
        priceLineVisible: true,
    });

    // Prepare data for the chart
    let chartData = data
        .filter(item => item.glucoseRate !== null)
        .map(item => ({
            time: item.timestamp.getTime() / 1000, // Convert to seconds for Lightweight Charts
            value: item.glucoseRate,
        }));

    chartData.forEach(item => {
        console.log("item", item);
        console.log(item.time);
    });

    // Set the data
    glucoseSeries.setData(chartData);

    // Add markers for notes
    const markers = data
        .filter(item => item.note || item.details)
        .map(item => ({
            time: item.timestamp.getTime() / 1000, // Convert to seconds for Lightweight Charts
            position: 'belowBar',
            color: '#f68410',
            shape: 'arrowUp',
            text: item.note || 'Note',
        }));

    markers.forEach(item => {
        console.log("item", item);
        console.log(item.time);
    });


    glucoseSeries.setMarkers(markers);

    // Add configurable lines
    // Target level (green)
    glucoseSeries.createPriceLine({
        price: currentLevels.target,
        color: '#4caf50',
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Target',
    });

    // Hypoglycemia threshold (red)
    glucoseSeries.createPriceLine({
        price: currentLevels.hypo,
        color: '#f44336',
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Hypo',
    });

    // Hyperglycemia threshold (red)
    glucoseSeries.createPriceLine({
        price: currentLevels.hyper,
        color: '#f44336',
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Hyper',
    });

    // Medium threshold (yellow)
    glucoseSeries.createPriceLine({
        price: currentLevels.medium,
        color: '#ffc300',
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Medium',
    });

    // Handle window resize
    const resizeObserver = new ResizeObserver(entries => {
        if (entries.length === 0 || entries[0].target !== chartElement) {
            return;
        }
        const newRect = entries[0].contentRect;
        chart.applyOptions({ width: newRect.width });
    });

    resizeObserver.observe(chartElement);

    // Show tooltip on hover
    const toolTip = document.createElement('div');
    toolTip.className = 'chart-tooltip';
    chartElement.appendChild(toolTip);

    chart.subscribeCrosshairMove(param => {
        if (param.point === undefined || !param.time || param.point.x < 0 || param.point.x > chartElement.clientWidth || param.point.y < 0 || param.point.y > chartElement.clientHeight) {
            toolTip.style.display = 'none';
            return;
        }

        const data = param.seriesData.get(glucoseSeries);
        if (!data) return;

        toolTip.style.display = 'block';
        toolTip.innerHTML = `
            <div>Time: ${new Date(param.time).toLocaleString()}</div>
            <div>Glucose: ${data.value.toFixed(1)} mmol/L</div>
        `;

        const toolTipWidth = toolTip.offsetWidth;
        const toolTipHeight = toolTip.offsetHeight;
        const left = param.point.x + 20;
        const top = param.point.y + 20;

        toolTip.style.left = left + 'px';
        toolTip.style.top = top + 'px';
    });

    // Add styles for tooltip
    const style = document.createElement('style');
    style.textContent = `
        .chart-tooltip {
            position: absolute;
            display: none;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            pointer-events: none;
            z-index: 1000;
            font-size: 12px;
            color: #333;
        }
        .chart-tooltip div {
            margin: 4px 0;
        }
    `;
    document.head.appendChild(style);

    chart.timeScale().fitContent();
}

function toDate(dateString) {
// Разбиваем

    const [datePart, timePart] = dateString.split(' ');
    const [day, month, year] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);

// month - 1, так как в JS месяцы с 0 начинаются
    const jsDate = new Date(year, month - 1, day, hours, minutes);

    return jsDate;
}

function handleDownload() {
    if (!joinedData || joinedData.length === 0) {
        alert('No data to download. Please parse files first.');
        return;
    }

    // Create CSV content
    const csvContent = convertToCSV(joinedData);

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'glucose_data_with_notes.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function convertToCSV(data) {
    // CSV headers
    const headers = ['Timestamp', 'Glucose Rate (mmol/L)', 'Notes'];

    // Convert data to CSV rows
    const rows = data.map(item => {
        const timestamp = item.timestamp.toLocaleString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).replace(',', '');

        const glucoseRate = item.glucoseRate !== null ? item.glucoseRate : '';

        // Combine note and details with colon separator
        let notes = '';
        if (item.note || item.details) {
            if (item.note && item.details) {
                notes = `${item.note}:${item.details}`;
            } else if (item.note) {
                notes = item.note;
            } else if (item.details) {
                notes = item.details;
            }
        }

        // Escape commas and quotes in notes field
        if (notes.includes(',') || notes.includes('"')) {
            notes = `"${notes.replace(/"/g, '""')}"`;
        }

        return [timestamp, glucoseRate, notes];
    });

    // Combine headers and rows
    const csvLines = [headers, ...rows];

    // Convert to CSV string
    return csvLines.map(row => row.join(',')).join('\n');
}

// Level configuration functions
function loadLevels() {
    try {
        const savedLevels = localStorage.getItem('glucoseLevels');
        if (savedLevels) {
            currentLevels = { ...DEFAULT_LEVELS, ...JSON.parse(savedLevels) };
        }
    } catch (error) {
        console.warn('Failed to load saved glucose levels:', error);
        currentLevels = { ...DEFAULT_LEVELS };
    }
    updateLevelInputs();
}

function saveLevels() {
    const levels = {
        hypo: parseFloat(hypoLevelInput.value),
        target: parseFloat(targetLevelInput.value),
        medium: parseFloat(mediumLevelInput.value),
        hyper: parseFloat(hyperLevelInput.value)
    };

    // Validate levels
    if (Object.values(levels).some(level => isNaN(level) || level <= 0)) {
        alert('Please enter valid positive numbers for all glucose levels.');
        return;
    }

    // Save to localStorage and update current levels
    try {
        localStorage.setItem('glucoseLevels', JSON.stringify(levels));
        currentLevels = levels;

        // Re-render chart if data is available
        if (joinedData) {
            renderChart(joinedData);
        }

        alert('✅ Glucose level settings saved successfully!');
    } catch (error) {
        console.error('Failed to save glucose levels:', error);
        alert('❌ Failed to save settings. Please try again.');
    }
}

function resetLevels() {
    if (confirm('Reset glucose levels to default values?')) {
        currentLevels = { ...DEFAULT_LEVELS };
        updateLevelInputs();

        // Clear from localStorage
        try {
            localStorage.removeItem('glucoseLevels');
        } catch (error) {
            console.warn('Failed to clear saved levels:', error);
        }

        // Re-render chart if data is available
        if (joinedData) {
            renderChart(joinedData);
        }

        alert('🔄 Glucose levels reset to defaults!');
    }
}

function updateLevelInputs() {
    hypoLevelInput.value = currentLevels.hypo.toFixed(1);
    targetLevelInput.value = currentLevels.target.toFixed(1);
    mediumLevelInput.value = currentLevels.medium.toFixed(1);
    hyperLevelInput.value = currentLevels.hyper.toFixed(1);
}

// Initialize levels on page load
document.addEventListener('DOMContentLoaded', loadLevels);
