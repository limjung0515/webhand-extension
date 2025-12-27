# PRD: 라이프이즈세일즈 AI Review 분석기

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | 라이프이즈세일즈 AI Review 분석기 |
| **목적** | 수많은 리뷰 중 비즈니스에 실질적인 단서가 되는 '진짜 정보'가 담긴 리뷰를 AI가 골라내어 빠르게 검토하기 위함 |
| **핵심 가치** | 단순 나열이 아닌, AI 추천순 정렬을 통해 정보 밀도가 높은 리뷰 우선 확인 |

---

## 2. 기술 스택 (Tech Stack)

- **Frontend**: React 19 (TypeScript)
- **Styling**: Tailwind CSS (CDN 또는 설치형)
- **Build Tool**: Vite
- **AI Engine**: Google Gemini API (@google/genai SDK 사용)
  - Text Model: gemini-2.0-flash-exp (리뷰 분석 및 인사이트 생성)
- **Data Scraping**: Kmong API + allorigins Proxy (CORS 우회 필수)
- **Data Storage**: localStorage (히스토리 및 로그 저장)
- **Icons**: Font Awesome 6.5.1
- **Auth**: Gemini API Key 사용

---

## 3. 핵심 기능 요구사항

### 3.1. 공통 기능

- **API Key 관리**: 사용자가 본인의 Google AI Studio API 키를 연동하거나 시스템 환경변수 키를 사용
- **네비게이션**: 리뷰 분석하기 / 히스토리 보기 탭 전환 기능
- **지원 플랫폼 (Phase 1)**: 
  - 크몽 (최우선 구현)
  - 유튜브 (준비)
  - 쿠팡 (준비)

### 3.2. 서비스 흐름 (Simplified Flow)

#### Step 1: 통합 검색 및 수집 인터페이스
- **UI 설계**: 상단에 지원하는 서비스(크몽, 유튜브, 쿠팡 등)를 스타일리시한 아이콘으로 나열.
- **자동 감지**: 사용자가 URL을 입력하면 시스템이 어느 플랫폼인지 자동으로 판단 (별도 선택 과정 생략).
- **리뷰 시각화 (중요)**: 
  - 수집된 리뷰를 AI 분석 전에 먼저 **매우 심미적인 카드 리스트**로 출력.
  - 사용자가 직접 리뷰 원본을 훑어보며 현장의 목소리를 느낄 수 있도록 가독성 최우선 설계.
  - 요약 통계(평점 분포, 누적 리뷰수) 제공.

#### Step 2: AI 우선순위 정렬 (AI Priority Sorting)
- **기능**: 수집된 모든 리뷰를 AI가 분석하여 '정보 가치'에 따라 재정렬.
- **정렬 기준**: 
  - **AI 추천순**: 단순 칭찬("감사합니다", "최고")은 뒤로, 구체적 니즈나 서비스 활용 맥락이 담긴 리뷰는 최상단으로.
  - **최신순**: 크몽 등 플랫폼의 기본 정렬 방식 유지.
- **UI**: 두 가지 정렬 모드를 쉽게 전환할 수 있는 버튼 또는 메뉴 제공.
- **포커스**: 인사이트 요약문을 읽는 대신, **정렬된 원본 리뷰를 직접 빠르게 훑어보는 것**이 핵심 UX.

### 3.3. 히스토리 관리 (History)

- **저장 방식**: localStorage 사용
  - 분석 날짜/시간
  - 플랫폼 종류
  - 상품/컨텐츠 URL 또는 제목
  - AI 정렬 점수 및 순위 데이터
  - 리뷰 데이터 원본 (선택적)
- **히스토리 리스트 UI**:
  - 카드 형태로 과거 분석 표시
  - 최신순 정렬
  - 검색 및 필터 기능
  - 클릭 시 상세 분석 결과 보기
- **관리 기능**:
  - 개별 삭제
  - 전체 삭제
  - 내보내기 (JSON 파일)

### 3.5. 과금 관리 및 이용 제한 (Usage Control)
- **API Quota 설정 (Google Cloud Console)**: 
  - 관리자(사용자)는 Google Cloud Console에서 일일 API 호출량 하드 쿼터(Hard Quota)를 설정하여 예기치 못한 과금 방지.
  - 예산 알림(Budget Alert) 설정 권장.
- **사용자별 일일 이용 제한 (Client-side)**: 
  - **로그인 없이** 구현하기 위해 `localStorage`에 '마지막 이용 날짜'와 '오늘 이용 횟수'를 저장.
  - 하루 최대 **10회**로 제한 (자정 기준 초기화).
  - 횟수 초과 시 "오늘 이용 횟수를 모두 소진했습니다. 내일 다시 이용해 주세요." 안내 메시지 노출 및 분석 버튼 비활성화.
- **L-Debug 콘솔 (Debugging Tool)**:
  - 실시간 로깅: API 요청/응답, INFO, ERROR, SUCCESS 상태를 타임스탬프와 함께 기록
  - UI: 우측 하단 플로팅 버튼으로 온/오프 가능한 다크 터미널 스타일 터미널 UI
  - 데이터 검사: 로그 클릭 시 전달된 JSON 데이터 원본(Input/Output) 확인 가능

---

## 4. 데이터 구조 (Types)

```typescript
// 플랫폼 종류
export type Platform = 'kmong' | 'youtube' | 'coupang';

// 단일 리뷰 데이터
export interface Review {
  id: string;
  author: string;
  content: string;
  rating?: number;        // 별점 (있는 경우)
  date: string;
  helpful?: number;       // 도움됨 수 (있는 경우)
}

// 리뷰 수집 결과
export interface ReviewCollection {
  platform: Platform;
  url: string;
  productId: string;
  productTitle?: string;
  totalReviews: number;
  averageRating?: number;
  reviews: Review[];
  collectedAt: string;    // ISO 8601 timestamp
}

// 정렬 옵션
export interface SortingOptions {
  sortBy: 'latest' | 'ai_recommended';
}

// AI 정렬 결과
export interface RankingResult {
  reviewId: string;
  score: number;        // 0~100 가치 점수
  reason: string;       // 왜 이 리뷰가 상단에 배치되었는지 (단서 요약)
}

// 히스토리 아이템
export interface HistoryItem {
  id: string;
  reviewCollection: ReviewCollection;
  rankingResults: RankingResult[];
  createdAt: string;
}
```

---

## 5. API 연동 사양

### 5.1. 크몽 API (Kmong)

**Endpoint**: `https://api.kmong.com/order-app/order/v1/reviews/gigs/{gigId}`

**Query Parameters**:
- `perPage`: 페이지당 리뷰 수 (권장: 20~50)
- `sortType`: 정렬 방식 (`CREATED_AT_DESC` 사용)
- `page`: 페이지 번호 (1부터 시작)

**응답 구조 예상**:
```json
{
"reviewPage": {
"totalItemCount": 15,
"lastPage": 3,
"currentPage": 1,
"perPage": 5,
"items": [
{
"buyerReview": {
"reviewId": 3864788,
"userId": 4797881,
"nickname": "섬세******",
"thumbnail": "https://d2v80xjmx68n4w.cloudfront.net/members/thumbs/default/064_orange.png",
"comment": "쿠팡 작업후 또 고민도없이...구매했습니다.\n아직은 초기라 뭐가 뭔지는 모르겠지만\n조금더 지켜보면 성과가 있을거라 생각합니다.\n상담도 잘받아주시고 너무 감사합니다.\n다음건도 또 그럼 ...뿅",
"score": 5,
"files": null,
"statusType": "ACTIVE",
"isBizUser": false,
"jobSectorId": 14,
"createdDateTime": "2025-12-25 21:14:49",
"repliedDateTime": "2025-12-25 21:14:49"
},
"sellerReview": null,
"orderDetail": {
"orderId": 6939845,
"gigId": 672902,
"productTitle": "미친 OTT 제휴마케팅 AI풀자동화 노하우",
"productThumbnail": "https://d2v80xjmx68n4w.cloudfront.net/gigs/APFxc1748788376.jpg",
"days": "4일",
"totalPrice": 550000,
"minPrice": 500000,
"maxPrice": 600000,
"priceRangeInKo": "50만원 ~ 60만원"
},
"isReorder": false,
"isReviewAd": false,
"isReviewBlocked": false
},
{
"buyerReview": {
"reviewId": 3850981,
"userId": 35025,
"nickname": "쌈마*",
"thumbnail": "https://d2v80xjmx68n4w.cloudfront.net/members/thumbs/dEhPN1583145357.jpg",
"comment": "그냥최고입니다\n더이상묻지도 말고 구매하세요\n판매자님친절하시구 일처리깔끔합니다\n여지껏크몽 판매자님중최고",
"score": 5,
"files": null,
"statusType": "ACTIVE",
"isBizUser": false,
"jobSectorId": null,
"createdDateTime": "2025-12-15 22:09:28",
"repliedDateTime": "2025-12-15 22:09:28"
},
"sellerReview": null,
"orderDetail": {
"orderId": 6921506,
"gigId": 672902,
"productTitle": "미친 OTT 제휴마케팅 AI풀자동화 노하우",
"productThumbnail": "https://d2v80xjmx68n4w.cloudfront.net/gigs/APFxc1748788376.jpg",
"days": "2일",
"totalPrice": 690000,
"minPrice": 600000,
"maxPrice": 700000,
"priceRangeInKo": "60만원 ~ 70만원"
},
"isReorder": false,
"isReviewAd": false,
"isReviewBlocked": false
},
{
"buyerReview": {
"reviewId": 3833673,
"userId": 2084282,
"nickname": "힐링****",
"thumbnail": "https://d2v80xjmx68n4w.cloudfront.net/members/thumbs/default.png",
"comment": "이런 것도 있구나 라는 것을 알게 되어 신기했구요 앞으로 이 것으로 제2의 월급이 되었으면 좋겠습니다. 감사합니다!!",
"score": 5,
"files": null,
"statusType": "ACTIVE",
"isBizUser": false,
"jobSectorId": null,
"createdDateTime": "2025-12-03 22:36:40",
"repliedDateTime": "2025-12-03 22:36:40"
},
"sellerReview": null,
"orderDetail": {
"orderId": 6885170,
"gigId": 672902,
"productTitle": "미친 OTT 제휴마케팅 AI풀자동화 노하우",
"productThumbnail": "https://d2v80xjmx68n4w.cloudfront.net/gigs/APFxc1748788376.jpg",
"days": "2일",
"totalPrice": 490000,
"minPrice": 400000,
"maxPrice": 500000,
"priceRangeInKo": "40만원 ~ 50만원"
},
"isReorder": false,
"isReviewAd": false,
"isReviewBlocked": false
},
{
"buyerReview": {
"reviewId": 3814401,
"userId": 4746776,
"nickname": "끈질********",
"thumbnail": "https://d2v80xjmx68n4w.cloudfront.net/members/thumbs/default/171_blue.png",
"comment": "왜 이제야 여기를 알았는지 지난 시간들이 아깝네요 물어보는 것들마다 성심성의껏 답변해 주시고 피드백이 너무 좋습니다 무엇보다도 풀 오토라서 좋고 아무것도 몰라도 할 수 있어서 무척 좋네요 다른 서비스들도 믿고 구매해 보려고요 앞으로도 같이 쭉 가고 싶습니다!",
"score": 5,
"files": null,
"statusType": "ACTIVE",
"isBizUser": false,
"jobSectorId": null,
"createdDateTime": "2025-11-21 01:57:33",
"repliedDateTime": "2025-11-21 01:57:33"
},
"sellerReview": null,
"orderDetail": {
"orderId": 6841369,
"gigId": 672902,
"productTitle": "미친 OTT 제휴마케팅 AI풀자동화 노하우",
"productThumbnail": "https://d2v80xjmx68n4w.cloudfront.net/gigs/APFxc1748788376.jpg",
"days": "4일",
"totalPrice": 620000,
"minPrice": 600000,
"maxPrice": 700000,
"priceRangeInKo": "60만원 ~ 70만원"
},
"isReorder": false,
"isReviewAd": false,
"isReviewBlocked": false
},
{
"buyerReview": {
"reviewId": 3811211,
"userId": 3845711,
"nickname": "낙천*******",
"thumbnail": "https://d2v80xjmx68n4w.cloudfront.net/members/thumbs/default/167_yellow.png",
"comment": "제가 이쪽으로는 아는게 없어 상담후 추천받아 해보게되었습니다.\n판매자분께서 안내를 잘해주시고 피드백도 빠르십니다.\n판매자분께서 최대한 잘 도와주시겠다고하셔서 신뢰감에 용기내어 구매하였고 아직제가 미숙해서 아직 사용법을 파악중이지만 판매자분께서 잘도와주실것으로 사료됩니다. 제경우 OTT전에 쿠팡파트너스 블로그 자동화수익을 먼저 상담했었고 수익화를위해서 같이 병행하게되었습니다. :)일단 저는 아무지식이없기에 막막했는데 블로그자동업데이트글역시 판매자분께서 다셋팅해주셨고, 수익 이루어진다면 제가 이비용으로는 할수없을 시스템이라고 봅니다.",
"score": 5,
"files": null,
"statusType": "ACTIVE",
"isBizUser": false,
"jobSectorId": 14,
"createdDateTime": "2025-11-19 10:33:33",
"repliedDateTime": "2025-11-19 10:33:33"
},
"sellerReview": null,
"orderDetail": {
"orderId": 6826723,
"gigId": 672902,
"productTitle": "미친 OTT 제휴마케팅 AI풀자동화 노하우",
"productThumbnail": "https://d2v80xjmx68n4w.cloudfront.net/gigs/APFxc1748788376.jpg",
"days": "7일",
"totalPrice": 688000,
"minPrice": 600000,
"maxPrice": 700000,
"priceRangeInKo": "60만원 ~ 70만원"
},
"isReorder": false,
"isReviewAd": false,
"isReviewBlocked": false
}
]
},
"aggregates": {
"bizUserCount": 3,
"aggregateJobSectors": [
{
"jobSectorId": 14,
"count": 7
},
{
"jobSectorId": 21,
"count": 1
}
]
}
}
```

**구현 로직**:
1. URL에서 gigId 추출
2. page=1부터 시작하여 API 호출
3. 응답에서 totalPages 확인
4. totalPages까지 반복 호출하여 모든 리뷰 수집
5. 각 페이지 로딩 상태를 UI에 표시

### 5.2. 유튜브 API (준비)

**방식**: YouTube Data API v3 사용
- Comments: threads endpoint 활용
- 필요: YouTube API Key

### 5.3. 쿠팡 API (준비)

**방식**: 
- 공식 API가 없을 수 있으므로 추가 조사 필요
- 대안: 크롤링 또는 Coupang Partners API 검토

---

## 6. 프롬프트 엔지니어링 전략 (AI Logic)

개발 시 `services/geminiService.ts`에 포함되어야 할 핵심 프롬프트 지침입니다.

### 6.1. 리뷰 분석 프롬프트 템플릿

```typescript
const ANALYSIS_SYSTEM_PROMPT = `
당신은 리뷰 데이터 필터링 및 정렬 전문가입니다.
귀하의 작업은 수많은 리뷰 중에서 비즈니스에 실질적인 단서(Market Insight)가 될 수 있는 리뷰를 우선순위대로 정렬하는 것입니다.

# 유용한 리뷰의 판단 기준 (높은 점수)
- **비즈니스 단서**: "A를 하기 전에 B를 상담받았다", "C 서비스와 병행하고 있다" 등 새로운 사업 아이디어나 확장 가능성이 보이는 언급.
- **구체적인 니즈**: "이런 업무 고민이 있었는데 이 기능으로 해결했다"는 구체적인 활용 사례.
- **기능적 요구/결핍**: "이런 게 더 있으면 좋겠다"는 실질적 건의사항.

# 무의미한 리뷰의 판단 기준 (낮은 점수)
- **내용 없는 칭찬**: "친절해요", "최고입니다", "감사드려요", "또 구매할게요".
- **단순 기대감**: "월급이 되었으면 좋겠네요", "잘 운영해볼게요".
- **일반적 감상**: "반신반의했는데 결과가 좋네요", "신기합니다".

# 출력 형식
반드시 다음 JSON 배열 형식으로만 응답하세요:
[{ "id": "리뷰ID", "score": 점수(0~100), "point": "왜 유용한지 15자 이내 요약" }]
`;

const buildRankingPrompt = (reviews: Review[]): string => {
  let prompt = `# 리뷰 정렬 및 스코어링 요청\n\n`;
  prompt += `아래 리뷰들을 분석하여 비즈니스 가치가 높은 순서로 정렬하기 위한 데이터를 추출하세요.\n\n`;

  prompt += `## 분석 대상 리뷰\n`;
  reviews.forEach((review, idx) => {
    prompt += `[ID: ${review.id}] ${review.content}\n`;
  });
  
  return prompt;
};
```

### 6.2. Gemini API 호출 로직

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }
  
  async analyzeReviews(
    reviews: Review[], 
    options: AnalysisOptions
  ): Promise<AnalysisResult> {
    const model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      systemInstruction: ANALYSIS_SYSTEM_PROMPT
    });
    
    const prompt = buildAnalysisPrompt(reviews, options);
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // 섹션별로 파싱 (구현 필요)
    return parseAnalysisResponse(text, options);
  }
}
```

---

## 7. 개발 요청용 프롬프트 (Master Prompt)

이 내용을 AI(Cursor, ChatGPT, Gemini 등)에게 입력하면 위 앱을 즉시 구현할 수 있습니다.

```text
React 19, TypeScript, Tailwind CSS를 사용하여 'LifeIsSales AI Review 분석기'라는 고품질 SaaS 웹앱을 개발해줘. 

### 1. 디자인 및 UX (Premium SaaS Look)
- **컬러**: `bg-slate-50` 배경, `blue-600` 포인트, `indigo-600` 강조 컬러 사용.
- **스타일**: `rounded-3xl`의 매우 둥근 모서리, `backdrop-blur-md` 내비게이션, `animate-fadeIn` 등장 효과.
- **아이콘**: Font Awesome 6.5.1 활용.
- **푸터**: 모든 페이지 하단에 라이프이즈세일즈 공식 푸터 고정 (Youtube, Thread, 리틀리 링크).

### 2. 핵심 기능 요구사항
- **리뷰 수집 및 표시**: 크몽 URL 입력 시 자동 감지하여 리뷰 수집. 수집된 원본 리뷰를 심미적인 카드 리스트로 즉시 노출.
- **AI 추천순 정렬 (압도적 핵심)**: 
  - 단순히 칭찬만 있는 리뷰("감사합니다", "최고", "친절해요" 등)는 뒤로 보냄.
  - 전직 고민, 타 서비스 병행, 구체적 활용 루틴, 기능적 결핍/제안이 포함된 리뷰만 상단에 배치.
  - 정렬 기준: [AI 추천순] vs [최신순] 토글 버튼 제공.
- **사용자 이용 제한 (자체 방어)**:
  - 로그인 없이 `localStorage`를 활용하여 사용자당 **하루 10회** 이용 제한 로직을 구현해줘.
  - 자정(KST) 기준 초기화, 횟수 초과 시 정중한 안내 메시지와 함께 버튼 비활성화 처리 필수.
- **기술 사양**: CORS 우회를 위해 allorigins 프록시 사용. Google Gemini API를 활용한 리뷰 스코어링 (JSON 응답 스키마 사용 필수).
- **L-Debug 콘솔**: 우측 하단 토글 가능한 디버그 콘솔 탑재.

### 3. 기술 스택 및 구조
- Vite, React 19, `@google/generative-ai`.
- `services/` 폴더 내에 `reviewService.ts`, `geminiService.ts`, `storageService.ts`로 분리.
- AI 응답은 정해진 JSON 스키마([{ id, score, point }])를 따르도록 구현.

위 요구사항을 바탕으로 즉시 실행 가능한 전체 소스 코드를 작성해줘.
```

---

## 8. 앱 푸터 (App Footer)

앱 인터페이스 하단에 항상 고정으로 표시되는 푸터를 구현합니다:

```
이 앱은 라이프이즈세일즈의 지침으로 만들어졌습니다.
유튜브와 쓰레드 팔로우 부탁드려요!

유튜브 (Youtube): 
쓰레드 (Thread):
리틀리: 
```

**구현 요구사항:**
- 앱 레이아웃 최하단에 푸터 컴포넌트로 구현
- 각 링크는 클릭 가능한 하이퍼링크로 구현
- 새 탭에서 열리도록 target="\_blank" 속성 적용
- 모든 페이지(리뷰 분석하기, 히스토리)에서 항상 표시

---

## 9. 확장 계획 (Future Enhancements)

### Phase 2
- 유튜브 댓글 분석 구현
- 쿠팡 리뷰 분석 구현
- 여러 상품 비교 분석 기능

### Phase 3
- PDF 리포트 내보내기
- 트렌드 분석 (시간대별 감정 변화)
- 경쟁사 비교 분석

### Phase 4
- 팀 협업 기능 (공유, 댓글)
- 대시보드 (통합 인사이트)
- AI 추천 액션 아이템

---

## 10. 디자인 시스템 (Detailed Design)

### 10.1. 컬러 시스템 (Blue/Sky)
- **Background**: `bg-slate-50` (매우 밝은 회색조, 깨끗한 느낌)
- **Primary**: `blue-600` (신뢰감 있는 메인 블루)
- **Accent**: `indigo-600` (전문성 강조)
- **Sub**: `sky-400` (경쾌한 느낌)
- **Text**: `slate-900` (가독성 높은 어두운 무채색)
- **Surface**: White 배경 + `border-slate-200` + `shadow-sm`

### 10.2. 컴포넌트 스타일
- **Border Radius**: `rounded-3xl` (매우 둥근 모서리로 최신 SaaS 트렌드 반영)
- **Buttons**: `from-blue-600 to-indigo-600` 그라데이션 + `shadow-blue-500/20` 입체적 효과
- **Navigation**: `backdrop-blur-md` 적용된 고정 상단바
- **Animations**: `animate-fadeIn`을 통한 부드러운 요소 등장 효과
