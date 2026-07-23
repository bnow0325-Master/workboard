# BNOW Workboard

BNOW 내부 프로젝트, 담당자, 일정, 댓글·승인요청을 관리하는 사내 업무보드임.

## 현재 구조

- 단일 `index.html` 정적 애플리케이션
- Supabase Auth 및 Database 사용
- 별도 빌드 과정 없이 정적 호스팅 가능

## 로컬 실행

브라우저에서 파일을 직접 열지 말고 로컬 HTTP 서버로 실행함.

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000`에 접속함.

## 개발 방식

1. 기본 브랜치 최신 상태를 확인함.
2. `agent/<작업명>` 기능 브랜치를 생성함.
3. 변경 후 PR을 생성함.
4. GitHub Actions의 정적 검증을 통과한 뒤 병합함.
5. 상세 규칙은 `AGENTS.md`를 따름.

## Supabase GitHub 백업

Supabase 구조, RLS, 트리거, DB 함수, Edge Function 변경은 GitHub에도 같이 백업함. 관련 기준은 `docs/supabase-github-backup.md`와 `supabase/README.md`를 따름.

운영 데이터와 비밀키는 공개 저장소에 평문으로 커밋하지 않음. 실제 프로젝트 데이터 백업이 필요하면 Supabase 백업 기능 또는 비공개/암호화 저장소를 사용함.

## 보안 주의사항

이 저장소는 사내 인원과 업무정보를 다루므로 **비공개 저장소로 운영해야 함**.

- Supabase `anon` 키는 브라우저에서 사용하는 공개 식별값이지만, Row Level Security 정책이 반드시 활성화되어야 함.
- `service_role` 키, DB 비밀번호, Jandi·Slack Webhook, 개인 토큰은 절대 코드에 넣지 않음.
- 관리자 권한은 이메일 문자열 비교가 아니라 서버 또는 Supabase 정책으로 검증해야 함.
- 실제 직원정보와 업무내용을 테스트 데이터로 커밋하지 않음.

## 향후 구조 개선 권장

- HTML, CSS, JavaScript 파일 분리
- Supabase 접근 모듈 분리
- 관리자 권한과 알림 전송을 서버 API로 이동
- 테스트 가능한 모듈 구조로 전환
