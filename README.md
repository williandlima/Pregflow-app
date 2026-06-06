# PregFlow Pro

Aplicativo PWA para criar, editar e apresentar sermões e mensagens. Funciona offline após a primeira visita.

## Funcionalidades

- **Editor de blocos** — parágrafos, títulos H1/H2, citações bíblicas, avisos e destaques
- **Modo Pregação** — tela cheia com cronômetro e controle de tamanho de fonte
- **Bíblia integrada** — busca versículos por livro/capítulo e insere no editor (requer internet)
- **Backup e restauração** — exporta/importa dados em JSON
- **Modo escuro** — tema claro e escuro com persistência
- **PWA instalável** — funciona offline, pode ser instalado como app no celular ou desktop

## Como usar

### Criar uma mensagem
1. Abra o app e toque em **+** (canto inferior direito)
2. Digite o título e a referência bíblica
3. Use a barra de ferramentas para formatar os blocos

### Modo Pregação
- Toque no botão **▶** (play) no editor para entrar em modo tela cheia
- Use **A-** / **A+** para ajustar o tamanho da fonte
- Toque na área inferior para mostrar/esconder o HUD
- O cronômetro inicia com o botão ▶ na barra inferior

### Bíblia
- Toque no ícone de livro no editor
- Selecione o livro e o capítulo
- **Copiar** — copia o versículo para a área de transferência
- **Inserir** — insere o versículo como citação no editor

### Backup
1. Vá em **Configurações** (ícone de engrenagem)
2. **Baixar** — salva um arquivo `.json` com todas as mensagens
3. **Upload** — restaura a partir de um arquivo de backup

## Instalar como PWA

No Chrome/Edge, toque em **Instalar** na barra de endereços ou no menu do navegador. No iOS (Safari), use **Compartilhar → Adicionar à Tela Inicial**.

## Estrutura do Projeto

```
Pregflow-app/
├── index.html         # Estrutura HTML
├── styles.css         # Estilos e design system
├── app.js             # Lógica da aplicação
├── service-worker.js  # Cache offline (PWA)
├── manifest.json      # Configuração PWA
└── icons/             # Ícones para instalação PWA
```

## Desenvolvimento

Não há dependências ou build step. Basta servir os arquivos com qualquer servidor HTTP:

```bash
# Python
python3 -m http.server 8080

# Node.js (npx)
npx serve .
```

Abra `http://localhost:8080` no navegador.

## Dados

Todos os dados são armazenados localmente no `localStorage` do navegador. Use o **Backup** regularmente para não perder mensagens ao limpar o cache do navegador.
