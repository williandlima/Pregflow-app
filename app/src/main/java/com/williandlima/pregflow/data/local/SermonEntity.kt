package com.williandlima.pregflow.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sermons")
data class SermonEntity(
    @PrimaryKey val id: String,
    val title: String,
    val bibleRef: String,
    val createdAt: Long,
    val updatedAt: Long,
)
