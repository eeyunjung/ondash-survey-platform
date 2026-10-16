import { useState } from 'react'
import { SCREENER, isAnswered, isEligible } from '../questionsBank.js'
import { Question, StepFrame } from '../components/fields.jsx'

export default function Screener({ record, commit, goTo }) {
  const [answers, setAnswers] = useState(record.screener)
  const [closed, setClosed] = useState(false)

  if (record.status === 'screened_out') {
    return (
      <StepFrame
        title="참여해 주셔서 감사합니다"
        lead="이번 연구는 현재 유효한 운전면허가 있는 분을 대상으로 합니다."
        footer={
          <button
            type="button"
            className="sv-btn"
            onClick={() => {
              // 브라우저가 스크립트로 연 창이 아니면 닫히지 않으므로, 닫히지 않는 경우를 대비해 안내를 바꾼다.
              window.close()
              setClosed(true)
            }}
          >
            종료하기
          </button>
        }
      >
        {closed && <p className="sv-note">참여해 주셔서 감사합니다. 이제 창을 닫으셔도 됩니다.</p>}
      </StepFrame>
    )
  }

  const complete = SCREENER.every((q) => isAnswered(q, answers[q.id]))
  const submit = () => {
    if (isEligible(answers)) goTo('guide', { screener: answers })
    else commit({ screener: answers, status: 'screened_out', completedAt: new Date().toISOString() })
  }

  return (
    <StepFrame
      title="참여 조건 확인"
      lead="세 가지만 여쭙겠습니다."
      footer={
        <button type="button" className="sv-btn sv-btn-primary" disabled={!complete} onClick={submit}>
          다음
        </button>
      }
    >
      {SCREENER.map((q, i) => (
        <Question
          key={q.id}
          name={q.id}
          question={{ ...q, label: `${i + 1}. ${q.label}` }}
          value={answers[q.id]}
          onChange={(v) => setAnswers({ ...answers, [q.id]: v })}
        />
      ))}
    </StepFrame>
  )
}
