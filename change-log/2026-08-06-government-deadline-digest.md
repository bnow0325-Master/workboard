# 정부과제 만기일 잔디 요약

## 동작

- 매일 오전 9시(Asia/Seoul)에 실행한다.
- 최신 정부과제 동기화 레코드에서 `준비중`, `검토중` 상태이면서 제출일이 없는 과제를 확인한다.
- 기한 초과, 오늘 마감, 7일 이내 과제를 만기일 순으로 묶어 채민강 잔디 웹훅으로 보낸다.
- 대상 과제가 없어도 정상 실행 여부를 알 수 있도록 빈 요약을 보낸다.
- 같은 한국 날짜에는 한 번만 발송하고 실행 날짜, 요청 ID, 과제 수, 전송 payload를 기록한다.

## 운영 구성

- 예약 이름: `bnow-government-deadline-digest`
- Cron: `0 0 * * *` (UTC, 한국시간 오전 9시)
- 발송 함수: `public.send_government_deadline_digest(date, boolean)`
- 실행 이력: `public.government_deadline_digest_runs`
- 잔디 전송: 기존 `notify-jandi` Edge Function과 `JANDI_WEBHOOK_CHAE_MINKANG` 비밀값 재사용
- 함수 호출 인증: Supabase Vault의 `workboard_publishable_key`를 `apikey`와 `Authorization` 헤더에 사용

2026-08-06 운영 강제 테스트에서 대상 과제 4건을 집계했고 `notify-jandi`가 HTTP 200과 `{"ok":true}`를 반환했다.

강제 재시험이 필요하면 Supabase SQL Editor에서 아래를 실행한다.

```sql
select public.send_government_deadline_digest(
  timezone('Asia/Seoul', now())::date,
  true
);
```
