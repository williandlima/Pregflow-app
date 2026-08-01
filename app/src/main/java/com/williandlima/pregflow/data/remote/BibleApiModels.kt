package com.williandlima.pregflow.data.remote

import kotlinx.serialization.Serializable

@Serializable
data class BibleApiVerse(
    val verse: Int,
    val text: String,
)

@Serializable
data class BibleApiResponse(
    val verses: List<BibleApiVerse> = emptyList(),
    val error: String? = null,
)
