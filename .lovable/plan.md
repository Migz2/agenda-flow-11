## Plano de Implementação — 4 Fases

### Fase 1: Evolução do AI Study Hub
1. **Visualização de Fontes** — Modal read-only ao clicar numa fonte
2. **Upload PDF** — Usar `pdfjs-dist` no frontend para extrair texto e salvar como fonte
3. **Quiz UI (1 questão por tela)** — Refatorar aba Exercícios com navegação tipo Duolingo (ref: imagem enviada), botões neumórficos para alternativas, botão "Next"
4. **Tutor Contextualizado** — Botão "💬 Explicar Questão" que abre painel com chat IA pré-contextualizado

### Fase 2: Modo Foco (Pomodoro)
5. **Nova tela/widget** com timer (25/5, 50/10)
6. **Dropdown** para selecionar tarefa pendente do dia
7. **Auto-Complete** — Marca tarefa como concluída ao fim do ciclo (optimistic update)
8. **Navegação** — Adicionar ao sidebar

### Fase 3: Dashboard Avançado
9. **Cards de métricas** — Horas estudadas, blocos concluídos/pendentes, taxa de conclusão, streak
10. **Filtro multi-select** no gráfico radar para categorias

### Fase 4: Refinamentos CRUD
11. **Description vazia** nos blocos gerados (corrigir gerador de rotinas)
12. **Deletar categorias** — Tarefas perdem a categoria (set null) em vez de serem deletadas
13. **Exclusão em massa** — Modal com opções "apenas este" ou "este e futuros" baseado em batch_id

### Design System
- Todas as novas UIs usam `neu-raised`/`neu-pressed` no light e glows neon no dark
- Transições suaves com Framer Motion
