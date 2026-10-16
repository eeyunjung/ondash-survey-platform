import { useState } from 'react'
import { StepFrame } from '../components/fields.jsx'

const TERMS = [
  ['연구 목적', '차량과 관련된 상황에서 AI의 답변이 운전자에게 어떻게 받아들여지는지 비교합니다.'],
  ['수집 정보', '연령대와 성별, 운전 경험 여부, AI 답변에 대한 선택과 의견, 응답 시간 정보를 수집합니다.'],
  ['개인정보', '이름, 연락처, 차량번호 등 개인을 식별할 수 있는 정보는 수집하지 않습니다.'],
  ['자료 이용', '응답은 참가자 번호로 저장되며 연구 목적으로만 사용됩니다.'],
  ['참여와 중단', '참여는 자발적이며 언제든 중단할 수 있습니다. 중단에 따른 불이익은 없습니다.'],
]

export default function Consent({ goTo }) {
  const [understood, setUnderstood] = useState(false)
  const [agreed, setAgreed] = useState(false)

  return (
    <StepFrame
      title="연구 참여 동의"
      lead="아래 내용을 읽고 동의하시면 다음으로 진행해 주세요."
      footer={
        <button
          type="button"
          className="sv-btn sv-btn-primary"
          disabled={!understood || !agreed}
          onClick={() => goTo('screener', { consent: { agreed: true, at: new Date().toISOString() } })}
        >
          동의하고 계속
        </button>
      }
    >
      <dl className="sv-terms">
        {TERMS.map(([term, text]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
      <div className="sv-options">
        <label className="sv-option">
          <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
          <span>위 내용을 읽고 이해했습니다.</span>
        </label>
        <label className="sv-option">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>연구 참여와 응답 수집에 동의합니다.</span>
        </label>
      </div>
    </StepFrame>
  )
}
