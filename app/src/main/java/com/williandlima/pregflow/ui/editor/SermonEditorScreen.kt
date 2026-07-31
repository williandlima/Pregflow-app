package com.williandlima.pregflow.ui.editor

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.williandlima.pregflow.R
import com.williandlima.pregflow.data.model.BlockType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SermonEditorScreen(
    onBack: () -> Unit,
    viewModel: SermonEditorViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    var showAddBlockMenu by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {},
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.editor_back_cd))
                    }
                },
                actions = {
                    TextButton(onClick = { viewModel.save(onSaved = onBack) }) {
                        Text(stringResource(R.string.editor_save))
                    }
                },
            )
        },
        floatingActionButton = {
            Box {
                FloatingActionButton(onClick = { showAddBlockMenu = true }) {
                    Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.editor_add_block_cd))
                }
                DropdownMenu(expanded = showAddBlockMenu, onDismissRequest = { showAddBlockMenu = false }) {
                    BlockType.entries.forEach { type ->
                        DropdownMenuItem(
                            text = { Text(type.label) },
                            onClick = {
                                viewModel.addBlock(type)
                                showAddBlockMenu = false
                            },
                        )
                    }
                }
            }
        },
    ) { innerPadding ->
        if (state.isLoading) {
            Box(
                modifier = Modifier.padding(innerPadding).fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }
        } else {
            Column(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
                OutlinedTextField(
                    value = state.title,
                    onValueChange = viewModel::onTitleChange,
                    label = { Text(stringResource(R.string.editor_title_placeholder)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                )
                OutlinedTextField(
                    value = state.bibleRef,
                    onValueChange = viewModel::onBibleRefChange,
                    label = { Text(stringResource(R.string.editor_bible_ref_placeholder)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                )

                if (state.blocks.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(24.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(stringResource(R.string.editor_empty_blocks))
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(state.blocks, key = { it.id }) { block ->
                            BlockItem(
                                block = block,
                                onTextChange = { viewModel.updateBlockText(block.id, it) },
                                onToggleBold = { viewModel.toggleBold(block.id) },
                                onToggleItalic = { viewModel.toggleItalic(block.id) },
                                onToggleUnderline = { viewModel.toggleUnderline(block.id) },
                                onToggleStrikethrough = { viewModel.toggleStrikethrough(block.id) },
                                onToggleMinistered = { viewModel.toggleMinistered(block.id) },
                                onMoveUp = { viewModel.moveBlockUp(block.id) },
                                onMoveDown = { viewModel.moveBlockDown(block.id) },
                                onDelete = { viewModel.deleteBlock(block.id) },
                            )
                        }
                    }
                }
            }
        }
    }
}
