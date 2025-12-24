/**
 * Common scraping utility functions
 */

import type { ScrapeResult } from '@/types/scraper';
import { getScraperById } from '@/scrapers/registry';

/**
 * 스크래퍼 표시 이름 가져오기
 */
export function getScraperDisplayName(scraperId: string): string {
    const scraper = getScraperById(scraperId);
    return scraper?.name || scraperId;
}

/**
 * 스크래핑 결과 저장
 */
export async function saveScrapeResult(params: {
    scraperId: string;
    url: string;
    pageTitle?: string;
    favicon?: string;
    items: any[];
}): Promise<string> {

    const result: ScrapeResult = {
        id: Date.now().toString(),
        scraperId: params.scraperId,
        scraperName: getScraperDisplayName(params.scraperId),
        url: params.url,
        pageTitle: params.pageTitle || document.title,
        favicon: params.favicon || document.querySelector<HTMLLinkElement>('link[rel*="icon"]')?.href || '',
        timestamp: Date.now(),
        totalItems: params.items.length,
        items: params.items
    };

    await chrome.storage.local.set({
        [`scrape_result_${result.id}`]: result
    });

    console.log(`✅ Saved scrape result: ${result.id} (${result.totalItems} items)`);

    return result.id;
}

/**
 * 통합 진행상황 인터페이스
 */
export interface UnifiedProgress {
    mode: 'single' | 'multi';
    status: 'scraping' | 'complete' | 'error';
    currentPage: number;
    totalPages: number | null;
    itemsCollected: number;
    message?: string;
}

/**
 * sessionStorage에 저장할 스크래핑 상태
 */
export interface ScrapingState {
    isActive: boolean;
    mode: 'single' | 'multi';
    currentPage: number;
    totalPages: number | null;
    itemsCollected: number;
    message?: string;
}
