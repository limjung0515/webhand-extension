import type { ScraperConfig, SupportedSite } from '@/types/scraper-config';


/**
 * 지원 사이트 목록
 */
export const SUPPORTED_SITES: SupportedSite[] = [
    {
        name: '도매매',
        domain: 'domemedb.domeggook.com',
        url: 'https://domemedb.domeggook.com',
        icon: '🏪'
    },
    {
        name: '네이버 부동산',
        domain: 'm.land.naver.com',
        url: 'https://m.land.naver.com',
        icon: '🏠'
    },
    {
        name: '카카오맵',
        domain: 'map.kakao.com',
        url: 'https://map.kakao.com',
        icon: '🗺️'
    }
];

/**
 * 스크래퍼 설정 목록
 */
export const SCRAPERS: ScraperConfig[] = [
    {
        id: 'domeme-products',
        name: '도매매 상품 목록',
        icon: '📦',
        domain: 'domemedb.domeggook.com',
        url: 'https://domemedb.domeggook.com',
        matcher: (url: string) => url.includes('domemedb.domeggook.com'),
        scraperClass: 'DomemeScraper'
    },
    {
        id: 'naver-land-map',
        name: '네이버 부동산 매물',
        icon: '🏠',
        domain: 'm.land.naver.com',
        url: 'https://m.land.naver.com',
        matcher: (url: string) => url.includes('m.land.naver.com/map'),
        scraperClass: 'NaverLandScraper'
    }
];

/**
 * URL에 맞는 모든 스크래퍼 찾기
 */
export function findAllScrapersForUrl(url: string): ScraperConfig[] {
    return SCRAPERS.filter(scraper => scraper.matcher(url));
}

/**
 * ID로 스크래퍼 찾기
 */
export function getScraperById(id: string): ScraperConfig | undefined {
    return SCRAPERS.find(scraper => scraper.id === id);
}

/**
 * 도메인으로 사이트 정보 찾기
 */
export function getSiteByDomain(domain: string): SupportedSite | undefined {
    return SUPPORTED_SITES.find(site => domain.includes(site.domain));
}

/**
 * URL로 사이트 정보 찾기
 */
export function getSiteByUrl(url: string): SupportedSite | undefined {
    try {
        const hostname = new URL(url).hostname;
        return SUPPORTED_SITES.find(site => hostname.includes(site.domain));
    } catch {
        return undefined;
    }
}
