package com.williandlima.pregflow.data.model

import java.text.Normalizer

/**
 * Índice de temas/palavras-chave para referências bíblicas (ex: "amor" -> "João 3:16").
 * Contém apenas citações (livro/capítulo/versículo), não o texto dos versículos —
 * equivalente a um índice de concordância, sem conteúdo de tradução protegido.
 */
val BIBLE_TOPIC_INDEX: Map<String, List<String>> = linkedMapOf(
    // Temas principais
    "amor" to listOf("1 João 4:8", "João 3:16", "1 Coríntios 13:4-7", "Romanos 8:38-39", "João 15:13", "1 João 4:16"),
    "fé" to listOf("Hebreus 11:1", "Romanos 10:17", "Gálatas 2:20", "Tiago 2:17", "Marcos 11:22", "2 Coríntios 5:7"),
    "esperança" to listOf("Romanos 5:5", "Jeremias 29:11", "Romanos 15:13", "1 Pedro 1:3", "Hebreus 6:19", "Salmos 33:18"),
    "graça" to listOf("Efésios 2:8-9", "João 1:17", "2 Coríntios 12:9", "Romanos 5:20", "Tito 2:11"),
    "salvação" to listOf("João 3:16", "Atos 4:12", "Romanos 10:9-10", "Efésios 2:8", "Tito 3:5", "Atos 16:31"),
    "perdão" to listOf("Salmos 103:12", "Efésios 4:32", "1 João 1:9", "Mateus 6:14-15", "Colossenses 3:13"),
    "paz" to listOf("João 14:27", "Filipenses 4:7", "Isaías 26:3", "Romanos 5:1", "Salmos 29:11", "João 16:33"),
    "oração" to listOf("Mateus 6:9-13", "Filipenses 4:6", "1 Tessalonicenses 5:17", "Tiago 5:16", "Jeremias 33:3"),
    "cura" to listOf("Isaías 53:5", "1 Pedro 2:24", "Salmos 103:3", "Êxodo 15:26", "Tiago 5:14-15"),
    "bênção" to listOf("Números 6:24-26", "Salmos 1:1", "Efésios 1:3", "Malaquias 3:10", "João 1:16"),
    "adoração" to listOf("João 4:23-24", "Salmos 100:1-4", "Romanos 12:1", "Salmos 95:6", "Apocalipse 4:11"),
    "louvor" to listOf("Salmos 150:1-6", "Salmos 34:1", "Efésios 5:19", "Salmos 113:1", "Atos 16:25"),
    "poder" to listOf("Filipenses 4:13", "2 Timóteo 1:7", "Atos 1:8", "Efésios 3:20", "Isaías 40:31"),
    "força" to listOf("Filipenses 4:13", "Isaías 40:31", "Salmos 28:7", "Efésios 6:10", "Neemias 8:10"),
    "vitória" to listOf("1 Coríntios 15:57", "Romanos 8:37", "1 João 5:4", "2 Coríntios 2:14"),
    "humildade" to listOf("Filipenses 2:3-4", "Tiago 4:10", "Provérbios 22:4", "Mateus 23:12", "1 Pedro 5:6"),
    "santidade" to listOf("1 Pedro 1:16", "Levítico 11:44", "Hebreus 12:14", "1 Tessalonicenses 4:3"),
    "sabedoria" to listOf("Provérbios 1:7", "Tiago 1:5", "Provérbios 3:5-6", "Colossenses 2:3", "1 Reis 3:9"),
    "confiança" to listOf("Provérbios 3:5-6", "Salmos 37:5", "Isaías 26:4", "Jeremias 17:7", "Salmos 56:11"),
    "alegria" to listOf("Neemias 8:10", "Filipenses 4:4", "Salmos 16:11", "João 15:11", "Romanos 15:13"),
    "sofrimento" to listOf("Romanos 8:18", "2 Coríntios 1:3-4", "1 Pedro 5:10", "Salmos 34:18", "Romanos 5:3-5"),
    "perseverança" to listOf("Tiago 1:2-4", "Hebreus 12:1", "Romanos 5:3-4", "Gálatas 6:9", "2 Timóteo 4:7"),
    "tentação" to listOf("1 Coríntios 10:13", "Tiago 1:12", "Mateus 26:41", "Hebreus 2:18"),
    "pecado" to listOf("Romanos 3:23", "1 João 1:9", "Isaías 59:2", "Romanos 6:23", "Salmos 51:1-2"),
    "redenção" to listOf("Efésios 1:7", "Colossenses 1:14", "Gálatas 3:13", "1 Pedro 1:18-19"),
    "propósito" to listOf("Jeremias 29:11", "Romanos 8:28", "Efésios 2:10", "Provérbios 19:21"),
    "missão" to listOf("Mateus 28:19-20", "Marcos 16:15", "Atos 1:8", "João 20:21"),
    "obediência" to listOf("João 14:15", "Deuteronômio 28:1-2", "1 Samuel 15:22", "Romanos 6:17"),
    "prosperidade" to listOf("3 João 1:2", "Josué 1:8", "Salmos 1:3", "Provérbios 10:22"),
    "provisão" to listOf("Filipenses 4:19", "Mateus 6:33", "Salmos 23:1", "2 Coríntios 9:8"),
    "proteção" to listOf("Salmos 91:1-4", "Isaías 43:2", "Salmos 121:1-8", "Provérbios 18:10"),
    "livramento" to listOf("Salmos 34:17", "Daniel 6:27", "1 Coríntios 10:13", "Salmos 91:14"),
    "resurreicao" to listOf("1 Coríntios 15:14", "João 11:25", "Romanos 6:4", "Mateus 28:6"),
    "ressurreição" to listOf("1 Coríntios 15:14", "João 11:25", "Romanos 6:4", "Mateus 28:6"),
    "vida eterna" to listOf("João 3:16", "João 17:3", "1 João 5:13", "João 10:10", "Romanos 6:23"),
    "morte" to listOf("João 11:25-26", "Romanos 6:23", "1 Coríntios 15:55", "Salmos 23:4"),
    // Família
    "família" to listOf("Josué 24:15", "Efésios 6:1-4", "Colossenses 3:18-21", "Provérbios 22:6"),
    "familia" to listOf("Josué 24:15", "Efésios 6:1-4", "Colossenses 3:18-21", "Provérbios 22:6"),
    "filhos" to listOf("Provérbios 22:6", "Efésios 6:1-3", "Salmos 127:3", "Mateus 19:14"),
    "casamento" to listOf("Gênesis 2:24", "Efésios 5:25-33", "Hebreus 13:4", "Mateus 19:6"),
    // Deus / Jesus / Espírito
    "deus" to listOf("João 3:16", "1 João 4:8", "Gênesis 1:1", "Romanos 8:28", "Hebreus 11:6"),
    "jesus" to listOf("João 14:6", "Filipenses 2:9-11", "Mateus 1:21", "Atos 4:12", "João 1:1"),
    "cristo" to listOf("Filipenses 4:13", "Gálatas 2:20", "Romanos 8:1", "Colossenses 1:27", "2 Coríntios 5:17"),
    "espírito santo" to listOf("João 14:16-17", "Atos 1:8", "Gálatas 5:22-23", "João 16:13"),
    "espirito" to listOf("João 14:16-17", "Atos 1:8", "Gálatas 5:22-23", "Romanos 8:26"),
    "espírito" to listOf("João 14:16-17", "Atos 1:8", "Gálatas 5:22-23", "Romanos 8:26"),
    "trindade" to listOf("Mateus 28:19", "2 Coríntios 13:14", "João 1:1-3"),
    // Igreja / Reino
    "reino" to listOf("Mateus 6:33", "Mateus 5:3", "Lucas 17:21", "Marcos 1:15"),
    "igreja" to listOf("Mateus 16:18", "Efésios 5:25-27", "Atos 2:42-47", "1 Coríntios 12:27"),
    "discipulado" to listOf("Mateus 28:19-20", "Lucas 9:23", "João 8:31", "2 Timóteo 2:2"),
    "unidade" to listOf("João 17:21", "Salmos 133:1", "Efésios 4:3", "Colossenses 3:14"),
    "frutos" to listOf("Gálatas 5:22-23", "João 15:5", "Mateus 7:17-18", "João 15:8"),
    "dons" to listOf("1 Coríntios 12:4-11", "Romanos 12:6-8", "Efésios 4:11-12", "1 Pedro 4:10"),
    "batismo" to listOf("Mateus 28:19", "Atos 2:38", "Romanos 6:3-4", "Marcos 16:16"),
    // Personagens
    "davi" to listOf("1 Samuel 16:13", "Salmos 23:1", "Salmos 51:1", "Atos 13:22", "2 Samuel 7:8"),
    "abraão" to listOf("Gênesis 12:1-3", "Hebreus 11:8", "Romanos 4:3", "Gálatas 3:9"),
    "abrao" to listOf("Gênesis 12:1-3", "Hebreus 11:8", "Romanos 4:3"),
    "moisés" to listOf("Êxodo 3:10", "Hebreus 11:24-26", "Números 12:3"),
    "moises" to listOf("Êxodo 3:10", "Hebreus 11:24-26", "Números 12:3"),
    "paulo" to listOf("Filipenses 4:11-13", "Gálatas 2:20", "2 Coríntios 12:9", "Atos 9:15"),
    "pedro" to listOf("Mateus 16:18", "João 21:17", "Atos 2:14", "1 Pedro 5:7"),
    "maria" to listOf("Lucas 1:38", "Lucas 1:46-49", "João 2:5"),
    "noé" to listOf("Gênesis 6:9", "Hebreus 11:7", "Gênesis 6:22"),
    "noe" to listOf("Gênesis 6:9", "Hebreus 11:7"),
    "josé" to listOf("Gênesis 37:28", "Gênesis 50:20", "Atos 7:9-10"),
    "jose" to listOf("Gênesis 37:28", "Gênesis 50:20"),
    "salomão" to listOf("1 Reis 3:9-14", "Provérbios 1:1", "1 Reis 4:29"),
    "salomao" to listOf("1 Reis 3:9-14", "Provérbios 1:1"),
    "elias" to listOf("1 Reis 18:36-38", "1 Reis 19:11-12", "Tiago 5:17"),
    "daniel" to listOf("Daniel 3:17-18", "Daniel 6:10", "Daniel 1:8"),
    "israel" to listOf("Êxodo 3:10", "Isaías 43:1", "Romanos 11:26", "Jeremias 31:31"),
    // Palavras-chave
    "luz" to listOf("João 8:12", "Mateus 5:14-16", "Salmos 119:105", "1 João 1:5"),
    "sal" to listOf("Mateus 5:13", "Colossenses 4:6"),
    "caminho" to listOf("João 14:6", "Provérbios 3:6", "Salmos 16:11", "Isaías 30:21"),
    "verdade" to listOf("João 14:6", "João 8:32", "João 17:17", "Efésios 4:15"),
    "vida" to listOf("João 14:6", "João 10:10", "1 João 5:12", "Deuteronômio 30:19"),
    "porta" to listOf("João 10:9", "Apocalipse 3:20", "Mateus 7:7-8"),
    "pão" to listOf("João 6:35", "Mateus 6:11", "João 6:48"),
    "agua" to listOf("João 4:14", "João 7:38", "Apocalipse 22:17"),
    "água" to listOf("João 4:14", "João 7:38", "Apocalipse 22:17"),
    "sangue" to listOf("1 Pedro 1:19", "Hebreus 9:22", "Apocalipse 1:5", "1 João 1:7"),
    "cruz" to listOf("1 Coríntios 1:18", "Gálatas 2:20", "Filipenses 2:8", "Colossenses 2:14"),
    "glória" to listOf("Romanos 8:18", "João 17:22", "2 Coríntios 3:18", "Salmos 19:1"),
    "gloria" to listOf("Romanos 8:18", "João 17:22", "2 Coríntios 3:18"),
    "armadura" to listOf("Efésios 6:10-18"),
    "armadura de deus" to listOf("Efésios 6:10-18"),
    "pai nosso" to listOf("Mateus 6:9-13", "Lucas 11:2-4"),
    "salmo 23" to listOf("Salmos 23:1-6"),
    "bem-aventuranças" to listOf("Mateus 5:3-12"),
    "novo nascimento" to listOf("João 3:3-7", "1 Pedro 1:23", "2 Coríntios 5:17"),
    "nova criatura" to listOf("2 Coríntios 5:17", "Gálatas 6:15", "Efésios 4:24"),
    "criação" to listOf("Gênesis 1:1", "João 1:3", "Colossenses 1:16", "Hebreus 11:3"),
    "fogo" to listOf("Atos 2:3", "Jeremias 20:9", "Deuteronômio 4:24", "Lucas 12:49"),
    "bênçãos" to listOf("Deuteronômio 28:1-14", "Efésios 1:3", "Números 6:24-26"),
    "gracas" to listOf("1 Tessalonicenses 5:18", "Filipenses 4:6", "Colossenses 3:17"),
    "graças" to listOf("1 Tessalonicenses 5:18", "Filipenses 4:6", "Colossenses 3:17"),
    "serviço" to listOf("Mateus 20:28", "Marcos 10:45", "Gálatas 5:13"),
    "servir" to listOf("Mateus 20:28", "Josué 24:15", "Romanos 12:11"),
    "libertação" to listOf("Lucas 4:18", "João 8:36", "Gálatas 5:1", "Romanos 8:2"),
    "libertacao" to listOf("Lucas 4:18", "João 8:36", "Gálatas 5:1"),
)

private fun normalize(text: String): String =
    Normalizer.normalize(text.lowercase(), Normalizer.Form.NFD).replace(Regex("\\p{Mn}+"), "")

/** Busca por tema/palavra-chave, retornando apenas referências (sem duplicatas, na ordem encontrada). */
fun searchBibleTopics(query: String): List<String> {
    val normalizedQuery = normalize(query)
    val matched = LinkedHashSet<String>()
    for ((key, refs) in BIBLE_TOPIC_INDEX) {
        val normalizedKey = normalize(key)
        if (normalizedKey.contains(normalizedQuery) || normalizedQuery.contains(normalizedKey)) {
            matched.addAll(refs)
        }
    }
    return matched.toList()
}
