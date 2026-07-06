'use client'

import React from 'react'

/**
 * Formats ENADE question text with rich styling matching the PDF format.
 *
 * Design goals (revised 2026-06-30):
 *   1. NEVER make the question body text golden. The golden colour (#C8A84B)
 *      is reserved exclusively for: section headers (TEXTO 1, TEXTO 2,
 *      QUESTÃO 05) and bullet/number markers. The body text itself is
 *      always rendered in a high-contrast off-white (#E8EDFF / #F1F4FA).
 *   2. Only treat a line as a "header" when the WHOLE line is exactly the
 *      header token (e.g. "TEXTO 1" by itself). Previously the regex
 *      matched any line that *started* with "TEXTO 1", which caused the
 *      entire body of "TEXTO 1 <paragraph...>" to be rendered golden.
 *   3. Reference lines (PEREIRA, P. F.; ...; Disponível em: ...; Acesso
 *      em: ...) are now styled subtly (smaller, italic, muted) AND clearly
 *      delimited from the body text by a left border — but NEVER golden.
 *   4. Inline images via `imageUrl` prop are rendered in a dedicated
 *      block at the top of the question (used by callers that don't
 *      already render the image separately).
 *
 * Block types:
 *   - header       → "TEXTO 1", "TEXTO 2", "QUESTÃO 05"
 *   - subheader    → "Texto para questões 09 e 10"
 *   - reference    → academic citations (PEREIRA, ...; LAGNY, M. ...)
 *   - source       → "Disponível em: ..." / "Acesso em: ..." URL lines
 *   - transition   → "Considerando...", "De acordo com...", "Com base..."
 *   - bullet       → lines starting with •, ●, ○
 *   - emphasis     → "Função referencial:" style named bullets
 *   - numbered     → "1. xxx", "2. xxx"
 *   - paragraph    → regular body text (default)
 *   - blank        → paragraph break
 */

interface QuestionTextProps {
  text: string
  className?: string
  textSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl'
  imageUrl?: string | null
  /**
   * When `true`, the component collapses long supporting texts (Texto 1,
   * Texto 2 body paragraphs) down to just their header + a small
   * "Texto completo recolhido" placeholder. Headers, transitions
   * (Considerando...), references and sources are still rendered in
   * full — only the verbose body paragraphs are hidden.
   *
   * Used by the presentation screen's Phase 2 (Voting Mode) so the
   * alternatives and the live vote animation get full focus.
   */
  compact?: boolean
}

// ── Colour tokens ───────────────────────────────────────────────────
// Centralised so we can tweak the palette without touching each block.
const C = {
  body: 'text-[#E8EDFF]',
  bodyMuted: 'text-[#C8D0E8]',
  header: 'text-[#C8A84B]',
  marker: 'text-[#C8A84B]',
  reference: 'text-[#8899CC]',
  source: 'text-[#6B7AA1]',
  transition: 'text-[#F1F4FA]',
  emphasis: 'text-[#F1F4FA]',
  emphasisTerm: 'text-[#E8EDFF]',
}

export function QuestionText({ text, className = '', textSize = 'base', imageUrl, compact = false }: QuestionTextProps) {
  const sizeClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
  }[textSize]

  const blocks = parseQuestionText(text)

  // ── Compact-mode post-processing ───────────────────────────────────
  // In compact mode we want to keep headers (TEXTO 1, TEXTO 2, QUESTÃO 05),
  // subheaders, references, sources, transitions, bullets, numbered items
  // and emphasis blocks. We collapse consecutive runs of plain `paragraph`
  // blocks that appear immediately after a `header` (i.e. the body of
  // Texto 1 / Texto 2) into a single "collapsed" placeholder so the
  // audience knows there's more text but it isn't taking up screen real
  // estate during the voting phase.
  const renderedBlocks = compact
    ? collapseSupportParagraphs(blocks)
    : blocks

  return (
    <div className={`leading-relaxed text-justify ${sizeClass} ${C.body} ${className}`}>
      {renderedBlocks.map((block, i) => (
        <QuestionBlock key={i} block={block} imageUrl={imageUrl} isFirst={i === 0} />
      ))}
    </div>
  )
}

/**
 * In compact (voting-phase) mode, collapse runs of paragraph blocks that
 * follow a `header` block into a single `collapsed` placeholder. This
 * keeps "TEXTO 1" / "TEXTO 2" / "QUESTÃO 05" labels visible (so the
 * audience still knows the question structure) but hides the verbose
 * supporting body so the alternatives + bar chart get focus.
 *
 * Non-paragraph blocks (transitions, references, bullets, numbered
 * items, emphasis) are always kept — they're short and semantically
 * important.
 */
function collapseSupportParagraphs(blocks: TextBlock[]): TextBlock[] {
  const out: TextBlock[] = []
  let collapsing = false
  let collapseCount = 0
  let collapsePreview: string[] = []

  for (const block of blocks) {
    if (block.type === 'header' || block.type === 'subheader') {
      // Flush any pending collapsed run first.
      if (collapsing && collapseCount > 0) {
        out.push({ type: 'collapsed', content: '', preview: collapsePreview.join(' ') })
      }
      out.push(block)
      collapsing = true
      collapseCount = 0
      collapsePreview = []
      continue
    }

    if (block.type === 'paragraph' || block.type === 'blank') {
      if (collapsing) {
        // Accumulate this paragraph into the pending collapse run.
        if (block.type === 'paragraph') {
          collapseCount++
          if (collapsePreview.length < 2) {
            // Take just the first ~120 chars of the paragraph as a preview.
            const preview = block.content.length > 120
              ? block.content.slice(0, 120).trim() + '…'
              : block.content
            collapsePreview.push(preview)
          }
        }
        // Skip pushing the paragraph — it's absorbed into the collapse.
        continue
      }
      // Not currently after a header — keep the paragraph as-is.
      out.push(block)
      continue
    }

    // Any other block type (transition, reference, source, bullet,
    // numbered, emphasis) flushes the pending collapse and is rendered
    // normally.
    if (collapsing && collapseCount > 0) {
      out.push({ type: 'collapsed', content: '', preview: collapsePreview.join(' ') })
    }
    collapsing = false
    collapseCount = 0
    collapsePreview = []
    out.push(block)
  }

  // Flush any trailing collapse run.
  if (collapsing && collapseCount > 0) {
    out.push({ type: 'collapsed', content: '', preview: collapsePreview.join(' ') })
  }

  return out
}

interface TextBlock {
  type:
    | 'header'
    | 'subheader'
    | 'reference'
    | 'source'
    | 'bullet'
    | 'numbered'
    | 'emphasis'
    | 'paragraph'
    | 'blank'
    | 'transition'
    | 'collapsed'
  content: string
  children?: TextBlock[]
  level?: number
  preview?: string
}

function parseQuestionText(text: string): TextBlock[] {
  // Normalise line endings, then split on \n. We intentionally do NOT
  // collapse newlines here — they're semantically meaningful (each
  // paragraph / reference / source line is its own block).
  const normalised = text.replace(/\r\n?/g, '\n')
  const lines = normalised.split('\n')
  const blocks: TextBlock[] = []
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trim()

    // Skip empty lines but track paragraph breaks (collapse runs of blanks
    // into a single blank block).
    if (!line) {
      // Only push a blank block if the previous block wasn't already blank
      // and we're not at the very start / end.
      const prev = blocks[blocks.length - 1]
      if (prev && prev.type !== 'blank') {
        // Look ahead — only push a blank if there's more content coming.
        let j = i + 1
        while (j < lines.length && !lines[j].trim()) j++
        if (j < lines.length) {
          blocks.push({ type: 'blank', content: '' })
        }
      }
      i++
      continue
    }

    // ── Strict header detection ────────────────────────────────────
    // Only treat a line as a header when the WHOLE line is the header
    // token. This prevents "TEXTO 1 <paragraph body...>" from being
    // classified as a header and rendered entirely golden.
    //
    // Accepted forms:
    //   "TEXTO 1", "TEXTO 2", "TEXTO 3" ...          (case-insensitive)
    //   "QUESTÃO 05", "QUESTÃO 12"                    (case-insensitive)
    //   "QUESTÃO 5" (no leading zero)                 (case-insensitive)
    if (/^TEXTO\s+\d+$/i.test(line)) {
      blocks.push({ type: 'header', content: line })
      i++
      continue
    }
    if (/^QUEST[AÃ]O\s+\d+$/i.test(line)) {
      blocks.push({ type: 'header', content: line })
      i++
      continue
    }

    // "Texto para questões XX e YY" — section intro (only if the line
    // starts with that exact phrase).
    if (/^Texto para quest[õo]es/i.test(line)) {
      blocks.push({ type: 'subheader', content: line })
      i++
      continue
    }

    // Source references: "Disponível em:" / "Acesso em:" lines.
    if (/^Dispon[ií]vel em:/i.test(line) || /^Acesso em:/i.test(line)) {
      blocks.push({ type: 'source', content: line })
      i++
      continue
    }

    // Reference lines — typically all caps surnames followed by year or
    // common academic markers. We require BOTH conditions:
    //   (a) Line starts with 2+ uppercase letters (surname) followed by
    //       space/comma/semicolon/period.
    //   (b) Line contains a year, "adaptado", "Disponível", "Acesso",
    //       "Editora", "Revista", "Cadernos", "In:", "Universidade",
    //       "Dissertação", "Tese", "Monografia", "Anais", "Congresso",
    //       "Simpósio", "Periódico" — OR is a short author-only line
    //       like "LAERTE."
    //
    // We also exclude lines that start with an alternative letter ("A ",
    // "B ", ...) since those are answer options, not references.
    if (
      /^[A-ZÀ-Ÿ]{2,}[\s,;.]/.test(line) &&
      line.length > 5 &&
      !line.startsWith('A ') &&
      !line.startsWith('B ') &&
      !line.startsWith('C ') &&
      !line.startsWith('D ') &&
      !line.startsWith('E ')
    ) {
      if (
        /\d{4}|adaptado|Dispon[ií]vel|Acesso|Editora|Revista|Cadernos|In:|Universidade|Disserta[çc][ãa]o|Tese|Monografia|Anais|Congresso|Simp[óo]sio|Peri[óo]dico/.test(
          line
        )
      ) {
        blocks.push({ type: 'reference', content: line })
        i++
        continue
      }
      // Short author-only lines like "LAERTE." or "BRASIL."
      if (/^[A-ZÀ-Ÿ]+\.?\s*$/.test(line)) {
        blocks.push({ type: 'reference', content: line })
        i++
        continue
      }
    }

    // Transition paragraphs: "Considerando...", "De acordo com...",
    // "Com base...", etc. These introduce the actual question prompt
    // after the supporting texts.
    if (
      /^Considerando/i.test(line) ||
      /^De acordo com/i.test(line) ||
      /^Com base/i.test(line) ||
      /^De acordo/i.test(line) ||
      /^Ao relacionar/i.test(line) ||
      /^Entre as/i.test(line) ||
      /^A an[aá]lise/i.test(line) ||
      /^A atividade/i.test(line) ||
      /^A fim de/i.test(line) ||
      /^A partir das/i.test(line) ||
      /^A partir do/i.test(line) ||
      /^A partir de/i.test(line)
    ) {
      blocks.push({ type: 'transition', content: line })
      i++
      continue
    }

    // Bullet points: "• " or "● " etc.
    if (/^[•●○▪▸►]\s/.test(line)) {
      blocks.push({ type: 'bullet', content: line.replace(/^[•●○▪▸►]\s*/, '') })
      i++
      continue
    }

    // Named bullet points like "Função referencial:", "Função
    // instrumental:", etc. — common in PNLD-style questions.
    if (/^Fun[çc][ãa]o\s+\w+:/i.test(line) || /^Fun[çc][ãa]o\s+\w+\s+e\s+\w+:/i.test(line)) {
      blocks.push({ type: 'emphasis', content: line })
      i++
      continue
    }

    // Numbered items: "1. xxx", "2. xxx", "3. xxx"
    if (/^\d+\.\s/.test(line)) {
      blocks.push({ type: 'numbered', content: line, level: parseInt(line) })
      i++
      continue
    }

    // Quoted text: starts and ends with quotes
    if (/^["\u201C\u201D]/.test(line) && /["\u201C\u201D]$/.test(line)) {
      blocks.push({ type: 'emphasis', content: line })
      i++
      continue
    }

    // Regular paragraph — the default body text case.
    blocks.push({ type: 'paragraph', content: line })
    i++
  }

  return blocks
}

function QuestionBlock({
  block,
  imageUrl,
  isFirst,
}: {
  block: TextBlock
  imageUrl?: string | null
  isFirst?: boolean
}) {
  switch (block.type) {
    case 'header':
      // Section headers like "TEXTO 1", "TEXTO 2", "QUESTÃO 05".
      // Rendered bold + golden + uppercase — but ONLY for the header
      // token itself (which is the whole line, per the strict regex
      // above). The body text that follows is rendered as separate
      // paragraph blocks.
      return (
        <div className={`mt-5 mb-2 ${isFirst ? 'mt-0' : ''}`}>
          <span
            className={`font-bold ${C.header} tracking-wide uppercase text-[0.95em]`}
            style={{ letterSpacing: '0.04em' }}
          >
            {block.content}
          </span>
        </div>
      )

    case 'subheader':
      return (
        <div className={`mt-5 mb-2 ${isFirst ? 'mt-0' : ''}`}>
          <span className={`font-semibold ${C.body} italic`}>{block.content}</span>
        </div>
      )

    case 'reference':
      // Academic citations: PEREIRA, ...; LAGNY, M. ...; BRASIL. Lei ...
      // Styled subtly (smaller, italic, muted) with a left accent border
      // to clearly separate them from the body text.
      return (
        <div className="my-2 pl-3 border-l-2 border-[#1A2A5E]/70">
          <span className={`${C.reference} italic text-[0.88em] leading-snug`}>
            {block.content}
          </span>
        </div>
      )

    case 'source':
      // URL/source lines: "Disponível em: ...", "Acesso em: ..."
      // Smaller and more muted than references — they're metadata.
      return (
        <div className="my-1.5 pl-3 border-l-2 border-[#1A2A5E]/50">
          <span className={`${C.source} italic text-[0.85em] leading-snug`}>
            {block.content}
          </span>
        </div>
      )

    case 'transition':
      // "Considerando...", "De acordo com...", etc. — the actual
      // question prompt that introduces the alternatives. Bold-ish,
      // high-contrast, slightly larger.
      return (
        <div className="my-3 text-justify">
          <span className={`${C.transition} font-medium`}>{renderInlineFormatting(block.content)}</span>
        </div>
      )

    case 'bullet':
      return (
        <div className="my-1.5 pl-4 flex gap-2 text-justify">
          <span className={`${C.marker} shrink-0`}>•</span>
          <span className={C.bodyMuted}>{renderInlineFormatting(block.content)}</span>
        </div>
      )

    case 'numbered':
      return (
        <div className="my-1.5 pl-4 flex gap-2 text-justify">
          <span className={`${C.marker} font-bold shrink-0`}>{block.level}.</span>
          <span className={C.bodyMuted}>{renderInlineFormatting(block.content.replace(/^\d+\.\s*/, ''))}</span>
        </div>
      )

    case 'emphasis':
      return (
        <div className="my-1.5 text-justify">
          {renderInlineFormatting(block.content)}
        </div>
      )

    case 'blank':
      return <div className="h-2" />

    case 'collapsed':
      // Rendered only in compact (voting-phase) mode. Shows a short
      // preview of the collapsed supporting text + a "texto recolhido"
      // hint, so the audience understands there was more body text that
      // has been hidden to give focus to the alternatives.
      return (
        <div className="my-2 px-3 py-2 rounded-md border border-dashed border-[#1A2A5E]/70 bg-[#0D1B3E]/40">
          {block.preview && (
            <p className={`${C.reference} italic text-[0.8em] leading-snug line-clamp-2`}>
              {block.preview}
            </p>
          )}
          <p className={`${C.source} text-[0.7em] mt-1 uppercase tracking-wider`}>
            texto de apoio recolhido • modo votação
          </p>
        </div>
      )

    case 'paragraph':
    default:
      // Regular body paragraph — the most common block type. Always
      // rendered in the high-contrast body colour, NEVER golden.
      return (
        <div className="my-1.5 text-justify">
          {renderInlineFormatting(block.content)}
        </div>
      )
  }
}

/**
 * Renders inline formatting within a text block:
 *   - Bold: text between ** ** or terms followed by colon (like
 *     "Função referencial:")
 *   - Italic: text in quotes
 *
 * The body text itself is ALWAYS rendered in the high-contrast body
 * colour — never golden. Only the emphasised term (before a colon)
 * gets a slightly brighter shade.
 */
function renderInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let keyIndex = 0

  // Process: patterns like "Term:" at start → bold the term
  const termColonMatch = remaining.match(/^([^:]{2,40}):(.*)$/)
  if (termColonMatch && !remaining.startsWith('http')) {
    parts.push(
      <span key={keyIndex++} className={`font-semibold ${C.emphasisTerm}`}>
        {termColonMatch[1]}:
      </span>
    )
    remaining = termColonMatch[2]
  }

  // Process quoted text → italic
  const quoteRegex = /["\u201C]([^"\u201D]+)["\u201D]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = quoteRegex.exec(remaining)) !== null) {
    // Text before the quote
    if (match.index > lastIndex) {
      parts.push(
        <span key={keyIndex++} className={C.body}>
          {remaining.slice(lastIndex, match.index)}
        </span>
      )
    }
    // The quoted text
    parts.push(
      <span key={keyIndex++} className={`italic ${C.bodyMuted}/90`}>
        &ldquo;{match[1]}&rdquo;
      </span>
    )
    lastIndex = match.index + match[0].length
  }

  // Remaining text after last quote
  if (lastIndex < remaining.length) {
    parts.push(<span key={keyIndex++} className={C.body}>{remaining.slice(lastIndex)}</span>)
  }

  // If no quotes found, just return the remaining text in body colour
  if (parts.length === 0) {
    return <span className={C.body}>{text}</span>
  }

  return <>{parts}</>
}

/**
 * Helper: get the list of non-empty alternative letters for a question
 */
export function getActiveAlternatives(question: {
  altA: string
  altB: string
  altC: string
  altD: string
  altE: string
}): string[] {
  const alts = ['A', 'B', 'C', 'D', 'E'] as const
  return alts.filter((alt) => {
    const key = `alt${alt}` as keyof typeof question
    return question[key] && question[key].trim().length > 0
  })
}
