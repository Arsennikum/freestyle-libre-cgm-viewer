# 📊 Glucose Level Tracker

A web-based tool for visualizing continuous glucose monitor (CGM) data alongside personal notes and activities. Parse CSV files from LibreView and create interactive charts with customizable reference lines.

🔗 **Live Demo:** [https://arsennikum.github.io/freestyle-libre-cgm-viewer/](https://arsennikum.github.io/freestyle-libre-cgm-viewer/)

## ✨ Features

- **📈 Interactive Charts**: Visualize glucose trends with TradingView's Lightweight Charts library
- **📝 Activity Tracking**: Combine glucose data with personal notes and activities
- **🎯 Customizable Reference Lines**: Set your own target, hypo, hyper, and medium thresholds
- **🔄 Unit Conversion**: Automatic conversion from mg/dL to mmol/L
- **💾 Settings Persistence**: Your custom glucose levels are saved in browser cache
- **📱 Mobile Friendly**: Responsive design works on all devices
- **📊 CSV Export**: Download combined data with glucose readings and notes
- **🚀 Example Files**: Includes sample data to try the tool immediately

## 🚀 Quick Start

🌐 **Visit the app**: [https://arsennikum.github.io/freestyle-libre-cgm-viewer/](https://arsennikum.github.io/freestyle-libre-cgm-viewer/)

📋 **All instructions are available on the website** - the app includes comprehensive guides for:
- Exporting data from LibreView
- Creating notes CSV using AI prompts
- Configuring glucose level thresholds

**Or follow these steps:**
1. **Try with Examples**: Download the sample files directly from the web app
2. **Upload Your Data**: Export glucose data from LibreView and upload your notes CSV
3. **Parse & Visualize**: Click "Parse Files" to generate your interactive chart
4. **Customize**: Configure your glucose level thresholds in the settings

## 📋 Data Requirements

### Glucose Data (CSV)
Export from LibreView with these required columns:
- `Device Timestamp` (format: DD-MM-YYYY HH:MM)
- `Historic Glucose mmol/L` or `Historic Glucose mg/dL`
- `Scan Glucose mmol/L` or `Scan Glucose mg/dL`

### Notes Data (CSV)
Semicolon-separated format:
```csv
timestamp;note;details
29-06-2025 13:23;sport;Lifting 15 min, max power
29-06-2025 13:45;lunch;complex meal with meat and bread
```

## 🤖 Creating Notes with AI

The app includes a ready-to-use AI prompt to convert your messenger logs into structured CSV:

1. Copy your daily messages from Telegram/WhatsApp
2. Use the provided AI prompt in ChatGPT/Claude
3. Save the output as a CSV file
4. Upload alongside your glucose data

## 🎯 Default Glucose Levels (mmol/L)

- **🔴 Hypoglycemia (Low):** 3.9 mmol/L (70 mg/dL)
- **🟢 Target (Normal):** 5.5 mmol/L (100 mg/dL)
- **🟡 Medium (Elevated):** 7.8 mmol/L (140 mg/dL)
- **🔴 Hyperglycemia (High):** 10.0 mmol/L (180 mg/dL)

*All levels are fully customizable and persist in your browser.*

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Charts**: [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts)
- **Storage**: Browser localStorage for settings
- **Deployment**: GitHub Pages

## 🚀 Development

This is a static web application - no build process required!

```bash
# Clone the repository
git clone https://github.com/Arsennikum/freestyle-libre-cgm-viewer.git

# open index.html in your browser
```

## 🔧 Key Components

### Data Processing Pipeline
1. **File Upload**: Handles two CSV files - glucose and notes
2. **CSV Parsing**: Extracts timestamps and glucose values with unit conversion
3. **Data Joining**: Merges by timestamp using millisecond precision
4. **Visualization**: Interactive charts with glucose trends and activity markers
5. **Export**: Downloads combined data in CSV format

### Chart Features
- Real-time glucose level visualization
- Customizable reference lines with color coding
- Interactive markers for notes and activities
- Responsive design with tooltip information
- Zoom and pan functionality

## 🤝 Contributing

Contributions are welcome! This project helps people better understand their glucose patterns and make informed health decisions.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with sample data
5. Submit a pull request

## 📊 Data Privacy

- **Client-Side Only**: All data processing happens in your browser
- **No Server Storage**: Files are never uploaded to any server
- **Local Settings**: Glucose level preferences stored in browser cache only
- **Your Data Stays Private**: Perfect for sensitive health information

## 🩺 Health Disclaimer

This tool is for informational purposes only and should not replace professional medical advice. Always consult with healthcare providers for medical decisions related to diabetes management.

## 📄 License

MIT License - see the code and use it freely for any purpose.

## 🙏 Acknowledgments

- [TradingView](https://github.com/tradingview/lightweight-charts) for the excellent charting library
- [LibreView](https://www.libreview.com/) for CGM data export functionality
- The diabetes community for inspiration and feedback

---

**⭐ Star this repo if it helps you track your glucose levels better!**
