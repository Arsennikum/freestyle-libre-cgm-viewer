// DOM Elements
const glucoseFileInput = document.getElementById('glucoseFile');
const notesFileInput = document.getElementById('notesFile');
const parseBtn = document.getElementById('parseBtn');
const output = document.getElementById('output');
const glucoseFileName = document.getElementById('glucoseFileName');
const notesFileName = document.getElementById('notesFileName');

// DTOs
class GlucoseData {
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

        // Display results
        output.textContent = JSON.stringify({
            glucoseData: glucoseData,
            notesData: notesData
        }, null, 2);
        
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
                    let rate = '';
                    if (values[historicGlucoseIndex]) {
                        rate = parseInt(values[historicGlucoseIndex], 10);
                    } else if (values[scanGlucoseIndex]) {
                        rate = parseInt(values[scanGlucoseIndex], 10);
                    }
                    
                    // Skip if no rate is available
                    if (!rate || isNaN(rate) || !timestamp) continue;
                    
                    result.push(new GlucoseData(timestamp, rate));
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
