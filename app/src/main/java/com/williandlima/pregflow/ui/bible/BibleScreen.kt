package com.williandlima.pregflow.ui.bible

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AssistChip
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.williandlima.pregflow.R
import com.williandlima.pregflow.data.remote.BibleApiVerse

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BibleScreen(
    onBack: () -> Unit,
    onInsertVerse: (String) -> Unit,
    viewModel: BibleViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    var showBookMenu by remember { mutableStateOf(false) }
    var showChapterMenu by remember { mutableStateOf(false) }
    val clipboardManager = LocalClipboardManager.current
    val bookName = viewModel.books[state.bookIndex].name

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.bible_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.bible_back_cd))
                    }
                },
            )
        },
    ) { innerPadding ->
        Column(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
            OutlinedTextField(
                value = state.searchQuery,
                onValueChange = viewModel::onSearchQueryChange,
                label = { Text(stringResource(R.string.bible_search_placeholder)) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            )

            if (state.searchResults.isNotEmpty()) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(bottom = 8.dp),
                ) {
                    items(state.searchResults) { refText ->
                        AssistChip(onClick = { viewModel.openReference(refText) }, label = { Text(refText) })
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box {
                    TextButton(onClick = { showBookMenu = true }) { Text(bookName) }
                    DropdownMenu(expanded = showBookMenu, onDismissRequest = { showBookMenu = false }) {
                        viewModel.books.forEachIndexed { index, book ->
                            DropdownMenuItem(
                                text = { Text(book.name) },
                                onClick = {
                                    viewModel.selectBook(index)
                                    showBookMenu = false
                                },
                            )
                        }
                    }
                }
                Box {
                    TextButton(onClick = { showChapterMenu = true }) { Text(state.chapter.toString()) }
                    DropdownMenu(expanded = showChapterMenu, onDismissRequest = { showChapterMenu = false }) {
                        (1..viewModel.books[state.bookIndex].chapterCount).forEach { chapterNumber ->
                            DropdownMenuItem(
                                text = { Text(chapterNumber.toString()) },
                                onClick = {
                                    viewModel.selectChapter(chapterNumber)
                                    showChapterMenu = false
                                },
                            )
                        }
                    }
                }
            }

            when {
                state.isLoading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                state.errorMessage != null -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(state.errorMessage ?: stringResource(R.string.bible_error))
                }
                else -> LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    items(state.verses, key = { it.verse }) { verse ->
                        VerseRow(
                            bookName = bookName,
                            chapter = state.chapter,
                            verse = verse,
                            onCopy = { text -> clipboardManager.setText(AnnotatedString(text)) },
                            onInsert = onInsertVerse,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun VerseRow(
    bookName: String,
    chapter: Int,
    verse: BibleApiVerse,
    onCopy: (String) -> Unit,
    onInsert: (String) -> Unit,
) {
    val reference = "$bookName $chapter:${verse.verse}"
    val verseText = verse.text.trim()

    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Text("${verse.verse}. $verseText")
        Row(modifier = Modifier.padding(top = 4.dp)) {
            TextButton(onClick = { onCopy("$verseText — $reference") }) {
                Text(stringResource(R.string.bible_copy))
            }
            TextButton(onClick = { onInsert("$verseText ($reference)") }) {
                Text(stringResource(R.string.bible_insert))
            }
        }
    }
}
