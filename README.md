# WebHand Extension

한국 사이트 특화 AI 기반 웹 스크래핑 크롬 확장프로그램

## 🚀 개발 시작하기

### 1. 의존성 설치

```bash
cd webhand-extension
npm install
```

### 2. 개발 모드 실행

```bash
npm run dev
```

### 3. 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 폴더에 생성됩니다.

### 4. Chrome에 로드하기

1. Chrome 브라우저에서 `chrome://extensions` 접속
2. 우측 상단 "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `dist/` 폴더 선택

## 📁 프로젝트 구조

```
webhand-extension/
├── src/
│   ├── background/          # Background Service Worker
│   │   └── index.ts
│   ├── content/             # Content Script
│   │   └── index.ts
│   ├── sidepanel/           # Side Panel UI (React)
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── index.css
│   ├── components/          # Reusable React Components
│   ├── utils/               # Utility Functions
│   │   ├── dom.ts          # DOM manipulation
│   │   └── scraper.ts      # Scraping logic
│   └── types/               # TypeScript Types
│       ├── messages.ts
│       └── data.ts
├── public/
│   ├── manifest.json       # Extension Manifest
│   ├── icons/              # Extension Icons
│   └── _locales/           # i18n Translations
│       ├── ko/
│       └── en/
└── dist/                   # Build Output
```

## 🔧 기술 스택

- **TypeScript** - 타입 안전성
- **React** - UI 구축
- **Vite** - 빠른 빌드
- **Chrome Extensions API** - Manifest V3

## 📝 주요 기능

- ✅ 웹 페이지 텍스트 추출
- ✅ 리스트 패턴 자동 감지
- ✅ 실시간 스크래핑 진행률 표시
- ⏳ AI 기반 필드 자동 추출 (예정)
- ⏳ CSV/Excel 내보내기 (예정)
- ⏳ 한국 사이트 전용 스크래퍼 (예정)

## 🎨 개발 참고

이 프로젝트는 [Thunderbit-AI](https://github.com/thunderbit-ai) 확장프로그램을 리버스 엔지니어링하여 핵심 패턴을 학습하고 구현했습니다.

주요 참고 패턴:
- 메시징 아키텍처 (Background ↔ Content ↔ Side Panel)
- 에러 방지 DOM 선택기
- 재귀적 텍스트 추출
- 리스트 패턴 감지

자세한 분석 내용은 `/reference-analysis` 폴더 참조.

## 📦 배포

### GitHub Actions를 통한 자동 빌드

1. GitHub에 푸시하면 자동으로 빌드됩니다
2. Release 생성 시 자동으로 zip 파일 생성
3. Chrome Web Store에 업로드

### 수동 배포

```bash
npm run build
npm run zip
```

생성된 `webhand-extension.zip` 파일을 Chrome Web Store에 업로드

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

MIT License - 자유롭게 사용하세요!

## 🙏 감사의 말

Thunderbit-AI 팀에게 영감을 받았습니다.
