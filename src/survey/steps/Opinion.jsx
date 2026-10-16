import { useState } from 'react'
import { OPINION, OPINION_ANCHORS, POSITIONS, getItem, itemView } from '../questionsBank.js'
import { BlindAnswer, Scale, StepFrame } from '../components/fields.jsx'

// 상황마다 서비스(OnDash)의 답변이 놓였던 자리와 답변 내용.
function ondashAnswers(assignment) {
  return assignment
    .map((a, i) => {
      const item = getItem(a.itemId)
      if (!item) return null
      const position = POSITIONS[a.order.indexOf('ondash')]
      const answer = item.answers.ondash
      return {
        n: i + 1,
        position,
        question: itemView(item).question,
        text: answer.display ?? answer.text,
      }
    })
    .filter(Boolean)
}

/** 접어 둔 목록. 한 번에 하나만 펼쳐져 화면이 길어지지 않는다. */
function Recall({ rows }) {
  const [open, setOpen] = useState(null)
  return (
    <div className="sv-recall">
      {rows.map((r) => (
        <div key={r.n} className="sv-recall-row" data-open={open === r.n ? 'true' : undefined}>
          <button
            type="button"
            className="sv-recall-head"
            aria-expanded={open === r.n}
            onClick={() => setOpen(open === r.n ? null : r.n)}
          >
            <span className="sv-recall-no">상황 {r.n}</span>
            <span className="sv-recall-q">{r.question}</span>
            <span className="sv-recall-pos">답변 {r.position}</span>
          </button>
          {open === r.n && (
            <div className="sv-recall-body">
              <BlindAnswer text={r.text} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function Opinion({ record, goTo }) {
  const saved = record.opinion ?? {}
  const [intent, setIntent] = useState(saved.intent ?? null)
  const [reason, setReason] = useState(saved.reason ?? '')

  const complete = intent !== null && reason.trim().length > 0

  return (
    <StepFrame
      title={`${OPINION.title} (마지막 질문)`}
      footer={
        <button
          type="button"
          className="sv-btn sv-btn-primary"
          disabled={!complete}
          onClick={() =>
            goTo('done', {
              opinion: { intent, reason: reason.trim() },
              status: 'completed',
              completedAt: new Date().toISOString(),
            })
          }
        >
          제출하기
        </button>
      }
    >
      <p className="sv-note">
        앞서 본 각 상황의 답변 중 하나는,{' '}
        <strong>차에 대해 질문하면 차량 설명서 등에서 관련 내용을 찾아 답해 주는 챗봇 서비스</strong>에서 제공한
        답변입니다. 사용자가 입력한 차종과 상황에 맞춰 차량 기능, 설정, 경고, 충전 관련 정보를
        안내합니다. 아래에서 상황별로 해당 답변을 다시 볼 수 있습니다.
      </p>
      <Recall rows={ondashAnswers(record.assignment)} />
      <p className="sv-note">지금까지 본 답변과 설명을 바탕으로 응답해 주세요.</p>

      <div className="sv-field">
        <Scale
          name="opinion-intent"
          label={`1. ${OPINION.intentLabel}`}
          value={typeof intent === 'number' ? intent : undefined}
          onChange={setIntent}
          anchorLabels={OPINION_ANCHORS}
          hint={OPINION.intentHint}
          asQuestion
        />
      </div>

      <label className="sv-field">
        <span className="sv-field-label">2. {OPINION.reasonLabel(intent)}</span>
        <span className="sv-field-hint">
          {OPINION.reasonHint.map((line) => (
            <span key={line} className="sv-hint-line">
              {line}
            </span>
          ))}
        </span>
        <textarea rows={5} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
    </StepFrame>
  )
}
