# PregFlow (Android nativo)

App Android nativo para criar, editar e apresentar sermões/pregações,
reescrito em Kotlin + Jetpack Compose a partir do PWA original. Objetivo:
publicação paga (assinatura Pro) na Google Play Store.

Este projeto está em migração ativa a partir de um PWA estático
(HTML/CSS/JS). **Decisão definitiva do projeto: os dados ficam sempre no
aparelho — sem login, conta de usuário ou sincronização em nuvem, nem no
futuro.** O plano completo de fases está descrito no histórico de
planejamento do projeto — cada fase é implementada incrementalmente.

## Stack

- Kotlin + Jetpack Compose (Material 3)
- Arquitetura MVVM + Hilt (injeção de dependência)
- Room (armazenamento local — única fonte de dados; sem Firebase/nuvem
  por decisão definitiva do projeto)
- OkHttp + kotlinx.serialization (consulta à bible-api.com)
- Google Play Billing Library (assinatura Pro, fase futura)

## Status atual

- ✅ **Fase 1 — Scaffold do projeto**: tema/marca, navegação, ícone adaptativo.
- ✅ **Fase 2 — CRUD de sermões + editor de blocos (offline, Room)**: tela
  inicial lista/cria/exclui pregações; editor permite título, referência
  bíblica, blocos (parágrafo, títulos, tópico, citação, aviso, destaque)
  com formatação (negrito/itálico/sublinhado/tachado), reordenar, marcar
  como ministrado e excluir. Nesta v1 a formatação é por bloco inteiro,
  não por trecho selecionado dentro do texto — formatação em nível de
  seleção de texto é um risco técnico já mapeado para uma fase futura.
- ✅ **Fase 3 — Modo Pregação**: tela cheia acessada pelo ▶ no editor, com
  toque na tela para esconder/mostrar o HUD, controle de tamanho de fonte
  (A-/A+), cronômetro (iniciar/pausar/zerar) e blocos ministrados exibidos
  com opacidade reduzida.
- ✅ **Fase 4 — Busca bíblica**: consulta em tempo real à bible-api.com
  (tradução Almeida), igual ao PWA original — o app não empacota nem
  redistribui texto bíblico (NVI/NVT/Almeida Revisada são traduções
  comerciais protegidas por direitos autorais, sem licença obtida ainda;
  ver observação abaixo). Busca por referência direta ("João 3:16"), por
  tema/palavra-chave (índice local de referências, sem texto de versículo)
  ou navegação por livro/capítulo; inserir um versículo cria um bloco de
  citação no editor.
- ✅ **Fase 5 — Backup local**: substitui de vez o antigo plano de login +
  sincronização em nuvem (Firebase) — os dados ficam **sempre** só no
  aparelho, por decisão definitiva do projeto. Esta fase adiciona
  exportar/importar backup como arquivo `.json` via seletor de arquivos do
  sistema (tela de Configurações, acessível pelo ícone de engrenagem na
  tela inicial) — mesma ideia do backup manual que o PWA original já
  tinha, sem depender de nenhuma conta ou serviço externo.
- ❌ Fora do roteiro (decisão definitiva): login/conta de usuário,
  sincronização em nuvem entre dispositivos.
- ⏸️ Sem plano concreto por enquanto: assistente de IA (dependia do
  backend Firebase descartado; será redesenhado sem Firebase se retomado).
- ⏳ Próxima: assinatura Pro (Google Play Billing) — não depende de
  nuvem para o conteúdo, só os servidores do Google validam a compra em
  si.

Login e sincronização em nuvem nunca existirão neste app — os dados vivem
sempre no banco Room local do dispositivo, com backup/restauração manual
via arquivo.

**Nota sobre conteúdo bíblico:** o app não embute texto de nenhuma
tradução (NVI, NVT, Almeida Revisada etc.) porque essas traduções são
protegidas por direitos autorais das respectivas sociedades bíblicas/
editoras (Biblica, Mundo Cristão, Imprensa Bíblica Brasileira/SBB) e
exigem licenciamento comercial antes de serem redistribuídas num app
pago — algo que ainda não foi obtido. A busca bíblica depende de conexão
com a internet (bible-api.com) até que essa licença seja resolvida.

## Abrir no Android Studio

1. Clone o repositório e abra a pasta raiz no Android Studio (Ladybug ou
   mais recente).
2. Deixe o Gradle sincronizar (primeira sincronização baixa o Android SDK
   platform 35 e as dependências do Google Maven — precisa de acesso à
   internet a `dl.google.com`/`maven.google.com`, o que **não** foi
   possível validar no ambiente onde este scaffold foi gerado, pois o
   acesso a `dl.google.com` estava bloqueado pela política de rede da
   sessão; o build não foi compilado/testado localmente por causa dessa
   restrição — a primeira verificação real precisa ser feita no Android
   Studio).
3. Rode a configuração `app` num emulador ou dispositivo físico
   (`minSdk 26`).

## Build via linha de comando

```bash
./gradlew assembleDebug
./gradlew testDebugUnitTest
```

## Estrutura

```
app/src/main/java/com/williandlima/pregflow/
├── PregFlowApplication.kt   # @HiltAndroidApp
├── MainActivity.kt
├── data/
│   ├── model/                # BlockType, TextSpan, BibleBook, índice de temas, backup
│   ├── local/                # Entidades Room, DAO, Database, Converters
│   ├── remote/                # Cliente da bible-api.com (OkHttp + kotlinx.serialization)
│   ├── backup/                # Leitura/escrita do arquivo de backup (SAF)
│   └── repository/           # SermonRepository, BibleRepository
├── di/                       # Módulos Hilt (Database, Network, Repository)
└── ui/
    ├── theme/                # Cores/tema Material 3 (marca PregFlow)
    ├── navigation/           # NavHost e rotas
    ├── home/                 # Lista de pregações
    ├── editor/                # Editor de blocos da pregação
    ├── preach/                # Modo Pregação (tela cheia)
    ├── bible/                 # Busca bíblica
    └── settings/              # Exportar/importar backup
```
