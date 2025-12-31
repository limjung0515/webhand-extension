# WebHand Extension

> 🚀 **Advanced Multi-Site Web Scraping Chrome Extension**
> Enterprise-grade architecture with distributed tracing, state management, and real-time progress tracking

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?logo=vite)](https://vitejs.dev/)
[![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome)](https://developer.chrome.com/docs/extensions/mv3/)

---

## 📖 Overview

**WebHand Extension**은 한국 주요 사이트를 대상으로 한 고급 웹 스크래핑 Chrome Extension입니다.
복잡한 멀티 컨텍스트 환경에서 **엔터프라이즈급 메시징 시스템**, **실시간 상태 동기화**, **자동 페이지 네비게이션**을 제공합니다.

### 🎯 Why This Project?

개인 프로젝트나 비즈니스에서 대량의 데이터를 수집해야 할 때, 매번 수동으로 복사-붙여넣기하는 비효율을 해결하기 위해 만들었습니다.
단순한 스크래핑 도구를 넘어, **확장 가능한 아키텍처**와 **프로덕션급 에러 핸들링**을 갖춘 플랫폼입니다.

---

## ✨ Key Features

### 🔍 **Multi-Site Scraping**
- **Domeme (도매매)** - E-commerce product listings
- **Naver Real Estate (네이버 부동산)** - Property listings with infinite scroll support
- **Extensible Scraper Registry** - Add new sites easily with plugin architecture

### 🎛️ **Scraping Modes**
- **Current Page Mode** - Extract all items from the current page
- **All Pages Mode** - Automatically navigate and scrape multiple pages
- **Infinite Scroll Support** - Smart scrolling for dynamically loaded content

### 📊 **Real-Time Progress Tracking**
- In-page modal with live updates
- Page counter (e.g., "Page 3 of 15")
- Item counter with real-time accumulation
- Estimated total for infinite scroll sites

### 💾 **Data Export & Sharing**
- **CSV Download** - UTF-8 encoded with proper Korean support
- **Google Sheets Integration** - Direct export to spreadsheets
- **Email Export** - Send results via Google Apps Script
- **History Management** - Save and revisit previous scraping sessions

### 🛡️ **Anti-Detection**
- DevTools bypass for Naver sites
- Human-like delays between actions
- Retry mechanisms with exponential backoff

---

## 🔥 Technical Highlights

### 1. **Enterprise-Grade Messaging System**

Custom messaging infrastructure with production-ready features:

- **Distributed Tracing** - Tree visualization of message flows across contexts
- **Rate Limiting** - Prevent API abuse with configurable limits
- **Dead Letter Queue (DLQ)** - Capture and debug failed messages
- **Metrics Tracking** - Real-time latency and success/failure rates
- **Circuit Breaker Pattern** - Graceful degradation under load

```typescript
// src/utils/messaging.ts
interface TraceInfo {
    id: string;
    startedAt: number;
    chain: TraceStep[];
}

class RateLimiter {
    check(key: string, options: RateLimitOptions): boolean;
    cleanup(maxAge: number): void;
}
```

### 2. **Multi-Context State Management**

Robust state synchronization across Chrome Extension contexts:

- **Single Source of Truth** - Chrome session storage as central state
- **Observer Pattern** - Real-time UI updates via listeners
- **State History** - Time-travel debugging with state snapshots
- **Cross-Context Sync** - Background ↔ Content Script ↔ Side Panel

```typescript
// src/core/ScrapingStateManager.ts
class ScrapingStateManager {
    static getInstance(): ScrapingStateManager;
    setState(updates: Partial<ScrapingState>): Promise<void>;
    addListener(listener: StateListener): void;
}
```

### 3. **Orchestrator Pattern**

Complex workflow coordination with intelligent navigation:

```typescript
// src/background/services/ScrapingOrchestrator.ts
class ScrapingOrchestrator {
    async start(config: ScrapeConfig): Promise<void>;
    async stop(): Promise<void>;
    private async navigateToNextPage(): Promise<boolean>;
    private async waitForContent(): Promise<void>;
}
```

### 4. **Extensible Scraper Architecture**

Plugin-style scraper system with registry pattern:

```typescript
// src/scrapers/registry.ts
export const SUPPORTED_SITES: SupportedSite[] = [
    {
        id: 'domeme',
        name: '도매매',
        urlPatterns: [/domeme\.domeggook\.com/],
        scrapers: [domemeConfig]
    },
    {
        id: 'naver-land',
        name: '네이버 부동산',
        urlPatterns: [/land\.naver\.com\/map/],
        scrapers: [naverLandConfig]
    }
];
```

Each scraper implements a common interface:

```typescript
interface BaseScraper {
    scrape(mode: 'current' | 'all'): Promise<ScrapeResult>;
    stop(): void;
}
```

---

## 🏗️ Architecture

### **Three-Layer Architecture**

```
┌─────────────────────────────────────────────────────┐
│                    UI Layer (React)                  │
│  ┌────────────────┐          ┌──────────────────┐  │
│  │  Side Panel    │          │  Results Page    │  │
│  │  (Control UI)  │          │  (Data Display)  │  │
│  └────────────────┘          └──────────────────┘  │
└─────────────────────┬───────────────────────────────┘
                      │ Chrome Messaging API
┌─────────────────────┴───────────────────────────────┐
│         Background Layer (Service Worker)            │
│  ┌──────────────────────────────────────────────┐  │
│  │  ScrapingOrchestrator - Workflow Manager     │  │
│  │  PageNavigator - Tab Navigation              │  │
│  │  ResultManager - Data Persistence            │  │
│  │  StateManager - Centralized State            │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────┘
                      │ chrome.scripting.executeScript
┌─────────────────────┴───────────────────────────────┐
│          Content Script Layer (Injected JS)          │
│  ┌──────────────────────────────────────────────┐  │
│  │  DomemeScraper - E-commerce scraper          │  │
│  │  NaverLandScraper - Real estate scraper      │  │
│  │  ScrapeModal - Progress UI                   │  │
│  └──────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### **Key Design Patterns**

| Pattern | Implementation | Purpose |
|---------|---------------|---------|
| **Singleton** | `ScrapingStateManager` | Single state instance across contexts |
| **Strategy** | Scraper Registry | Pluggable scrapers for different sites |
| **Observer** | State Listeners | Reactive UI updates |
| **Orchestrator** | `ScrapingOrchestrator` | Complex workflow coordination |
| **Circuit Breaker** | Messaging System | Fault tolerance |

---

## 📸 Screenshots

### Side Panel - Main Control Interface
> 📁 `docs/screenshots/sidepanel.png` (Add your screenshot here)

**Features shown:**
- Site detection
- Scraper selection
- Mode toggle (Current/All pages)
- Start/Stop controls
- History viewer

### Progress Modal - Real-Time Updates
> 📁 `docs/screenshots/progress.png` (Add your screenshot here)

**Features shown:**
- Live page counter
- Item accumulation
- Progress spinner
- Status messages

### Results Page - Data Table
> 📁 `docs/screenshots/results.png` (Add your screenshot here)

**Features shown:**
- Responsive data table
- Export buttons (CSV, Sheets, Email)
- Clickable product links
- Metadata (timestamp, count)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google Chrome browser

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/limjung0515/webhand-extension.git
   cd webhand-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Development mode** (with hot reload)
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

### Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `dist/` folder from the project directory

### Configuration (Optional)

For Google Sheets and Email features:

1. Open Chrome Extensions and click on **WebHand Extension**
2. Go to **Extension Options** (if available) or use `chrome.storage.sync`
3. Set the following:
   - `googleSheetsUrl` - Your Google Apps Script deployment URL
   - `emailAddress` - Your email for receiving exports

Alternatively, these can be set programmatically via Chrome DevTools:

```javascript
chrome.storage.sync.set({
    googleSheetsUrl: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    emailAddress: 'your-email@example.com'
});
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18.3** - UI framework
- **TypeScript 5.6** - Type safety
- **Vite 5.4** - Build tool and dev server
- **Zustand 4.5** - Lightweight state management

### Chrome APIs
- **Manifest V3** - Latest extension platform
- **chrome.sidePanel** - Modern side panel UI
- **chrome.scripting** - Dynamic script injection
- **chrome.storage.session/local** - State persistence
- **chrome.tabs** - Tab management and navigation

### Build & DevOps
- **@crxjs/vite-plugin** - Chrome Extension + Vite integration
- **TypeScript ESLint** - Code quality
- **Prettier** - Code formatting
- **GitHub Actions** - CI/CD pipeline with automated builds

---

## 📁 Project Structure

```
webhand-extension/
├── .github/
│   └── workflows/
│       └── build.yml              # CI/CD pipeline
├── docs/
│   ├── screenshots/               # App screenshots (add yours!)
│   ├── review_analyzer_prd.md    # Future feature: Review analyzer
│   └── tax_calculator_prd.md     # Future feature: Tax calculator
├── public/
│   ├── _locales/                 # i18n (Korean & English)
│   │   ├── ko/messages.json
│   │   └── en/messages.json
│   ├── icons/                    # Extension icons
│   ├── manifest.json             # Chrome Extension manifest
│   └── bypass-devtools.js        # Naver anti-detection
├── src/
│   ├── background/               # Service Worker
│   │   ├── index.ts
│   │   └── services/
│   │       ├── ScrapingOrchestrator.ts
│   │       ├── PageNavigator.ts
│   │       └── ResultManager.ts
│   ├── content/                  # Content Scripts
│   │   ├── index.ts
│   │   ├── scrape-modal.ts
│   │   └── modal/
│   ├── sidepanel/                # Side Panel UI
│   │   ├── App.tsx               # Main control interface
│   │   ├── main.tsx
│   │   └── index.css
│   ├── pages/                    # Results page
│   │   ├── results.tsx
│   │   └── results.css
│   ├── scrapers/                 # Site-specific scrapers
│   │   ├── registry.ts           # Scraper registry
│   │   ├── domeme.ts
│   │   └── naver-land.ts
│   ├── core/                     # Core services
│   │   └── ScrapingStateManager.ts
│   ├── types/                    # TypeScript definitions
│   │   ├── messages.ts
│   │   ├── scraper.ts
│   │   └── settings.ts
│   └── utils/                    # Utilities
│       ├── messaging.ts          # Advanced messaging system
│       ├── dom.ts
│       └── async/
│           └── DelayTimer.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🎯 Roadmap

### Phase 1 - Core Features ✅
- [x] Multi-site scraping (Domeme, Naver Real Estate)
- [x] Automatic page navigation
- [x] Real-time progress tracking
- [x] CSV export with UTF-8 encoding
- [x] History management
- [x] Google Sheets integration
- [x] Email export

### Phase 2 - Advanced Features 🚧
- [ ] Review analyzer with AI (see `docs/review_analyzer_prd.md`)
- [ ] Tax calculator for e-commerce sellers
- [ ] Kakao Map scraper
- [ ] YouTube comment scraper
- [ ] Coupang product scraper

### Phase 3 - Quality & UX 📋
- [ ] Unit tests (Jest + React Testing Library)
- [ ] E2E tests (Playwright)
- [ ] Settings UI page
- [ ] Dark mode
- [ ] Chrome Web Store publication

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style (ESLint + Prettier)
- Add TypeScript types for all new code
- Write meaningful commit messages
- Update documentation for new features

---

## 📦 Build & Deploy

### Local Build

```bash
npm run build        # Build extension
npm run zip          # Package as .zip for Chrome Web Store
```

### CI/CD Pipeline

GitHub Actions automatically:
- Runs type checking on every push
- Builds the extension for PRs
- Creates release artifacts on GitHub Releases
- Uploads `.zip` file for distribution

See `.github/workflows/build.yml` for details.

---

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes.

---

## 🙏 Acknowledgments

Inspired by modern web scraping tools and Chrome Extension best practices.
Built with a focus on **clean architecture**, **type safety**, and **production-ready patterns**.

---

## 📞 Contact

For questions, suggestions, or collaboration:
- GitHub Issues: [Create an issue](https://github.com/limjung0515/webhand-extension/issues)
- Email: limjung0515@gmail.com

---

**Made with ❤️ and TypeScript**
