package com.williandlima.pregflow.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.williandlima.pregflow.data.local.SermonEntity
import com.williandlima.pregflow.data.repository.SermonRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repository: SermonRepository,
) : ViewModel() {

    val sermons: StateFlow<List<SermonEntity>> = repository.observeSermons()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun createSermon(onCreated: (String) -> Unit) {
        viewModelScope.launch {
            val id = repository.createSermon()
            onCreated(id)
        }
    }

    fun deleteSermon(sermonId: String) {
        viewModelScope.launch {
            repository.deleteSermon(sermonId)
        }
    }
}
