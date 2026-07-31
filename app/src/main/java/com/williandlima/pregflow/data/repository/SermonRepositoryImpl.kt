package com.williandlima.pregflow.data.repository

import com.williandlima.pregflow.data.local.BlockEntity
import com.williandlima.pregflow.data.local.SermonDao
import com.williandlima.pregflow.data.local.SermonEntity
import com.williandlima.pregflow.data.local.SermonWithBlocks
import com.williandlima.pregflow.data.model.BackupFile
import com.williandlima.pregflow.data.model.BlockBackup
import com.williandlima.pregflow.data.model.SermonBackup
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.util.UUID
import javax.inject.Inject

class SermonRepositoryImpl @Inject constructor(
    private val dao: SermonDao,
) : SermonRepository {

    private val json = Json { ignoreUnknownKeys = true; prettyPrint = true }

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

    override suspend fun exportBackupJson(): String {
        val backup = BackupFile(
            exportedAt = System.currentTimeMillis(),
            sermons = dao.getAllSermonsWithBlocks().map { it.toBackup() },
        )
        return json.encodeToString(backup)
    }

    override suspend fun importBackupJson(json: String) {
        val backup = this.json.decodeFromString<BackupFile>(json)
        backup.sermons.forEach { sermonBackup ->
            dao.saveSermonWithBlocks(sermonBackup.toSermonEntity(), sermonBackup.blocks.map { it.toBlockEntity(sermonBackup.id) })
        }
    }

    private fun SermonWithBlocks.toBackup(): SermonBackup = SermonBackup(
        id = sermon.id,
        title = sermon.title,
        bibleRef = sermon.bibleRef,
        createdAt = sermon.createdAt,
        updatedAt = sermon.updatedAt,
        blocks = blocks.sortedBy { it.position }.map { block ->
            BlockBackup(
                id = block.id,
                type = block.type,
                position = block.position,
                ministered = block.ministered,
                spans = block.spans,
            )
        },
    )

    private fun SermonBackup.toSermonEntity(): SermonEntity = SermonEntity(
        id = id,
        title = title,
        bibleRef = bibleRef,
        createdAt = createdAt,
        updatedAt = updatedAt,
    )

    private fun BlockBackup.toBlockEntity(sermonId: String): BlockEntity = BlockEntity(
        id = id,
        sermonId = sermonId,
        type = type,
        position = position,
        ministered = ministered,
        spans = spans,
    )
}
