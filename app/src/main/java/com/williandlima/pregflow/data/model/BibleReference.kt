package com.williandlima.pregflow.data.model

data class BibleReference(val bookIndex: Int, val chapter: Int, val verse: Int? = null)

private val REFERENCE_REGEX = Regex("""^(.+?)\s+(\d+)(?::(\d+)(?:-\d+)?)?$""")

/** Interpreta algo como "João 3:16" ou "Salmos 23" numa referência navegável. */
fun parseBibleReference(query: String): BibleReference? {
    val match = REFERENCE_REGEX.find(query.trim()) ?: return null
    val bookQuery = match.groupValues[1].trim().lowercase()
    val chapter = match.groupValues[2].toIntOrNull() ?: return null
    val verse = match.groupValues[3].toIntOrNull()

    var bookIndex = BIBLE_BOOKS.indexOfFirst { it.name.lowercase() == bookQuery }
    if (bookIndex == -1) bookIndex = BIBLE_BOOKS.indexOfFirst { it.name.lowercase().startsWith(bookQuery) }
    if (bookIndex == -1) bookIndex = BIBLE_BOOKS.indexOfFirst { it.name.lowercase().contains(bookQuery) }
    if (bookIndex == -1) return null
    if (chapter < 1 || chapter > BIBLE_BOOKS[bookIndex].chapterCount) return null

    return BibleReference(bookIndex, chapter, verse)
}
