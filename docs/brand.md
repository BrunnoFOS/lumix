# Lumix — Brand & Design System

**Last updated:** 2026-04-10

IMPORTANT: Estes tokens são a única fonte de estilo. Nunca hardcode cores,
fontes ou valores de espaçamento nos componentes. Sempre referencie estes
tokens via CSS custom properties ou Tailwind config.

---

## Design Identity

**Style:** Limpo, profissional e orientado a dados. Dashboards com boa legibilidade de números e gráficos. Energia solar = confiança e modernidade.
**Personality:** Confiável, técnico mas acessível. Transmite competência e clareza.
**Inspiration:** Linear, Grafana dashboards — foco em dados bem apresentados.

---

## Color Palette

| Token | Hex Value | Usage |
|-------|-----------|-------|
| --color-primary | #F97316 | Botões principais, links, focus rings, ações-chave (laranja) |
| --color-primary-hover | #EA580C | Hover em elementos primários |
| --color-primary-subtle | #FFF7ED | Background atrás de elementos primários, chips |
| --color-secondary | #F59E0B | Ações secundárias, destaques de energia/geração (amarelo) |
| --color-secondary-hover | #D97706 | Hover em elementos secundários |
| --color-secondary-subtle | #FFFBEB | Background de cards de geração/energia |
| --color-bg | #FFFFFF | Background da página |
| --color-surface | #F9FAFB | Background de cards, painéis, tabelas |
| --color-surface-raised | #FFFFFF | Superfícies elevadas (modais, popovers) |
| --color-border | #E5E7EB | Divisores, bordas de inputs, linhas de tabela |
| --color-border-subtle | #F3F4F6 | Separadores sutis entre seções |
| --color-text-primary | #111827 | Texto principal, headings |
| --color-text-secondary | #6B7280 | Labels, captions, metadata |
| --color-text-disabled | #9CA3AF | Texto desabilitado |
| --color-text-on-primary | #FFFFFF | Texto sobre fundos laranja/primários |
| --color-success | #10B981 | Status "bom", geração acima do esperado, enviado |
| --color-warning | #F59E0B | Status "regular", pendente, atenção |
| --color-error | #EF4444 | Status "ruim", erro, valores negativos |
| --color-info | #3B82F6 | Informações neutras, tooltips |

### Cores temáticas de energia solar

| Token | Hex Value | Usage |
|-------|-----------|-------|
| --color-solar-gold | #FBBF24 | Ícones de sol, indicadores de geração |
| --color-solar-warm | #FB923C | Gráficos de energia, barras de geração |
| --color-solar-gradient-start | #F97316 | Início de gradientes (laranja) |
| --color-solar-gradient-end | #FBBF24 | Fim de gradientes (amarelo/dourado) |

---

## Typography

**Primary font:** Inter
**Source:** Google Fonts
**Import:** `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`

**Secondary font:** nenhuma
**Usage:** N/A

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| --text-xs | 12px / 0.75rem | 400 | 1.33 | Captions, metadata, timestamps |
| --text-sm | 14px / 0.875rem | 400 | 1.43 | Labels, texto secundário |
| --text-base | 16px / 1rem | 400 | 1.5 | Texto corpo |
| --text-lg | 18px / 1.125rem | 500 | 1.56 | Corpo grande, títulos pequenos |
| --text-xl | 20px / 1.25rem | 600 | 1.4 | Títulos de seção |
| --text-2xl | 24px / 1.5rem | 700 | 1.33 | Títulos de página |
| --text-3xl | 30px / 1.875rem | 700 | 1.27 | Números grandes do dashboard (kWh, R$) |

---

## Spacing Scale

Baseado em 4px. Todo espaçamento usa múltiplos de 4.

| Token | Value | Common use |
|-------|-------|------------|
| --space-1 | 4px | Gap de ícone, padding inline |
| --space-2 | 8px | Padding de item de lista |
| --space-3 | 12px | Padding de botão |
| --space-4 | 16px | Padding de card |
| --space-6 | 24px | Espaçamento entre seções |
| --space-8 | 32px | Entre seções maiores |
| --space-12 | 48px | Margens de página |
| --space-16 | 64px | Padding de hero/header |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| --radius-sm | 6px | Inputs, tags, badges |
| --radius-md | 8px | Cards, botões |
| --radius-lg | 12px | Modais, cards grandes |
| --radius-full | 9999px | Avatares, badges redondos |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| --shadow-sm | 0 1px 2px 0 rgba(0,0,0,0.05) | Inputs em foco |
| --shadow-md | 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1) | Cards, dropdowns |
| --shadow-lg | 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1) | Modais, overlays |

---

## Component Defaults

**Buttons:**
- Height: 40px
- Padding: 12px 16px
- Border radius: var(--radius-md)
- Font: 500 14px

**Inputs:**
- Height: 40px
- Padding: 8px 12px
- Border: 1px solid var(--color-border)
- Border radius: var(--radius-sm)

**Cards:**
- Padding: var(--space-4)
- Border: 1px solid var(--color-border)
- Border radius: var(--radius-md)
- Background: var(--color-surface)

**Cards de Dashboard (KPI):**
- Padding: var(--space-6)
- Border radius: var(--radius-lg)
- Background: var(--color-bg)
- Shadow: var(--shadow-md)
- Número grande: --text-3xl, --color-text-primary
- Label: --text-sm, --color-text-secondary

---

## Animation

**Duration:**
- Fast (UI feedback): 150ms
- Medium (transitions): 250ms
- Slow (page transitions): 350ms

**Easing:**
- Default: cubic-bezier(0.4, 0, 0.2, 1)
- Enter: cubic-bezier(0, 0, 0.2, 1)
- Exit: cubic-bezier(0.4, 0, 1, 1)

---

## Notes

- Dark mode NÃO está no escopo do MVP. Não implementar.
- Ícones: usar Lucide React (já incluído no shadcn/ui).
- Gráficos: usar Recharts para gráficos de geração e comparativos.
- Tabelas de dados são o padrão principal — otimizar para escaneabilidade.
- O gradiente laranja→amarelo é a assinatura visual da marca nos headers e CTAs.
