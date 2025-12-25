/**
 * PageNavigator
 * 탭 페이지 이동 및 로드 대기를 담당
 * 
 * 책임:
 * - URL 정규화
 * - 페이지 URL 생성
 * - 페이지 로드 대기
 */

export class PageNavigator {
    /**
     * 시작 URL로 정규화 (pagenum=0으로 설정 - 1페이지)
     */
    normalizeStartUrl(url: string): string {
        const urlObj = new URL(url);
        urlObj.searchParams.set('pagenum', '0');
        return urlObj.toString();
    }

    /**
     * 다음 페이지 URL 생성
     */
    buildNextPageUrl(baseUrl: string, pageNum: number): string {
        const urlObj = new URL(baseUrl);
        urlObj.searchParams.set('pagenum', pageNum.toString());
        return urlObj.toString();
    }

    /**
     * 페이지 로드 완료 대기
     */
    async waitForPageLoad(tabId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error(`Page load timeout (tabId: ${tabId})`));
            }, 15000); // 15초 타임아웃

            const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
                if (updatedTabId === tabId && changeInfo.status === 'complete') {
                    cleanup();
                    resolve();
                }
            };

            const cleanup = () => {
                clearTimeout(timeout);
                chrome.tabs.onUpdated.removeListener(listener);
            };

            chrome.tabs.onUpdated.addListener(listener);
        });
    }

    /**
     * 페이지로 이동
     */
    async navigateToPage(tabId: number, url: string): Promise<void> {
        await chrome.tabs.update(tabId, { url });
        await this.waitForPageLoad(tabId);
    }
}
