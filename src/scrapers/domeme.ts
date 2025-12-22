/**
 * Domeme (도매매) Scraper
 */

import type { ProductItem, ScrapeProgress } from '@/types/scraper';

export const DOMEME_CONFIG = {
    id: 'domeme',
    name: '도매매',
    url: 'https://domemedb.domeggook.com',
    favicon: 'https://domemedb.domeggook.com/favicon.ico',
    matcher: (url: string) => url.includes('domemedb.domeggook.com')
};

export class DomemeScraper {
    private currentPage = 0;
    private results: ProductItem[] = [];

    constructor() { }

    /**
     * 현재 페이지 스크래핑
     */
    scrapeCurrentPage(): ProductItem[] {
        const items: ProductItem[] = [];
        const productCards = document.querySelectorAll('.sub_cont_bane1');

        productCards.forEach((card) => {
            try {
                const item = this.extractProductData(card as HTMLElement);
                if (item) {
                    items.push(item);
                }
            } catch (error) {
                console.error('Failed to extract product:', error);
            }
        });

        return items;
    }

    /**
     * 상품 데이터 추출
     */
    private extractProductData(card: HTMLElement): ProductItem | null {
        const nameEl = card.querySelector('.itemName');
        const idEl = card.querySelector('.txt8');
        const imageEl = card.querySelector('img');
        const linkEl = card.querySelector('a[href*="supplyView"]');

        if (!nameEl) return null;

        const text = card.textContent || '';

        // 가격 추출 (도매꾹판매가 4,020원)
        const priceMatch = text.match(/도매꾹판매가\s*([\d,]+)원/);
        const price = priceMatch ? priceMatch[1] + '원' : '';

        // 배송비 추출
        const shippingMatch = text.match(/(선결제|착불|무료)\s*([\d,]*)\s*원?/);
        const shipping = shippingMatch ? shippingMatch[0] : '';

        // 판매자 추출
        const sellerEl = card.querySelector('.main_cont_text3');
        const seller = sellerEl?.textContent?.trim() || '';

        return {
            name: nameEl.textContent?.trim() || '',
            productId: idEl?.textContent?.trim() || '',
            price,
            shipping,
            seller,
            imageUrl: imageEl?.src || '',
            productUrl: linkEl ? window.location.origin + (linkEl as HTMLAnchorElement).getAttribute('href') : ''
        };
    }

    /**
     * 전체 페이지 스크래핑
     */
    async scrapeAllPages(
        onProgress: (progress: ScrapeProgress) => void
    ): Promise<ProductItem[]> {
        this.results = [];
        this.currentPage = 1;

        // 첫 페이지 스크래핑
        const firstPageItems = this.scrapeCurrentPage();
        this.results.push(...firstPageItems);

        onProgress({
            current: 1,
            total: 0, // 아직 모름
            status: 'scraping',
            message: '페이지 1 스크래핑 중...'
        });

        // 다음 페이지들 순회
        while (true) {
            const nextButton = this.findNextButton();

            if (!nextButton) {
                // 마지막 페이지
                onProgress({
                    current: this.currentPage,
                    total: this.currentPage,
                    status: 'complete',
                    message: '스크래핑 완료!'
                });
                break;
            }

            // 진행 상황을 storage에 저장 (페이지 이동 대비)
            try {
                await chrome.storage.local.set({
                    scrape_in_progress: {
                        currentPage: this.currentPage,
                        results: this.results
                    }
                });
            } catch (e) {
                console.warn('Failed to save progress:', e);
            }

            // 다음 페이지로 이동
            nextButton.click();
            await this.waitForPageLoad();

            this.currentPage++;

            // 현재 페이지 스크래핑
            const pageItems = this.scrapeCurrentPage();
            this.results.push(...pageItems);

            onProgress({
                current: this.currentPage,
                total: 0, // Unknown
                status: 'scraping',
                message: `페이지 ${this.currentPage} 스크래핑 중... (${this.results.length}개 수집)`
            });
        }

        // 완료 후 진행 상황 삭제
        try {
            await chrome.storage.local.remove('scrape_in_progress');
        } catch (e) {
            console.warn('Failed to clear progress:', e);
        }

        return this.results;
    }

    /**
     * 다음 버튼 찾기
     */
    findNextButton(): HTMLAnchorElement | null {
        // img alt="다음페이지 바로가기"의 부모 a 태그
        const nextImg = Array.from(document.querySelectorAll('img')).find(
            img => img.alt === '다음페이지 바로가기'
        );

        if (nextImg) {
            const link = nextImg.closest('a');
            // href가 javascript:가 아닌지 확인
            if (link && link.getAttribute('href') && !link.getAttribute('href')!.startsWith('javascript:')) {
                return link as HTMLAnchorElement;
            }
        }

        return null;
    }

    /**
     * 페이지 로드 대기
     */
    waitForPageLoad(): Promise<void> {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const hasProducts = document.querySelector('.sub_cont_bane1');

                if (hasProducts) {
                    clearInterval(checkInterval);
                    // 추가 안정화 대기
                    setTimeout(resolve, 500);
                }
            }, 100);

            // 타임아웃 (10초)
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 10000);
        });
    }
}
