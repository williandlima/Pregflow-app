package com.williandlima.pregflow.data.model

/** Tipos de bloco do editor, equivalentes aos do PWA original (p, h1, h2, bullet, quote, warning, highlight). */
enum class BlockType(val label: String) {
    PARAGRAPH("Parágrafo"),
    HEADING_1("Título"),
    HEADING_2("Subtítulo"),
    BULLET("Tópico"),
    QUOTE("Citação bíblica"),
    WARNING("Aviso"),
    HIGHLIGHT("Destaque"),
}
