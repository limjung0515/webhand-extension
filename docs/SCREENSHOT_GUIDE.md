# 📸 Screenshot Guide

이 문서는 포트폴리오용 스크린샷을 촬영하는 가이드입니다.

## 📁 필요한 스크린샷

`docs/screenshots/` 폴더에 다음 3개의 스크린샷을 추가하세요:

### 1. `sidepanel.png` - Side Panel 메인 화면

**촬영 방법:**
1. Chrome에서 확장 프로그램 로드
2. 도매매 또는 네이버 부동산 사이트로 이동
3. Side Panel 열기 (확장 프로그램 아이콘 클릭)
4. 스크린샷 캡처

**포함되어야 할 요소:**
- ✅ 지원 사이트 표시
- ✅ 스크래퍼 선택 드롭다운
- ✅ 모드 선택 (현재 페이지만 / 전체 페이지)
- ✅ 시작 버튼
- ✅ 히스토리 보기 버튼 (선택)

**권장 크기:** 400px x 600px (Side Panel 전체)

---

### 2. `progress.png` - 스크래핑 진행 중 모달

**촬영 방법:**
1. Side Panel에서 "스크래핑 시작" 클릭
2. 진행 중인 모달이 나타나면 캡처
3. 가능하면 "페이지 3/15" 등 진행 상태가 보이는 시점에 캡처

**포함되어야 할 요소:**
- ✅ 회전하는 스피너 애니메이션
- ✅ 페이지 카운터 (예: "페이지 3 / 15")
- ✅ 수집된 아이템 개수 (예: "87개 수집 중...")
- ✅ 상태 메시지

**권장 크기:** 800px x 400px (페이지 중앙 부분)

---

### 3. `results.png` - 결과 페이지

**촬영 방법:**
1. 스크래핑 완료 후 결과 페이지로 이동
2. 데이터 테이블이 보이도록 캡처
3. 가능하면 3-5개 정도의 아이템이 보이도록

**포함되어야 할 요소:**
- ✅ 헤더 (스크래퍼 이름, 타임스탬프, 아이템 개수)
- ✅ 액션 버튼들 (CSV 다운로드, Google Sheets, 이메일)
- ✅ 데이터 테이블 (최소 3-5개 행)
- ✅ 썸네일 이미지
- ✅ 클릭 가능한 링크

**권장 크기:** 1200px x 800px (전체 페이지)

---

## 🎨 촬영 팁

### 화면 해상도
- **권장:** 1920x1080 (Full HD)
- 크롬 확대/축소: 100% (기본값)

### 스크린샷 도구
- **macOS:** `Cmd + Shift + 4` (영역 선택)
- **Windows:** `Win + Shift + S` (Snipping Tool)
- **Chrome Extension:** Awesome Screenshot (추천)

### 파일 형식
- **PNG** (압축 없음, 선명도 최고)
- **JPG** (용량이 작지만 선명도 약간 떨어짐)

### 개인정보 보호
스크린샷에서 개인정보가 노출되지 않도록 주의:
- ❌ 개인 이메일 주소
- ❌ 개인 판매자 정보
- ❌ 민감한 가격 정보 (필요시 모자이크 처리)

---

## 📐 스크린샷 편집 (선택사항)

더 전문적으로 보이게 하려면:

1. **테두리 추가**
   - 1-2px 회색 테두리로 경계 명확화
   - macOS: Preview → Tools → Annotate
   - 온라인: [Photopea](https://www.photopea.com/)

2. **그림자 효과**
   - 약간의 드롭 섀도우로 입체감 추가
   - CSS: `box-shadow: 0 4px 20px rgba(0,0,0,0.1)`

3. **화살표/강조 추가** (선택)
   - 중요한 기능에 화살표나 하이라이트
   - 도구: Skitch, Snagit, Figma

---

## ✅ 체크리스트

스크린샷 추가 후 확인:

- [ ] `docs/screenshots/sidepanel.png` 추가됨
- [ ] `docs/screenshots/progress.png` 추가됨
- [ ] `docs/screenshots/results.png` 추가됨
- [ ] 모든 이미지가 PNG 또는 JPG 형식
- [ ] 개인정보 노출 없음
- [ ] 해상도가 충분히 높음 (최소 800px)
- [ ] README.md의 스크린샷 섹션 업데이트 (현재는 placeholder)

---

## 📝 README 업데이트

스크린샷 추가 후 README.md 수정:

```markdown
### Side Panel - Main Control Interface
![Side Panel](docs/screenshots/sidepanel.png)

### Progress Modal - Real-Time Updates
![Progress Modal](docs/screenshots/progress.png)

### Results Page - Data Table
![Results Page](docs/screenshots/results.png)
```

현재 README에는 `(Add your screenshot here)` placeholder가 있으므로,
이미지를 추가한 후 해당 부분을 위 코드로 교체하세요.

---

**완료되면 git commit과 함께 업로드하세요!**
