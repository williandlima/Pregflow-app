package com.williandlima.pregflow.ui.bible

import com.williandlima.pregflow.data.remote.BibleApiVerse

data class BibleUiState(
    val bookIndex: Int = 0,
    val chapter: Int = 1,
    val verses: List<BibleApiVerse> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val searchQuery: String = "",
    val searchResults: List<String> = emptyList(),
)
