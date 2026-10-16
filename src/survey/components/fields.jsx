import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkCjkFriendly from 'remark-cjk-friendly'
import { SCALE_ANCHORS, SCALE_POINTS } from '../questionsBank.js'

export function Scale({ name, label, hint, value, onChange, anchors = [1, 4, 7], anchorLabels = SCALE_ANCHORS, asQuestion = false }) {
  return (
    <fieldset className={`sv-scale${asQuestion ? ' sv-scale-question' : ''}`}>
      <legend>{label}</legend>
      {hint && <p className="sv-field-hint sv-scale-hint">{hint}</p>}
      <div className="sv-scale-points">
        {SCALE_POINTS.map((point) => (
          <label key={point} className="sv-point">
            <input
              type="radio"
              name={name}
              aria-label={anchorLabels[point] ? `${point}점 ${anchorLabels[point]}` : `${point}점`}
              checked={value === point}
              onChange={() => onChange(point)}
            />
            <span>{point}</span>
          </label>
        ))}
      </div>
      <div className="sv-scale-anchors" aria-hidden="true">
        {anchors.map((point) => (
          <span key={point} data-point={point}>
            <b>{point}</b> {anchorLabels[point]}
          </span>
        ))}
      </div>
    </fieldset>
  )
}

/** **굵게** 표시를 굵은 글씨로 바꿔 그린다. */
export function Rich({ text }) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) => (part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part))
}

/** 낯선 용어의 한 줄 설명. 마우스를 올리지 않아도 보이도록 항상 펼쳐 둔다. */
export function Glossary({ items }) {
  if (!items?.length) return null
  return (
    <span className="sv-gloss-list">
      {items.map((g) => (
        <span className="sv-gloss" key={g.term}>
          <span className="sv-gloss-mark" aria-hidden="true">
            ?
          </span>
          <span>
            <b>{g.term}</b>: {g.text}
          </span>
        </span>
      ))}
    </span>
  )
}

export function Question({ question, value, onChange, name }) {
  const q = question
  if (q.scale) {
    return <Scale name={name} label={q.label} value={value} onChange={onChange} anchors={[1, 7]} />
  }

  if (q.text) {
    return (
      <label className="sv-field">
        <span className="sv-field-label">{q.label}</span>
        {q.hint && <span className="sv-field-hint">{q.hint}</span>}
        <textarea rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      </label>
    )
  }

  const selected = q.multiple ? (value ?? []) : value
  const toggle = (option) => {
    if (!q.multiple) return onChange(option)
    if (option === q.exclusive) return onChange(selected.includes(option) ? [] : [option])
    const rest = selected.filter((o) => o !== q.exclusive)
    onChange(rest.includes(option) ? rest.filter((o) => o !== option) : [...rest, option])
  }

  return (
    <fieldset className="sv-field">
      <legend className="sv-field-label">{q.label}</legend>
      {q.hint && <p className="sv-field-hint">{q.hint}</p>}
      <div className="sv-options">
        {q.options.map((option) => (
          <label key={option} className="sv-option">
            <input
              type={q.multiple ? 'checkbox' : 'radio'}
              name={name}
              checked={q.multiple ? selected.includes(option) : selected === option}
              onChange={() => toggle(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// 한글 조사 앞에서 **굵게** 표시가 풀리지 않도록 CJK 보정 플러그인을 함께 쓴다.
const PLUGINS = [remarkGfm, remarkCjkFriendly]

// 블라인드 평가용 답변 표시. 문구는 원문 그대로 두고, 링크는 주소가 출처를 드러내므로 글자만 보여 준다.
const blindComponents = {
  a: ({ children }) => <span className="sv-linktext">{children}</span>,
}

export function BlindAnswer({ text }) {
  return (
    <div className="sv-md">
      <ReactMarkdown remarkPlugins={PLUGINS} components={blindComponents}>
        {text}
      </ReactMarkdown>
    </div>
  )
}

export function StepFrame({ title, lead, children, footer }) {
  return (
    <section className="sv-step sv-rise">
      <h1>{title}</h1>
      {lead && <p className="sv-lead">{lead}</p>}
      <div className="sv-step-body">{children}</div>
      {footer && <div className="sv-step-foot">{footer}</div>}
    </section>
  )
}
