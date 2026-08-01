package com.williandlima.pregflow.ui.editor

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.williandlima.pregflow.R
import com.williandlima.pregflow.data.model.BlockType

@Composable
fun BlockItem(
    block: BlockUiState,
    onTextChange: (String) -> Unit,
    onToggleBold: () -> Unit,
    onToggleItalic: () -> Unit,
    onToggleUnderline: () -> Unit,
    onToggleStrikethrough: () -> Unit,
    onToggleMinistered: () -> Unit,
    onMoveUp: () -> Unit,
    onMoveDown: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val containerColor = when (block.type) {
        BlockType.QUOTE -> MaterialTheme.colorScheme.primaryContainer
        BlockType.WARNING -> MaterialTheme.colorScheme.errorContainer
        BlockType.HIGHLIGHT -> MaterialTheme.colorScheme.tertiaryContainer
        else -> MaterialTheme.colorScheme.surfaceVariant
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = containerColor),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = block.type.label,
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = onMoveUp) {
                    Icon(Icons.Filled.KeyboardArrowUp, contentDescription = stringResource(R.string.editor_block_move_up_cd))
                }
                IconButton(onClick = onMoveDown) {
                    Icon(Icons.Filled.KeyboardArrowDown, contentDescription = stringResource(R.string.editor_block_move_down_cd))
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Filled.Delete, contentDescription = stringResource(R.string.editor_block_delete_cd))
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                FilterChip(selected = block.bold, onClick = onToggleBold, label = { Text("B") })
                Spacer(modifier = Modifier.width(4.dp))
                FilterChip(selected = block.italic, onClick = onToggleItalic, label = { Text("I") })
                Spacer(modifier = Modifier.width(4.dp))
                FilterChip(selected = block.underline, onClick = onToggleUnderline, label = { Text("U") })
                Spacer(modifier = Modifier.width(4.dp))
                FilterChip(selected = block.strikethrough, onClick = onToggleStrikethrough, label = { Text("T") })
                Spacer(modifier = Modifier.weight(1f))
                Checkbox(
                    checked = block.ministered,
                    onCheckedChange = { onToggleMinistered() },
                )
            }

            TextField(
                value = block.text,
                onValueChange = onTextChange,
                placeholder = { Text(stringResource(R.string.editor_block_text_placeholder)) },
                textStyle = block.toTextStyle(),
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

private fun BlockUiState.toTextStyle(): TextStyle {
    val decoration = when {
        underline && strikethrough -> TextDecoration.combine(listOf(TextDecoration.Underline, TextDecoration.LineThrough))
        underline -> TextDecoration.Underline
        strikethrough -> TextDecoration.LineThrough
        else -> null
    }
    val fontSize = when (type) {
        BlockType.HEADING_1 -> 22.sp
        BlockType.HEADING_2 -> 18.sp
        else -> 16.sp
    }
    val isHeading = type == BlockType.HEADING_1 || type == BlockType.HEADING_2
    return TextStyle(
        fontWeight = if (bold || isHeading) FontWeight.Bold else FontWeight.Normal,
        fontStyle = if (italic) FontStyle.Italic else FontStyle.Normal,
        textDecoration = decoration,
        fontSize = fontSize,
    )
}
