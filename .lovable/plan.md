
## Plano de Implementação — Evolução Neurocientífica

### Fase 1: Database & Infraestrutura
- Adicionar colunas `chronotype`, `conscientiousness`, `neuroticism` na tabela `profiles`
- Migração SQL com valores default null (perfil opcional até onboarding)

### Fase 2: Navegação — Floating Top-Bar
- Remover `AppSidebar.tsx`
- Criar `FloatingTopBar.tsx`: pílula flutuante centralizada com glassmorphism + sombras neumórficas
- Ícones com tooltips: Dashboard, Planner, Tasks, Calendar, AI Hub, Library
- Comportamento hide-on-scroll-down / show-on-scroll-up
- Botões de tema e logout integrados na top-bar
- Atualizar `Index.tsx` para usar a nova navegação

### Fase 3: Landing Page + Onboarding
- Criar `LandingPage.tsx`: tela limpa pré-login com hero "Seu cérebro tem um ritmo"
- Criar `OnboardingQuiz.tsx`: fluxo de 3 etapas visuais
  1. Cronotipo (Leão/Urso/Lobo)
  2. Conscientiosidade (Alta/Baixa)
  3. Neuroticismo (Alto/Baixo)
- Tela de resultado com perfil visual ("Você é um Lobo Focado")
- Salvar no `profiles` via Supabase
- Integrar no fluxo: Auth → check profile → onboarding ou dashboard

### Fase 4: Dashboard Metacognitivo
- Refatorar página inicial pós-login para ser o Dashboard
- Cards interativos: "Objetivo do bloco atual" + "Retenção pós-sessão (1-10)"
- Manter gráficos Radar e estatísticas existentes
- Layout em cards neumórficos limpos

### Fase 5: Evoluções nas Features Existentes
- **Smart Scheduler**: Botão "✨ Auto-Agendar via Perfil" na geração de rotinas (horários baseados no cronotipo)
- **Cronômetro Adaptativo**: Modo Foco lê perfil — baixa conscientiosidade = Pomodoro fixo, alta = libera Flowtime
- **Interleaving**: Opção no Quiz do AI Hub para misturar assuntos
- **Técnica Feynman**: Sub-aba no AI Hub — usuário explica, IA avalia clareza e aponta lacunas

### Fase 6: Biblioteca Científica
- Criar `LibraryPage.tsx`: galeria de cards com artigos sobre Active Recall, Spaced Repetition, Interleaving, etc.
- Conteúdo estático com design neumórfico/neon

### Design System
- Top-bar: glassmorphism (`backdrop-blur-xl`, `bg-background/70`) + `neu-flat`
- Hide on scroll com `useEffect` + `scroll` listener
- Todos os novos componentes usam tokens semânticos do design system
