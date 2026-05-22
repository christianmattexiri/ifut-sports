## Plano — Função "Juiz" (Árbitro) na pelada

### Objetivo
Criar um novo papel `juiz` que entra na pelada e na lista de presença, mas não joga, não é sorteado, não pontua e tem permissão de admin **apenas** para registrar/editar gols e assistências durante a partida.

---

### 1. Banco de Dados (migration única)

- `match_members.role` hoje **não existe** como coluna (a tabela só tem `user_id`, `match_id`, `is_goalkeeper`, `rating`, `created_at`). Vou **adicionar** `role text not null default 'player'` com check `role in ('player','juiz')`. Admin continua sendo identificado por `matches.admin_id` (não muda).
- `match_attendance`: adicionar `is_referee boolean not null default false`.
- Sem mudança de RLS (políticas atuais já permitem o que precisamos).

### 2. Server functions / lib

- `src/lib/admin-users.functions.ts` → nova `inviteRefereeToMatch({ matchId, userId })`: insere em `match_members` com `role='juiz'`, `rating=0`, `is_goalkeeper=false`. Autoriza para super admin ou `admin_id` da pelada.
- Helpers compartilhados:
  - Em `src/lib/pelada-queries.ts` (ou local da tela) passar `role` ao ler `match_members`.
  - Tipo `MemberRow` ganha `role: 'player' | 'juiz'`.

### 3. UI — Gerenciamento de Usuários (`pelada.$id_.usuarios.tsx`)

- Ao lado de **"+ Adicionar Jogador"**, novo botão **"🏁 Chamar Juiz"** (variant secundário).
- Reusa o mesmo modal de busca de usuários; ao confirmar chama `inviteRefereeToMatch`.
- Na listagem de membros, juízes aparecem em seção própria **"Juízes"** no topo, sem campo de Nota e sem botão de goleiro. Mantém botão de remover.

### 4. UI — Lista de Presença (`pelada.$id_.lista.tsx`)

- Ao marcar presença de um membro `juiz` da pelada (ou ao adicionar manualmente), `match_attendance.is_referee=true`, `rating=0`, `is_goalkeeper=false`.
- Renderização: bloco **"🏁 Juiz da partida"** fixo no topo, antes do header `X/16 Linhas · X/2 Goleiros`.
  - Card: avatar + nome + badge `🏁 JUIZ` com borda amarela sutil (`border-yellow-500/40 bg-yellow-500/5`).
  - Sem campo de nota, sem botão luva.
- Contadores `linhas/goleiros` **excluem** árbitros do total.
- Botão "+ Adicionar Jogador" **não** permite marcar como juiz (juiz só vem do gerenciamento). A presença do juiz aparece automaticamente quando ele estiver em `match_members` com role juiz e for marcado presente (ou via toggle dedicado no card do juiz se ele ainda não estiver na lista).

### 5. Sorteio (`pelada.$id_.partida.tsx`)

- Filtrar `attendance.filter(p => !p.is_referee)` em **todos** os pontos: lista de disponíveis, algoritmo de balanceamento, contagem de goleiros, escalações Time A/B. Juiz nunca aparece nem em "Disponíveis" nem nos times.
- Exibir card "🏁 Juiz: <nome>" acima do bloco de sorteio.

### 6. Rankings / Histórico / Perfil

- `src/routes/pelada.$id_.rankings.tsx`: ao computar partidas jogadas, ignorar jogadores cuja `game_player_stats` não exista — comportamento atual já cobre isso (juiz não é inserido em stats). Garantir que não criamos linha em `game_player_stats` para juiz no fluxo de salvar partida.
- `pelada.$id_.jogador.$userId.tsx` (perfil do jogador): se o usuário é juiz da pelada, mostrar contador opcional "Jogos apitados" = count distinct de `games.id` em partidas onde ele esteve como juiz (`match_attendance.is_referee=true`). Fica como cartão extra; nenhuma alteração nos rankings.

### 7. Permissão "juiz como admin parcial"

- Helper `canEditMatchStats(userId, match, members)` → `true` se: super admin, ou `match.admin_id === userId`, ou existe `match_members` com `user_id=userId, role='juiz'`.
- Usar esse helper em `pelada.$id_.partida.tsx` e `pelada.$id_.historico.tsx` para liberar o botão **"Registrar/Editar Partida"** e o `EditMatchDialog` para o juiz. Demais ações de admin (gerenciar membros, configurações, excluir pelada, abrir votação) continuam exclusivas do admin/super admin.

### Arquivos a editar
- migration nova em `supabase/migrations/`
- `src/lib/admin-users.functions.ts`
- `src/lib/pelada-queries.ts` (se aplicável)
- `src/routes/pelada.$id_.usuarios.tsx`
- `src/routes/pelada.$id_.lista.tsx`
- `src/routes/pelada.$id_.partida.tsx`
- `src/routes/pelada.$id_.historico.tsx`
- `src/routes/pelada.$id_.rankings.tsx`
- `src/routes/pelada.$id_.jogador.$userId.tsx`

### Fora de escopo
- Não mexer em políticas RLS.
- Não criar tela dedicada de "juiz"; ele entra pela busca normal de usuários.
- Não remover avatares ao remover juiz (consistente com remoção de membros hoje).
