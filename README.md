# PregFlow (Android nativo)

App Android nativo para criar, editar e apresentar sermões/pregações,
reescrito em Kotlin + Jetpack Compose a partir do PWA original. Objetivo:
publicação paga (assinatura Pro) na Google Play Store.

Este projeto está em migração ativa a partir de um PWA estático
(HTML/CSS/JS). O plano completo de fases (editor de blocos, Modo Pregação,
busca bíblica offline, login + backup em nuvem, IA via backend próprio,
assinatura Google Play Billing) está descrito no histórico de planejamento
do projeto — cada fase é implementada incrementalmente.

## Stack

- Kotlin + Jetpack Compose (Material 3)
- Arquitetura MVVM + Hilt (injeção de dependência)
- Room (cache local offline-first) + Cloud Firestore (sync entre
  dispositivos, a partir da Fase 5)
- Firebase Auth (Google Sign-In, a partir da Fase 5)
- Firebase Cloud Functions (proxy do assistente de IA e validação de
  compras, a partir das Fases 6/7)
- Google Play Billing Library (assinatura Pro, Fase 7)

## Status atual

**Fase 1 — Scaffold do projeto.** O app compila para uma tela inicial
("shell") vazia com o tema/marca do PregFlow; ainda não há CRUD de
sermões, editor de blocos, login ou IA — isso vem nas próximas fases.

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
└── ui/
    ├── theme/                # Cores/tema Material 3 (marca PregFlow)
    ├── navigation/           # NavHost e rotas
    └── home/                 # Tela inicial (shell)
```
