/**
 * Scraper Configuration Types
 * 스크래퍼 설정 타입 정의
 */

export interface ScraperConfig {
    id: string;              // 'domeme-products'
    name: string;            // '도매매 상품 목록'
    icon: string;            // '🏪'
    domain: string;          // 'domemedb.domeggook.com'
    url: string;             // 'https://domemedb.domeggook.com'
    matcher: (url: string) => boolean;

    // 스크래핑 로직 (기존 스크래퍼 클래스 참조)
    scraperClass: string;    // 'DomemeScraper'
}

export interface SupportedSite {
    name: string;
    url: string;
    domain: string;
    icon: string;
}
