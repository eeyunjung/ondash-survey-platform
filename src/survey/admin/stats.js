import { POSITIONS, RATINGS, REFERENCE_DEPENDS, REFERENCE_OTHER, SURVEY_VERSION, SYSTEMS, getItem } from '../questionsBank.js'
import { isPilot } from '../pilot.js'

// 참고할 것 선택의 값: 시스템 이름, 'depends'(상황에 따라 다름), 'other'(기타).
export const REFERENCE_OUTCOMES = [...SYSTEMS, REFERENCE_DEPENDS, REFERENCE_OTHER]

/** 현재 형식(답변별 척도 + 참고 선택)의 응답인지. 이전 형식은 reference가 없다. */
export const isCurrentResponse = (ev) => ev && typeof ev.reference === 'string' && ev.ratings

/**
 * 응답을 두 가지 긴 형식으로 펼친다. 블라인드 자리(A·B·C)를 실제 시스템으로 되돌린다.
 *  - ratingRows: 참가자 × 문항 × 답변 한 줄 (R1, R2)
 *  - itemRows:   참가자 × 문항 한 줄 (참고 선택, 가장 중요하게 본 점)
 */
export function flatten(responses) {
  const ratingRows = []
  const itemRows = []
  for (const r of responses) {
    if (r.surveyVersion !== SURVEY_VERSION) continue // 문항 구성이 다른 이전 버전은 합치지 않는다.
    for (const [itemId, ev] of Object.entries(r.evaluations ?? {})) {
      const item = getItem(itemId)
      if (!item || !isCurrentResponse(ev)) continue
      const base = {
        participantId: r.participantId,
        pilot: isPilot(r) ? 1 : 0,
        status: r.status,
        itemId,
        focus: item.focus,
        presentedIndex: ev.presentedIndex + 1,
      }
      POSITIONS.forEach((position, i) => {
        ratingRows.push({
          ...base,
          position,
          system: ev.order[i],
          ...Object.fromEntries(RATINGS.map((x) => [x.id, ev.ratings[position]?.[x.id]])),
        })
      })
      const referenceSystem = POSITIONS.includes(ev.reference) ? ev.order[POSITIONS.indexOf(ev.reference)] : ev.reference
      itemRows.push({
        ...base,
        systemA: ev.order[0],
        systemB: ev.order[1],
        systemC: ev.order[2],
        reference: ev.reference,
        referenceSystem,
        referenceOther: ev.referenceOther ?? '',
        important: ev.important ?? '',
        durationSec: ev.durationSec,
        answeredAt: ev.answeredAt,
      })
    }
  }
  return { ratingRows, itemRows }
}

function describe(values) {
  const v = values.filter((x) => typeof x === 'number')
  const n = v.length
  if (n === 0) return { n: 0, mean: null, sd: null }
  const mean = v.reduce((a, b) => a + b, 0) / n
  const sd = n > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : null
  return { n, mean, sd }
}

/** 시스템별 두 척도의 평균·표준편차. */
export function summarizeRatings(ratingRows) {
  return Object.fromEntries(
    SYSTEMS.map((system) => {
      const own = ratingRows.filter((row) => row.system === system)
      return [system, { n: own.length, scales: Object.fromEntries(RATINGS.map((x) => [x.id, describe(own.map((row) => row[x.id]))])) }]
    }),
  )
}

const tally = (rows) => {
  const counts = Object.fromEntries(REFERENCE_OUTCOMES.map((o) => [o, 0]))
  for (const row of rows) counts[row.referenceSystem] = (counts[row.referenceSystem] ?? 0) + 1
  return { n: rows.length, counts }
}

export const summarizeReference = (itemRows) => tally(itemRows)

export function summarizeByItem(ratingRows, itemRows) {
  const ids = [...new Set(itemRows.map((row) => row.itemId))].sort()
  return ids.map((itemId) => {
    const items = itemRows.filter((row) => row.itemId === itemId)
    return {
      itemId,
      focus: items[0].focus,
      ratings: summarizeRatings(ratingRows.filter((row) => row.itemId === itemId)),
      ...tally(items),
      others: items.filter((row) => row.referenceOther).map((row) => ({ participantId: row.participantId, text: row.referenceOther })),
      important: items
        .filter((row) => row.important)
        .map((row) => ({ participantId: row.participantId, system: row.referenceSystem, text: row.important })),
    }
  })
}

export function countByStatus(responses) {
  const counts = { total: responses.length, completed: 0, in_progress: 0, screened_out: 0 }
  for (const r of responses) counts[r.status] = (counts[r.status] ?? 0) + 1
  return counts
}

/** 현재와 다른 문항 구성(이전 버전)으로 응답한 기록 수. 집계에서는 제외하고 원본 JSON에는 남는다. */
export const countLegacy = (responses) =>
  responses.filter(
    (r) => r.legacy || (r.surveyVersion !== SURVEY_VERSION && Object.keys(r.evaluations ?? {}).length > 0),
  ).length
