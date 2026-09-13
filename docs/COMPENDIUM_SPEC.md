# Especificação Técnica & Contrato de Design: Compêndio & Nested Tooltips

> **Aviso de Preservação:** Este documento define as regras de arquitetura, comportamento, ergonomia e integração do sistema de **Glossário, Compêndio e Tooltips Aninhadas (Lexicon)**.  
> Caso a interface (UI/UX) passe por um redesign ou refatoração visual no futuro, os princípios, atalhos, contratos de dados e salvaguardas aqui documentados **devem ser mantidos intactos**.

---

## 1. Visão Geral & Filosofia

O sistema foi desenhado para enriquecer a leitura de fichas e textos de RPG (D&D 5e) no estilo dos CRPGs modernos (como *Baldur's Gate 3*), com duas diretrizes centrais:

1. **Separação entre Motor e Estilo (Headless Behavior):**
   * A lógica de busca, tokenização de texto, empilhamento de termos navegáveis e atalhos de teclado é isolada da estilização visual.
   * Modificações cosméticas (como trocar tons de cor, cantos arredondados ou densidade visual) **não devem** interferir na pilha de estados (`LexiconContext`) nem na renderização via `createPortal`.

2. **Diretrizes Ergonômicas (Apple HIG & Google Material Design 3):**
   * **Desktop:** Floating Cards inteligentes que detectam bordas de tela e evitam corte ou estouro da viewport.
   * **Mobile:** Bottom Sheet nativo posicionado na zona de alcance do polegar (*thumb-zone*), substituindo tooltips flutuantes instáveis.
   * **Área Mínima de Toque:** Todo botão móvel (fechar, voltar, limpar busca) possui área de contato útil de no mínimo **44×44px** (Apple HIG) / **48×48px** (M3).

---

## 2. Mapa dos Componentes e Responsabilidades

| Arquivo / Caminho | Responsabilidade |
|---|---|
| `src/lib/lexiconClient.js` | Motor de busca, cache em LocalStorage, normalização de texto e tokenizador Regex Unicode. |
| `src/context/LexiconContext.jsx` | Provedor de estado global (pilha de tooltips, verbetes fixados, atalhos de teclado e estado do Drawer). |
| `src/components/lexicon/LexiconText.jsx` | Componente de texto "drop-in" que recebe uma string e substitui termos reconhecidos por nós clicáveis. |
| `src/components/lexicon/GlossaryTerm.jsx` | Componente visual do termo com sublinhado pontilhado interativo, hover e clique de fixação. |
| `src/components/lexicon/NestedTooltipPortal.jsx` | Portal flutuante (Desktop) ou Bottom Sheet (Mobile) que exibe o verbete ativo e gerencia navegação profunda. |
| `src/components/lexicon/CompendiumDrawer.jsx` | Painel lateral deslizante com busca em tempo real e filtros por categoria. |
| `src/pages/CompendiumPage.jsx` | Página completa dedicada ao compêndio para visualização expandida/desktop. |

---

## 3. Contrato de Dados (Supabase & View)

Toda a leitura do compêndio é realizada através de uma única consulta unificada:

```sql
SELECT * FROM v_codex_entries ORDER BY name_pt ASC;
```

### Estrutura do Verbete (`v_codex_entries`)
Cada item do compêndio segue o seguinte formato padrão:

| Campo | Tipo | Descrição |
|---|---|---|
| `entry_id` | `text` (PK) | Identificador único estável (ex: `spell:fireball`, `rule:grapple`, `condition:blinded`). |
| `category` | `text` | Identificador da categoria (`rule`, `condition`, `spell`, `item`, `feat`, `damage_type`, `class`, `lore`). |
| `badge_label` | `text` | Rótulo legível em português (ex: `Magia`, `Condição`, `Regra`). |
| `name` | `text` | Nome original em inglês (para busca e compatibilidade). |
| `name_pt` | `text` | Nome oficial/traduzido em português. |
| `slug` | `text` | Slug normalizado para busca rápida e deep linking. |
| `short_desc` | `text` | Resumo rápido (1 ou 2 frases) exibido no cabeçalho do tooltip ou lista. |
| `description` | `text` | Texto detalhado completo, formatado e preparado para retokenização. |
| `synonyms` | `text[]` | Array de sinônimos para expansão da busca e regex. |
| `extra_data` | `jsonb` | Metadados específicos (nível de magia, tempo de conjuração, dado de vida, peso, custo). |
| `campaign_id` | `uuid` (opcional) | Identificador se o verbete for conteúdo *homebrew* de campanha ou do SRD oficial (`null`). |

---

## 4. Como Integrar em Novos Componentes

Para transformar qualquer texto bruto em texto interativo com termos clicáveis, basta substituir o `<p>` ou `<span>` comum por `<LexiconText />`:

```jsx
import LexiconText from '../lexicon/LexiconText';

// Exemplo: Descrição de uma habilidade ou item
function FeatureCard({ feature }) {
  return (
    <div className="card">
      <h3>{feature.title}</h3>
      <LexiconText 
        text={feature.description} 
        className="text-sm text-neutral-200"
      />
    </div>
  );
}
```

### Regra do `excludeEntryId` (Anti-Loop Infinito)
Sempre que estiver renderizando a descrição **dentro do próprio tooltip ou da página do verbete**, passe o ID do verbete no prop `excludeEntryId`:

```jsx
// Evita que a palavra "Cego" dentro da descrição da condição "Cego" tente abrir a si mesma
<LexiconText 
  text={entry.description} 
  excludeEntryId={entry.entry_id} 
/>
```

### Suporte a Wikilinks Explícitos
O motor suporta sintaxe manual de links estilo Obsidian/Wikipedia:
* `[[Furtividade]]` ➔ busca automaticamente o verbete com nome "Furtividade".
* `[[Ataque de Oportunidade|reação de golpe]]` ➔ vincula o verbete do alvo, mas exibe o texto customizado "reação de golpe".

---

## 5. Invariantes & Regras Invioláveis de UX (Guia Anti-Regressão)

Se o visual do site for reescrito, **nenhuma das regras abaixo deve ser removida ou alterada sem aprovação explícita**:

### 1. Prevenção de Propagação de Eventos (`e.stopPropagation()`)
No arquivo `GlossaryTerm.jsx`, o manipulador `onClick` **obrigatoriamente** deve chamar `e.stopPropagation()`. Caso contrário, clicar em um termo dentro de um card colapsável ou modal fechará o componente pai.

### 2. Acessibilidade e Teclado
* O `GlossaryTerm` deve conter `role="button"` e `tabIndex={0}`.
* Deve responder às teclas `Enter` e `Space` para permitir que usuários sem mouse consigam travar o tooltip.

### 3. Atalhos Globais de Teclado
* `Ctrl + K` / `Cmd + K`: Alterna a exibição do Drawer de Busca do Compêndio (ignorado caso o foco esteja em um `input` ou `textarea`).
* `T`: Trava (*pin*) a tooltip que estiver atualmente sob foco/hover, permitindo navegar pelos links internos dela (estilo *Baldur's Gate 3*).
* `Escape`: Desempilha ou fecha a tooltip ativa; se não houver tooltips, fecha o Compêndio.

### 4. Pilha de Navegação Recursiva (Tooltips Aninhadas)
* O `LexiconContext` gerencia o estado `tooltipStack`.
* Quando o usuário clica em um termo dentro de uma tooltip já aberta, o novo verbete é **adicionado ao topo da pilha** (não sobrescreve o anterior).
* O cabeçalho da tooltip deve renderizar um botão **"Voltar"** (`popTooltip`) sempre que `tooltipStack.length > 1`.

### 5. Ergonomia Touch (Mobile Bottom Sheet)
* Em telas com largura `< 768px`, **nunca** renderize tooltips flutuantes dependentes de hover.
* Renderize o painel como um **Bottom Sheet** animado deslizando da parte inferior, com fundo escurecido com desfoque (*backdrop-blur*).
* Todos os botões interativos devem respeitar a área de toque mínima de **44×44px**.

### 6. Isolamento por Portals
Tanto `NestedTooltipPortal` quanto `CompendiumDrawer` utilizam `createPortal(..., document.body)`. Eles **nunca** devem ser renderizados dentro da árvore DOM do componente pai para evitar que propriedades como `overflow: hidden`, `transform` ou `z-index` recortem as tooltips.

### 7. Âncora Estável na Pilha & Proteção de Viewport (Anti-Pulo de Tela)
* Quando o usuário clica em termos aninhados dentro do card (nível 2+ da pilha), o card **deve manter a âncora de coordenadas do primeiro termo** (`tooltipStack[0].targetRect`). Isso impede que o card salte bruscamente para baixo ou despenque para fora da tela ao clicar em palavras próximas ao rodapé.
* O cálculo do eixo Y deve sempre medir a altura real do card e limitar estritamente `top <= window.innerHeight - measuredHeight - padding`, garantindo que o card inteiro permaneça 100% visível no viewport.

---

## 6. Cache & Performance

* **Estratégia:** O compêndio carrega o índice completo na inicialização e o persiste no `localStorage` sob a chave `ra_codex_cache_v2` com TTL de **12 horas**.
* **Resiliência Offline:** Se o Supabase estiver indisponível ou ocorrer falha de conexão, o sistema se recupera silenciosamente a partir do cache local. Se o cache estiver vazio, o texto é exibido normalmente sem marcações, sem travar a renderização do restante da página.
* **Regex Compilado:** O regex de busca é compilado uma única vez na função `buildIndex` com ordenação de termos pelo comprimento decrescente (ex: "ataque de oportunidade" tem precedência sobre "ataque").

---

## 7. Matriz de Cobertura e Adoção do Lexicon por Aba / Tela

Este inventário vivo lista todas as áreas da aplicação que já possuem ou devem receber o enriquecimento com `<LexiconText />`:

| Aba / Tela | Arquivo Fonte | Campos / Elementos Conectados | Status | Oportunidades de Vocabulário & Sugestões |
|---|---|---|:---:|---|
| **Magias** | `src/components/tabs/MagiasTab.jsx` | `spell.desc`, `spell.higher_level` | ✅ Concluído | Identificar termos como *concentração*, *componentes*, *rolagem de ataque*, tipos de dano (*fogo*, *radiante*). |
| **Classe & Características** | `src/components/tabs/ClasseTab.jsx` | `feature.description`, `option.summary` | ✅ Concluído | Conectar regras como *ataque de oportunidade*, *descanso curto*, *descanso longo*, *vantagem*, *fúria*. |
| **Inventário & Equipamentos** | `src/components/tabs/InventarioTab.jsx` | `item.name`, `item.description` | ✅ Concluído | Itens mágicos, armas, propriedades de armas (*acuidade*, *versátil*, *pesada*), armaduras e poções. |
| **Compêndio Completo** | `src/pages/CompendiumPage.jsx` | Descrição principal e verbetes relacionados | ✅ Concluído | Navegação cruzada entre todas as 8 categorias do banco. |
| **Drawer do Compêndio** | `src/components/lexicon/CompendiumDrawer.jsx` | `activeEntry.description` | ✅ Concluído | Permite saltar de um termo para outro diretamente na busca rápida. |
| **Portal / Tooltip Flutuante** | `src/components/lexicon/NestedTooltipPortal.jsx` | Descrição do tooltip ativo | ✅ Concluído | Suporta recursão com salvaguarda `excludeEntryId` e pilha de navegação. |
| **Estatísticas / Status** | `src/components/tabs/StatsTab.jsx` | HP, CA, Iniciativa, atributos, Resistência e todas as 18 perícias (`skill.name`) | ✅ Concluído | Exibe regras canônicas de perícias e mecânicas básicas de combate ao passar o cursor ou tocar. |
| **Atributos & Modificadores** | `src/components/tabs/AtributosTab.jsx` | Nomes dos atributos e nota de explicação do d20 | ✅ Concluído | Esclarece cálculo de modificadores, testes e rolagens de salvaguarda. |
| **Resumo da Ficha** | `src/components/tabs/ResumoTab.jsx` | Proficiência, Deslocamento, Pontos de Vida, Classe de Armadura e nota descritiva | ✅ Concluído | Acesso imediato a conceitos fundamentais de sobrevivência e movimentação. |
| **Log de Sessão** | `src/components/tabs/LogTab.jsx` | `entry.content` (anotações e eventos registrados da campanha) | ✅ Concluído | Termos de regras, feitiços, monstros e locais mencionados em anotações viram links vivos. |
| **Personalidade & Background** | `src/components/tabs/PersonaTab.jsx` | Sugestões interativas de histórico, traços e ideias | ✅ Concluído | Dicas de interpretação com termos do universo D&D enriquecidos. |
| **Assistente de Evolução** | `src/components/LevelUpWizardModal.jsx` | Características de classe, arquétipos/subclasses, descrições de magias e truques, talentos e escolhas | ✅ Concluído | Apoio completo para tomada de decisão no momento de subir de nível. |
| **Painel do Mestre (DM)** | `src/pages/DMDashboard.jsx` | Perícias e notas de solicitações de personagens (Nível 1 e Criação Completa) | ✅ Concluído | Facilita a auditoria de regras pelo Mestre durante a aprovação de fichas. |

---

## 8. Guia Contínuo de Padronização de Vocabulário

Conforme o app evoluir, você pode sugerir adaptações de termos e frases para enriquecer a experiência do jogador. O fluxo funciona assim:

### 1. Descoberta de Palavras-Chave no Texto
Ao redigir ou traduzir descrições nas fichas e no banco, utilize **termos canônicos de D&D 5e** que ativam automaticamente o Lexicon:
* Em vez de *"não pode ver nada"*, prefira utilizar a condição canônica **"está [[Cego]]"** ou simplesmente **"fica cego"**.
* Em vez de *"ganha um bônus para não ser atingido"*, use termos como **"ganha cobertura meia"** ou **"rolagem de salvaguarda"**.

### 2. Cadastro de Sinônimos no Banco de Dados
Se os jogadores ou você usarem termos informais frequentes, adicione-os no campo `synonyms` da tabela/view correspondente:
* **Exemplo para 'Ataque de Oportunidade':** `synonyms: ["ataque de reação", "reação de oportunidade", "adop"]`.
* Isso faz o motor sublinhar e reconhecer a expressão sem precisar reescrever o texto fonte.

### 3. Atualização Periódica deste Documento
Sempre que uma nova aba, modal ou página receber o `<LexiconText />`, atualize a tabela na **Seção 7** marcando o status para `✅ Concluído` e anotando o campo conectado.
