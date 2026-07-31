package com.williandlima.pregflow.data.repository

import com.williandlima.pregflow.data.model.BIBLE_BOOKS
import com.williandlima.pregflow.data.model.BibleBook
import com.williandlima.pregflow.data.model.BibleReference
import com.williandlima.pregflow.data.model.parseBibleReference
import com.williandlima.pregflow.data.model.searchBibleTopics
import com.williandlima.pregflow.data.remote.BibleApiVerse
import com.williandlima.pregflow.data.remote.BibleRemoteDataSource
import javax.inject.Inject

interface BibleRepository {
    val books: List<BibleBook>
    fun parseReference(query: String): BibleReference?
    fun searchByKeyword(query: String): List<String>
    suspend fun fetchChapter(bookIndex: Int, chapter: Int): Result<List<BibleApiVerse>>
}

class BibleRepositoryImpl @Inject constructor(
    private val remote: BibleRemoteDataSource,
) : BibleRepository {

    override val books: List<BibleBook> = BIBLE_BOOKS

    override fun parseReference(query: String): BibleReference? = parseBibleReference(query)

    override fun searchByKeyword(query: String): List<String> = searchBibleTopics(query)

    override suspend fun fetchChapter(bookIndex: Int, chapter: Int): Result<List<BibleApiVerse>> {
        val book = books.getOrNull(bookIndex)
            ?: return Result.failure(IllegalArgumentException("Livro inválido"))
        return remote.fetchChapter(book.name, chapter)
    }
}
