package com.williandlima.pregflow.data.model

import kotlinx.serialization.Serializable

@Serializable
data class BackupFile(
    val version: Int = 1,
    val exportedAt: Long,
    val sermons: List<SermonBackup>,
)

@Serializable
data class SermonBackup(
    val id: String,
    val title: String,
    val bibleRef: String,
    val createdAt: Long,
    val updatedAt: Long,
    val blocks: List<BlockBackup>,
)

@Serializable
data class BlockBackup(
    val id: String,
    val type: BlockType,
    val position: Int,
    val ministered: Boolean,
    val spans: List<TextSpan>,
)
