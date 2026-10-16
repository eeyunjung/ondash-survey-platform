import { useState } from 'react'
import { ITEMS_PER_PARTICIPANT } from '../questionsBank.js'
import { StepFrame } from '../components/fields.jsx'

export default function Guide({ startEvaluation }) {
  const [starting, setStarting] = useState(false)

  return (
    <StepFrame
      title="이렇게 진행됩니다"
      lead={
        <>
          각 상황에서 <strong>운전자의 질문</strong>을 먼저 읽어 주세요.
        </>
      }
      footer={
        <button
          type="button"
          className="sv-btn sv-btn-primary"
          disabled={starting}
          onClick={() => {
            setStarting(true)
            startEvaluation()
          }}
        >
          시작하기
        </button>
      }
    >
      <section className="sv-guide">
        <ol className="sv-bullets sv-numbered">
          <li>
            <strong>상황과 질문을 읽습니다.</strong>
          </li>
          <li>
            <strong>AI 답변 A, B, C를 하나씩 읽고, 각각 두 가지를 평가합니다.</strong>
          </li>
          <li>
            <strong>세 답변을 모두 본 뒤, 비슷한 일이 생기면 무엇을 먼저 참고할지 고르고 짧게 의견을 적습니다.</strong>
          </li>
        </ol>
        <p className="sv-note">어느 AI가 만든 답변인지는 알려드리지 않습니다.</p>
      </section>

      <p className="sv-note">
        총 {ITEMS_PER_PARTICIPANT}개의 상황입니다. 차량이 <strong>주차되어 있는지, 주행 중인지</strong>에 따라 적절한
        답변이 달라질 수 있으니 각 상황을 먼저 확인해 주세요.
      </p>
    </StepFrame>
  )
}
