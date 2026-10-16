import { useEffect, useRef } from 'react'

// 설문 중 언제든 열어 볼 수 있는 안내.
export default function HelpDialog({ onClose }) {
  const closeRef = useRef(null)

  useEffect(() => {
    const previous = document.activeElement
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [onClose])

  return (
    <div className="sv-overlay" onClick={onClose}>
      <div
        className="sv-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sv-help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sv-dialog-head">
          <h2 id="sv-help-title">설문 안내</h2>
        </div>

        <div className="sv-dialog-body">
          <p>
            이 연구에서는 같은 차량 상황에 대한 AI 답변 세 개를 비교합니다. 어떤 AI가 만든 답변인지는 알려드리지
            않습니다.
          </p>

          <section>
            <h3>한 문항에서 하는 일</h3>
            <ol>
              <li>상황과 질문을 읽습니다.</li>
              <li>답변 A, B, C를 하나씩 읽고 각각 두 가지를 평가합니다.</li>
              <li>세 답변을 비교해, 비슷한 일이 생기면 무엇을 먼저 참고할지 고릅니다.</li>
            </ol>
          </section>

          <section>
            <h3>평가 기준</h3>
            <p>각 답변을 1~7점으로 평가합니다.</p>
            <ul>
              <li>이 답변으로 다음에 할 행동을 판단할 수 있었는가</li>
              <li>차량 정보와 현재 상황을 반영해 안내했는가</li>
            </ul>
          </section>

          <p className="sv-note">
            모든 상황은 가상 상황입니다. 실제 운전 중에는 설문에 참여하거나 화면을 조작하지 마세요.
          </p>

          <button ref={closeRef} type="button" className="sv-btn sv-btn-primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
