// Migração única: copia os dados do SQLite local (db/custom.db) para o
// Postgres do Supabase configurado em DATABASE_URL/DIRECT_URL (.env).
//
// Idempotente por segurança: aborta se o Postgres já tiver qualquer Session,
// para nunca sobrescrever dados que já estejam lá. Rodar de novo depois de
// um `prisma db push` num banco vazio é seguro.
//
// Uso: node scripts/migrate-sqlite-to-supabase.cjs

const { DatabaseSync } = require('node:sqlite')
const path = require('node:path')
const { PrismaClient } = require('@prisma/client')

const SQLITE_PATH = path.resolve(__dirname, '..', 'db', 'custom.db')

function gabaritoDistribution(rows) {
  const dist = { A: 0, B: 0, C: 0, D: 0, E: 0 }
  for (const r of rows) {
    if (dist[r.correctAnswer] !== undefined) dist[r.correctAnswer]++
  }
  return dist
}

async function main() {
  const sqlite = new DatabaseSync(SQLITE_PATH, { readOnly: true })
  const prisma = new PrismaClient()

  const sessions = sqlite.prepare('SELECT * FROM Session').all()
  const questions = sqlite.prepare('SELECT * FROM Question').all()
  const students = sqlite.prepare('SELECT * FROM Student').all()
  const votes = sqlite.prepare('SELECT * FROM Vote').all()
  const bank = sqlite.prepare('SELECT * FROM QuestionBank').all()

  console.log('--- Origem (SQLite) ---')
  console.log({
    sessions: sessions.length,
    questions: questions.length,
    students: students.length,
    votes: votes.length,
    questionBank: bank.length,
  })
  console.log('Distribuição de gabarito — Question:', gabaritoDistribution(questions))
  console.log('Distribuição de gabarito — QuestionBank:', gabaritoDistribution(bank))

  const existingSessions = await prisma.session.count()
  if (existingSessions > 0) {
    console.error(
      `ABORTADO: o Postgres de destino já tem ${existingSessions} sessão(ões). ` +
        'Este script só roda contra um banco vazio, para nunca sobrescrever dados existentes.'
    )
    process.exit(1)
  }

  await prisma.session.createMany({
    data: sessions.map((s) => ({
      id: s.id,
      code: s.code,
      title: s.title,
      status: s.status,
      currentQuestionId: s.currentQuestionId,
      requireIdentification: !!s.requireIdentification,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
    })),
  })

  await prisma.question.createMany({
    data: questions.map((q) => ({
      id: q.id,
      sessionId: q.sessionId,
      text: q.text,
      year: q.year,
      course: q.course,
      altA: q.altA,
      altB: q.altB,
      altC: q.altC,
      altD: q.altD,
      altE: q.altE,
      correctAnswer: q.correctAnswer,
      imageUrl: q.imageUrl,
      isRevealed: !!q.isRevealed,
      orderIndex: q.orderIndex,
      createdAt: new Date(q.createdAt),
      updatedAt: new Date(q.updatedAt),
    })),
  })

  await prisma.student.createMany({
    data: students.map((s) => ({
      id: s.id,
      sessionId: s.sessionId,
      name: s.name,
      rgm: s.rgm,
      score: s.score,
      answers: s.answers,
      corrects: s.corrects,
      joinedAt: new Date(s.joinedAt),
    })),
  })

  if (votes.length > 0) {
    await prisma.vote.createMany({
      data: votes.map((v) => ({
        id: v.id,
        questionId: v.questionId,
        studentId: v.studentId,
        choice: v.choice,
        isCorrect: !!v.isCorrect,
        votedAt: new Date(v.votedAt),
      })),
    })
  }

  await prisma.questionBank.createMany({
    data: bank.map((b) => ({
      id: b.id,
      title: b.title,
      text: b.text,
      year: b.year,
      course: b.course,
      altA: b.altA,
      altB: b.altB,
      altC: b.altC,
      altD: b.altD,
      altE: b.altE,
      correctAnswer: b.correctAnswer,
      imageUrl: b.imageUrl,
      category: b.category,
      tags: b.tags,
      createdAt: new Date(b.createdAt),
      updatedAt: new Date(b.updatedAt),
    })),
  })

  const dest = {
    sessions: await prisma.session.count(),
    questions: await prisma.question.count(),
    students: await prisma.student.count(),
    votes: await prisma.vote.count(),
    questionBank: await prisma.questionBank.count(),
  }
  console.log('--- Destino (Postgres/Supabase) ---')
  console.log(dest)

  const destQuestions = await prisma.question.findMany({ select: { correctAnswer: true } })
  const destBank = await prisma.questionBank.findMany({ select: { correctAnswer: true } })
  console.log('Distribuição de gabarito — Question (destino):', gabaritoDistribution(destQuestions))
  console.log('Distribuição de gabarito — QuestionBank (destino):', gabaritoDistribution(destBank))

  const ok =
    dest.sessions === sessions.length &&
    dest.questions === questions.length &&
    dest.students === students.length &&
    dest.votes === votes.length &&
    dest.questionBank === bank.length

  if (!ok) {
    console.error('DIVERGÊNCIA DE CONTAGEM — revise antes de considerar a migração concluída.')
    process.exit(1)
  }
  console.log('OK: contagens batem entre origem e destino.')

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Migração falhou:', err)
  process.exit(1)
})
