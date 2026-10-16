import { StepFrame } from '../components/fields.jsx'

export default function Done({ record }) {
  return (
    <StepFrame
      title="설문이 종료되었습니다"
      lead="참여해 주셔서 감사합니다. 응답은 차량 상황별 안내 답변을 비교하는 연구에 사용됩니다."
    >
      <div className="sv-code">
        <span>참가자 번호</span>
        <strong>{record.participantId}</strong>
      </div>
      <p className="sv-note">연구 담당자가 참가자 번호를 요청하는 경우 위 번호를 알려 주세요.</p>
      <p className="sv-note">이제 창을 닫으셔도 됩니다.</p>
    </StepFrame>
  )
}
