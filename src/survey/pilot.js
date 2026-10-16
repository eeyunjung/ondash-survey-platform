// 응답 기록의 앱 버전과 테스트 기록 표시.
//
// 파일럿 테스트는 끝났고 테스터 도구(테스터 줄, 처음으로 돌아가기, 문항 이동)는 화면에서 없앴다.
// 이미 저장된 테스트 기록은 지우지 않고, 관리자 화면에서 구분할 수 있도록 표시만 유지한다.
//   - pilot: true 이거나, 앱 버전이 없거나 3 미만인 기록은 파일럿 기록이다.
//   - 6 이후(이 버전부터) 새로 시작한 기록은 실참여자의 응답이다.
export const APP_VERSION = 6
export const PILOT_COHORT_BEFORE = 3

export const isPilot = (record) =>
  Boolean(record?.pilot) || !record?.appVersion || record.appVersion < PILOT_COHORT_BEFORE
