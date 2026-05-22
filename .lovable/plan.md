## Plano — Excluir peladas (Super Admin e Admin da pelada)

### Objetivo
Permitir que `christianmatte` e `leofreitas` (super admins) excluam qualquer pelada pela tela `/super-admin`, e que o admin de cada pelada exclua a sua própria pelada pelo menu Administrador.

### O que vai mudar

**1. Server function `deleteMatch` (`src/lib/admin-users.functions.ts`)**
- Nova `createServerFn` protegida por `requireSupabaseAuth` recebendo `{ matchId }`.
- Carrega `matches.admin_id` + username do chamador.
- Autoriza se: usuário é super admin **OU** é o `admin_id` da pelada.
- Usa `supabaseAdmin` para limpar em ordem (já que não há FKs em cascata): `game_votes`, `game_player_stats`, `games` (pelos game_ids do match), `match_attendance`, `match_invitations`, `match_members`, e por fim `matches`.
- Retorna `{ ok: true }`.

**2. Super Admin (`src/routes/super-admin.tsx`)**
- Adicionar botão de lixeira (ícone `Trash2`) em cada linha de pelada, ao lado do switch PRO.
- Ao clicar abre `AlertDialog` de confirmação ("Excluir pelada `<nome>`? Esta ação é irreversível.").
- Confirmar chama `deleteMatch` e remove a linha localmente; toast de sucesso/erro.

**3. Tela do Administrador da pelada (`src/routes/pelada.$id_.admin.tsx`)**
- Nova `Section` no fim ("Zona de perigo") com botão vermelho "Excluir esta pelada".
- Só aparece quando o usuário atual é o `admin_id` da pelada (não para super admin acessando pelada alheia — eles usam a tela `/super-admin`).
- `AlertDialog` exigindo digitar o nome da pelada para confirmar.
- Após sucesso: toast + `navigate({ to: "/dashboard" })`.

### Notas técnicas
- A lógica de "quem pode deletar" fica **no servidor** (server fn), não confiamos na UI.
- Avatares no Storage não são removidos (mantém comportamento atual de outras exclusões; pode virar follow-up).
- Nenhuma migration necessária — RLS atual já permite as deleções via `service_role` no `supabaseAdmin`.
