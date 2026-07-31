package com.williandlima.pregflow.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

@Dao
interface SermonDao {

    @Query("SELECT * FROM sermons ORDER BY updatedAt DESC")
    fun observeSermons(): Flow<List<SermonEntity>>

    @Transaction
    @Query("SELECT * FROM sermons WHERE id = :sermonId")
    fun observeSermonWithBlocks(sermonId: String): Flow<SermonWithBlocks?>

    @Transaction
    @Query("SELECT * FROM sermons")
    suspend fun getAllSermonsWithBlocks(): List<SermonWithBlocks>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertSermon(sermon: SermonEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertBlocks(blocks: List<BlockEntity>)

    @Query("DELETE FROM blocks WHERE sermonId = :sermonId")
    suspend fun deleteBlocksForSermon(sermonId: String)

    @Query("DELETE FROM sermons WHERE id = :sermonId")
    suspend fun deleteSermon(sermonId: String)

    /** Substitui todos os blocos do sermão pelo novo conjunto, de forma atômica. */
    @Transaction
    suspend fun saveSermonWithBlocks(sermon: SermonEntity, blocks: List<BlockEntity>) {
        upsertSermon(sermon)
        deleteBlocksForSermon(sermon.id)
        if (blocks.isNotEmpty()) upsertBlocks(blocks)
    }
}
