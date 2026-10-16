import { useEffect, useRef, useState } from 'react'
import {
  IMPORTANT_QUESTION,
  OTHER_HINT,
  POSITIONS,
  RATINGS,
  REFERENCES,
  REFERENCE_OTHER,
  REFERENCE_QUESTION,
  getItem,
  itemView,
} from '../questionsBank.js'
import { BlindAnswer, Glossary, Rich, Scale } from '../components/fields.jsx'

// 문항 하나를 장면으로 나누어 한 번에 한 가지 일만 하게 한다.
// 상황 읽기 → 답변 A 읽고 평가 → 답변 B → 답변 C → 참고할 것 고르기 · 가장 중요하게 본 점
const ORDER = ['intro', 'A', 'B', 'C', 'final']

const emptyDraft = () => ({
  ratings: { A: {}, B: {}, C: {} },
  reference: null,
  referenceOther: '',
  important: '',
})
const isRated = (ratings) => RATINGS.every((r) => ratings?.[r.id])

// 중간에 닫았다면 아직 평가하지 않은 답변부터 이어 간다.
function initialPhase(draft) {
  if (!draft) return 'intro'
  const open = POSITIONS.find((p) => !isRated(draft.ratings?.[p]))
  if (!open) return 'final'
  return open === 'A' && Object.keys(draft.ratings?.A ?? {}).length === 0 ? 'intro' : open
}

export default function Evaluation({ record, commit, goTo }) {
  const { assignment, evaluations } = record
  const firstOpen = assignment.findIndex((a) => !evaluations[a.itemId])
  // 항상 첫 미응답 문항부터 이어 간다.
  const index = firstOpen === -1 ? assignment.length - 1 : firstOpen

  // 문항이 바뀌면 key가 달라져 입력 상태가 새로 시작된다.
  return (
    <ItemEvaluation key={assignment[index].itemId} index={index} record={record} commit={commit} goTo={goTo} />
  )
}

function ItemEvaluation({ index, record, commit, goTo }) {
  const { assignment, evaluations } = record
  const { itemId, order } = assignment[index]
  const item = getItem(itemId)
  const view = itemView(item)
  const isLast = index === assignment.length - 1

  const savedDraft = record.drafts?.[itemId]
  const [draft, setDraft] = useState(() => ({ ...emptyDraft(), ...savedDraft }))
  const [phase, setPhase] = useState(() => initialPhase(savedDraft))
  const [viewing, setViewing] = useState('A')
  const [showMissing, setShowMissing] = useState(false)
  const shownAt = useRef(Date.now())

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])

  // 분석용 원문(text)은 그대로 두고, 줄바꿈·목록이 보이도록 만든 표시본(display)이 있으면 그것을 보여 준다.
  const answerText = (position) => {
    const a = item.answers[order[POSITIONS.indexOf(position)]]
    return a.display ?? a.text
  }

  const go = (next) => {
    setPhase(next)
    setShowMissing(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // 답변을 하나 평가할 때마다 저장해 두어, 중간에 닫아도 그 지점부터 이어 갈 수 있다.
    commit({ drafts: { ...record.drafts, [itemId]: draft } })
  }

  const rate = (position, id, value) =>
    setDraft((d) => ({ ...d, ratings: { ...d.ratings, [position]: { ...d.ratings[position], [id]: value } } }))

  const referenceDone =
    draft.reference && (draft.reference !== REFERENCE_OTHER || draft.referenceOther.trim().length > 0)
  const importantDone = draft.important.trim().length > 0

  const submit = () => {
    if (!referenceDone || !importantDone) {
      setShowMissing(true)
      return
    }
    const saved = {
      ratings: draft.ratings,
      reference: draft.reference,
      referenceOther: draft.reference === REFERENCE_OTHER ? draft.referenceOther.trim() : '',
      important: draft.important.trim(),
      order,
      presentedIndex: index,
      durationSec: Math.round((Date.now() - shownAt.current) / 1000),
      answeredAt: new Date().toISOString(),
    }
    const { [itemId]: _done, ...drafts } = record.drafts ?? {}
    const nextEvaluations = { ...evaluations, [itemId]: saved }
    if (isLast) {
      goTo('opinion', { evaluations: nextEvaluations, drafts })
    }
    else commit({ evaluations: nextEvaluations, drafts })
  }

  const phaseIndex = ORDER.indexOf(phase)
  const previous = ORDER[phaseIndex - 1]

  const count = (
    <header className="sv-eval-head">
      <p className="sv-eval-count">
        문항 {index + 1} / {assignment.length}
      </p>
    </header>
  )

  // 답변 장면 위쪽에 두는 짧은 상기: 상황 태그와 질문
  const recap = (
    <p className="sv-recap">
      {view.tag && (
        <span>
          <em className="sv-chip">{view.tag}</em>
        </span>
      )}
      <strong>{view.question}</strong>
      <Glossary items={view.glossary} />
    </p>
  )

  // ── 1. 상황과 질문 읽기
  if (phase === 'intro') {
    return (
      <section className="sv-eval">
        {count}
        <div className="sv-stage" key="intro">
          <div className="sv-intro">
            <div className="sv-prompt sv-rise">
              <div className="sv-prompt-situation">
                <span className="sv-prompt-label">
                  상황{view.tag && <em className="sv-chip">{view.tag}</em>}
                </span>
                <p>
                  <Rich text={view.description} />
                </p>
                <Glossary items={view.glossary} />
              </div>
              <p className="sv-prompt-question">
                <span>운전자의 질문</span>
                {view.question}
              </p>
            </div>

            <div className="sv-brief sv-rise sv-delay-2">
              <p>같은 질문에 AI 세 개가 답했습니다. 답변을 하나씩 읽고 평가해 주세요.</p>
            </div>

            <div className="sv-actions sv-rise sv-delay-3">
              <button type="button" className="sv-btn sv-btn-primary" onClick={() => go('A')}>
                답변 A 읽기
              </button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // ── 2~4. 답변 하나를 읽고 두 문항 평가
  if (POSITIONS.includes(phase)) {
    const rated = isRated(draft.ratings[phase])
    const next = ORDER[phaseIndex + 1]
    const nextLabel = next === 'final' ? '다음' : `답변 ${next} 읽기`
    return (
      <section className="sv-eval">
        {count}
        <div className="sv-stage" key={phase}>
          {recap}
          <div className="sv-split">
            <article className="sv-pane sv-pane-answer sv-rise">
              <h2>답변 {phase}</h2>
              <BlindAnswer text={answerText(phase)} />
            </article>

            <aside className="sv-pane sv-pane-rate sv-rise sv-delay-2">
              <h2>이 답변을 평가해 주세요</h2>
              <div className="sv-ratings">
                {RATINGS.map((r) => (
                  <Scale
                    key={r.id}
                    name={`${itemId}-${phase}-${r.id}`}
                    label={r.statement}
                    value={draft.ratings[phase][r.id]}
                    onChange={(v) => rate(phase, r.id, v)}
                  />
                ))}
              </div>
              <div className="sv-actions">
                <button type="button" className="sv-btn" onClick={() => go(previous)}>
                  이전
                </button>
                <button type="button" className="sv-btn sv-btn-primary" disabled={!rated} onClick={() => go(next)}>
                  {nextLabel}
                </button>
              </div>
            </aside>
          </div>
        </div>
      </section>
    )
  }

  // ── 5. 비슷한 일이 생기면 무엇을 먼저 참고할지, 가장 중요하게 본 점
  return (
    <section className="sv-eval">
      {count}
      <div className="sv-stage" key="final">
        {recap}
        <div className="sv-split">
          <article className="sv-pane sv-pane-answer sv-rise">
            <div className="sv-peek" role="tablist" aria-label="답변 다시 보기">
              {POSITIONS.map((p) => (
                <button key={p} type="button" role="tab" aria-selected={viewing === p} onClick={() => setViewing(p)}>
                  답변 {p}
                </button>
              ))}
            </div>
            <div className="sv-peek-body" key={viewing}>
              <BlindAnswer text={answerText(viewing)} />
            </div>
          </article>

          <aside className="sv-pane sv-pane-rate sv-rise sv-delay-2">
            <fieldset className="sv-field">
              <legend className="sv-field-label">{REFERENCE_QUESTION}</legend>
              <div className="sv-options">
                {REFERENCES.map((c) => (
                  <label key={c.value} className="sv-option">
                    <input
                      type="radio"
                      name={`${itemId}-reference`}
                      checked={draft.reference === c.value}
                      onChange={() => {
                        setDraft((d) => ({ ...d, reference: c.value }))
                        setShowMissing(false)
                      }}
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
              {draft.reference === REFERENCE_OTHER && (
                <label className="sv-field">
                  <span className="sv-field-hint">{OTHER_HINT}</span>
                  <textarea
                    rows={2}
                    maxLength={200}
                    value={draft.referenceOther}
                    onChange={(e) => setDraft((d) => ({ ...d, referenceOther: e.target.value }))}
                  />
                </label>
              )}
            </fieldset>

            <label className="sv-field">
              <span className="sv-field-label">{IMPORTANT_QUESTION}</span>
              <textarea
                rows={3}
                value={draft.important}
                onChange={(e) => setDraft((d) => ({ ...d, important: e.target.value }))}
              />
            </label>

            {showMissing && (
              <p className="sv-missing" role="alert">
                {!referenceDone
                  ? draft.reference === REFERENCE_OTHER
                    ? '참고할 것을 적어 주세요.'
                    : '하나를 골라 주세요.'
                  : '가장 중요하게 본 점을 적어 주세요.'}
              </p>
            )}

            <div className="sv-actions">
              <button type="button" className="sv-btn" onClick={() => go('C')}>
                이전
              </button>
              <button type="button" className="sv-btn sv-btn-primary" onClick={submit}>
                {isLast ? '마치기' : '다음 문항'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
