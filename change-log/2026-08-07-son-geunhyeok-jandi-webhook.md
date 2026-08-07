# 손근혁 잔디 웹훅 분리

- `notify-jandi`의 직원별 라우팅에 손근혁 전용 비밀값 `JANDI_WEBHOOK_SON_GEUNHYEOK`을 추가한다.
- 손근혁 대상 알림은 기존 직원 맵이나 공용 기본 웹훅보다 전용 웹훅을 우선 사용한다.
- 실제 웹훅 URL은 저장소에 기록하지 않고 Supabase Edge Function 비밀값으로만 관리한다.
