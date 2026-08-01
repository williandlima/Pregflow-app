package com.williandlima.pregflow.ui.home

import android.util.Log
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
        Log.d("PregFlowDebug", "HomeViewModel.createSermon: launching coroutine")
        viewModelScope.launch {
            Log.d("PregFlowDebug", "HomeViewModel.createSermon: coroutine started, calling repository.createSermon()")
            val id = repository.createSermon()
            Log.d("PregFlowDebug", "HomeViewModel.createSermon: got id=$id, calling onCreated")
            onCreated(id)
            Log.d("PregFlowDebug", "HomeViewModel.createSermon: onCreated returned")
        }
    }

    fun deleteSermon(sermonId: String) {
        viewModelScope.launch {
            repository.deleteSermon(sermonId)
        }
    }
}
