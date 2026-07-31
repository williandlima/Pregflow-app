package com.williandlima.pregflow.ui.home

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
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
import com.williandlima.pregflow.data.local.SermonEntity

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onOpenSermon: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val sermons by viewModel.sermons.collectAsState()
    var sermonPendingDelete by remember { mutableStateOf<SermonEntity?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text(stringResource(R.string.home_title)) })
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { viewModel.createSermon(onOpenSermon) }) {
                Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.home_new_sermon_cd))
            }
        },
    ) { innerPadding ->
        if (sermons.isEmpty()) {
            Box(
                modifier = Modifier
                    .padding(innerPadding)
                    .fillMaxSize()
                    .padding(24.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(stringResource(R.string.home_empty_state))
            }
        } else {
            LazyColumn(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
                items(sermons, key = { it.id }) { sermon ->
                    ListItem(
                        headlineContent = {
                            Text(sermon.title.ifBlank { stringResource(R.string.home_untitled) })
                        },
                        supportingContent = if (sermon.bibleRef.isNotBlank()) {
                            { Text(sermon.bibleRef) }
                        } else null,
                        trailingContent = {
                            IconButton(onClick = { sermonPendingDelete = sermon }) {
                                Icon(Icons.Filled.Delete, contentDescription = stringResource(R.string.home_delete_cd))
                            }
                        },
                        modifier = Modifier.padding(horizontal = 0.dp),
                    )
                }
            }
        }
    }

    sermonPendingDelete?.let { sermon ->
        AlertDialog(
            onDismissRequest = { sermonPendingDelete = null },
            title = { Text(stringResource(R.string.home_delete_confirm_title)) },
            text = { Text(stringResource(R.string.home_delete_confirm_message)) },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteSermon(sermon.id)
                    sermonPendingDelete = null
                }) {
                    Text(stringResource(R.string.home_delete_confirm_confirm))
                }
            },
            dismissButton = {
                TextButton(onClick = { sermonPendingDelete = null }) {
                    Text(stringResource(R.string.home_delete_confirm_cancel))
                }
            },
        )
    }
}
