/**
 * ResultManager
 * 스크래핑 결과 저장 및 결과 페이지 열기를 담당
 * 
 * 책임:
 * - 결과 저장
 * - 결과 페이지 생성
 * - 탭 정보 가져오기
 */

export class ResultManager {
    /**
     * 탭 정보 가져오기 (제목, 파비콘)
     */
    async getTabInfo(tabId: number): Promise<{ title: string; favicon: string }> {
        try {
            const tab = await chrome.tabs.get(tabId);
            return {
                title: tab.title || '',
                favicon: tab.favIconUrl || ''
            };
        } catch (error) {
            console.warn('⚠️ Failed to get tab info:', error);
            return { title: '', favicon: '' };
        }
    }

    /**
     * 결과 저장 및 결과 페이지 열기
     */
    async saveAndOpenResults(payload: {
        scraperId: string;
        results: any[];
        url: string;
        pageTitle?: string;
        favicon?: string;
    }): Promise<void> {
        const { scraperId, results, url, pageTitle, favicon } = payload;

        // 결과 생성
        const scrapeResult = {
            id: Date.now().toString(),
            scraperId: scraperId,
            scraperName: scraperId.startsWith('domeme-') ? '도매매' : scraperId,
            url: url,
            pageTitle: pageTitle || '',
            favicon: favicon || '',
            timestamp: Date.now(),
            totalItems: results.length,
            items: results
        };

        // Chrome Storage에 저장
        await chrome.storage.local.set({
            [`scrape_result_${scrapeResult.id}`]: scrapeResult
        });

        console.log(`🎉 Scraping complete! Total items: ${results.length}`);

        // 결과 페이지 열기
        await this.openResultPage(scrapeResult.id);
    }

    /**
     * 결과 페이지 열기
     */
    async openResultPage(resultId: string): Promise<void> {
        const resultUrl = chrome.runtime.getURL(`src/pages/results.html?id=${resultId}`);
        const tab = await chrome.tabs.create({ url: resultUrl });
        console.log('✅ Result page opened:', tab.id);
    }
}
