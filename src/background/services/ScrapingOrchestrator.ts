/**
 * ScrapingOrchestrator
 * 다중 페이지 스크래핑의 오케스트레이션을 담당
 * 
 * 책임:
 * - 페이지 간 스크래핑 조율
 * - 재시도 로직
 * - 진행 상태 추적
 */

import { DelayTimer } from '@/utils/async/DelayTimer';

export class ScrapingOrchestrator {
    private shouldStop = false;
    private timer: DelayTimer;

    constructor(targetDuration: number = 3000) {
        this.timer = new DelayTimer(targetDuration);
    }

    /**
     * 중단 요청
     */
    requestStop() {
        this.shouldStop = true;
    }

    /**
     * 중단 여부 확인
     */
    isStopping(): boolean {
        return this.shouldStop;
    }

    /**
     * 상태 초기화
     */
    reset() {
        this.shouldStop = false;
    }

    /**
     * 페이지 스크래핑 실행 (재시도 로직 포함)
     */
    async scrapePage(
        tabId: number,
        scraperId: string,
        currentPage: number,
        maxRetries: number = 3
    ): Promise<{ success: boolean; results?: any[]; hasNextPage?: boolean }> {
        let retryCount = 0;
        let pageResponse: any = null;

        while (retryCount < maxRetries) {
            // 중단 확인
            if (this.shouldStop) {
                return { success: false };
            }

            try {
                const response = await chrome.tabs.sendMessage(tabId, {
                    type: 'START_SITE_SCRAPE',
                    payload: {
                        mode: 'current',
                        scraperId: scraperId
                    }
                });


                if (response.success && response.results && response.results.length > 0) {
                    pageResponse = response;
                    break;
                } else {
                    console.warn(`⚠️ Page ${currentPage + 1}: Empty or invalid response, retrying... (${retryCount + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error(`❌ Page ${currentPage + 1} scrape failed (${retryCount + 1}/${maxRetries}):`, error);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            retryCount++;
        }

        // 재시도 실패
        if (!pageResponse) {
            console.warn(`⚠️ Page ${currentPage + 1}: Skipped after ${maxRetries} retries`);
            return { success: false };
        }

        return {
            success: true,
            results: pageResponse.results || [],
            hasNextPage: pageResponse.hasNextPage || false
        };
    }

    /**
     * 타이머 시작
     */
    startTimer() {
        this.timer.start();
    }

    /**
     * 타이머 재시작
     */
    restartTimer() {
        this.timer.restart();
    }

    /**
     * 남은 시간 대기
     */
    async waitTimer() {
        await this.timer.waitRemaining();
    }
}
