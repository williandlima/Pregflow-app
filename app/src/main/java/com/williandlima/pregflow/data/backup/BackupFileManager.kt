package com.williandlima.pregflow.data.backup

import android.content.Context
import android.net.Uri
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException
import javax.inject.Inject

/** Lê/escreve o arquivo de backup escolhido pelo usuário via seletor de arquivos do sistema. */
class BackupFileManager @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    suspend fun writeToUri(uri: Uri, content: String) = withContext(Dispatchers.IO) {
        context.contentResolver.openOutputStream(uri)?.use { stream ->
            stream.write(content.toByteArray(Charsets.UTF_8))
        } ?: throw IOException("Não foi possível abrir o arquivo para escrita")
    }

    suspend fun readFromUri(uri: Uri): String = withContext(Dispatchers.IO) {
        context.contentResolver.openInputStream(uri)?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }
            ?: throw IOException("Não foi possível abrir o arquivo para leitura")
    }
}
