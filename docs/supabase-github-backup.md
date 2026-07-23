# Supabase GitHub 백업 정책

## 원칙

GitHub은 Workboard와 정부과제 워크보드의 Supabase 코드와 구조를 백업하는 기준 저장소로 사용한다. Supabase 대시보드나 SQL Editor에서 직접 변경한 내용도 같은 작업 안에서 GitHub에 남겨야 한다.

다만 실제 운영 데이터는 공개 저장소에 평문으로 커밋하지 않는다. 프로젝트, 댓글, 정부과제 메모, 담당자 의견, 고객정보, 직원정보는 Supabase 운영 데이터로 관리하고, 별도 데이터 백업이 필요하면 Supabase 백업 또는 비공개/암호화 백업 저장소를 사용한다.

## GitHub에 반드시 남기는 것

- `supabase/migrations/*.sql`: 테이블, 컬럼, 인덱스, RLS 정책, 트리거, 데이터베이스 함수 변경
- `supabase/functions/*`: Supabase Edge Function 코드와 설정
- `index.html`, `government/app.js`, `government/recommendations.js`: 브라우저에서 Supabase를 호출하는 공개 클라이언트 코드
- Supabase 연결 방식, 동기화 방식, 배포 절차를 설명하는 문서

## GitHub에 남기지 않는 것

- Supabase service role 키, DB 비밀번호, 개인 GitHub 토큰, Webhook 토큰
- 실제 프로젝트 데이터, 댓글, 정부과제 리스트의 운영 수정본
- 직원 이메일, 고객명, 농가명, 계약 내용 같은 내부 식별 정보가 들어간 테스트 데이터
- Supabase 운영 DB 덤프 파일

## 변경 절차

1. Supabase 구조를 바꿀 때는 먼저 `supabase/migrations`에 새 SQL migration을 만든다.
2. Supabase 대시보드에서 임시로 먼저 바꿨다면, 같은 변경을 migration 파일로 다시 정리한다.
3. Edge Function을 바꿨다면 `supabase/functions` 아래 코드도 같이 수정한다.
4. 프론트엔드에서 Supabase 호출 방식이 바뀌면 해당 HTML/JS 파일과 문서를 같이 갱신한다.
5. PR 또는 커밋 전에 GitHub Actions 정적 검증을 통과시킨다.

## 정부과제 동기화 메모

정부과제 워크보드는 현재 별도 `government_tasks` 테이블이 아니라 기존 Supabase `projects` 테이블 안에 숨김 동기화 레코드를 저장한다. 숨김 레코드는 `__BNOW_GOVERNMENT_BOARD_SYNC__` 제목 접두어를 사용하며, 메인 업무보드에서는 보이지 않도록 필터링한다.

이 방식 자체를 바꾸거나 별도 테이블로 분리할 경우 반드시 migration, RLS 정책, 프론트엔드 동기화 코드를 같은 커밋에 포함한다.
