# 2026 YUHAN 창업동아리 사업계획서 온라인 접수 시스템

유한대학교 창업지원센터 | 사업계획서 작성 → 접수 → 평가 통합 시스템

## 🚀 Vercel 배포 방법 (5분 소요)

### 사전 준비
- GitHub 계정 (없으면 https://github.com 에서 가입)
- Vercel 계정 (없으면 https://vercel.com 에서 GitHub 계정으로 가입)

### Step 1: GitHub 저장소 만들기

1. https://github.com/new 접속
2. Repository name: `yuhan-startup-2026`
3. **Public** 선택 → **Create repository** 클릭

### Step 2: 코드 업로드

**방법 A: GitHub 웹에서 직접 업로드 (가장 쉬움)**

1. 만든 저장소 페이지에서 "uploading an existing file" 클릭
2. 이 프로젝트 폴더의 모든 파일을 드래그 앤 드롭
3. "Commit changes" 클릭

**방법 B: 명령어 사용 (Git 설치되어 있는 경우)**

```bash
cd yuhan-startup
git init
git add .
git commit -m "초기 커밋: 창업동아리 접수 시스템"
git branch -M main
git remote add origin https://github.com/본인계정/yuhan-startup-2026.git
git push -u origin main
```

### Step 3: Vercel에서 배포

1. https://vercel.com/dashboard 접속
2. **"Add New..." → "Project"** 클릭
3. **"Import Git Repository"** 에서 `yuhan-startup-2026` 선택
4. Framework Preset: **Vite** 자동 감지됨
5. **"Deploy"** 클릭
6. 약 1~2분 후 배포 완료!

### Step 4: 배포 URL 확인

배포가 완료되면 다음과 같은 URL이 생성됩니다:
```
https://yuhan-startup-2026.vercel.app
```

이 URL을 학생들에게 공유하면 됩니다.

### (선택) 커스텀 도메인 설정

Vercel 대시보드 → 프로젝트 → Settings → Domains 에서
`startup.yuhan.ac.kr` 같은 학교 도메인을 연결할 수 있습니다.

---

## 📁 프로젝트 구조

```
yuhan-startup/
├── index.html          # HTML 진입점
├── package.json        # 의존성 목록
├── vite.config.js      # Vite 설정
├── tailwind.config.js  # Tailwind CSS 설정
├── postcss.config.js   # PostCSS 설정
├── public/
│   └── favicon.svg     # 파비콘
└── src/
    ├── main.jsx        # React 진입점
    ├── index.css       # Tailwind CSS
    ├── storage.js      # 데이터 저장 모듈 (★ 향후 Supabase로 교체)
    └── App.jsx         # 메인 앱 (신청자/관리자/평가위원)
```

## 💾 데이터 저장 방식

**현재: localStorage (브라우저 내장 저장소)**
- 같은 기기/브라우저에서만 접근 가능
- 브라우저 캐시 삭제 시 데이터 소실 가능
- 관리자 대시보드에서 "전체 데이터 백업" 버튼으로 JSON 파일 다운로드 가능

**향후 계획: Supabase 연동**
- `src/storage.js` 파일만 교체하면 됨
- 모든 기기에서 데이터 공유
- SQL 쿼리로 근거자료 추출 가능
- Google Drive 자동 백업 가능 (n8n 연동)

## ⚠ 주의사항

- 현재 버전은 **프로토타입**입니다
- 실 운영 전 Supabase 연동을 권장합니다
- 관리자/평가위원 접근 제한은 향후 인증 시스템 추가 시 구현됩니다
