import { useEffect, useRef, useState } from 'react'
import './survey.css'
import { STIMULUS_VERSION, SURVEY_VERSION, assignItems } from './questionsBank.js'
import { loadCurrent, saveResponse } from './storageService.js'
import HelpDialog from './components/HelpDialog.jsx'
import { APP_VERSION } from './pilot.js'
import Welcome from './steps/Welcome.jsx'
import Consent from './steps/Consent.jsx'
import Screener from './steps/Screener.jsx'
import Guide from './steps/Guide.jsx'
import Evaluation from './steps/Evaluation.jsx'
import Opinion from './steps/Opinion.jsx'
import Done from './steps/Done.jsx'

// 7단계: 안내 → 동의 → 참여 조건 → 진행 방법 → 답변 비교 → 서비스 의견 → 완료
const STEPS = [
  { id: 'welcome', label: '안내', Component: Welcome },
  { id: 'consent', label: '동의', Component: Consent },
  { id: 'screener', label: '참여 조건', Component: Screener },
  { id: 'guide', label: '진행 방법', Component: Guide },
  { id: 'evaluation', label: '답변 비교', Component: Evaluation },
  { id: 'opinion', label: '서비스 의견', Component: Opinion },
  { id: 'done', label: '완료', Component: Done },
]

const newParticipantId = () =>
  `P-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase()

const newRecord = () => ({
  participantId: newParticipantId(),
  appVersion: APP_VERSION,
  stimulusVersion: STIMULUS_VERSION,
  surveyVersion: SURVEY_VERSION,
  pilot: false,
  status: 'in_progress',
  step: 'welcome',
  startedAt: new Date().toISOString(),
  completedAt: null,
  consent: null,
  screener: {},
  background: {},
  assignment: [],
  evaluations: {},
  drafts: {},
  rests: [],
  post: {},
  opinion: {},
})

/**
 * 이전 형식(15문항 척도, 4문항 선택형)으로 시작한 진행 중 기록을 현재 형식으로 옮긴다.
 * 이전 응답은 legacy에 그대로 보존하고, 현재 형식은 진행 방법 화면부터 시작한다.
 * 이미 끝낸 기록(완료·대상 아님)은 건드리지 않는다.
 */
function migrate(r) {
  if (r.status !== 'in_progress' || r.surveyVersion === SURVEY_VERSION) return r
  const next = { ...r, surveyVersion: SURVEY_VERSION, migratedAt: new Date().toISOString() }
  if (r.step === 'background' || r.step === 'post') next.step = 'guide'
  if (r.assignment?.length > 0) {
    next.legacy = {
      surveyVersion: r.surveyVersion ?? 'long-15q',
      assignment: r.assignment,
      evaluations: r.evaluations,
      drafts: r.drafts,
      rests: r.rests,
      background: r.background,
      post: r.post,
    }
    Object.assign(next, { assignment: [], evaluations: {}, drafts: {}, rests: [], post: {} })
    if (['evaluation', 'post'].includes(r.step)) next.step = 'guide'
  }
  return next
}

export default function SurveyApp() {
  const migrated = useRef(false)
  const [record, setRecord] = useState(() => {
    const saved = loadCurrent()
    if (!saved) return newRecord()
    const moved = migrate(saved)
    migrated.current = moved !== saved
    return moved
  })
  const [helpOpen, setHelpOpen] = useState(false)
  // 임시 테스트용 이동: 화면에서만 바꾸고 저장하지 않는다.
  const [dev, setDev] = useState(null) // { step, item }
  const [devAssign] = useState(() => assignItems())

  useEffect(() => {
    document.title = 'OnDash 설문'
    if (migrated.current) saveResponse(record)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const viewStep = dev?.step ?? record.step
  const stepIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.id === viewStep),
  )
  const { Component } = STEPS[stepIndex]

  /** 응답을 고치고 저장한다. 화면 전환을 기다리게 하지 않으려고 저장 결과는 기다리지 않는다. */
  const commit = (patch) => {
    const next = { ...record, ...patch }
    setRecord(next)
    saveResponse(next)
    return next
  }

  const goTo = (step, patch = {}) => {
    setDev(null)
    commit({ ...patch, step })
    window.scrollTo({ top: 0 })
  }

  const startEvaluation = () => {
    goTo('evaluation', { assignment: record.assignment.length ? record.assignment : assignItems() })
  }

  const devAssignment = record.assignment.length ? record.assignment : devAssign
  let viewRecord = record
  if (dev) {
    viewRecord = { ...record, step: dev.step, assignment: devAssignment }
    if (dev.step === 'evaluation' && dev.item != null) {
      // 선택한 문항을 첫 미응답 문항으로 만들어 상황·질문 소개부터 시작한다. 화면에서만 바꾸고 저장하지 않는다.
      const evaluations = {}
      const drafts = { ...record.drafts }
      devAssignment.forEach((a, i) => {
        if (i < dev.item) evaluations[a.itemId] = record.evaluations[a.itemId] ?? { skipped: true }
        else delete drafts[a.itemId]
      })
      viewRecord = { ...viewRecord, evaluations, drafts }
    }
  }
  // 이동용 임시 값({skipped})이 저장되지 않게 거르고, 문항을 제출하면 이동 상태를 푼다.
  const devCommit = (patch) => {
    if (patch.evaluations) {
      const clean = Object.fromEntries(Object.entries(patch.evaluations).filter(([, v]) => !v?.skipped))
      setDev(null)
      return commit({ ...patch, evaluations: { ...record.evaluations, ...clean } })
    }
    return commit(patch)
  }
  const devItems = devAssignment.length

  const screenedOut = record.status === 'screened_out'

  return (
    <div className="survey">
      <header className="sv-top">
        <span className="sv-top-brand">OnDash 설문</span>
        <div className="sv-top-actions">
          {!screenedOut && (
            <button type="button" className="sv-help-btn" onClick={() => setHelpOpen(true)}>
              설문 안내
            </button>
          )}
        </div>
      </header>
      <div className="sv-progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={stepIndex + 1}>
        <span style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
      </div>

      <nav className="sv-devbar" aria-label="임시 이동">
        <span className="sv-devbar-label">임시 이동</span>
        <div className="sv-devbar-group">
          {STEPS.filter((s) => s.id !== 'evaluation').map((s) => (
            <button key={s.id} type="button" className={`sv-chip${!dev && record.step === s.id ? ' on' : dev?.step === s.id ? ' on' : ''}`} onClick={() => { setDev({ step: s.id }); window.scrollTo({ top: 0 }) }}>{s.label}</button>
          ))}
        </div>
        <div className="sv-devbar-group">
          {Array.from({ length: devItems }, (_, i) => (
            <button key={i} type="button" className={`sv-chip${dev?.step === 'evaluation' && dev.item === i ? ' on' : ''}`} onClick={() => { setDev({ step: 'evaluation', item: i }); window.scrollTo({ top: 0 }) }}>{i + 1}번 문항</button>
          ))}
        </div>
        {dev && <button type="button" className="sv-chip sv-chip-reset" onClick={() => setDev(null)}>이동 해제</button>}
      </nav>

      <main className={`sv-main${record.step === 'evaluation' ? ' sv-main-wide' : ''}`}>
        <Component
          key={`${viewStep}-${dev?.item ?? ''}`}
          record={viewRecord}
          commit={devCommit}
          goTo={goTo}
          startEvaluation={startEvaluation}
        />
      </main>

      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </div>
  )
}
