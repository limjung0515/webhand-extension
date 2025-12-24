/**
 * Background Service Worker
 * Handles message routing and manages extension state
 */

import { MessageType, type Message } from '../types/messages';
// 새로운 서비스 (기존 코드와 병행 사용)
import { ScrapingOrchestrator } from './services/ScrapingOrchestrator';
import { PageNavigator } from './services/PageNavigator';
import { ResultManager } from './services/ResultManager';
// 상태 관리 서비스
import { ScrapingStateManager } from '../core/ScrapingStateManager';
// 유틸리티
import { DelayTimer } from '../utils/async/DelayTimer';

console.log('🚀 WebHand Background Service Worker loaded');

// Content Script가 session storage에 접근하고 onChanged 이벤트를 받을 수 있도록 설정
chrome.storage.session.setAccessLevel({
    accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
});
console.log('✅ Session storage access level set for Content Scripts');

// Extension installed/updated handler
chrome.runtime.onInstalled.addListener((details) => {
    console.log('📦 Extension installed/updated:', details.reason);

    if (details.reason === 'install') {
        // First time installation
        chrome.storage.local.set({
            settings: {
                autoSave: true,
                defaultFields: ['title', 'content', 'date']
            }
        });
    }
});

// Message handler
chrome.runtime.onMessage.addListener((
    message: Message,
    sender
) => {
    console.log('📨 Message received in background:', message.type, sender.tab?.id);

    switch (message.type) {
        case MessageType.OPEN_SIDE_PANEL:
            handleOpenSidePanel(sender.tab?.id);
            break;

        case MessageType.START_SCRAPE:
            handleStartScrape(message.payload);
            break;

        case 'STOP_SCRAPE':
            handleStopScrape(message.payload);
            break;

        default:
            // Handle custom message types
            if ((message.type as any) === 'OPEN_RESULT_PAGE') {
                handleOpenResultPage(message.payload);
                break;
            }
            console.warn('⚠️ Unknown message type:', message.type);
    }

    return true; // Keep message channel open for async response
});

// Open side panel
async function handleOpenSidePanel(tabId?: number) {
    if (!tabId) return;

    try {
        await chrome.sidePanel.open({ tabId });
        console.log('✅ Side panel opened for tab:', tabId);
    } catch (error) {
        console.error('❌ Failed to open side panel:', error);
    }
}

// Unified scraping entry point
async function handleStartScrape(payload: { tabId: number; scraperId: string; mode: 'current' | 'all'; baseUrl: string }) {
    const { tabId, scraperId, mode, baseUrl } = payload;
    console.log(`🚀 Starting ${mode} scraping:`, { tabId, scraperId });

    // 모든 로직은 handleAllPageScrape에서 처리
    await handleAllPageScrape({ tabId, scraperId, baseUrl, mode });
}

// Helper: Save results and open result page
async function saveAndOpenResults(payload: {
    scraperId: string;
    results: any[];
    url: string;
    pageTitle?: string;
    favicon?: string;
}) {
    // 새로운 서비스 사용
    const resultManager = new ResultManager();
    await resultManager.saveAndOpenResults(payload);

    // Side Panel에 완료 알림
    chrome.runtime.sendMessage({
        type: 'SCRAPE_COMPLETE'
    }).catch(() => { });
}

// Handle stop scrape
async function handleStopScrape(payload: { tabId: number }) {
    const { tabId } = payload;

    console.log('🛑 Stopping scrape for tab:', tabId);

    // StateManager로 중단 요청
    await stateManager.stopScraping();

    // Content Script에 모달 닫기 메시지 전송
    try {
        await chrome.tabs.sendMessage(tabId, {
            type: 'HIDE_MODAL'
        });
    } catch (error) {
        console.error('❌ Failed to send hide modal message:', error);
    }
}


// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    console.log('🖱️ Extension icon clicked');
    handleOpenSidePanel(tab.id);
});

// Open result page
async function handleOpenResultPage(payload: { resultId: string }) {
    console.log("handleOpenResultPage : handleOpenResultPage : handleOpenResultPage : handleOpenResultPage")
    const resultUrl = chrome.runtime.getURL(`src/pages/results.html?id=${payload.resultId}`);

    try {
        await chrome.tabs.create({ url: resultUrl });
        console.log('✅ Result page opened:', payload.resultId);
    } catch (error) {
        console.error('❌ Failed to open result page:', error);
    }
}

// 상태 관리 서비스 (점진적 마이그레이션용)
const stateManager = ScrapingStateManager.getInstance();

// Handle all-page scraping (Background controls page navigation)
async function handleAllPageScrape(payload: { tabId: number; scraperId: string; baseUrl: string; mode: 'current' | 'all' }) {
    const { tabId, scraperId, baseUrl, mode } = payload;

    // 서비스 초기화 (향후 확장 가능)
    const orchestrator = new ScrapingOrchestrator(3000);
    orchestrator.reset();  // 초기화

    // Reset stop flag (StateManager 병행)
    await stateManager.startScraping(tabId, scraperId);  // StateManager 초기화

    // PageNavigator 서비스
    const navigator = new PageNavigator();
    const normalizedUrl = navigator.normalizeStartUrl(baseUrl);

    console.log('🚀 Starting scraping on tab', tabId, 'mode:', mode);
    console.log('📍 Normalized URL:', normalizedUrl);

    const allResults: any[] = [];
    let currentPage = 0; // domeme는 pagenum=0이 1페이지
    const MAX_RETRIES = 3;
    const timer = new DelayTimer();


    try {
        // ===== 상태 초기화 (중요!) =====
        // StateManager가 이미 startScraping()에서 상태를 초기화함

        // Content Script 전역 변수 리셋 메시지
        try {
            await chrome.tabs.sendMessage(tabId, { type: 'RESET_STATE' });
        } catch {
            // Content Script 없으면 무시
        }

        console.log('✅ State initialized for new scraping session');

        // 모달 상태 설정 - StateManager 사용
        await stateManager.showModal(currentPage + 1, null);

        // 전체 페이지 모드: 첫 페이지로 이동
        if (mode === 'all') {
            console.log('🔄 Navigating to first page...');
            await chrome.tabs.update(tabId, { url: normalizedUrl });

            // 페이지 로드 완료 대기
            await navigator.waitForPageLoad(tabId);
            timer.start();

            // chrome.tabs.sendMessage(tabId, {
            //     type: 'SHOW_MODAL',
            //     payload: { currentPage: currentPage + 1 }
            // });

            // return;
            // // 즉시 모달 표시
            // try {
            //     await chrome.tabs.sendMessage(tabId, {
            //         type: 'SHOW_MODAL',
            //         payload: { currentPage: 1 }
            //     });
            //     console.log('✅ Modal shown immediately after navigation');
            // } catch (error) {
            //     console.error('❌ Failed to show modal:', error);
            // }
        } else {
            await chrome.tabs.sendMessage(tabId, {
                type: 'SHOW_MODAL',
                payload: { currentPage: currentPage + 1 }
            });
            timer.start();
        }

        // // Content Script 로드 대기 (짧은 추가 대기)
        // await new Promise(resolve => setTimeout(resolve, 3000));

        while (true) {
            // 중단 확인 (루프 시작 시) - StateManager 사용
            const state = await stateManager.getState();
            if (state.shouldStop) {
                console.log('🛑 Scraping stopped by user (before scraping)');

                // Side Panel에 완료 신호 (버튼 복구)
                chrome.runtime.sendMessage({
                    type: 'SCRAPE_COMPLETE'
                }).catch(() => { });
                return;
            }

            console.log(`📄 Scraping page ${currentPage + 1} (pagenum=${currentPage})...`);

            let pageResponse: any = null;
            let retryCount = 0;

            // 재시도 로직
            while (retryCount < MAX_RETRIES) {
                try {
                    const response = await chrome.tabs.sendMessage(tabId, {
                        type: 'START_SITE_SCRAPE',
                        payload: {
                            scraperId: scraperId
                        }
                    });
                    console.log("response");
                    console.log(response);
                    log('✅ Page', currentPage, 'completed');

                    if (response.success && response.results && response.results.length > 0) {
                        pageResponse = response;
                        console.log(`✅ Page ${currentPage + 1}: ${response.results.length} items collected`);

                        break;
                    } else {
                        console.warn(`⚠️ Page ${currentPage + 1}: Empty or invalid response, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (error) {
                    console.error(`❌ Page ${currentPage + 1} scrape failed (${retryCount + 1}/${MAX_RETRIES}):`, error);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                retryCount++;
            }

            console.log('중단 확인')
            // 중단 확인 - StateManager 사용
            const state2 = await stateManager.getState();
            if (state2.shouldStop) {
                console.log('🛑 Scraping stopped by user');
                // Side Panel에 완료 신호 (버튼 복구)
                chrome.runtime.sendMessage({
                    type: 'SCRAPE_COMPLETE'
                }).catch(() => { });
                return;
            }

            // 결과 추가
            if (pageResponse && pageResponse.results && pageResponse.results.length > 0) {
                allResults.push(...pageResponse.results);
            } else {
                console.warn(`⚠️ Page ${currentPage + 1}: Skipped after ${MAX_RETRIES} retries`);
            }

            console.log("pageResponse");
            console.log(pageResponse);

            // 다음 페이지 확인 (응답에 포함됨)
            const hasNextPage = pageResponse?.hasNextPage || false;
            console.log(`📋 Has next page: ${hasNextPage}`);

            await timer.waitRemaining();

            // 중단 확인 - StateManager 사용
            const state3 = await stateManager.getState();
            if (state3.shouldStop) {
                console.log('🛑 Scraping stopped by user (before scraping)');

                // Side Panel에 완료 신호 (버튼 복구)
                chrome.runtime.sendMessage({
                    type: 'SCRAPE_COMPLETE'
                }).catch(() => { });
                return;
            }

            // 현재 페이지 모드이거나 다음 페이지 없으면 종료
            if (mode === 'current' || !hasNextPage) {
                console.log(`✅ Scraping complete! (mode: ${mode}, hasNextPage: ${hasNextPage})`);
                break;
            }

            // URL 기반으로 다음 페이지로 이동
            currentPage++;
            const nextPageUrl = navigator.buildNextPageUrl(normalizedUrl, currentPage);

            console.log(`🔄 Navigating to page ${currentPage + 1}: ${nextPageUrl}`);

            // 모달 상태 설정 - StateManager 사용
            await stateManager.showModal(currentPage + 1, null);



            await chrome.tabs.update(tabId, { url: nextPageUrl });
            // 페이지 로드 완료 대기 (필수!)
            await navigator.waitForPageLoad(tabId);
            timer.restart();

            // // 즉시 모달 표시
            // try {
            //     await chrome.tabs.sendMessage(tabId, {
            //         type: 'SHOW_MODAL',
            //         payload: { currentPage: currentPage + 1 }
            //     });
            // } catch (error) {
            //     console.error('❌ Failed to show modal on next page:', error);
            // }
        }

        // 스크래핑 완료 - 모달 닫기
        try {
            await chrome.tabs.sendMessage(tabId, { type: 'HIDE_MODAL' });
            console.log('✅ Modal hidden after scraping complete');
        } catch (error) {
            console.warn('⚠️ Failed to hide modal:', error);
        }

        // 모든 결과 저장 및 페이지 열기
        // 현재 탭 정보 가져오기 (pageTitle, favicon)
        let pageTitle = '';
        let favicon = '';
        try {
            const tab = await chrome.tabs.get(tabId);
            pageTitle = tab.title || '';
            favicon = tab.favIconUrl || '';
        } catch (error) {
            console.warn('⚠️ Failed to get tab info:', error);
        }

        await saveAndOpenResults({
            scraperId,
            results: allResults,
            url: baseUrl,
            pageTitle,
            favicon
        });

        // chrome.storage.session 정리
        // stop_all_scraping은 Content Script의 hide()에서 정리
        await chrome.storage.session.remove(`scraping_state_${tabId}`);

    } catch (error) {
        console.error('❌ All-page scrape failed:', error);
    }
}

// Timestamped console log utility
function log(...args: any[]) {
    const now = new Date();
    const time = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const ms = now.getMilliseconds().toString().padStart(3, '0');
    console.log(`[${time}.${ms}]`, ...args);
}