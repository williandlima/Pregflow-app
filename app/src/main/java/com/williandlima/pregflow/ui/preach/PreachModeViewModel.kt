package com.williandlima.pregflow.ui.preach

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.williandlima.pregflow.data.local.SermonWithBlocks
import com.williandlima.pregflow.data.repository.SermonRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

private const val MIN_FONT_SCALE = 0.6f
private const val MAX_FONT_SCALE = 2f
private const val FONT_SCALE_STEP = 0.1f

@HiltViewModel
class PreachModeViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    repository: SermonRepository,
) : ViewModel() {

    private val sermonId: String = checkNotNull(savedStateHandle["sermonId"])

    val sermon: StateFlow<SermonWithBlocks?> = repository.observeSermon(sermonId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    private val _fontScale = MutableStateFlow(1f)
    val fontScale: StateFlow<Float> = _fontScale.asStateFlow()

    private val _hudVisible = MutableStateFlow(true)
    val hudVisible: StateFlow<Boolean> = _hudVisible.asStateFlow()

    private val _elapsedSeconds = MutableStateFlow(0)
    val elapsedSeconds: StateFlow<Int> = _elapsedSeconds.asStateFlow()

    private val _isTimerRunning = MutableStateFlow(false)
    val isTimerRunning: StateFlow<Boolean> = _isTimerRunning.asStateFlow()

    private var timerJob: Job? = null

    fun increaseFontSize() {
        _fontScale.update { (it + FONT_SCALE_STEP).coerceAtMost(MAX_FONT_SCALE) }
    }

    fun decreaseFontSize() {
        _fontScale.update { (it - FONT_SCALE_STEP).coerceAtLeast(MIN_FONT_SCALE) }
    }

    fun toggleHud() {
        _hudVisible.update { !it }
    }

    fun toggleTimer() {
        if (_isTimerRunning.value) pauseTimer() else startTimer()
    }

    fun resetTimer() {
        pauseTimer()
        _elapsedSeconds.value = 0
    }

    private fun startTimer() {
        if (timerJob?.isActive == true) return
        _isTimerRunning.value = true
        timerJob = viewModelScope.launch {
            while (isActive) {
                delay(1_000)
                _elapsedSeconds.update { it + 1 }
            }
        }
    }

    private fun pauseTimer() {
        _isTimerRunning.value = false
        timerJob?.cancel()
    }

    override fun onCleared() {
        timerJob?.cancel()
        super.onCleared()
    }
}
