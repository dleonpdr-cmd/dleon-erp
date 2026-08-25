# UI Guidelines — D'LEON ERP

---

## Paleta de cores

### Cores por role (mobile)

| Role | Cor | Hex | Uso |
|---|---|---|---|
| PDR Tech | Laranja | `#FF6B00` | Headers, botões, badges, borda ativa |
| Inspector | Roxo | `#9B59B6` | Headers, botões, badges, borda ativa |
| Assembler | Azul | `#3498DB` | Headers, botões, badges, borda ativa |
| Supervisor / Admin | Âmbar | `#F59E0B` | Headers, KPIs, nav ativa, badge de gargalo |

### Cores semânticas

| Significado | Cor | Hex |
|---|---|---|
| Sucesso / Aprovado | Verde | `#1D9E75` |
| Erro / Problema / Repasse | Vermelho | `#E24B4A` |
| Urgente | Vermelho | `#E24B4A` |
| Informativo | Azul | `#378ADD` |
| Secundário / Desabilitado | Cinza | `#555` |
| Neutro / Inativo | Cinza claro | `#888` |
| Aviso | Laranja | `#E67E22` |

### Background (mobile)

| Elemento | Cor |
|---|---|
| Fundo geral | `#0D0D0D` |
| Cards | `#141414` |
| Border padrão | `#1E1E1E` |
| Divisórias | `#1A1A1A` |
| Texto principal | `#F0EEE9` |
| Texto secundário | `#888` |
| Texto desabilitado | `#555` |
| Texto muito sutil | `#444` |

### Padrão de cores com transparência

- Fundo de card com acento: `{cor}11` (ex: `#9B59B611`)
- Borda de card com acento: `{cor}44`
- Fundo de botão secundário: `{cor}22`
- Borda de badge: `{cor}44`

---

## Layout Mobile

### Container

```css
min-height: 100dvh;
background: #0D0D0D;
padding-bottom: 90px;   /* espaço para a bottom nav */
max-width: 430px;       /* centralizado no desktop */
```

### Bottom Navigation

```css
position: fixed;
bottom: 0;
left: 50%;
transform: translateX(-50%);
width: 100%;
max-width: 430px;
height: 72px;
background: #0D0D0D;
border-top: 1px solid #1A1A1A;
display: flex;
```

Cada item: `flex: 1`, `fontSize: 10px`, `gap: 3px`, ícone `fontSize: 20px`

Item ativo: `color: {accentColor}`, `borderTop: 2px solid {accentColor}`

Item inativo: `color: #444`, `borderTop: 2px solid transparent`

---

## Tipografia

### Hierarquia de textos (mobile)

| Elemento | Tamanho | Peso | Cor |
|---|---|---|---|
| Título do veículo | 15–16px | 700 | `#F0EEE9` |
| Label de seção | 10px | 600 | `#444`, letra-espaçamento 0.08em |
| Subtítulo (placa, cliente) | 11px | 400 | `#666–#888` |
| Timer | 22px | 800 | `{accentColor}` |
| Badge | 10px | 700 | variada |
| Botão principal | 15–16px | 700 | `#fff` |
| Botão secundário | 14px | 600 | `{accentColor}` |
| Texto desabilitado | 14px | 400 | `#555` |

---

## Componentes

### Cards de task (fila)

```
┌────────────────────────────────────────┐
│ 2026 Toyota Camry          [URGENTE]   │
│ ABC-1234                         #1   │
│                                        │
│ 田中一郎            10 min aguardando │
│                                        │
│ [ ▶ Iniciar reparação              ] │
└────────────────────────────────────────┘
```

- Border radius: `14px`
- Padding: `16px`
- Gap entre cards: `10px`

### Card EM ANDAMENTO (task ativa)

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│ 2026 Toyota Camry     [INSPEÇÃO]      │
│ ABC-1234                               │
│                                        │
│ ⏱ 00:12:34                           │
│                                        │
│ [ Ver detalhes ] [ ✓ Concluir       ] │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
```

Background: `{accentColor}11`
Border: `1px solid {accentColor}44`

### Botão principal

```css
width: 100%;
height: 52–58px;
border-radius: 12–14px;
background: {accentColor};
color: #fff;
font-size: 15–16px;
font-weight: 700;
border: none;
```

Estado bloqueado:
```css
background: #1A1A1A;
color: #555;
cursor: not-allowed;
```

Estado loading:
```css
background: #333;
opacity: 0.6;
```

### Badges

```css
font-size: 10px;
padding: 3px 10px;
border-radius: 8px;
font-weight: 700;
```

| Badge | Background | Cor | Borda |
|---|---|---|---|
| URGENTE | `#E24B4A22` | `#E24B4A` | `#E24B4A44` |
| REPASSE R2 | `#E24B4A22` | `#E24B4A` | `#E24B4A44` |
| DESMONTAGEM | `#FF6B0022` | `#FF6B00` | `#FF6B0044` |
| MONTAGEM | `#3498DB22` | `#3498DB` | `#3498DB44` |
| INSPEÇÃO | `#9B59B622` | `#9B59B6` | `#9B59B644` |

### Flash message (feedback)

```css
position: fixed;
top: 0;
left: 50%;
transform: translateX(-50%);
width: 100%;
max-width: 430px;
z-index: 100;
padding: 14px 20px;
font-size: 13px;
font-weight: 600;
text-align: center;
color: #fff;
background: #1D9E75;  /* ou #E24B4A para erro */
```

Duração: 3000ms auto-dismiss.

### Header de seção

```tsx
<div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>
  DESMONTAGEM
  <span style={{ marginLeft: '8px', color: accentColor }}>2 veículos</span>
</div>
```

---

## Empty states

```
      ✓
   Fila limpa
Nenhuma tarefa pendente
```

- Ícone: `fontSize: 36px`
- Título: `fontSize: 14px`, `fontWeight: 600`, `color: #F0EEE9`
- Subtítulo: `fontSize: 12px`, `color: #555`
- Padding: `60px 0`

---

## Formulário de inspeção (13 painéis)

### Painel OK

```css
background: #141414;
border: 1px solid #1D9E7533;
border-radius: 12px;
```

### Painel com problema

```css
background: #E24B4A08;
border: 1px solid #E24B4A55;
```

### Barra de progresso

```css
height: 4px;
background: #1A1A1A;
border-radius: 2px;
/* barra interna: */
background: hasProblems ? #E24B4A : #1D9E75;
transition: width 0.2s, background 0.2s;
```

---

## Layout Admin (desktop)

- Usa AppShell com sidebar fixa
- Sem restrição de maxWidth
- Tailwind para estilização
- Tabelas, cards, modais padrão
- Tema light (sem dark mode no admin por ora)

---

## Ícones (mobile bottom nav)

| Aba | Ícone |
|---|---|
| Home | 🏠 |
| Fila | 📋 |
| Histórico | 📖 |
| Perfil | 👤 |

---

## Espaçamentos

| Elemento | Valor |
|---|---|
| Padding horizontal da tela | `16–20px` |
| Gap entre cards | `10px` |
| Gap interno do card | `10–16px` |
| Margem entre seções | `24px` |
| Border radius — cards | `14px` |
| Border radius — botões | `12–14px` |
| Border radius — badges | `8px` |
| Border radius — inputs | `8–10px` |
