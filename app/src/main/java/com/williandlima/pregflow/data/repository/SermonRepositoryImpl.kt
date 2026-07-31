package com.williandlima.pregflow.data.repository

import com.williandlima.pregflow.data.local.BlockEntity
import com.williandlima.pregflow.data.local.SermonDao
import com.williandlima.pregflow.data.local.SermonEntity
import com.williandlima.pregflow.data.local.SermonWithBlocks
import kotlinx.coroutines.flow.Flow
import java.util.UUID
import javax.inject.Inject

class SermonRepositoryImpl @Inject constructor(
    private val dao: SermonDao,
) : SermonRepository {

    override fun observeSermons(): Flow<List<SermonEntity>> = dao.observeSermons()

    override fun observeSermon(sermonId: String): Flow<SermonWithBlocks?> =
        dao.observeSermonWithBlocks(sermonId)

    override suspend fun createSermon(): String {
        val now = System.currentTimeMillis()
        val sermon = SermonEntity(
            id = UUID.randomUUID().toString(),
            title = "",
            bibleRef = "",
            createdAt = now,
            updatedAt = now,
        )
        dao.upsertSermon(sermon)
        return sermon.id
    }

    override suspend fun saveSermon(sermon: SermonEntity, blocks: List<BlockEntity>) {
        dao.saveSermonWithBlocks(sermon.copy(updatedAt = System.currentTimeMillis()), blocks)
    }

    override suspend fun deleteSermon(sermonId: String) {
        dao.deleteSermon(sermonId)
    }
}
