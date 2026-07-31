package com.williandlima.pregflow.ui.editor

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.williandlima.pregflow.data.local.BlockEntity
import com.williandlima.pregflow.data.local.SermonEntity
import com.williandlima.pregflow.data.model.BlockType
import com.williandlima.pregflow.data.model.TextSpan
import com.williandlima.pregflow.data.repository.SermonRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class SermonEditorViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: SermonRepository,
) : ViewModel() {

    val sermonId: String = checkNotNull(savedStateHandle["sermonId"])

    private val _uiState = MutableStateFlow(EditorUiState(sermonId = sermonId))
    val uiState: StateFlow<EditorUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val existing = repository.observeSermon(sermonId).first()
            _uiState.update { state ->
                if (existing != null) {
                    state.copy(
                        createdAt = existing.sermon.createdAt,
                        title = existing.sermon.title,
                        bibleRef = existing.sermon.bibleRef,
                        blocks = existing.blocks.sortedBy { it.position }.map { it.toUiState() },
                        isLoading = false,
                    )
                } else {
                    state.copy(isLoading = false)
                }
            }
        }
    }

    fun onTitleChange(value: String) {
        _uiState.update { it.copy(title = value) }
    }

    fun onBibleRefChange(value: String) {
        _uiState.update { it.copy(bibleRef = value) }
    }

    fun addBlock(type: BlockType) {
        _uiState.update { state ->
            state.copy(blocks = state.blocks + BlockUiState(id = UUID.randomUUID().toString(), type = type))
        }
    }

    fun insertQuoteBlock(text: String) {
        _uiState.update { state ->
            state.copy(blocks = state.blocks + BlockUiState(id = UUID.randomUUID().toString(), type = BlockType.QUOTE, text = text))
        }
    }

    fun updateBlockText(blockId: String, text: String) = updateBlock(blockId) { it.copy(text = text) }
    fun toggleBold(blockId: String) = updateBlock(blockId) { it.copy(bold = !it.bold) }
    fun toggleItalic(blockId: String) = updateBlock(blockId) { it.copy(italic = !it.italic) }
    fun toggleUnderline(blockId: String) = updateBlock(blockId) { it.copy(underline = !it.underline) }
    fun toggleStrikethrough(blockId: String) = updateBlock(blockId) { it.copy(strikethrough = !it.strikethrough) }
    fun toggleMinistered(blockId: String) = updateBlock(blockId) { it.copy(ministered = !it.ministered) }

    fun deleteBlock(blockId: String) {
        _uiState.update { state -> state.copy(blocks = state.blocks.filterNot { it.id == blockId }) }
    }

    fun moveBlockUp(blockId: String) = moveBlock(blockId, -1)
    fun moveBlockDown(blockId: String) = moveBlock(blockId, +1)

    fun save(onSaved: () -> Unit) {
        viewModelScope.launch {
            val state = _uiState.value
            val sermon = SermonEntity(
                id = state.sermonId,
                title = state.title.trim(),
                bibleRef = state.bibleRef.trim(),
                createdAt = state.createdAt,
                updatedAt = System.currentTimeMillis(),
            )
            val blocks = state.blocks.mapIndexed { index, block ->
                BlockEntity(
                    id = block.id,
                    sermonId = state.sermonId,
                    type = block.type,
                    position = index,
                    ministered = block.ministered,
                    spans = listOf(
                        TextSpan(
                            text = block.text,
                            bold = block.bold,
                            italic = block.italic,
                            underline = block.underline,
                            strikethrough = block.strikethrough,
                        ),
                    ),
                )
            }
            repository.saveSermon(sermon, blocks)
            onSaved()
        }
    }

    private fun updateBlock(blockId: String, transform: (BlockUiState) -> BlockUiState) {
        _uiState.update { state ->
            state.copy(blocks = state.blocks.map { if (it.id == blockId) transform(it) else it })
        }
    }

    private fun moveBlock(blockId: String, delta: Int) {
        _uiState.update { state ->
            val index = state.blocks.indexOfFirst { it.id == blockId }
            if (index < 0) return@update state
            val newIndex = (index + delta).coerceIn(0, state.blocks.lastIndex)
            if (newIndex == index) return@update state
            val mutable = state.blocks.toMutableList()
            val item = mutable.removeAt(index)
            mutable.add(newIndex, item)
            state.copy(blocks = mutable)
        }
    }

    private fun BlockEntity.toUiState(): BlockUiState {
        val span = spans.firstOrNull() ?: TextSpan()
        return BlockUiState(
            id = id,
            type = type,
            ministered = ministered,
            text = span.text,
            bold = span.bold,
            italic = span.italic,
            underline = span.underline,
            strikethrough = span.strikethrough,
        )
    }
}
