package com.williandlima.pregflow.ui.settings

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.williandlima.pregflow.data.backup.BackupFileManager
import com.williandlima.pregflow.data.repository.SermonRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.SerializationException
import java.io.IOException
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val repository: SermonRepository,
    private val backupFileManager: BackupFileManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    fun exportBackup(uri: Uri) {
        _uiState.update { it.copy(isBusy = true) }
        viewModelScope.launch {
            try {
                val json = repository.exportBackupJson()
                backupFileManager.writeToUri(uri, json)
                _uiState.update { it.copy(isBusy = false, message = "Backup exportado com sucesso.") }
            } catch (e: IOException) {
                _uiState.update { it.copy(isBusy = false, message = "Erro ao exportar backup.") }
            }
        }
    }

    fun importBackup(uri: Uri) {
        _uiState.update { it.copy(isBusy = true) }
        viewModelScope.launch {
            try {
                val json = backupFileManager.readFromUri(uri)
                repository.importBackupJson(json)
                _uiState.update { it.copy(isBusy = false, message = "Backup importado com sucesso.") }
            } catch (e: IOException) {
                _uiState.update { it.copy(isBusy = false, message = "Erro ao ler o arquivo de backup.") }
            } catch (e: SerializationException) {
                _uiState.update { it.copy(isBusy = false, message = "Arquivo de backup inválido.") }
            }
        }
    }

    fun messageShown() {
        _uiState.update { it.copy(message = null) }
    }
}
