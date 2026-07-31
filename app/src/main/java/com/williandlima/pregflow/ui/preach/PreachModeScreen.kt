package com.williandlima.pregflow.ui.preach

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.williandlima.pregflow.R
import com.williandlima.pregflow.data.local.BlockEntity
import com.williandlima.pregflow.data.model.BlockType
import com.williandlima.pregflow.data.model.TextSpan
import java.util.Locale

@Composable
fun PreachModeScreen(
    onClose: () -> Unit,
    viewModel: PreachModeViewModel = hiltViewModel(),
) {
    val sermonWithBlocks by viewModel.sermon.collectAsState()
    val fontScale by viewModel.fontScale.collectAsState()
    val hudVisible by viewModel.hudVisible.collectAsState()
    val elapsedSeconds by viewModel.elapsedSeconds.collectAsState()
    val isTimerRunning by viewModel.isTimerRunning.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .pointerInput(Unit) {
                detectTapGestures(onTap = { viewModel.toggleHud() })
            },
    ) {
        val data = sermonWithBlocks
        if (data == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 72.dp),
            ) {
                item {
                    Text(
                        text = data.sermon.title.ifBlank { stringResource(R.string.home_untitled) },
                        style = MaterialTheme.typography.headlineLarge.copy(fontSize = MaterialTheme.typography.headlineLarge.fontSize * fontScale),
                        fontWeight = FontWeight.Bold,
                    )
                    if (data.sermon.bibleRef.isNotBlank()) {
                        Text(
                            text = data.sermon.bibleRef,
                            style = MaterialTheme.typography.titleLarge.copy(fontSize = MaterialTheme.typography.titleLarge.fontSize * fontScale),
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(top = 4.dp, bottom = 20.dp),
                        )
                    } else {
                        Spacer(modifier = Modifier.padding(top = 12.dp))
                    }
                }
                items(data.blocks.sortedBy { it.position }, key = { it.id }) { block ->
                    PreachBlockContent(
                        block = block,
                        fontScale = fontScale,
                        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                    )
                }
            }
        }

        AnimatedVisibility(
            visible = hudVisible,
            modifier = Modifier.align(Alignment.TopStart),
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            IconButton(onClick = onClose) {
                Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.preach_close_cd))
            }
        }

        AnimatedVisibility(
            visible = hudVisible,
            modifier = Modifier.align(Alignment.BottomCenter),
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            Surface(
                tonalElevation = 4.dp,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = viewModel::decreaseFontSize) {
                        Text("A-")
                    }
                    TextButton(onClick = viewModel::increaseFontSize) {
                        Text("A+")
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Text(formatElapsed(elapsedSeconds), style = MaterialTheme.typography.titleLarge)
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(onClick = viewModel::toggleTimer) {
                        Icon(
                            imageVector = if (isTimerRunning) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                            contentDescription = stringResource(
                                if (isTimerRunning) R.string.preach_timer_pause_cd else R.string.preach_timer_start_cd,
                            ),
                        )
                    }
                    IconButton(onClick = viewModel::resetTimer) {
                        Icon(Icons.Filled.Refresh, contentDescription = stringResource(R.string.preach_timer_reset_cd))
                    }
                }
            }
        }
    }
}

@Composable
private fun PreachBlockContent(block: BlockEntity, fontScale: Float, modifier: Modifier = Modifier) {
    val span = block.spans.firstOrNull() ?: TextSpan()
    if (span.text.isBlank()) return

    val style = block.preachTextStyle(fontScale)
    val contentModifier = if (block.ministered) modifier.alpha(0.5f) else modifier

    when (block.type) {
        BlockType.QUOTE -> PreachSurfaceBlock(span.text, style, contentModifier, MaterialTheme.colorScheme.primaryContainer)
        BlockType.WARNING -> PreachSurfaceBlock(span.text, style, contentModifier, MaterialTheme.colorScheme.errorContainer)
        BlockType.HIGHLIGHT -> PreachSurfaceBlock(span.text, style, contentModifier, MaterialTheme.colorScheme.tertiaryContainer)
        BlockType.BULLET -> Row(modifier = contentModifier) {
            Text("→  ", style = style, color = MaterialTheme.colorScheme.primary)
            Text(span.text, style = style)
        }
        else -> Text(span.text, style = style, modifier = contentModifier)
    }
}

@Composable
private fun PreachSurfaceBlock(text: String, style: TextStyle, modifier: Modifier, containerColor: Color) {
    Surface(color = containerColor, modifier = modifier) {
        Text(text, style = style, modifier = Modifier.padding(16.dp))
    }
}

private fun BlockEntity.preachTextStyle(fontScale: Float): TextStyle {
    val span = spans.firstOrNull() ?: TextSpan()
    val baseSize = when (type) {
        BlockType.HEADING_1 -> 26.sp
        BlockType.HEADING_2 -> 21.sp
        else -> 19.sp
    }
    val decoration = when {
        span.underline && span.strikethrough -> TextDecoration.combine(listOf(TextDecoration.Underline, TextDecoration.LineThrough))
        span.underline -> TextDecoration.Underline
        span.strikethrough -> TextDecoration.LineThrough
        else -> null
    }
    val isHeading = type == BlockType.HEADING_1 || type == BlockType.HEADING_2
    val scaledSize = baseSize * fontScale
    return TextStyle(
        fontWeight = if (span.bold || isHeading) FontWeight.Bold else FontWeight.Normal,
        fontStyle = if (span.italic) FontStyle.Italic else FontStyle.Normal,
        textDecoration = decoration,
        fontSize = scaledSize,
        lineHeight = scaledSize * 1.4f,
    )
}

private fun formatElapsed(totalSeconds: Int): String {
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds)
}
