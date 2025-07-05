package util

import model.GlucoseReading
import model.Note
import kotlinx.browser.window
import kotlinx.coroutines.await
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlin.js.Promise

object CsvParser {
    private external fun parseCsv(file: dynamic, config: dynamic): dynamic
    
    init {
        js("""
        function parseCsv(file, config) {
            return new Promise((resolve, reject) => {
                window.Papa.parse(file, {
                    ...config,
                    complete: (results) => resolve(results.data),
                    error: (error) => reject(error)
                });
            });
        }
        """.trimIndent())
    }

    suspend fun parseGlucoseCsv(file: dynamic): List<GlucoseReading> {
        val results: Array<Array<String>> = parseCsv(file, object {
            val delimiter = ";"
            val header = true
            val skipEmptyLines = true
        }).await()

        return results.mapNotNull { row ->
            val timestamp = row.getOrNull(2) ?: return@mapNotNull null
            val historicGlucose = row.getOrNull(4)?.toFloatOrNull()
            val scanGlucose = row.getOrNull(5)?.toFloatOrNull()
            
            val rate = when {
                historicGlucose != null -> historicGlucose.toInt()
                scanGlucose != null -> scanGlucose.toInt()
                else -> return@mapNotNull null
            }
            
            GlucoseReading(timestamp, rate)
        }
    }

    suspend fun parseNotesCsv(file: dynamic): List<Note> {
        val results: Array<Array<String>> = parseCsv(file, object {
            val delimiter = ";"
            val header = true
            val skipEmptyLines = true
        }).await()

        return results.mapNotNull { row ->
            val timestamp = row.getOrNull(0) ?: return@mapNotNull null
            val note = row.getOrNull(1) ?: ""
            val details = row.getOrNull(2) ?: ""
            
            Note(timestamp, note, details)
        }
    }
}
