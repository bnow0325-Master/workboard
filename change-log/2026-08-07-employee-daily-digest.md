# 직원별 매일 일정 잔디 알림

## 동작

- 매일 한국시간 오전 9시에 실행한다.
- 활성 직원별로 본인에게 배정된 `진행 중`, `대기 중` 업무를 만기일 순서로 요약한다.
- 완료·보관 업무와 정부과제 동기화·ID/PW 내부 데이터는 제외한다.
- 같은 한국 날짜에는 직원별 한 번만 전송하며 실행 날짜, 수신자, 요청 ID, 업무 수, payload를 기록한다.
- WEI 계정은 이메일 `wei.huang@bnow.co.kr`을 기준으로 표시명을 `WEI`로 정규화한다.

## 운영 구성

- 예약 이름: `bnow-employee-daily-digests`
- Cron: `0 0 * * *` (UTC, 한국시간 매일 오전 9시)
- 발송 함수: `public.send_employee_daily_digests(date, boolean, text)`
- 실행 이력: `public.employee_daily_digest_runs`
- 잔디 전송: `notify-jandi` Edge Function의 직원별 비밀값과 기존 `JANDI_WEBHOOK_URLS` 맵 재사용
- 함수 호출 인증: Supabase Vault의 `workboard_publishable_key` 사용

특정 직원만 강제 재시험하려면 Supabase SQL Editor에서 아래와 같이 실행한다.

```sql
select public.send_employee_daily_digests(
  timezone('Asia/Seoul', now())::date,
  true,
  'wei.huang@bnow.co.kr'
);
```
