package com.williandlima.pregflow.data.repository

import com.williandlima.pregflow.data.local.BlockEntity
import com.williandlima.pregflow.data.local.SermonEntity
import com.williandlima.pregflow.data.local.SermonWithBlocks
import kotlinx.coroutines.flow.Flow

interface SermonRepository {
    fun observeSermons(): Flow<List<SermonEntity>>
    fun observeSermon(sermonId: String): Flow<SermonWithBlocks?>
    suspend fun createSermon(): String
    suspend fun saveSermon(sermon: SermonEntity, blocks: List<BlockEntity>)
    suspend fun deleteSermon(sermonId: String)
}
