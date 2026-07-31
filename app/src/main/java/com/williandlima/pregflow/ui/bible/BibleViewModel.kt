package com.williandlima.pregflow.ui.bible

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.williandlima.pregflow.data.model.BibleBook
import com.williandlima.pregflow.data.repository.BibleRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class BibleViewModel @Inject constructor(
    private val repository: BibleRepository,
) : ViewModel() {

    val books: List<BibleBook> = repository.books

    private val _uiState = MutableStateFlow(BibleUiState())
    val uiState: StateFlow<BibleUiState> = _uiState.asStateFlow()

    init {
        loadChapter()
    }

    fun selectBook(index: Int) {
        _uiState.update { it.copy(bookIndex = index, chapter = 1) }
        loadChapter()
    }

    fun selectChapter(chapter: Int) {
        _uiState.update { it.copy(chapter = chapter) }
        loadChapter()
    }

    fun onSearchQueryChange(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        if (query.isBlank()) {
            _uiState.update { it.copy(searchResults = emptyList()) }
            return
        }
        val reference = repository.parseReference(query)
        if (reference != null) {
            _uiState.update {
                it.copy(bookIndex = reference.bookIndex, chapter = reference.chapter, searchResults = emptyList())
            }
            loadChapter()
        } else {
            _uiState.update { it.copy(searchResults = repository.searchByKeyword(query)) }
        }
    }

    fun openReference(refText: String) {
        val reference = repository.parseReference(refText) ?: return
        _uiState.update {
            it.copy(
                bookIndex = reference.bookIndex,
                chapter = reference.chapter,
                searchQuery = "",
                searchResults = emptyList(),
            )
        }
        loadChapter()
    }

    private fun loadChapter() {
        val state = _uiState.value
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            repository.fetchChapter(state.bookIndex, state.chapter).fold(
                onSuccess = { verses -> _uiState.update { it.copy(verses = verses, isLoading = false) } },
                onFailure = {
                    _uiState.update {
                        it.copy(verses = emptyList(), isLoading = false, errorMessage = "Capítulo não encontrado. Verifique sua conexão.")
                    }
                },
            )
        }
    }
}
