package com.williandlima.pregflow.data.local

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.williandlima.pregflow.data.model.BlockType
import com.williandlima.pregflow.data.model.TextSpan

@Entity(
    tableName = "blocks",
    foreignKeys = [
        ForeignKey(
            entity = SermonEntity::class,
            parentColumns = ["id"],
            childColumns = ["sermonId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("sermonId")],
)
data class BlockEntity(
    @PrimaryKey val id: String,
    val sermonId: String,
    val type: BlockType,
    val position: Int,
    val ministered: Boolean,
    val spans: List<TextSpan>,
)
