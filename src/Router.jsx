import { lazy, Suspense } from 'react'

const SurveyApp = lazy(() => import('./survey/SurveyApp.jsx'))
const SurveyAdmin = lazy(() => import('./survey/admin/SurveyAdmin.jsx'))

/** `/admin`은 관리 화면, 그 밖의 모든 경로는 설문이다. */
function pick(pathname) {
  const path = pathname.replace(/\/+$/, '')
  return path === '/admin' || path.startsWith('/admin/') ? SurveyAdmin : SurveyApp
}

export default function Router() {
  const Page = pick(window.location.pathname)
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  )
}
