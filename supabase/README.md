# Supabase assets

이 폴더는 Workboard 운영에 필요한 Supabase 구조와 서버 코드를 GitHub에 백업하기 위한 위치다.

## 포함 대상

- `migrations/`: 테이블, 컬럼, 인덱스, RLS 정책, 트리거, DB 함수 변경 이력
- `functions/`: Supabase Edge Function 코드
- `migrations/20260806000100_schedule_government_deadline_digest.sql`: 매일 오전 9시 채민강에게 정부과제 만기 요약을 보내는 Cron 작업
- `migrations/20260807000100_schedule_wei_instagram_reminder.sql`: 월·수·금 정오에 WEI에게 인스타그램 업로드 알림을 보내는 Cron 작업
- `migrations/20260807000200_schedule_employee_daily_digest.sql`: 매일 오전 9시에 직원별 진행 일정을 개인 잔디로 보내는 Cron 작업

## 운영 규칙

- Supabase 대시보드에서 schema, RLS, trigger, function을 직접 변경했다면 같은 작업에서 migration 파일로 남긴다.
- Edge Function을 수정했다면 배포본과 같은 내용이 `functions/`에도 있어야 한다.
- 운영 데이터, DB dump, 비밀키는 이 저장소에 커밋하지 않는다.
- 이 저장소가 공개 상태라면 특히 실제 업무 데이터와 직원/고객 식별정보를 넣지 않는다.

자세한 기준은 `docs/supabase-github-backup.md`를 따른다.
