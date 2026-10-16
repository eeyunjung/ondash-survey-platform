import { ITEMS_PER_PARTICIPANT } from '../questionsBank.js'
import { StepFrame } from '../components/fields.jsx'

export default function Welcome({ goTo }) {
  return (
    <StepFrame
      title="차량 상황 질문에 대한 AI 답변 평가"
      lead="차량과 관련된 여러 상황에서 서로 다른 AI가 만든 답변을 읽고 평가하는 연구입니다."
      footer={
        <button type="button" className="sv-btn sv-btn-primary" onClick={() => goTo('consent')}>
          시작하기
        </button>
      }
    >
      <ul className="sv-bullets">
        <li>총 {ITEMS_PER_PARTICIPANT}개의 상황이 제시됩니다.</li>
        <li>각 상황에서 AI 답변 3개를 읽고 평가합니다.</li>
        <li>약 5분이 소요됩니다.</li>
        <li>모든 상황은 가상 상황이며, 실제로 운전하거나 차량을 조작하지 않습니다.</li>
        <li>정답을 맞히는 시험이 아닙니다. 운전자의 입장에서 판단해 주세요.</li>
      </ul>
    </StepFrame>
  )
}
