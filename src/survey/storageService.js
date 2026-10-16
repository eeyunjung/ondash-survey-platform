import { collection, doc, getDocs, setDoc } from 'firebase/firestore/lite'
import { db, isFirebaseConfigured } from './firebase.js'

// Firestore / localStorage 하이브리드 저장소.
// 모든 저장은 먼저 localStorage에 쓰고, Firebase가 설정되어 있으면 Firestore에도 쓴다.
// 네트워크가 끊겨도 참가자는 설문을 계속할 수 있고, 다음 저장 때 최신 상태가 다시 올라간다.

const COLLECTION = 'survey_responses'
const CURRENT_KEY = 'ondash.survey.current.v1'
const ALL_KEY = 'ondash.survey.responses.v1'

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 저장 공간을 쓸 수 없는 브라우저에서도 설문 진행은 막지 않는다.
  }
}

export function loadCurrent() {
  return readJson(CURRENT_KEY, null)
}

export function clearCurrent() {
  try {
    localStorage.removeItem(CURRENT_KEY)
  } catch {
    // 위와 같은 이유로 무시한다.
  }
}

/** 응답을 저장한다. 반환값은 Firestore까지 저장되었는지 여부. */
export async function saveResponse(record) {
  const stamped = { ...record, updatedAt: new Date().toISOString() }
  writeJson(CURRENT_KEY, stamped)
  writeJson(ALL_KEY, { ...readJson(ALL_KEY, {}), [stamped.participantId]: stamped })

  if (!db) return false
  try {
    await setDoc(doc(db, COLLECTION, stamped.participantId), stamped)
    return true
  } catch (error) {
    console.warn('[survey] Firestore 저장 실패. 이 기기에는 저장되었습니다.', error)
    return false
  }
}

/** 관리자 화면용. Firestore와 이 기기의 응답을 합쳐 돌려준다. */
export async function listResponses() {
  const merged = new Map(Object.entries(readJson(ALL_KEY, {})))
  let remote = isFirebaseConfigured ? 'ok' : 'off'
  let remoteError = null

  if (db) {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION))
      snapshot.forEach((d) => {
        const record = d.data()
        const local = merged.get(d.id)
        if (!local || (record.updatedAt ?? '') >= (local.updatedAt ?? '')) merged.set(d.id, record)
      })
    } catch (error) {
      remote = 'error'
      remoteError = error.message
    }
  }

  const responses = [...merged.values()].sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))
  return { responses, remote, remoteError }
}
