package model

data class GlucoseReading(
    val timestamp: String,
    val rate: Int
)

data class Note(
    val timestamp: String,
    val note: String,
    val details: String
)
