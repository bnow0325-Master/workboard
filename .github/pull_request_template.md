## 변경 목적

<!-- 해결하려는 내부 업무 문제와 사용자 영향을 적어주세요. -->

## 주요 변경사항

- 

## 검증

- [ ] GitHub Actions 정적 검증을 통과함
- [ ] 로그인과 로그아웃을 확인함
- [ ] 프로젝트 등록·수정·보관·삭제를 확인함
- [ ] 댓글과 승인요청을 확인함
- [ ] 모바일 화면을 확인함
- [ ] 실제 직원·고객정보와 비밀키를 추가하지 않음

## 보안 확인

- [ ] 관리자 권한에 미치는 영향을 확인함
- [ ] Supabase RLS 정책 변경 필요 여부를 확인함
- [ ] Supabase schema/RLS/trigger/function 변경은 `supabase/migrations` 또는 `supabase/functions`에 같이 반영함
- [ ] 운영 DB 데이터, dump, 비밀키를 GitHub에 커밋하지 않음
- [ ] 외부 URL·Webhook·토큰을 브라우저 코드에 추가하지 않음
