# WEI 인스타그램 업로드 잔디 알림

## 동작

- 매주 월요일, 수요일, 금요일 한국시간 정오 12시에 실행한다.
- WEI 개인 잔디 웹훅으로 인스타그램 업로드 일정과 바로가기를 보낸다.
- 같은 한국 날짜에는 한 번만 전송하고 실행 날짜, 요청 ID, 전송 payload를 기록한다.
- 브라우저가 열려 있지 않아도 Supabase Cron이 서버에서 실행한다.

## 운영 구성

- 예약 이름: `bnow-wei-instagram-upload-reminder`
- Cron: `0 3 * * 1,3,5` (UTC, 한국시간 월·수·금 정오 12시)
- 발송 함수: `public.send_wei_instagram_upload_reminder(date, boolean)`
- 실행 이력: `public.instagram_upload_reminder_runs`
- 잔디 전송: 기존 `notify-jandi` Edge Function과 `JANDI_WEBHOOK_WEI` 비밀값 재사용
- 함수 호출 인증: Supabase Vault의 `workboard_publishable_key` 사용

강제 재시험이 필요하면 Supabase SQL Editor에서 아래를 실행한다.

```sql
select public.send_wei_instagram_upload_reminder(
  timezone('Asia/Seoul', now())::date,
  true
);
```
