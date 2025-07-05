import kotlinx.browser.document
import kotlinx.browser.window
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import model.GlucoseReading
import model.Note
import util.CsvParser
import kotlinx.html.*
import kotlinx.html.dom.*
import kotlinx.html.js.*
import org.w3c.files.File

private val mainScope = MainScope()

fun main() {
    window.onload = {
        val container = document.getElementById("root") ?: return@onload
        container.append {
            div(classes = "container") {
                h1 { +"CGM Data Parser" }
                
                div(classes = "file-upload") {
                    h2 { +"Upload Glucose Data (CSV)" }
                    input(InputType.file) {
                        id = "glucoseFile"
                        accept = ".csv"
                    }
                }
                
                div(classes = "file-upload") {
                    h2 { +"Upload Notes Data (CSV)" }
                    input(InputType.file) {
                        id = "notesFile"
                        accept = ".csv"
                    }
                }
                
                div {
                    id = "results"
                    style = "margin-top: 20px;"
                }
            }
        }
        
        setupFileUploads()
    }
}

private fun setupFileUploads() {
    val glucoseFileInput = document.getElementById("glucoseFile") as? HTMLInputElement
    val notesFileInput = document.getElementById("notesFile") as? HTMLInputElement
    val resultsDiv = document.getElementById("results")
    
    var glucoseReadings: List<GlucoseReading> = emptyList()
    var notes: List<Note> = emptyList()
    
    fun updateResults() {
        resultsDiv?.let { div ->
            div.clear()
            div.append {
                h3 { +"Parsed Data" }
                
                h4 { +"Glucose Readings:" }
                if (glucoseReadings.isEmpty()) {
                    p { +"No glucose data loaded" }
                } else {
                    table {
                        tr {
                            th { +"Timestamp" }
                            th { +"Glucose (mg/dL)" }
                        }
                        glucoseReadings.take(5).forEach { reading ->
                            tr {
                                td { +reading.timestamp }
                                td { +reading.rate.toString() }
                            }
                        }
                        if (glucoseReadings.size > 5) {
                            tr {
                                td { +"... and ${glucoseReadings.size - 5} more" }
                                td {}
                            }
                        }
                    }
                }
                
                h4 { +"Notes:" }
                if (notes.isEmpty()) {
                    p { +"No notes data loaded" }
                } else {
                    table {
                        tr {
                            th { +"Timestamp" }
                            th { +"Note" }
                            th { +"Details" }
                        }
                        notes.take(5).forEach { note ->
                            tr {
                                td { +note.timestamp }
                                td { +note.note }
                                td { +note.details }
                            }
                        }
                        if (notes.size > 5) {
                            tr {
                                td { +"... and ${notes.size - 5} more" }
                                td {}
                                td {}
                            }
                        }
                    }
                }
            }
        }
    }
    
    glucoseFileInput?.addEventListener("change", { event ->
        val file = (event.target as? HTMLInputElement)?.files?.get(0) as? File ?: return@addEventListener
        
        mainScope.launch {
            try {
                glucoseReadings = CsvParser.parseGlucoseCsv(file)
                updateResults()
            } catch (e: Exception) {
                window.alert("Error parsing glucose file: ${e.message}")
            }
        }
    })
    
    notesFileInput?.addEventListener("change", { event ->
        val file = (event.target as? HTMLInputElement)?.files?.get(0) as? File ?: return@addEventListener
        
        mainScope.launch {
            try {
                notes = CsvParser.parseNotesCsv(file)
                updateResults()
            } catch (e: Exception) {
                window.alert("Error parsing notes file: ${e.message}")
            }
        }
    })
}
