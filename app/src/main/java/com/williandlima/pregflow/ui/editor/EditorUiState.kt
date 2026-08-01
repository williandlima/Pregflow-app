package com.williandlima.pregflow.ui.editor

import com.williandlima.pregflow.data.model.BlockType

data class EditorUiState(
    val sermonId: String,
    val createdAt: Long = System.currentTimeMillis(),
    val title: String = "",
    val bibleRef: String = "",
    val blocks: List<BlockUiState> = emptyList(),
    val isLoading: Boolean = true,
)

data class BlockUiState(
    val id: String,
    val type: BlockType,
    val ministered: Boolean = false,
    val text: String = "",
    val bold: Boolean = false,
    val italic: Boolean = false,
    val underline: Boolean = false,
    val strikethrough: Boolean = false,
)
