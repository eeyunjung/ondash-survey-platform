import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore/lite'

const env = import.meta.env
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

// 설정값이 없으면 db는 null이고, 저장소는 localStorage만으로 동작한다.
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId)
export const db = isFirebaseConfigured ? getFirestore(initializeApp(config)) : null
