import kotlinx.browser.document
import kotlinx.html.dom.append
import kotlinx.html.js.div
import kotlinx.html.js.input
import org.w3c.files.FileReader
import org.w3c.files.get

data class FirstCSVDto(val timestamp: String, val rate: Int)
data class SecondCSVDto(val timestamp: String, val note: String, val details: String)

fun main() {
    val root = document.getElementById("root")
    root?.append {
        div {
            input(type = "file", name = "file1") {
                onChangeFunction = {
                    val file = it.target?.files?.get(0)
                    if (file != null) {
                        val reader = FileReader()
                        reader.onload = { _ ->
                            val text = reader.result as String
                            parseFirstCSV(text)
                        }
                        reader.readAsText(file)
                    }
                }
            }
            input(type = "file", name = "file2") {
                onChangeFunction = {
                    val file = it.target?.files?.get(0)
                    if (file != null) {
                        val reader = FileReader()
                        reader.onload = { _ ->
                            val text = reader.result as String
                            parseSecondCSV(text)
                        }
                        reader.readAsText(file)
                    }
                }
            }
        }
    }
}

fun parseFirstCSV(csvContent: String) {
    val lines = csvContent.lines()
    val dtos = lines.drop(1).mapNotNull { line ->
        val parts = line.split(";")
        if (parts.size >= 5) {
            val timestamp = parts[2]
            val rate = parts[4].toIntOrNull() ?: parts[5].toIntOrNull()
            if (rate != null) {
                FirstCSVDto(timestamp, rate)
            } else null
        } else null
    }
    // Handle dtos as needed
}

fun parseSecondCSV(csvContent: String) {
    val lines = csvContent.lines()
    val dtos = lines.drop(1).mapNotNull { line ->
        val parts = line.split(";")
        if (parts.size >= 3) {
            val timestamp = parts[0]
            val note = parts[1]
            val details = parts[2]
            SecondCSVDto(timestamp, note, details)
        } else null
    }
    // Handle dtos as needed
}
