package com.williandlima.pregflow.data.model

import kotlinx.serialization.Serializable

/**
 * Um trecho de texto formatado dentro de um bloco. Guardado como lista para
 * permitir, no futuro, múltiplos trechos com formatação diferente dentro do
 * mesmo bloco (seleção parcial de texto) — na v1 do editor nativo cada bloco
 * tem uma única [TextSpan] cobrindo todo o texto.
 */
@Serializable
data class TextSpan(
    val text: String = "",
    val bold: Boolean = false,
    val italic: Boolean = false,
    val underline: Boolean = false,
    val strikethrough: Boolean = false,
)
