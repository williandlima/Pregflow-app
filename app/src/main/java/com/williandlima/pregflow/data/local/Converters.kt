package com.williandlima.pregflow.data.local

import androidx.room.TypeConverter
import com.williandlima.pregflow.data.model.BlockType
import com.williandlima.pregflow.data.model.TextSpan
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class Converters {
    @TypeConverter
    fun fromBlockType(type: BlockType): String = type.name

    @TypeConverter
    fun toBlockType(value: String): BlockType = BlockType.valueOf(value)

    @TypeConverter
    fun fromSpans(spans: List<TextSpan>): String = Json.encodeToString(spans)

    @TypeConverter
    fun toSpans(value: String): List<TextSpan> =
        if (value.isBlank()) emptyList() else Json.decodeFromString(value)
}
