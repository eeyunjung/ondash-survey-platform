import { RATINGS, SCREENER } from '../questionsBank.js'
import { isPilot } from '../pilot.js'

const cell = (value) => {
  if (value === null || value === undefined) return ''
  const text = Array.isArray(value) ? value.join(' | ') : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const toCsv = (header, rows) => [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')

/** 답변 평가: 참가자 × 문항 × 답변(A·B·C) 한 줄. */
export function ratingsCsv(rows) {
  const header = [
    'participant_id', 'pilot', 'status', 'item_id', 'focus', 'presented_index', 'position', 'system',
    ...RATINGS.map((x) => x.id),
  ]
  return toCsv(
    header,
    rows.map((r) => [
      r.participantId, r.pilot, r.status, r.itemId, r.focus, r.presentedIndex, r.position, r.system,
      ...RATINGS.map((x) => r[x.id]),
    ]),
  )
}

/** 상황별 응답: 참가자 × 문항 한 줄. 참고 선택과 자유 응답을 담는다. */
export function itemsCsv(rows) {
  const header = [
    'participant_id', 'pilot', 'status', 'item_id', 'focus', 'presented_index',
    'system_A', 'system_B', 'system_C', 'reference', 'reference_system', 'reference_other', 'important',
    'duration_sec', 'answered_at',
  ]
  return toCsv(
    header,
    rows.map((r) => [
      r.participantId, r.pilot, r.status, r.itemId, r.focus, r.presentedIndex,
      r.systemA, r.systemB, r.systemC, r.reference, r.referenceSystem, r.referenceOther, r.important,
      r.durationSec, r.answeredAt,
    ]),
  )
}

/** 참가자: 한 명당 한 줄. 참여 조건 응답을 담는다. */
export function participantsCsv(responses) {
  const header = [
    'participant_id', 'pilot', 'app_version', 'survey_version', 'stimulus_version', 'status', 'step',
    'started_at', 'completed_at', 'items_answered',
    ...SCREENER.map((q) => `screener_${q.id}`),
    'opinion_intent', 'opinion_reason',
  ]
  return toCsv(
    header,
    responses.map((r) => [
      r.participantId, isPilot(r) ? 1 : 0, r.appVersion ?? '', r.surveyVersion ?? '', r.stimulusVersion ?? '',
      r.status, r.step, r.startedAt, r.completedAt,
      Object.values(r.evaluations ?? {}).filter((ev) => typeof ev?.reference === 'string').length,
      ...SCREENER.map((q) => r.screener?.[q.id]),
      r.opinion?.intent, r.opinion?.reason,
    ]),
  )
}

export function download(filename, content, type = 'text/csv') {
  // 엑셀이 한글을 올바르게 읽도록 BOM을 붙인다.
  const blob = new Blob([type === 'text/csv' ? '﻿' : '', content], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
