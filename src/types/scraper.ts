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
