package com.williandlima.pregflow.data.local

import androidx.room.Embedded
import androidx.room.Relation

data class SermonWithBlocks(
    @Embedded val sermon: SermonEntity,
    @Relation(parentColumn = "id", entityColumn = "sermonId", entity = BlockEntity::class)
    val blocks: List<BlockEntity>,
)
