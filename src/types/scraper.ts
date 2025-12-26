/**
 * Scraper Types
 */

export interface ScrapeOptions {
    mode: 'current' | 'all';
}


export interface ScrapeProgress {
    current: number;
    total: number;
    status: 'scraping' | 'complete' | 'error';
    message?: string;
}

export interface ScrapeResult {
    id: string;
    scraperId: string;
    scraperName: string;
    url: string;
    pageTitle?: string;
    favicon?: string;
    timestamp: number;
    totalItems: number;
    items: ProductItem[];
}

export interface ProductItem {
    name: string;
    productId: string;
    price: string;
    shipping: string;
    seller: string;
    sellerId?: string;        // 판매자 ID
    sellerGrade?: string;     // 판매자 등급
    sellType?: string;        // 판매 타입 (사업자전용 등)
    tag?: string;             // 국내/해외 태그
    imageUrl: string;
    productUrl: string;
}

export interface NaverLandItem {
    itemId: string;          // data-id
    thumbnailUrl: string;    // 썸네일 이미지
    badge?: string;          // 아이콘 뱃지 (현장 등)
    propertyType: string;    // 매물 타입 (빌라, 아파트, 오피스텔 등)
    dealType: string;        // 거래 유형 (매매, 전세, 월세)
    price: string;           // 가격
    area?: string;           // 면적 정보 (평수/㎡)
    floor?: string;          // 층수 (예: 4/5층)
    direction?: string;      // 방향 (남동향 등)
    description?: string;    // 상세 설명
    tags: string[];          // 태그 배열 (4년이내, 화장실두개 등)
    agentName?: string;      // 중개사명
    confirmedDate?: string;  // 확인매물 날짜
    articleUrl?: string;     // 매물 상세 링크
}
