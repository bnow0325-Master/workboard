# main.bnow.co.kr 워크보드 자체 호스팅

- 대상 서버: `1-ubuntu` (`210.116.101.13`)
- 웹 서버: 호스트 Nginx의 독립 가상 호스트
- 배포 경로: `/srv/workboard/releases/<commit>`
- 현재 릴리스: `/srv/workboard/current` 심볼릭 링크
- 데이터/Auth: 기존 Supabase 유지
- 외부 연동: 정부지원 추천 API와 근태 서비스는 기존 Vercel 유지
- 보안 변경: 정적 HTML의 회사 계정 목록을 제거하고 `company_credentials` RLS 테이블로 이전
- DNS: 가비아 `main.bnow.co.kr` A 레코드를 `210.116.101.13`으로 연결
- TLS: DNS 반영 후 Certbot Nginx 플러그인으로 발급 및 자동 갱신
