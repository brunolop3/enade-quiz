# HANDOVER — EnadeQuiz (UEMS Votação)

> Documento escrito para quem vai assumir a administração/manutenção deste
> sistema sem ter acompanhado o desenvolvimento. Assume zero contexto prévio.
> Última atualização: 2026-07-06 (noite, véspera de uma apresentação/demo —
> ver §9 para o que foi feito nesta sessão especificamente).
>
> **⚠️ Estado no fim da sessão**: o app funciona ponta a ponta (banco,
> páginas, votos) contra `https://diges-quiz.vercel.app`. O serviço de
> socket real foi hospedado no Railway e funciona — confirmado via Node.js
> e via `curl` (handshake HTTP/1.1 completo, upgrade pra WebSocket OK) —
> mas **o Firefox real do usuário não conseguiu completar esse mesmo
> upgrade** (`wss://.../socket.io/...` falha), ainda sem causa confirmada
> (suspeita: negociação WebSocket-sobre-HTTP/2 na borda do Railway,
> investigação não concluída — ver §9). O app **funciona de qualquer
> forma** por causa do fallback de polling HTTP (§3), só não com o tempo
> real instantâneo que o socket daria.

## 1. O que é este sistema

Aplicação de votação/simulado ao vivo usada em eventos da UEMS: um
apresentador projeta uma questão do ENADE/PND, os alunos votam pelo celular
em tempo real, e o resultado aparece na tela de projeção. Três papéis de
usuário, três telas:

- `/admin` — painel do operador/apresentador: cria sessões, cadastra
  questões (avulsas ou em lote), controla qual questão está ativa, revela o
  gabarito, acompanha ranking, gerencia o Banco de Questões reutilizável.
- `/apresentacao/[codigo]` — tela de projeção (data show), somente leitura,
  mostra a questão ativa e o gráfico de votos ao vivo.
- `/votar/[codigo]` — tela do celular do aluno, onde ele se identifica
  (nome + RGM) e vota.

## 2. Arquitetura — como as peças se conectam

São **três processos separados**, não um só:

| Serviço | Onde vive | Porta | Função |
|---|---|---|---|
| `uems-next` | Next.js 16 (App Router) | 3000 | App inteiro: páginas + API REST (`/api/*`) + Prisma/SQLite |
| `uems-socket` | `mini-services/enade-quiz/index.ts` (Bun + Socket.IO) | 3003 | Tempo real: propaga "questão ativa", votos, contagem de participantes |
| `uems-stress` | `mini-services/stress-test/index.ts` (Bun) | 3004 | Ferramenta de carga (simula alunos votando, inclusive cenários de ataque) — só para testes, não é usada em produção real |

O front-end **não fala direto** com o serviço de socket pela porta 3003.
Ele conecta em `io('/?XTransformPort=3003', ...)` (ver
[src/lib/session.ts](src/lib/session.ts)) — um truque de query-string que só
funciona porque o `Caddyfile` (raiz do repo e `deploy/Caddyfile.production`)
tem uma regra que olha o parâmetro `XTransformPort` e faz proxy reverso para
a porta correspondente. **Sem esse Caddy na frente, a página de votação e a
de apresentação nunca conseguem abrir o socket.**

O banco de dados era **SQLite** (arquivo local `db/custom.db`) até a noite
de 2026-07-06, quando foi migrado para **Postgres no Supabase** — ver §9.
`src/lib/db-ensure.ts` ainda existe e cuida do caso SQLite (fallback local /
dev), mas em produção o `DATABASE_URL`/`DIRECT_URL` agora apontam para o
Supabase.

## 3. Tempo real: Socket.IO hospedado no Railway + fallback de polling

O `deploy/DEPLOY.md` (guia extenso, ~670 linhas) documenta um deploy em
**VM própria** (Ubuntu + PM2 rodando os 3 processos + Caddy na frente),
usando o truque `io('/?XTransformPort=3003', ...)` que só funciona atrás
desse Caddy. **Isso não se aplica mais ao deploy atual** — o app roda no
Vercel, que não hospeda processos de longa duração (confirmado ao vivo em
2026-07-06: `GET /?XTransformPort=3003` só devolvia a página Next.js
normal, nenhum socket real ali).

**Solução aplicada nesta sessão**: o serviço `mini-services/enade-quiz`
(Socket.IO) foi hospedado separadamente no **Railway**
(`https://enade-quiz-production.up.railway.app`), e o cliente agora resolve
a URL do socket via `src/lib/session.ts::getSocketUrl()`:
- Se `NEXT_PUBLIC_SOCKET_URL` estiver setada (como está hoje, apontando pro
  Railway) → conecta lá direto.
- Senão → cai no path relativo antigo `?XTransformPort=3003` (mantém
  compatibilidade com o setup VPS+Caddy do `DEPLOY.md`, caso ele volte a
  ser usado no futuro).

Pontos de atenção sobre o Railway:
- **Root Directory do serviço Railway precisa ser `mini-services/enade-quiz`.**
  Configurado errado (vazio/raiz), o Railway tenta buildar o `Dockerfile`
  da raiz do repo (o do Next.js inteiro) e falha.
- **A porta que o Railway injeta via `process.env.PORT` é dinâmica** (foi
  `8080` nesta sessão, não necessariamente sempre). `mini-services/enade-quiz/index.ts`
  já lê `process.env.PORT` corretamente. O que precisa bater manualmente é
  a configuração de **Networking → Target Port** do domínio público
  gerado no Railway — se ela apontar pra uma porta diferente da que o
  processo realmente escuta, todo request dá **502 "connection refused"**
  (aconteceu nesta sessão, corrigido ajustando o Target Port para 8080).
  Confira nos Deploy Logs do Railway qual porta a mensagem
  `"ENADE Quiz real-time server running on port X"` reporta, e garanta que
  o Target Port bate com ela.
- `PRESENTER_KEY` precisa ser a mesma nas variáveis do Railway e no bundle
  do cliente (mesma limitação de sempre, ver §5).

**⚠️ Pendência não resolvida**: testado via Node.js (`socket.io-client`) e
via `curl` (handshake HTTP/1.1 manual, com e sem header `Origin`), o
upgrade para WebSocket **funciona perfeitamente** contra o Railway. Mas no
navegador real (Firefox) do usuário, a mesma conexão
(`wss://enade-quiz-production.up.railway.app/socket.io/...`) **falhou
repetidamente** ("Firefox não conseguiu estabelecer conexão"). A CORS não
é o problema (testado explicitamente). A hipótese mais provável no fim da
sessão é uma incompatibilidade na negociação WebSocket-sobre-HTTP/2 entre
o Firefox e a borda/edge do Railway — não confirmada (faltou testar em
outro navegador e inspecionar a coluna "Protocolo" do Network tab). Isso
**não bloqueia o funcionamento** do app — o polling HTTP (abaixo) cobre a
funcionalidade — mas o tempo real não fica instantâneo enquanto isso não
for resolvido. Próximos passos sugeridos: testar em Chrome/Edge para
isolar se é específico do Firefox; se for uma questão de HTTP/2, considerar
testar outro host (Fly.io é conhecido por bom suporte a WebSocket cru) ou
abrir um ticket de suporte com o Railway.

Como reforço independente do socket, `votar` e `apresentacao` também têm
**polling HTTP** que assume o trabalho quando o socket está desconectado
por mais de 1.5s (a cada 1.5s). Isso garante que o app funcione mesmo que
o WebSocket nunca seja resolvido, com um delay perceptível de ~1-3s em vez
de instantâneo.

## 4. Banco de dados

Schema (`prisma/schema.prisma`): `Session` → tem várias `Question` → cada
`Question` recebe `Vote`s de `Student`s. Existe também `QuestionBank`
(tabela separada, sem `sessionId`) usada para guardar questões reutilizáveis
entre sessões diferentes.

Pontos de atenção herdados do histórico (`worklog.md`):
- O reset de sessão (`POST /api/session/[code]/reset`) limpa votos e
  `isRevealed`, mas **não apaga os alunos cadastrados** — isso é
  intencional (a lista de presença sobrevive a um reset no meio do evento),
  mas pode surpreender quem espera um reset "total".
- `student.corrects` (contador de acertos usado no ranking) só é
  atualizado no momento do reveal da resposta, não no momento do voto —
  listado como bug conhecido pendente no worklog (Task 15/16), ainda não
  corrigido.
- Deduplicação de questões entre importações e tratamento de questão
  anulada/gabarito alterado por recurso: **não há tratamento explícito no
  código hoje**. Se isso for relevante para o próximo evento, precisa
  entrar no plano de trabalho (ver regras de domínio no `CLAUDE.md`).

## 5. Configuração e segredos

Variáveis de ambiente (arquivo `.env` local, não deve ser commitado):

| Variável | Uso | Observação |
|---|---|---|
| `DATABASE_URL` | Conexão com o Postgres (Supabase), **via connection pooler** (porta 6543, `?pgbouncer=true&connection_limit=1`) | Usada em runtime pela aplicação. Serverless precisa do pooler — conexão direta esgota o limite de conexões do Postgres rapidamente. |
| `DIRECT_URL` | Conexão direta ao Postgres, usada só por `prisma migrate`/`db push` | No Supabase, o host "direct connection" (`db.<ref>.supabase.co:5432`) é **IPv6-only** em muitas regiões/redes — se der `P1001: Can't reach database server`, use o **session pooler** na mesma porta 5432 do host do pooler (`...pooler.supabase.com:5432`) em vez do host direto. |
| `ADMIN_SECRET_KEY` | Senha do login `/admin` | Default `enade2024` — **trocar antes do evento**. |
| `PRESENTER_KEY` | Autoriza comandos privilegiados no socket (revelar resposta, avançar questão, etc.) | Default `presenter-default-key-2025`, **hardcoded também no bundle do cliente** (`admin/page.tsx` e `apresentacao/[codigo]/page.tsx`). Precisa ser igual no Railway (variável de ambiente do serviço de socket) e nesses dois arquivos client-side. Trocar exige editar os três lados e rebuildar — é soft-auth, não segurança real, qualquer um pode ler a chave no JS do navegador. |
| `NEXT_PUBLIC_SOCKET_URL` | URL pública do serviço de socket (Railway) | Nova nesta sessão. Setada no Vercel como `https://enade-quiz-production.up.railway.app`. Se vazia, o cliente cai no path relativo antigo `?XTransformPort=3003` (só funciona atrás do Caddy da VPS). Prefixo `NEXT_PUBLIC_` é obrigatório para o Next.js expor a variável no bundle do navegador — sem ele, fica `undefined` em runtime e o app volta ao path antigo silenciosamente. |

**⚠️ Achado de segurança (2026-07-06):** o `.env` estava **versionado no
repositório GitHub** (`diges-uems/enadeQUIZ`), apesar do `.gitignore` local
dizer para ignorá-lo — provavelmente ficou commitado antes da regra existir
e ninguém tirou do rastreamento depois. Ele foi removido do controle de
versão nesta sessão (`git rm --cached .env`), mas **o histórico antigo do
repositório ainda pode ter valores reais de `ADMIN_SECRET_KEY`/
`PRESENTER_KEY`/credenciais de banco em commits passados**. Recomendação:
alguém com acesso ao repositório deve revisar `git log -p -- .env` e
trocar qualquer segredo real que já tenha sido commitado.

`deploy/DEPLOY.md` menciona um script `bun run build:prod` e
`scripts/assemble-standalone.js` para builds "standalone". **Esse script
existe** (`scripts/assemble-standalone.js`) mas o `package.json` atual
**não tem mais o script `build:prod`** — foi removido na Task 16 do
worklog quando o `output: "standalone"` foi tirado do `next.config.ts`
para simplificar o deploy. Ou seja, **parte do `deploy/DEPLOY.md` está
desatualizada** em relação ao código atual. Use o worklog (`worklog.md`,
Tasks 14-16) como fonte da verdade sobre o que de fato está em vigor hoje;
o `DEPLOY.md` deve ser revisado/atualizado como parte do trabalho de
polimento.

## 6. Bugs e pendências conhecidas (herdadas do `worklog.md`)

- Ranking: `student.corrects` só atualiza no reveal, não no voto (ver §4).
- Comandos de revelar resposta / avançar questão "às vezes não funcionam"
  — parcialmente endereçado na Task 5-a (retry + ack no socket), mas
  listado de novo como pendência na Task 16, então pode não estar
  totalmente resolvido.
- Rota `/api/upload` (usada pelo diálogo de upload de imagem no admin)
  **não existe** — retorna 404. Bug pré-existente, não introduzido por
  nenhuma task registrada.
- `next-auth` está no `package.json` mas não é usado — a autenticação real
  do admin é um sistema próprio em `src/lib/api-auth.ts` (token HMAC).
  Dependência morta, candidata a remoção.
- Não há suíte de testes automatizados no projeto (sem pasta `tests/`,
  sem framework de teste no `package.json`). Toda validação até hoje foi
  manual (curl, lint, build) e registrada no worklog.

## 7. Antes do evento de setembro (checklist)

- [x] Banco migrado para Postgres/Supabase (2026-07-06, ver §9).
- [x] Socket.IO hospedado no Railway (2026-07-06) — funcional via Node/curl.
- [ ] Resolver a falha de WebSocket no Firefox real (§3) — investigar se é
      HTTP/2, testar outro navegador, considerar trocar de host se
      persistir.
- [ ] Decidir qual dos dois repositórios GitHub é o canônico daqui pra
      frente (ver §9 — hoje o que está de fato no ar é
      `brunolop3/enade-quiz`, pessoal, não `diges-uems/enadeQUIZ`,
      institucional). Recomendado: consolidar num só antes do evento real,
      idealmente numa conta/org institucional com plano Vercel que suporte
      colaboração (ver §9).
- [ ] Trocar `ADMIN_SECRET_KEY` e `PRESENTER_KEY` para valores fortes e
      únicos, atualizando os três lados (env do Vercel, env do Railway,
      bundle cliente).
- [ ] Revisar o histórico do `.env` no GitHub (`diges-uems/enadeQUIZ`) e
      rotacionar qualquer segredo real que já tenha sido commitado (ver
      §5). Se um token de acesso pessoal (PAT) do GitHub foi compartilhado
      em texto puro em algum momento, revogá-lo também.
- [ ] Testar ponta a ponta com carga próxima da real esperada (~400
      alunos) usando `mini-services/stress-test`, contra o Supabase e
      contra o Railway — os testes de carga registrados no worklog
      rodaram no sandbox de desenvolvimento original, não neste ambiente.
- [ ] Configurar backup do banco — Supabase tem backup gerenciado, mas
      confirme o plano/retenção contratado é suficiente para os dados do
      evento (script antigo `deploy/backup.sh` pressupõe SQLite numa VM e
      não se aplica mais).

## 9. O que foi feito na sessão de 2026-07-06 (véspera de demo)

Contexto: havia uma apresentação/demo ao vivo no dia seguinte (2026-07-07)
e o deploy do Vercel estava completamente quebrado (banco inacessível).
Trabalho feito, nessa ordem:

1. **Diagnóstico ao vivo contra `enade-quiz.vercel.app`**: confirmado que
   `/api/health` retornava 503 (`Unable to open the database file`) e que
   `/?XTransformPort=3003` não chega em nenhum servidor de socket real —
   ambos consequências estruturais de rodar esta arquitetura (pensada para
   VM+SQLite+Caddy) dentro do Vercel (ver §3).
2. **Migração SQLite → Postgres/Supabase**: `prisma/schema.prisma` trocado
   para `provider = "postgresql"` com `directUrl` (a conexão direta do
   Supabase é IPv6-only nesta rede — usei o session pooler na porta 5432
   como `DIRECT_URL`, ver §5). Dados migrados com
   `scripts/migrate-sqlite-to-supabase.cjs`: 4 sessões, 55 questões, 9
   alunos, 30 questões do banco de questões — contagem e distribuição de
   gabarito (A/B/C/D/E) conferidas antes/depois, bateram 100%. O script
   aborta sozinho se o Postgres de destino já tiver alguma sessão, então é
   seguro rodar de novo sem risco de duplicar/sobrescrever.
3. **Enquanto isso, um commit separado subiu direto no GitHub** (branch
   `main`, ~366 arquivos, feature "Modo Leitura/Modo Votação" nas telas de
   apresentação + fix de um bug de 404 geral por conflito entre
   `middleware.ts`/`proxy.ts`). Os passos 1-2 acima foram refeitos em cima
   dessa versão nova (branch `demo-fix-2026-07-06`), para não perder essa
   feature. Um branch separado (`local-supabase-fixes-2026-07-06`) guarda
   o estado local anterior a esse commit, caso precise comparar depois.
4. **Polling HTTP de reforço** em `votar` e `apresentacao` (ver §3) —
   ativa quando o socket fica indisponível por mais de 5s. Não substitui
   hospedar o socket de verdade, mas evita que o app fique completamente
   travado sem o Vercel poder rodar o `mini-services/enade-quiz`.
5. **`.env` removido do controle de versão** (estava commitado no GitHub
   — ver alerta de segurança em §5).
6. Testado localmente (Windows, Node 24 + npm — **Bun não está instalado
   nesta máquina**, `npm install` foi usado como alternativa; isso puxou
   uma versão de ESLint mais nova que expôs 11 erros de lint
   pré-existentes em `admin/page.tsx`, `carousel.tsx` e `use-mobile.ts`,
   nenhum deles introduzido por este trabalho): health check OK, leitura e
   escrita de voto no Postgres OK, as três páginas principais carregam sem
   erro.
7. **O Vercel bloqueou o deploy** com "The deployment was blocked because
   the commit author did not have contributing access to the project on
   Vercel. The Hobby Plan does not support collaboration for private
   repositories." — o plano Hobby não aceita commits de autores não
   reconhecidos como colaboradores do projeto Vercel em repositórios
   privados. Um commit vazio com o e-mail certo não resolveu (o bloqueio é
   sobre a conta do GitHub que efetivamente faz o push, não sobre o campo
   de e-mail do commit).
8. **Solução aplicada**: um novo repositório pessoal foi criado
   (`brunolop3/enade-quiz`, distinto do institucional
   `diges-uems/enadeQUIZ`) e um novo projeto Vercel foi conectado a ele.
   **Isso significa que, a partir desta sessão, o código que está de fato
   no ar (`diges-quiz.vercel.app`) vive em `brunolop3/enade-quiz`, não no
   repositório institucional.** Localmente, o branch `main` (neste
   diretório) descende do histórico do `diges-uems/enadeQUIZ`; o branch
   `fix-brunolop3` descende do snapshot enviado para o repositório
   pessoal e é o que reflete o que está realmente em produção. Os dois
   têm o mesmo conteúdo de código (as correções foram aplicadas nos dois
   via cherry-pick), mas históricos de commit diferentes. **Isso precisa
   ser resolvido/consolidado antes do evento real** — não é uma situação
   saudável a longo prazo para um sistema institucional.
9. Corrigidos, nesta ordem, depois do deploy voltar ao ar:
   - `src/proxy.ts` causava 404 em todas as rotas no Vercel (removido —
     perda temporária dos headers de segurança extra em `/admin`/`/api`).
   - `Cache-Control: public, s-maxage=5, stale-while-revalidate=30` em
     `GET /api/session/[code]` fazia o Vercel Edge cachear respostas por
     até 5-30s, atrapalhando o polling — trocado para `no-store`.
   - Bug de "piscar" no indicador de conexão da apresentação: o
     `useEffect` que cria o socket dependia do objeto `session` inteiro
     (que ganha referência nova a cada poll), destruindo/recriando o
     socket sem parar. Trocado para depender de um booleano estável.
   - `emitWithRetry` (admin) e os timeouts de socket/polling (votar,
     apresentacao) foram reduzidos (de ~10-20s de espera por ação para
     ~1-3s) para a situação sem socket algum.
10. **Socket.IO hospedado no Railway** (`mini-services/enade-quiz`) — ver
    §3 para detalhes técnicos (porta dinâmica, Root Directory, Target
    Port) e a pendência de WebSocket não funcionar no Firefox do usuário
    apesar de funcionar via Node/curl.

**Não feito ainda** (ficou para depois da demo, mirando setembro com mais
calma): resolver a falha de WebSocket no navegador (§3); decidir/consolidar
os dois repositórios GitHub (item 8 acima); corrigir o bug do ranking
(`corrects` só no reveal); teste de carga real para 400 alunos; revisão
geral de código; restaurar os headers de segurança que `proxy.ts` dava
(hoje removidos).

## 8. Onde cavar mais fundo

- `worklog.md` (raiz) — histórico linha a linha de tudo que foi feito,
  por que, e o que ficou pendente em cada sessão de trabalho anterior.
  Fonte primária para entender decisões passadas.
- `deploy/DEPLOY.md` — guia de deploy em VPS (parcialmente desatualizado,
  ver §5).
- `agent-ctx/*.md` — anotações de contexto de sessões de trabalho
  anteriores, mais informais que o worklog.
