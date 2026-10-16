# OnDash 설문 플랫폼

차량 매뉴얼 기반 안내 에이전트 **OnDash**를 ChatGPT·Gemini와 블라인드로 비교 평가하는 연구 설문 웹앱입니다.
Vite + React 19, 저장은 Firebase Firestore(없으면 브라우저 localStorage)를 씁니다.

| 경로 | 화면 |
| :--- | :--- |
| `/` , `/survey` | 설문 |
| `/admin` | 설문 관리 (집계, 엑셀 원문 답변, CSV 내보내기) |

## 설문 흐름

안내 → 동의 → 참여 조건(연령대·성별·면허) → 진행 방법 → 시나리오 5개(Q02·Q04·Q05·Q12·Q13) → 서비스 의견 → 완료.
시나리오마다 세 시스템의 답변을 순서를 섞어 블라인드로 보여 주고, 답변별 7점 척도 2문항(R1·R2)과
"먼저 상담할 곳" 선택, 가장 중요하게 본 점을 받습니다.

## 코드 구조

```
src/
  main.jsx, Router.jsx     경로에 따라 설문/관리 화면 선택
  survey/
    SurveyApp.jsx          단계 진행, 저장, 임시 이동 바
    questionsBank.js       문항·척도·선택지·시나리오 표시 설정
    storageService.js      localStorage + Firestore 저장
    firebase.js            환경 변수 기반 Firebase 초기화
    pilot.js               앱 버전과 파일럿 응답 구분
    steps/                 단계별 화면
    components/            공용 입력 컴포넌트
    admin/                 집계(stats), CSV(csv), 관리 화면
    data/benchmark.json    세 시스템의 답변 원문 15문항 (생성 데이터)
```

## 실행

```bash
npm install
cp .env.example .env.local   # Firebase 웹 앱 설정값을 채웁니다. 비워 두면 localStorage만 씁니다.
npm run dev
```

## 배포 (Firebase Hosting)

```bash
firebase use --add     # 본인 Firebase 프로젝트를 고릅니다.
npm run deploy
```

`firestore.rules`는 `survey_responses` 컬렉션만 허용하고 나머지는 모두 막습니다. 같은 프로젝트에서
다른 컬렉션을 쓰고 있다면 규칙을 합친 뒤 배포하거나 `firebase deploy --only hosting`만 쓰세요.

## 주의

- `/admin`에는 로그인 보호가 없고 Firestore 규칙도 응답 읽기를 열어 둡니다. 이름·연락처 등 개인정보는 수집하지 않지만, 실제 연구에 쓸 때는 접근 제한을 추가하세요.
- 화면 상단의 "임시 이동" 바는 테스트용입니다. 실제 참여자에게 배포하기 전에 `SurveyApp.jsx`의 `sv-devbar` 블록을 제거하세요.
- 참가자 응답 데이터는 저장소에 포함하지 않습니다.
