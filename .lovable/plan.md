# Módulo Futevôlei — Arquitetura

## 1. Banco de Dados (1 migration)

Novas tabelas (todas com RLS + GRANTs):

- **`futevolei_instructors`**
  - `user_id uuid PK` (= auth.uid())
  - `nome text`, `apelido text`, `idade int`, `local_aula text`
  - `invite_code text unique` (gerado: 6 chars alfanuméricos via trigger)
  - timestamps

- **`futevolei_students`**
  - `user_id uuid PK`
  - `nome text`, `apelido text`, `idade int`, `perna_dominante text` ('destra'|'canhota'|'ambidestra')
  - `nivel_atual text default 'iniciante'`
  - timestamps

- **`futevolei_members`** (vínculo instrutor↔aluno)
  - `id uuid PK`
  - `instructor_id uuid` (→ instructors.user_id)
  - `student_id uuid` (→ students.user_id)
  - `status text` ('pending'|'approved'|'rejected') default 'pending'
  - unique(instructor_id, student_id)
  - timestamps

Função `public.gen_invite_code()` SECURITY DEFINER para gerar código único.

Função `public.lookup_instructor_by_code(_code text)` SECURITY DEFINER que retorna `user_id` do instrutor — necessária porque RLS de instructors não deixa aluno ler outros perfis pelo código.

### RLS resumida
- `instructors`: dono lê/edita o próprio; qualquer authenticated lê (somente para nome — ou via função).
- `students`: dono lê/edita; instrutor lê alunos vinculados approved (via has_membership function).
- `members`:
  - aluno insere o próprio pending
  - aluno lê os próprios vínculos
  - instrutor lê/atualiza vínculos onde é o instructor
  - aluno deleta o próprio pending

## 2. Roteamento (TanStack)

Novas rotas:

- `pelada.novo.tsx` — tela de seleção de modalidade (⚽ Futebol | 🏐 Futevôlei)
- `futevolei.onboarding.tsx` — escolha perfil (Instrutor | Aluno)
- `futevolei.instrutor.cadastro.tsx` — formulário instrutor
- `futevolei.aluno.cadastro.tsx` — formulário aluno + step 2 (código)
- `futevolei.instrutor.tsx` — layout dashboard instrutor com `<Outlet/>` (sidebar)
  - `futevolei.instrutor.index.tsx` — visão geral (código convite em destaque, cards placeholder Alunos Atuais / Treinos do Dia)
  - `futevolei.instrutor.alunos.tsx` — abas Pendentes/Aprovados
- `futevolei.aluno.tsx` — layout aluno
  - se `status='pending'` ou sem vínculo: tela de bloqueio "Aguardando…"
  - se `approved`: dashboard (Nível Atual, Radar placeholder, Próximos/Passados Treinos)

Botão "+ Criar Pelada" existente redireciona para `/pelada/novo`. A opção "Futebol" navega para a rota/modal de criação atual (sem mudança). "Futevôlei" → `/futevolei/onboarding`.

## 3. Server functions

`src/lib/futevolei.functions.ts` — todas com `requireSupabaseAuth`:
- `createInstructor(input)` — insere instructor, retorna invite_code
- `createStudent(input)` — insere student
- `joinByCode({ code })` — chama RPC lookup, cria membership pending
- `listMyMemberships()` — para aluno
- `listInstructorRequests()` — pending para instrutor
- `listInstructorStudents()` — approved
- `respondMembership({ memberId, action: 'approve'|'reject' })`

## 4. Dashboards (skeleton)

Layouts usam shadcn sidebar. Estilo consistente com o app atual (semantic tokens de `src/styles.css`).

- Instrutor: header com invite code + botão copiar; sidebar [Visão Geral, Alunos]; cards placeholder.
- Aluno: header com nome do instrutor; cards Nível, Radar (placeholder), listas Treinos.

## 5. Não-alteração do Futebol

Nenhum arquivo existente do fluxo de Futebol (`pelada.$id*`, `dashboard.tsx`) é modificado, exceto:
- Local do botão "+ Criar Pelada" (mudança de handler para navegar a `/pelada/novo`).

## Ordem de execução

1. Migration (tabelas + RLS + funções + GRANTs)
2. Server functions
3. Rotas e componentes
4. Trocar handler do botão "+ Criar Pelada"

## Detalhes técnicos

- Convite code: 6 chars `[A-Z0-9]` excluindo confusos (0,O,1,I); gerado em loop até unique.
- Idade: int 5–99.
- Validação Zod em todas as server functions.
- Cliente: TanStack Query com `queryClient.invalidateQueries` após mutações.
- Realtime opcional não incluído neste skeleton.

Tudo OK para começar?