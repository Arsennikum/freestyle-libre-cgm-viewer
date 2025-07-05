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

        // Display results
        output.textContent = JSON.stringify(joinedData, null, 2);

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

                    result.push(new GlucoseRawData(timestamp, rate));
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
                        result.push(new NoteData(timestamp, note, details));
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
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}
