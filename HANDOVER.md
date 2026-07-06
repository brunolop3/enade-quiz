# HANDOVER — EnadeQuiz (UEMS Votação)

> Documento escrito para quem vai assumir a administração/manutenção deste
> sistema sem ter acompanhado o desenvolvimento. Assume zero contexto prévio.
> Última atualização: 2026-07-06 (noite, véspera de uma apresentação/demo —
> ver §9 para o que foi feito nesta sessão especificamente).

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

## 3. ⚠️ O Vercel não hospeda o serviço de tempo real (Socket.IO)

O `deploy/DEPLOY.md` (guia extenso, ~670 linhas) documenta um deploy em
**VM própria** (Ubuntu + PM2 rodando os 3 processos + Caddy na frente). É
esse o único cenário em que a arquitetura da seção 2 funciona 100% como
desenhada — com o socket ao vivo.

O sistema está rodando **no Vercel** (`enade-quiz.vercel.app`). Isso foi
**confirmado ao vivo** em 2026-07-06 (não é só teoria):

- `GET /api/health` retornava **503** com
  `"Unable to open the database file"` — SQLite não funciona no
  filesystem efêmero/somente-leitura do Vercel. **Corrigido** com a
  migração para Postgres/Supabase (§9) — confirme com um novo health
  check antes de confiar nisso para o próximo evento.
- `GET /?XTransformPort=3003` (o caminho que o cliente usa para "achar"
  o socket) simplesmente devolve a página Next.js normal — **não existe
  nenhum servidor de socket rodando no Vercel**, nem nunca vai existir
  enquanto o app ficar só lá, porque o Vercel não hospeda processos de
  longa duração. Isso é estrutural, não um bug para "consertar" — precisa
  de uma decisão de arquitetura (ver §9, "o que ainda falta").
- Como paliativo, `votar` e `apresentacao` agora têm **polling HTTP** que
  assume o trabalho quando o socket está fora do ar por mais de 5s (ver
  §9). Isso dá uma experiência "quase em tempo real" (delay de alguns
  segundos) sem depender do Socket.IO, mas **não é tão instantâneo quanto
  o socket real** — para o evento de setembro com ~400 alunos, avalie se
  isso é suficiente ou se vale a pena hospedar o socket à parte (Fly.io/
  Railway, por exemplo — o código de `mini-services/enade-quiz` já existe
  e está endurecido, só falta hospedá-lo).

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
| `PRESENTER_KEY` | Autoriza comandos privilegiados no socket (revelar resposta, avançar questão, etc.) | Default `presenter-default-key-2025`, **hardcoded também no bundle do cliente** (`admin/page.tsx` e `apresentacao/[codigo]/page.tsx`). Trocar exige editar os dois lados e rebuildar — é soft-auth, não segurança real, qualquer um pode ler a chave no JS do navegador. |

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
- [ ] Decidir onde hospedar o serviço de socket para tempo real de
      verdade (Fly.io/Railway/etc.) — hoje o app sobrevive só com o
      polling HTTP de reforço (§3), que tem alguns segundos de atraso.
- [ ] Trocar `ADMIN_SECRET_KEY` e `PRESENTER_KEY` para valores fortes e
      únicos, atualizando os dois lados do `PRESENTER_KEY` (env + bundle
      cliente).
- [ ] Revisar o histórico do `.env` no GitHub e rotacionar qualquer
      segredo real que já tenha sido commitado (ver §5).
- [ ] Testar ponta a ponta com carga próxima da real esperada (~400
      alunos) usando `mini-services/stress-test`, contra o Supabase e
      contra a hospedagem real escolhida para o socket — os testes de
      carga registrados no worklog rodaram no sandbox de desenvolvimento
      original, não neste ambiente.
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

**Não feito ainda** (ficou para depois da demo, mirando setembro com mais
calma): atualizar as variáveis de ambiente no painel do Vercel e redeployar
(passo manual, precisa ser feito por quem tem acesso ao projeto Vercel);
hospedar o serviço de socket para tempo real de verdade; corrigir o bug do
ranking (`corrects` só no reveal); teste de carga real para 400 alunos;
revisão geral de código.

## 8. Onde cavar mais fundo

- `worklog.md` (raiz) — histórico linha a linha de tudo que foi feito,
  por que, e o que ficou pendente em cada sessão de trabalho anterior.
  Fonte primária para entender decisões passadas.
- `deploy/DEPLOY.md` — guia de deploy em VPS (parcialmente desatualizado,
  ver §5).
- `agent-ctx/*.md` — anotações de contexto de sessões de trabalho
  anteriores, mais informais que o worklog.
