import benchmark from './data/benchmark.json'

// ── 평가 문항 ────────────────────────────────────────────────────────────────

// 설문에서 묻는 5문항. 시트의 3자 비교 문항 중 이 다섯 가지 상황의 답변을 쓴다. 순서는 고정이다.
//   1. Q02 경고음·핸들 진동 설정   2. Q04 후측방 기능 여부 불명   3. Q05 OTA 이후 메뉴 변화
//   4. Q12 충전 커넥터 강제 분리   5. Q13 빨간 경고 표시 정보 부족
export const SURVEY_ITEM_IDS = ['Q02', 'Q04', 'Q05', 'Q12', 'Q13']
export const ITEMS = SURVEY_ITEM_IDS.map((id) => benchmark.items.find((item) => item.id === id)).filter(Boolean)
// 세 시스템 답변 원문의 해시. 응답에 함께 저장해, 자극이 바뀐 시점 전후를 구분한다.
export const STIMULUS_VERSION = benchmark.stimulusVersion ?? 'unknown'
// 설문 구성(문항 수·형식) 버전. 5문항 + 답변별 2문항 척도 + 참고 선택 + 서비스 의견은 'scale-ref-5q'.
export const SURVEY_VERSION = 'scale-ref-5q'
export const SYSTEMS = ['ondash', 'chatgpt', 'gemini']
export const SYSTEM_NAMES = { ondash: 'OnDash', chatgpt: 'ChatGPT', gemini: 'Gemini' }
export const POSITIONS = ['A', 'B', 'C']

/** 참가자 한 명이 보는 문항 수. */
export const ITEMS_PER_PARTICIPANT = ITEMS.length

// 답변 하나마다 7점 척도 두 문항을 평가한다. 네 항목처럼 여러 척도를 합산하지 않는다.
export const RATINGS = [
  { id: 'R1', statement: '이 답변을 바탕으로 이 상황에서 다음에 할 행동을 판단할 수 있었다.', research: '다음 행동 판단' },
  { id: 'R2', statement: '이 답변은 차량 정보와 현재 상황을 반영해 안내했다.', research: '차량·상황 반영' },
]

// 세 답변을 모두 읽고 난 뒤, 상황마다 묻는 두 가지.
export const REFERENCE_QUESTION = '이 상황과 비슷한 일이 실제로 생기면 무엇을 먼저 참고할 것 같나요? 하나를 골라 주세요.'
export const REFERENCE_DEPENDS = 'depends'
export const REFERENCE_OTHER = 'other'
export const REFERENCES = [
  { value: 'A', label: '답변 A' },
  { value: 'B', label: '답변 B' },
  { value: 'C', label: '답변 C' },
  { value: REFERENCE_DEPENDS, label: '상황에 따라 다름' },
  { value: REFERENCE_OTHER, label: '기타' },
]
export const OTHER_HINT =
  '직접 적어 주세요. (예: 현대차 공식 안내 — 사용 설명서·고객센터·서비스센터, 인터넷 검색, 유튜브, 자동차 커뮤니티)'
export const IMPORTANT_QUESTION =
  '세 답변을 비교할 때 가장 중요하게 본 점은 무엇인가요? 이해하기 어렵거나 빠졌다고 느낀 내용이 있으면 함께 적어 주세요.'

// 안내 화면의 1~7점 안내용 상수. 답변 평가에는 쓰지 않는다.
export const SCALE_POINTS = [1, 2, 3, 4, 5, 6, 7]
export const SCALE_ANCHORS = { 1: '전혀 그렇지 않다', 4: '보통이다', 7: '매우 그렇다' }

// ── 답변 배치 ────────────────────────────────────────────────────────────────

const PERMUTATIONS = [
  [0, 1, 2],
  [1, 2, 0],
  [2, 0, 1],
  [0, 2, 1],
  [2, 1, 0],
  [1, 0, 2],
].map((p) => p.map((i) => SYSTEMS[i]))

/**
 * 문항 순서는 고정하고, 문항마다 A·B·C 자리에 놓이는 시스템 배열만 돌려 가며 배정한다.
 * 참가자별 시작 배열이 무작위이므로 여러 참가자에 걸쳐 각 시스템이 세 자리에 고르게 놓인다.
 */
export function assignItems() {
  const offset = Math.floor(Math.random() * PERMUTATIONS.length)
  return ITEMS.map((item, i) => ({
    itemId: item.id,
    order: PERMUTATIONS[(offset + i) % PERMUTATIONS.length],
  }))
}

export const getItem = (id) => ITEMS.find((item) => item.id === id)

// ── 참여 조건 ────────────────────────────────────────────────────────────────

const YES_NO = ['예', '아니오']

// 연령과 성별은 응답을 해석하기 위한 정보이며 참여 여부를 가르지 않는다.
// 현재 유효한 운전면허가 없으면('아니오') 설문 대상이 아니다.
export const SCREENER = [
  { id: 'ageGroup', label: '연령대를 선택해 주세요.', options: ['10대', '20대', '30대', '40대', '50대', '60대 이상'], informational: true },
  { id: 'gender', label: '성별을 선택해 주세요.', options: ['여성', '남성', '그 외', '응답하고 싶지 않음'], informational: true },
  { id: 'license', label: '현재 유효한 운전면허가 있습니까?', options: YES_NO },
]

export const isEligible = (answers) => SCREENER.filter((q) => !q.informational).every((q) => answers[q.id] === '예')

export function isAnswered(question, value) {
  if (question.optional) return true
  if (question.multiple) return Array.isArray(value) && value.length > 0
  return value !== undefined && value !== null && value !== ''
}

// ── 문항 화면 표시 ──────────────────────────────────────────────────────────

// 참가자에게 보이는 상황과 질문. **굵게** 표시한 부분이 키워드이고, glossary는 낯선 용어의 한 줄 설명이다.
// 질문(question)은 세 AI에게 입력한 원문과 같다. 상황 설명은 참가자의 이해를 돕기 위해 풀어 쓴 화면 표시용이다.
const CONNECTOR = { term: '커넥터', text: '차량 충전구에 꽂는 충전 플러그' }

const ITEM_VIEW = {
  Q02: {
    tag: '주차 중',
    description:
      '**차량을 세워 둔 상태**입니다. 운전 중 울리는 **경고음**이나 **핸들 진동**의 방식이 어떻게 설정되는지 확인하려고 합니다.',
    question: '운전자 보조 경고음이나 핸들 진동을 바꾸려면 어디로 가야 해? 이걸 바꾸면 다른 운전자 보조 기능에도 영향이 있어?',
  },
  Q04: {
    tag: '주차 중',
    description:
      '차량을 세워 두고 내 차에 **어떤 주행 보조 기능이 있는지** 확인하고 있습니다. **옆이나 뒤쪽 차량과의 충돌**을 막아주는 기능이 있는지 찾고 있습니다.',
    glossary: [
      { term: '후측방 충돌방지 보조', text: '옆이나 뒤쪽에서 접근하는 차량과의 충돌을 피하도록 돕는 기능' },
    ],
    question: '내 차에 후측방 충돌방지 보조가 있는지 모르겠어. 설정 메뉴가 안 보이는데 기능이 없는 거야?',
  },
  Q05: {
    tag: '소프트웨어 업데이트 후',
    description:
      '차량 **소프트웨어를 업데이트**했습니다. 설명서를 보고 운전자 보조 기능의 설정을 확인하려는데, **설명서에 나온 메뉴 위치와 현재 화면이 달라진** 상황입니다.',
    question: '소프트웨어 업데이트를 한 뒤 설명서에 나온 운전자 보조 메뉴 위치가 달라졌어. 왜 그런 거야? 어디서 확인해야 해?',
  },
  Q12: {
    tag: '충전 완료',
    description:
      '전기차 **충전은 끝났지만** **충전 플러그가 빠지지 않습니다**. 타는 냄새나 연기 같은 **전기 이상은 없는** 상태입니다.',
    glossary: [CONNECTOR],
    question: '충전이 끝났는데 커넥터가 안 빠져. 세게 당겨서 빼도 돼?',
  },
  Q13: {
    tag: '계기판 경고',
    description:
      '계기판에 **빨간색 표시**가 나타났습니다. 운전자는 빨간색이었다는 것만 확인했고, **정확한 모양이나 함께 나온 문구는 확인하지 못했습니다**.',
    question: '계기판에 빨간 표시가 떴어. 무슨 문제야?',
  },
}

/** 화면에 보여 줄 상황 태그, 상황 설명, 운전자의 질문. */
export function itemView(item) {
  return ITEM_VIEW[item.id] ?? { tag: null, description: item.situation, question: item.question, glossary: [] }
}

// ── 서비스에 대한 의견 ──────────────────────────────────────────────────────
// 네 상황을 모두 본 뒤에 묻는다. 이 단계에서 처음으로 OnDash 답변이 어느 자리였는지 알려 준다.
export const OPINION_ANCHORS = { 1: '전혀 없다', 4: '보통이다', 7: '매우 높다' }
export const OPINION = {
  title: '서비스에 대한 의견',
  intentLabel: '차량 관련 질문이 생겼을 때, 평소 이용하는 방법보다 이 서비스를 먼저 이용할 의향은 어느 정도인가요?',
  intentHint: '평소 이용하는 방법에는 AI 챗봇, 구글·네이버 검색, 유튜브, 차량 설명서, 지인이나 정비소에 문의하기 등이 포함됩니다.',
  // 이유와 활용할 상황을 한 질문으로 묻는다.
  // 1번에서 고른 숫자를 넣어 묻는다. 숫자를 고르기 전에는 숫자 없이 묻는다.
  reasonLabel: (intent) => {
    if (typeof intent !== 'number') return '1번 질문에 응답한 이유는 무엇인가요?'
    // 받침이 있는 읽기(일·삼·육·칠)는 '이라고', 없는 읽기(이·사·오)는 '라고'
    const particle = [1, 3, 6, 7].includes(intent) ? '이라고' : '라고'
    return `1번 질문에 ${intent}${particle} 응답한 이유는 무엇인가요?`
  },
  // 한 문장씩 줄을 바꿔 보여 준다.
  reasonHint: [
    '평소 이용하는 방법이 있다면 함께 적고,',
    '그 방법과 비교해 이 서비스를 먼저 선택하거나 선택하지 않을 이유를 설명해 주세요.',
    '쓸 것 같은 상황이 떠오르면 어떤 일이 생겼을 때 무엇을 물어볼 것 같은지도 적어 주세요.',
    '비교하기 어렵다면 그 이유를 적어 주세요.',
  ],
}
