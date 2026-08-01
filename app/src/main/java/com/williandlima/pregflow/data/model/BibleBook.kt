package com.williandlima.pregflow.data.model

/** Nome e número de capítulos por livro — fatos estruturais, não texto de tradução. */
data class BibleBook(val name: String, val chapterCount: Int)

val BIBLE_BOOKS: List<BibleBook> = listOf(
    BibleBook("Gênesis", 50), BibleBook("Êxodo", 40), BibleBook("Levítico", 27), BibleBook("Números", 36), BibleBook("Deuteronômio", 34),
    BibleBook("Josué", 24), BibleBook("Juízes", 21), BibleBook("Rute", 4), BibleBook("1 Samuel", 31), BibleBook("2 Samuel", 24),
    BibleBook("1 Reis", 22), BibleBook("2 Reis", 25), BibleBook("1 Crônicas", 29), BibleBook("2 Crônicas", 36), BibleBook("Esdras", 10),
    BibleBook("Neemias", 13), BibleBook("Ester", 10), BibleBook("Jó", 42), BibleBook("Salmos", 150), BibleBook("Provérbios", 31),
    BibleBook("Eclesiastes", 12), BibleBook("Cânticos", 8), BibleBook("Isaías", 66), BibleBook("Jeremias", 52), BibleBook("Lamentações", 5),
    BibleBook("Ezequiel", 48), BibleBook("Daniel", 12), BibleBook("Oseias", 14), BibleBook("Joel", 3), BibleBook("Amós", 9),
    BibleBook("Obadias", 1), BibleBook("Jonas", 4), BibleBook("Miqueias", 7), BibleBook("Naum", 3), BibleBook("Habacuque", 3),
    BibleBook("Sofonias", 3), BibleBook("Ageu", 2), BibleBook("Zacarias", 14), BibleBook("Malaquias", 4),
    BibleBook("Mateus", 28), BibleBook("Marcos", 16), BibleBook("Lucas", 24), BibleBook("João", 21), BibleBook("Atos", 28),
    BibleBook("Romanos", 16), BibleBook("1 Coríntios", 16), BibleBook("2 Coríntios", 13), BibleBook("Gálatas", 6), BibleBook("Efésios", 6),
    BibleBook("Filipenses", 4), BibleBook("Colossenses", 4), BibleBook("1 Tessalonicenses", 5), BibleBook("2 Tessalonicenses", 3),
    BibleBook("1 Timóteo", 6), BibleBook("2 Timóteo", 4), BibleBook("Tito", 3), BibleBook("Filemom", 1), BibleBook("Hebreus", 13),
    BibleBook("Tiago", 5), BibleBook("1 Pedro", 5), BibleBook("2 Pedro", 3), BibleBook("1 João", 5), BibleBook("2 João", 1),
    BibleBook("3 João", 1), BibleBook("Judas", 1), BibleBook("Apocalipse", 22),
)
