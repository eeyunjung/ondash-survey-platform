import { useEffect, useMemo, useState } from 'react'
import '../survey.css'
import { ITEMS_PER_PARTICIPANT, OPINION, RATINGS, SYSTEMS, SYSTEM_NAMES } from '../questionsBank.js'
import { listResponses } from '../storageService.js'
import { countByStatus, countLegacy, flatten, summarizeByItem, summarizeRatings, summarizeReference } from './stats.js'
import { download, itemsCsv, participantsCsv, ratingsCsv } from './csv.js'
import { isPilot } from '../pilot.js'
import benchmark from '../data/benchmark.json'

const STATUS_LABEL = { completed: '완료', in_progress: '진행 중', screened_out: '대상 아님' }
const REMOTE_LABEL = {
  ok: 'Firestore와 이 기기의 응답을 합쳐 표시합니다.',
  off: 'Firebase 설정이 없어 이 기기(localStorage)에 저장된 응답만 표시합니다.',
  error: 'Firestore를 읽지 못해 이 기기에 저장된 응답만 표시합니다.',
}

const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : '–')
const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–'
const stamp = () => new Date().toISOString().slice(0, 10)

const REF_LABEL = {
  ondash: 'OnDash',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  depends: '상황에 따라 다름',
  other: '기타',
}

const fmt = (value, digits = 2) => (value === null || value === undefined ? '–' : value.toFixed(digits))

function SystemTable({ ratings, reference }) {
  return (
    <div className="sv-table-wrap">
      <table className="sv-table">
        <thead>
          <tr>
            <th scope="col">시스템</th>
            <th scope="col" className="num">평가 수</th>
            {RATINGS.map((x) => (
              <th scope="col" className="num" key={x.id}>
                {x.id} {x.research}
              </th>
            ))}
            <th scope="col" className="num">먼저 참고하겠다</th>
          </tr>
        </thead>
        <tbody>
          {SYSTEMS.map((system) => (
            <tr key={system}>
              <th scope="row">{SYSTEM_NAMES[system]}</th>
              <td className="num">{ratings[system].n}</td>
              {RATINGS.map((x) => (
                <td className="num" key={x.id}>
                  {fmt(ratings[system].scales[x.id].mean)}
                  <span className="sv-sd">±{fmt(ratings[system].scales[x.id].sd)}</span>
                </td>
              ))}
              <td className="num">
                {reference.counts[system]}
                <span className="sv-sd">{pct(reference.counts[system], reference.n)}</span>
              </td>
            </tr>
          ))}
          {['depends', 'other'].map((o) => (
            <tr key={o}>
              <th scope="row">{REF_LABEL[o]}</th>
              <td className="num" colSpan={RATINGS.length + 1} />
              <td className="num">
                {reference.counts[o]}
                <span className="sv-sd">{pct(reference.counts[o], reference.n)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 알약으로 강조할 문항: 해당 문항에서 점수(R1·R2 평균)가 가장 높은 시스템과 그 점수를 보여 준다.
const PILL_ITEMS = ['Q12', 'Q04', 'Q13']

function topSystem(item) {
  const scored = SYSTEMS.map((system) => {
    const v = RATINGS.map((x) => item.ratings[system].scales[x.id].mean).filter((m) => m !== null && m !== undefined)
    return { system, score: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }
  }).filter((x) => x.score !== null)
  return scored.sort((a, b) => b.score - a.score)[0] ?? null
}

function ItemTable({ items }) {
  return (
    <div className="sv-table-wrap">
      <table className="sv-table sv-table-dense">
        <thead>
          <tr>
            <th scope="col" rowSpan={2}>문항</th>
            <th scope="col" rowSpan={2} className="num">응답 수</th>
            {SYSTEMS.map((system) => (
              <th scope="colgroup" colSpan={RATINGS.length + 1} key={system} className="group">
                {SYSTEM_NAMES[system]}
              </th>
            ))}
            <th scope="col" rowSpan={2} className="num">비슷함·기타</th>
          </tr>
          <tr>
            {SYSTEMS.map((system) => [
              ...RATINGS.map((x, i) => (
                <th scope="col" className={`num${i === 0 ? ' group' : ''}`} key={system + x.id}>
                  {x.id}
                </th>
              )),
              <th scope="col" className="num" key={system + 'ref'}>
                참고
              </th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.itemId}>
              <th scope="row">
                {item.itemId}
                <span className="sv-sub">{item.focus}</span>
                {PILL_ITEMS.includes(item.itemId) && topSystem(item) && (
                  <span className="sv-top-pill">
                    {SYSTEM_NAMES[topSystem(item).system]} 최고 {topSystem(item).score.toFixed(2)}
                  </span>
                )}
              </th>
              <td className="num">{item.n}</td>
              {SYSTEMS.map((system) => [
                ...RATINGS.map((x, i) => (
                  <td className={`num${i === 0 ? ' group' : ''}`} key={system + x.id}>
                    {fmt(item.ratings[system].scales[x.id].mean, 1)}
                  </td>
                )),
                <td className="num" key={system + 'ref'}>
                  {item.counts[system]}
                </td>,
              ])}
              <td className="num group">
                {item.counts.depends} · {item.counts.other}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Texts({ items }) {
  const rows = items.filter((item) => item.important.length > 0 || item.others.length > 0)
  if (rows.length === 0) return <p className="sv-empty">적힌 의견이 없습니다.</p>
  return (
    <div className="sv-reasons">
      {rows.map((item) => (
        <div key={item.itemId}>
          <h3>
            {item.itemId} <span className="sv-sub">{item.focus}</span>
            {PILL_ITEMS.includes(item.itemId) && topSystem(item) && (
              <span className="sv-top-pill" style={{ marginLeft: 8 }}>
                {SYSTEM_NAMES[topSystem(item).system]} 최고 {topSystem(item).score.toFixed(2)}
              </span>
            )}
          </h3>
          {item.others.length > 0 && (
            <>
              <p className="sv-note">기타로 적은 참고처</p>
              <ul>
                {item.others.map((o) => (
                  <li key={o.participantId}>{o.text}</li>
                ))}
              </ul>
            </>
          )}
          {item.important.length > 0 && (
            <>
              <p className="sv-note">가장 중요하게 본 점 · 이해하기 어렵거나 빠졌다고 느낀 내용</p>
              <ul>
                {item.important.map((o) => (
                  <li key={o.participantId}>
                    <b>{REF_LABEL[o.system] ?? o.system}</b> {o.text}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function OpinionSummary({ responses }) {
  const list = responses.map((r) => ({ id: r.participantId, ...(r.opinion ?? {}) })).filter((o) => o.intent !== undefined)
  if (list.length === 0) return <p className="sv-empty">아직 서비스 의견 응답이 없습니다.</p>
  const nums = list.map((o) => o.intent).filter((v) => typeof v === 'number')
  const mean = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
  return (
    <>
      <p className="sv-note">
        {OPINION.intentLabel}
        <br />
        1~7점 평균 {mean === null ? '–' : mean.toFixed(2)} (n={nums.length})
      </p>
      <div className="sv-reasons">
        <div>
          <h3>이유와 활용할 상황</h3>
          <ul>
            {list.filter((o) => o.reason).map((o) => <li key={o.id}><b>{typeof o.intent === 'number' ? `${o.intent}점` : '선택지'}</b> {o.reason}</li>)}
          </ul>
        </div>
      </div>
    </>
  )
}

// 엑셀(시트)에 입력해 둔 세 시스템의 원문 답변. 설문 5문항 외 나머지 문항도 모두 볼 수 있다.
const SURVEY_IDS = ['Q02', 'Q04', 'Q05', 'Q12', 'Q13']
const ANSWER_ORDER = ['ondash', 'chatgpt', 'gemini']

function AnswerLibrary() {
  const [id, setId] = useState(SURVEY_IDS[0])
  const item = benchmark.items.find((x) => x.id === id)
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {benchmark.items.map((x) => (
          <button
            key={x.id}
            type="button"
            className={`sv-btn ${x.id === id ? 'sv-btn-primary' : 'sv-btn-ghost'}`}
            onClick={() => setId(x.id)}
          >
            {x.id}
            {SURVEY_IDS.includes(x.id) ? ' ★' : ''}
          </button>
        ))}
      </div>
      <p className="sv-note">★ 표시는 설문에 쓰인 5문항입니다.</p>
      <h3 style={{ margin: '8px 0 4px' }}>
        {item.id} · {item.categoryKo} · {item.focus}
      </h3>
      <p><b>상황</b> {item.situation}</p>
      <p><b>질문</b> {item.question}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, marginTop: 12 }}>
        {ANSWER_ORDER.map((sys) => (
          <div key={sys} style={{ border: '1px solid #ddd', borderRadius: 10, padding: 12, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>
              {SYSTEM_NAMES[sys]}
              {item.answers[sys]?.model ? <span className="sv-sd"> {item.answers[sys].model}</span> : null}
            </h4>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>
              {item.answers[sys]?.text || '(답변 없음)'}
            </div>
          </div>
        ))}
      </div>
      {item.expected && <p className="sv-note" style={{ marginTop: 12 }}><b>기대 답변</b> {item.expected}</p>}
    </div>
  )
}

export default function SurveyAdmin() {
  const [state, setState] = useState({ loading: true, responses: [], remote: 'off', remoteError: null })
  const [completedOnly, setCompletedOnly] = useState(true)
  const [excludePilot, setExcludePilot] = useState(false)

  const load = async () => {
    setState((s) => ({ ...s, loading: true }))
    const result = await listResponses()
    setState({ loading: false, ...result })
  }

  useEffect(() => {
    document.title = 'OnDash 설문 관리'
    load()
  }, [])

  const responses = useMemo(
    () => (excludePilot ? state.responses.filter((r) => !isPilot(r)) : state.responses),
    [state.responses, excludePilot],
  )
  const counts = useMemo(() => countByStatus(responses), [responses])
  const legacy = useMemo(() => countLegacy(responses), [responses])
  const { ratingRows, itemRows } = useMemo(
    () => flatten(responses.filter((r) => (completedOnly ? r.status === 'completed' : r.status !== 'screened_out'))),
    [responses, completedOnly],
  )
  const ratings = useMemo(() => summarizeRatings(ratingRows), [ratingRows])
  const reference = useMemo(() => summarizeReference(itemRows), [itemRows])
  const items = useMemo(() => summarizeByItem(ratingRows, itemRows), [ratingRows, itemRows])
  const rows = itemRows

  const tiles = [
    ['전체 응답', counts.total],
    ['완료', counts.completed],
    ['진행 중', counts.in_progress],
    ['대상 아님', counts.screened_out],
  ]

  return (
    <div className="survey sv-admin">
      <header className="sv-admin-head">
        <div>
          <h1>설문 관리</h1>
          <p>{state.loading ? '응답을 불러오는 중입니다.' : REMOTE_LABEL[state.remote]}</p>
          {state.remoteError && <p className="sv-missing">{state.remoteError}</p>}
        </div>
        <div className="sv-admin-actions">
          <button type="button" className="sv-btn" onClick={load} disabled={state.loading}>
            새로고침
          </button>
          <button
            type="button"
            className="sv-btn"
            disabled={rows.length === 0}
            onClick={() => download(`ondash_ratings_${stamp()}.csv`, ratingsCsv(ratingRows))}
          >
            답변 평가 CSV
          </button>
          <button
            type="button"
            className="sv-btn"
            disabled={rows.length === 0}
            onClick={() => download(`ondash_items_${stamp()}.csv`, itemsCsv(itemRows))}
          >
            상황별 응답 CSV
          </button>
          <button
            type="button"
            className="sv-btn"
            disabled={responses.length === 0}
            onClick={() => download(`ondash_participants_${stamp()}.csv`, participantsCsv(responses))}
          >
            참가자 CSV
          </button>
          <button
            type="button"
            className="sv-btn"
            disabled={responses.length === 0}
            onClick={() =>
              download(`ondash_raw_${stamp()}.json`, JSON.stringify(responses, null, 2), 'application/json')
            }
          >
            원본 JSON
          </button>
        </div>
      </header>

      <dl className="sv-tiles">
        {tiles.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <section className="sv-admin-section">
        <div className="sv-admin-section-head">
          <h2>시스템별 평가</h2>
          <label className="sv-option sv-option-inline">
            <input type="checkbox" checked={completedOnly} onChange={(e) => setCompletedOnly(e.target.checked)} />
            <span>완료한 응답만</span>
          </label>
          <label className="sv-option sv-option-inline">
            <input type="checkbox" checked={excludePilot} onChange={(e) => setExcludePilot(e.target.checked)} />
            <span>파일럿 제외</span>
          </label>
        </div>
        <p className="sv-note">
          1~7점 평균 ± 표준편차. 두 항목은 합산하지 않습니다. 참가자의 평가와 선호이며 정답이나 안전성 판정이 아닙니다.
          정확성·안전성·근거는 공식 매뉴얼과 채점 기준으로 따로 확인합니다.
          {legacy > 0 && ` 이전 형식의 응답 ${legacy}건은 질문이 달라 집계에서 제외했습니다(원본 JSON에는 있습니다).`}
        </p>
        {rows.length === 0 ? (
          <p className="sv-empty">아직 집계할 응답이 없습니다.</p>
        ) : (
          <SystemTable ratings={ratings} reference={reference} />
        )}
      </section>

      {rows.length > 0 && (
        <section className="sv-admin-section">
          <h2>문항별 평균과 선택</h2>
          <ItemTable items={items} />
        </section>
      )}

      {rows.length > 0 && (
        <section className="sv-admin-section">
          <h2>자유 응답</h2>
          <Texts items={items} />
        </section>
      )}

      <section className="sv-admin-section">
        <h2>서비스에 대한 의견</h2>
        <OpinionSummary responses={responses.filter((r) => (completedOnly ? r.status === 'completed' : r.status !== 'screened_out'))} />
      </section>

      <section className="sv-admin-section">
        <h2>엑셀 원문 답변 (ChatGPT · Gemini · OnDash)</h2>
        <AnswerLibrary />
      </section>

      <section className="sv-admin-section">
        <h2>참가자</h2>
        {responses.length === 0 ? (
          <p className="sv-empty">아직 응답이 없습니다.</p>
        ) : (
          <div className="sv-table-wrap">
            <table className="sv-table">
              <thead>
                <tr>
                  <th scope="col">참가자 번호</th>
                  <th scope="col">상태</th>
                  <th scope="col" className="num">답한 문항</th>
                  <th scope="col">시작</th>
                  <th scope="col">완료</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <tr key={r.participantId}>
                    <th scope="row">
                      {r.participantId}
                      {isPilot(r) && <span className="sv-sub">파일럿</span>}
                    </th>
                    <td>{STATUS_LABEL[r.status] ?? r.status}</td>
                    <td className="num">
                      {Object.values(r.evaluations ?? {}).filter((ev) => typeof ev?.reference === 'string').length} / {ITEMS_PER_PARTICIPANT}
                    </td>
                    <td>{formatDate(r.startedAt)}</td>
                    <td>{r.status === 'completed' ? formatDate(r.completedAt) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
