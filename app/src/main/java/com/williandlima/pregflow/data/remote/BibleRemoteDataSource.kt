package com.williandlima.pregflow.data.remote

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException
import java.net.URLEncoder
import javax.inject.Inject

/**
 * Consulta o texto bíblico em tempo real via bible-api.com (tradução "almeida"),
 * sem armazenar ou redistribuir o texto — mesma abordagem do PWA original.
 */
class BibleRemoteDataSource @Inject constructor(
    private val client: OkHttpClient,
) {
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun fetchChapter(bookName: String, chapter: Int): Result<List<BibleApiVerse>> =
        withContext(Dispatchers.IO) {
            try {
                val query = URLEncoder.encode("$bookName $chapter", "UTF-8")
                val request = Request.Builder()
                    .url("https://bible-api.com/$query?translation=almeida")
                    .build()

                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) {
                        return@withContext Result.failure(IOException("HTTP ${response.code}"))
                    }
                    val bodyString = response.body?.string()
                        ?: return@withContext Result.failure(IOException("Resposta vazia"))
                    val parsed = json.decodeFromString<BibleApiResponse>(bodyString)
                    if (parsed.error != null || parsed.verses.isEmpty()) {
                        Result.failure(IOException(parsed.error ?: "Capítulo não encontrado"))
                    } else {
                        Result.success(parsed.verses)
                    }
                }
            } catch (e: IOException) {
                Result.failure(e)
            } catch (e: SerializationException) {
                Result.failure(e)
            }
        }
}
