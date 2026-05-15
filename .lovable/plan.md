## Plano de implementação

1. **Navegação da tela inicial da pelada**
   - Transformar o card/botão **Ranking** em link para `/pelada/$id/rankings`.
   - Transformar o card/botão **Stats** em link para `/pelada/$id/perfil`.

2. **Perfil de outro jogador na pelada**
   - Criar rota reutilizando o visual da tela atual de perfil: `/pelada/$id/perfil/$userId`.
   - O perfil do próprio usuário continua em `/pelada/$id/perfil` com botão **Editar Perfil**.
   - Perfis de terceiros usam o mesmo layout, estatísticas e histórico, mas **sem** botão de edição.
   - Jogadores clicáveis no pódio da tela inicial, rankings e listas de partidas apontam para esse perfil.

3. **Limpeza do perfil e modal de edição**
   - Remover os hardcoded **“RAFAEL BORRÉ F.C”** e **“Volante”**.
   - Mostrar apenas avatar/fallback, nome atual e username.
   - Ajustar o `ProfileDialog` para sincronizar o campo **Nome de exibição** sempre que abrir ou quando `fullName` mudar, evitando o valor estático “Jogador”.
   - Manter upload no bucket de avatares e salvar `avatar_url` em `profiles`.

4. **Sincronização instantânea de nome/foto**
   - Criar um pequeno mecanismo global de perfil por evento/local state compartilhado: ao salvar nome/foto, disparar um evento interno e atualizar também os dados persistidos em `localStorage` que dependem daquele jogador.
   - Atualizar presença, times salvos e histórico local para trocar apenas campos visuais (`name`/`avatarUrl`) do mesmo `user_id`, sem alterar estatísticas.
   - Fazer as páginas que exibem jogadores ouvirem esse evento para refletir mudanças sem reload.

5. **Correção crítica ID vs nome**
   - Refatorar a tela de perfil para filtrar **Meus Últimos Jogos** e somar estatísticas por `userId`/`player.id`, nunca por nome.
   - Refatorar o destaque no acordeão para comparar `p.id === userId`.
   - Manter `name` apenas para renderização visual.

6. **Rankings e histórico consistentes**
   - Ajustar agregação dos rankings para usar `id` como chave permanente e, quando possível, buscar/mesclar nomes e avatares atuais de `profiles`.
   - Garantir que gols, assistências, MVPs, vitórias e derrotas permaneçam vinculados ao mesmo `id` mesmo após troca de nome/avatar.
   - Adicionar links nos nomes/avatar do leaderboard para o perfil do jogador.

7. **Validação**
   - Conferir os fluxos principais: edição de perfil, atualização visual imediata, navegação Ranking/Stats, clique em Matador/MVP/Maestro e preservação do histórico após troca de nome.