# Documentação de Hand-off (Frontend & Arquitetura de Aplicação)

> **Status do Projeto:** Ativo & Estável  
> **Stack Principal:** React 19, Vite 8, Tailwind CSS v4, Supabase JS v2, Lucide React, React Router v7  
> **Última Atualização:** Setembro/2026

---

## 📌 1. Visão Geral do Sistema

O **Roll Angels Site** é uma plataforma web para gestão de campanhas de RPG (Dungeons & Dragons 5ª Edição), integrando fichas de personagem interativas, assistente de evolução de nível, sistema de compêndio/glossário enriquecido estilo CRPG (*Baldur's Gate 3*), painel administrativo do Mestre (DM), controle detalhado de campanha e tabuleiro virtual em tempo real (VTT).

O sistema adota padrões ergonômicos estritos baseados em **Apple Human Interface Guidelines (HIG)** e **Google Material Design 3 (M3)**, garantindo acessibilidade, superfícies tonais translúcidas (*Frosted Glass*) e áreas úteis de toque mínimas de 44×44px (Desktop/Apple) a 48×48px (Mobile/M3).

---

## 🗺️ 2. Matriz de Rotas da Aplicação (`src/App.jsx`)

| Rota | Componente | Descrição / Responsabilidade | Acesso / Permissão |
|---|---|---|---|
| `/` | `Navigate to="/login"` | Redirecionamento padrão para a página de autenticação. | Público |
| `/login` | `Login.jsx` | Autenticação via email/senha, login social e link para recuperação. | Público |
| `/reset-password` | `ResetPassword.jsx` | Redefinição de senha utilizando tokens de recuperação do Supabase Auth. | Público |
| `/selecao` | `CharacterSelection.jsx` | Hub do jogador: listagem de personagens ativos, status de aprovação e criação. | Jogador Autenticado |
| `/criacao` | `CharacterCreationRequest.jsx` | Formulário rápido para propor novo conceito de personagem ao Mestre. | Jogador Autenticado |
| `/criacao-completa/:requestId` | `CharacterFullCreation.jsx` | Construtor aprofundado de ficha (raça, classe, atributos, antecedentes e magias). | Jogador Autenticado |
| `/ficha/:id` | `CharacterSheet.jsx` | Ficha interativa completa com 8 abas temáticas, logs e atalhos de compêndio. | Jogador Dono / Mestre |
| `/compendio` | `CompendiumPage.jsx` | Enciclopédia global expansível com busca textual e filtros de todas as categorias. | Jogador / Mestre |
| `/mestre` | `DMDashboard.jsx` | Painel de controle do DM: campanhas, grupos, sessões, aprovação de fichas e IA. | Apenas Mestre (DM) |
| `/mestre/campanha/:campaignId` | `CampaignControl.jsx` | Gestor operacional de campanha: XP, Missões (Quests), NPCs e Conhecimento. | Apenas Mestre (DM) |
| `/vtt/:sessionId` | `VTTPage.jsx` | Tabuleiro Virtual de Combate sincronizado em tempo real com névoa e tokens. | Jogador / Mestre |

> **Portais Globais (Renderizados em `App.jsx`):**  
> Envolvidos pelo `<LexiconProvider>`, garantindo que o sistema de tooltips aninhadas (`<NestedTooltipPortal />`) e a busca rápida lateral (`<CompendiumDrawer />`) estejam disponíveis em qualquer rota da aplicação.

---

## 📚 3. Sistema Lexicon & Compêndio (D&D Codex & Nested Tooltips)

Inspirado na arquitetura de RPGs modernos, este sistema converte qualquer texto bruto contendo termos de regras em links interativos vivos, com suporte a **Tooltips Aninhadas Recursivas** e busca instantânea.

### 3.1 Componentes e Módulos do Lexicon

- **`src/lib/lexiconClient.js`**:
  - Motor de busca, cache e tokenização de strings.
  - Carrega o índice unificado da view `v_codex_entries` e armazena em `localStorage` sob a chave `ra_codex_cache_v2` com TTL de 12 horas.
  - Compila Regex Unicode ordenado pelo comprimento decrescente dos termos (ex: *"Ataque de Oportunidade"* tem precedência sobre *"Ataque"*).
  - Suporte a Wikilinks explícitos estilo Obsidian/Wikipedia: `[[Termo]]` ou `[[Termo|Rótulo Exibido]]`.
  - Mecanismo de resiliência offline: em falhas de conexão ou cache vazio, o texto bruto é renderizado de forma graciosa sem quebrar a UI.
- **`src/context/LexiconContext.jsx`**:
  - Estado global da pilha de tooltips (`tooltipStack`), controle de verbetes fixados (*pinned*) e abertura do Drawer lateral.
  - Atalhos globais de teclado:
    - `Ctrl + K` / `Cmd + K`: Alterna o Drawer de busca rápida do Compêndio (ignorado em inputs/textareas).
    - `T`: Fixa (*pin*) o tooltip ativo sob hover para navegação interna de seus links (estilo *Baldur's Gate 3*).
    - `Escape`: Desempilha a última tooltip aberta ou fecha o Drawer caso a pilha esteja vazia.
- **`src/components/lexicon/NestedTooltipPortal.jsx`**:
  - Renderizado diretamente em `document.body` via `createPortal`, isolado de limitações de layout pai (`overflow: hidden`, `z-index`).
  - **Desktop (>= 768px):** Floating Cards inteligentes.
    - *Root Coordinate Anchoring (Invariante 7):* Ao clicar em termos aninhados dentro do card, o tooltip preserva as coordenadas do primeiro termo (`tooltipStack[0].targetRect`), evitando saltos verticais bruscos na tela.
    - *Viewport Clamping:* Medição dinâmica da altura real que garante que o card permaneça estritamente contido no viewport (`top <= window.innerHeight - measuredHeight - padding`).
    - *Hover Bridges:* Pseudo-elementos transparentes `:before`/`:after` que preenchem a lacuna física de 8px entre o texto e o card, eliminando perda acidental de hover.
  - **Mobile (< 768px):** Transforma-se automaticamente em **Bottom Sheet nativo** ancorado na parte inferior da tela, respeitando a zona ergonômica do polegar (*thumb-zone*) e botões com área útil mínima de 48×48px.
- **`src/components/lexicon/LexiconText.jsx`**:
  - Componente utilitário *drop-in*. Divide strings em fragmentos normais e nós `<GlossaryTerm />`.
  - Suporta `excludeEntryId` para evitar auto-referências recursivas (um verbete não gera tooltip de si mesmo dentro de sua própria descrição).
  - Suporta `isNested` para controlar a sensibilidade de hover em níveis profundos da pilha.
- **`src/components/lexicon/GlossaryTerm.jsx`**:
  - Renderiza o termo com sublinhado pontilhado estilizado (`border-b border-dotted`).
  - Chamada mandatória de `e.stopPropagation()` no clique para evitar disparos acidentais em modais e acordeões pais.
  - Acessibilidade: `role="button"`, `tabIndex={0}` e ativação pelas teclas `Enter` e `Space`.
- **`src/components/lexicon/CompendiumDrawer.jsx`**:
  - Gaveta lateral translúcida com busca em tempo real, badges de categoria e suporte a navegação direta entre verbetes.
- **`src/pages/CompendiumPage.jsx`**:
  - Página dedicada com filtros por 8 categorias canônicas (Magias, Condições, Regras, Itens, Classes, Talentos, Tipos de Dano, Lore) e leitura expandida.

### 3.2 Matriz de Cobertura do Lexicon no Frontend

| Arquivo / Tela | Campos / Nós Hidratados com `<LexiconText />` |
|---|---|
| `src/components/tabs/MagiasTab.jsx` | Descrições de magias (`spell.desc`) e efeitos em níveis superiores (`spell.higher_level`). |
| `src/components/tabs/ClasseTab.jsx` | Descrições de características de classe (`feature.description`) e opções de arquétipo (`option.summary`). |
| `src/components/tabs/InventarioTab.jsx` | Nomes de itens e descrições detalhadas de equipamentos/itens mágicos. |
| `src/components/tabs/StatsTab.jsx` | PV, CA, Iniciativa, atributos, Resistência e todas as 18 perícias (`skill.name`). |
| `src/components/tabs/AtributosTab.jsx` | Nomes dos atributos e nota de explicação do d20. |
| `src/components/tabs/ResumoTab.jsx` | Proficiência, Deslocamento, Pontos de Vida, Classe de Armadura e notas de combate. |
| `src/components/tabs/LogTab.jsx` | Conteúdo das entradas de diário/log de campanha (`entry.content`). |
| `src/components/tabs/PersonaTab.jsx` | Sugestões interativas de antecedentes, traços, ideais e defeitos. |
| `src/components/LevelUpWizardModal.jsx` | Características de classe, subclasses, truques, magias e descrição completa de talentos (Feats). |
| `src/pages/DMDashboard.jsx` | Lista de perícias e notas nas solicitações de criação simplificada e completa. |
| `src/components/CharacterSheet.jsx` | Botões de acesso rápido ao Compêndio posicionados no Header e na barra lateral. |

---

## 🛡️ 4. Ficha de Personagem D&D 5e (`src/components/CharacterSheet.jsx`)

Componente central do jogador, organizado em abas com persistência reativa e sincronização via Supabase:

1. **`StatsTab.jsx` (Status & Combate):**
   - Pontos de Vida (atuais, máximos, temporários) com barra de progresso visual.
   - Classe de Armadura (CA) e Iniciativa calculada dinamicamente com base em Destreza.
   - Salvaguardas com indicadores de proficiência por classe.
   - 18 Perícias D&D 5e com modificador somado, bônus de proficiência e suporte a Especialização (*Expertise*).
2. **`ClasseTab.jsx` (Progressão & Arquétipos):**
   - Timeline de características de classe desbloqueadas por nível.
   - Seleção de Subclasse/Arquétipo e opções customizáveis (ex: Estilos de Luta, Invocações Místicas).
   - Magias concedidas por subclasse com marcação *Always Prepared* e ícone de cadeado/brilho (*Sparkle*).
3. **`InventarioTab.jsx` (Itens & Carga):**
   - Gestão de moedas (PC, PP, PE, PO, PL).
   - Cálculo automático de capacidade de carga máxima baseada no valor de Força.
   - Itens equipados vs guardados e slots de sintonização mágica (*Attunement* - 3 slots máximos).
4. **`MagiasTab.jsx` (Grimório & Slots):**
   - Controle de espaços de magia (gastos vs disponíveis) do 1º ao 9º nível e truques (*cantrips*).
   - Filtros por nível, escola de magia, rituais e concentração.
   - Marcador de magias preparadas com limite dinâmico por classe/nível.
5. **`PersonaTab.jsx` (Interpretação & RP):**
   - Antecedente (*Background*), Traços de Personalidade, Ideais, Vínculos e Defeitos.
   - Sugestões interativas alimentadas por `src/lib/personaSuggestions.js` com inserção em um clique.
6. **`LogTab.jsx` (Diário da Campanha):**
   - Anotações de sessões, eventos marcantes e pistas com tags de Lexicon clicáveis.
7. **`AtributosTab.jsx` & `ResumoTab.jsx`:**
   - Visualizações focadas para consulta rápida de modificadores e decisões de combate em alta pressão.

### 4.1 Assistente de Nível (`src/components/LevelUpWizardModal.jsx`)
- Modal guiado passo-a-passo acionado quando o XP atinge o patamar estipulado por `levelProgression.js`.
- **Passo 1 (Vida):** Escolha entre valor médio garantido da classe ou rolagem animada do Dado de Vida (*Hit Die*).
- **Passo 2 (Características & Subclasse):** Apresentação das habilidades do novo nível e escolha de arquétipo quando aplicável.
- **Passo 3 (Magias & Truques):** Seleção de novas magias respeitando os limites da tabela da classe.
- **Passo 4 (ASI ou Talento):** Distribuição de +2 em um atributo, +1 em dois atributos ou escolha de Talento (*Feat*) com descrição detalhada via Lexicon.

### 4.2 Customização e Notificações
- **Temas Dinâmicos (`SheetThemeSettingsModal.jsx` / `sheetTheme.js`):** Injeção de variáveis CSS `--sheet-accent` diretamente no elemento raiz do documento e scrollbars temáticas.
- **Central de Notificações:** Dropdown com contador de avisos não lidos e persistência de leitura no Supabase.
- **Upload de Avatar:** Modal com preview instantâneo e upload direto para o Supabase Storage bucket.

---

## 🎲 5. Painel de Controle de Campanha (`src/pages/CampaignControl.jsx`)

Área operacional exclusiva do Mestre para gerenciar a dinâmica viva de uma campanha (`/mestre/campanha/:campaignId`):

- **Visão Geral (`overview`):** Status da campanha (Ativa, Pausada, Concluída), listagem dos grupos e sessões recentes.
- **Gerenciador de XP (`src/components/campaign/XPManager.jsx`):**
  - Concessão de experiência coletiva (dividida igualmente entre os membros) ou individual.
  - Histórico de distribuição com data, motivo e cálculo automático de aptidão para subir de nível.
- **Quadro de Missões (`src/components/campaign/QuestBoard.jsx`):**
  - Gerenciamento de missões primárias e secundárias (status: Em Aberto, Concluída, Falha).
  - Objetivos intermediários com checklist e registro de recompensas em ouro/XP.
- **Lista de NPCs (`src/components/campaign/NPCList.jsx`):**
  - Fichas resumidas de personagens do Mestre com atitudes (Amigável, Neutro, Hostil), facção e notas secretas.
- **Conhecimento & Lore (`src/components/campaign/CampaignKnowledge.jsx`):**
  - Enciclopédia interna da campanha: locais explorados, segredos, documentos históricos e mitologias.

---

## 👑 6. Painel do Mestre (`src/pages/DMDashboard.jsx`)

Central administrativa para mestres de jogo (`/mestre`):

1. **Gestão de Sessões & VTT:**
   - Criação de novas sessões vinculadas a campanhas e grupos.
   - Ações diretas para iniciar, pausar ou finalizar sessões com redirecionamento para o VTT (`/vtt/:sessionId`).
2. **Fila de Criação de Personagens:**
   - **Solicitações Simplificadas (`character_creation_requests`):** Aprovação de conceito inicial (raça, classe, perícias e histórico).
   - **Solicitações de Criação Completa:** Auditoria aprofundada de distribuição de atributos, equipamentos iniciais e magias com validação visual via `LexiconText`.
3. **Assistente IA do Mestre (`src/components/PiNoKyoChat.jsx`):**
   - Chatbot flutuante dedicado para consultas rápidas sobre regras de D&D 5e, geração de ideias de encontros e criação improvisada de ganchos narrativos.

---

## ⚔️ 7. Tabuleiro Virtual em Tempo Real (VTT - `src/pages/VTTPage.jsx`)

Ambiente tático para visualização de encontros e combate:

- **Componentes:**
  - `src/components/vtt/VTTCanvas.jsx`: Grid interativo com renderização de tokens de personagens e monstros, zoom, pan e medição de alcance.
  - `src/components/vtt/VTTSidebar.jsx`: Ordem de iniciativa, rolador de dados e gerenciamento de tokens ativos.
- **Sincronização Realtime (`src/lib/vttClient.js`):**
  - Utiliza Supabase Realtime Channels (`subscribeToVTTRoom`).
  - Broadcast de eventos de baixa latência: movimentação de tokens (`broadcastTokenMove`), alteração de HP (`broadcastTokenHP`), avanço de turno (`broadcastTurnAdvance`), adição/remoção de tokens e alternância entre Modo Exploração e Modo Combate.
  - Rastreamento de presença (*presence state*) dos participantes online na sessão.

---

## 💾 8. Camada de Dados, Autenticação e Supabase

- **Cliente Supabase Central (`src/lib/supabaseClient.js`):**
  - Mapeia operações CRUD para personagens, atributos, inventário, magias, logs, campanhas, grupos e notificações.
  - Verificação de privilégios de DM via `isCurrentUserDM()`.
- **View Consolidada (`v_codex_entries`):**
  - Unifica tabelas de regras, condições, magias, itens, talentos e monstros sob um único schema estandardizado (`entry_id`, `category`, `badge_label`, `name`, `name_pt`, `slug`, `short_desc`, `description`, `synonyms`, `extra_data`).
- **Segurança (Row Level Security - RLS):**
  - Fichas acessíveis para leitura/escrita pelo proprietário autenticado e leitura/modificação pelo DM associado à campanha.
  - Dados sensíveis do Mestre (notas de NPCs, documentos ocultos) restritos por políticas de usuário.

---

## 🎨 9. Diretrizes de UI/UX Obrigatórias (Apple HIG & Material Design 3)

Todas as telas e componentes devem preservar rigorosamente os seguintes pilares de design:

1. **Ergonomia e Alvos de Toque:**
   - Botões, seletores, ícones e ações móveis possuem área de clique/toque de no mínimo **44×44px** (Apple) e **48×48px** (M3).
   - Inputs com botão de limpar possuem espaçamento à direita (`pr-9` ou superior) para evitar sobreposição.
2. **Superfícies Tonais & Frosted Glass:**
   - Headers, sidebars e gavetas utilizam acabamento translúcido com `backdrop-blur-2xl` e bordas suaves (`border-white/5` a `border-white/10`).
   - Cores primárias saturadas são reservadas para botões de ação principal (CTA); containers secundários utilizam tons sutis (`bg-surface-container`).
3. **Zero Truncamento Acidental:**
   - Proibido o uso arbitrário de reticências que impeçam a leitura de títulos ou termos canônicos; layouts adaptáveis com quebra de linha fluida.
4. **Micro-interações e Feedback:**
   - Feedback elástico em botões interativos (`active:scale-95`).
   - Transições suaves com classes `animate-in` e curvas cúbicas naturais.

---

## 🚀 10. Procedimentos para Desenvolvimento & Deploy

- **Ambiente de Desenvolvimento:**
  ```bash
  npm run dev
  ```
- **Validação de Build de Produção:**
  ```bash
  npm run build
  ```
- **Validação de Linters:**
  ```bash
  npm run lint
  ```
- **Deploy:**
  - Configurado para Vercel via `vercel.json` (redirecionamento de rotas SPA para `index.html`).

---
*Este documento deve ser mantido 100% sincronizado com qualquer modificação futura em rotas, modelos de dados, componentes ou fluxos de negócio da aplicação.*
