// DOM Elements
const glucoseFileInput = document.getElementById('glucoseFile');
const notesFileInput = document.getElementById('notesFile');
const parseBtn = document.getElementById('parseBtn');
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

// Track selected files
let glucoseFile = null;
let notesFile = null;

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (event.target.id === 'glucoseFile') {
        glucoseFile = file;
        glucoseFileName.textContent = file.name;
    } else {
        notesFile = file;
        notesFileName.textContent = file.name;
    }

    // Enable parse button only when both files are selected
    if (glucoseFile && notesFile) {
        parseBtn.disabled = false;
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
        const joinedData = joinDataByTimestamp(glucoseData, notesData);

        // Display results (hidden by default)
        output.textContent = JSON.stringify(joinedData, null, 2);
        
        // Render the chart
        renderChart(joinedData);

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
                const historicGlucoseIndex = headers.indexOf('Historic Glucose mmol/L');
                const scanGlucoseIndex = headers.indexOf('Scan Glucose mmol/L');
                console.log("parsed indexes: ", timestampIndex, historicGlucoseIndex, scanGlucoseIndex);

                if (timestampIndex === -1 || (historicGlucoseIndex === -1 && scanGlucoseIndex === -1)) {
                    throw new Error('Invalid CSV format for glucose data');
                }

                const result = [];

                for (let i = 2; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;

                    const values = lines[i].split(',').map(v => v.trim());
                    const timestamp = values[timestampIndex];

                    // Get rate from Historic Glucose or fallback to Scan Glucose
                    let rate = null;
                    if (values[historicGlucoseIndex]) {
                        rate = parseFloat(values[historicGlucoseIndex]);
                    } else if (values[scanGlucoseIndex]) {
                        rate = parseFloat(values[scanGlucoseIndex]);
                    }

                    // Skip if no valid rate is available
                    if (rate === null || isNaN(rate) || !timestamp) continue;

                    result.push(new GlucoseRawData(toDate(timestamp), rate));
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
    // Create a map to store data by timestamp
    const resultMap = new Map();

    // Add all glucose data to the map
    for (const glucose of glucoseData) {
        resultMap.set(glucose.timestamp, new GlucoseFullData(glucose.timestamp, glucose, null));
    }

    // Add or update with notes data
    for (const note of notesData) {
        if (resultMap.has(note.timestamp)) {
            // Update existing entry with notes
            const existing = resultMap.get(note.timestamp);
            resultMap.set(note.timestamp, new GlucoseFullData(
                note.timestamp,
                { rate: existing.glucoseRate },
                note
            ));
        } else {
            // Add new entry with just notes
            resultMap.set(note.timestamp, new GlucoseFullData(note.timestamp, null, note));
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

    chartData = chartData.slice(1,9); // todo fixme - remove doubles in data
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

    // Add price line at 5.5 mmol/L (100 mg/dL) - common target range
    glucoseSeries.createPriceLine({
        price: 5.5,
        color: '#4caf50',
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Target',
    });

    // Add price line at 3.9 mmol/L (70 mg/dL) - hypoglycemia threshold
    glucoseSeries.createPriceLine({
        price: 3.9,
        color: '#f44336',
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Hypo',
    });

    // Add price line at 10 mmol/L (180 mg/dL) - hyperglycemia threshold
    glucoseSeries.createPriceLine({
        price: 10,
        color: '#f44336',
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Hyper',
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
