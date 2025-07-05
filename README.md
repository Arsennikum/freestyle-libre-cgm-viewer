# CGM Data Parser

A Kotlin/JS web application for parsing and displaying CGM (Continuous Glucose Monitoring) data and related notes from CSV files.

## Features

- Upload and parse glucose data from CSV files
- Upload and parse notes data from CSV files
- Display parsed data in a clean, tabular format
- Responsive design that works on desktop and mobile devices

## Getting Started

### Prerequisites

- JDK 11 or higher
- Gradle 7.0 or higher

### Running the Application

1. Clone the repository
2. Build the project:
   ```bash
   ./gradlew build
   ```
3. Run the development server:
   ```bash
   ./gradlew run
   ```
4. Open your browser and navigate to `http://localhost:8080`

## File Formats

### Glucose Data CSV Format
```
Device;Serial Number;Device Timestamp;Record Type;Historic Glucose mmol/L;Scan Glucose mmol/L
;;28-06-2025 21:15;0;117
;;28-06-2025 21:20;0;119
;;28-06-2025 21:39;1;;130
```

### Notes Data CSV Format
```
timestamp;note;details
29-06-2025 09:38;Завтрак;Овсянка долгой варки, хумус, авокадо
29-06-2025 09:57;Прогулка;Идём 15 мин ко храму в горку
```

## Building for Production

To create a production build:

```bash
./gradlew build
```

The compiled files will be available in the `build/distributions` directory.
