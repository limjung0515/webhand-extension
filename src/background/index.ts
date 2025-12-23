/**
 * Background Service Worker
 * Handles message routing and manages extension state
 */

import { MessageType, type Message } from '../types/messages';

console.log('🚀 WebHand Background Service Worker loaded');

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
            handleStartScrape(message.payload, sender.tab?.id);
            break;

        case MessageType.READ_PAGE:
            handleReadPage(sender.tab?.id);
            break;

        case MessageType.OPEN_RESULT_PAGE:
            handleOpenResultPage(message.payload);
            break;

        case MessageType.SCRAPE_PROGRESS:
            console.log('📊 Scrape progress:', message.payload);
            break;

        default:
            // Handle custom message types
            if ((message.type as any) === 'START_ALL_PAGE_SCRAPE') {
                handleAllPageScrape(message.payload);
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

// Start scraping
async function handleStartScrape(config: any, tabId?: number) {
    if (!tabId) return;

    console.log('🔧 Starting scrape with config:', config);

    try {
        // Forward to content script
        const response = await chrome.tabs.sendMessage(tabId, {
            type: MessageType.START_SCRAPE,
            payload: config
        });

        console.log('✅ Scrape started:', response);
    } catch (error) {
        console.error('❌ Scrape failed:', error);
    }
}

// Read page content
async function handleReadPage(tabId?: number) {
    if (!tabId) return;

    try {
        const response = await chrome.tabs.sendMessage(tabId, {
            type: MessageType.READ_PAGE
        });

        console.log('✅ Page content read:', response);
    } catch (error) {
        console.error('❌ Failed to read page:', error);
    }
}

// Open result page
async function handleOpenResultPage(payload: { resultId: string }) {
    const resultUrl = chrome.runtime.getURL(`src/pages/results.html?id=${payload.resultId}`);

    try {
        await chrome.tabs.create({ url: resultUrl });
        console.log('✅ Result page opened:', payload.resultId);
    } catch (error) {
        console.error('❌ Failed to open result page:', error);
    }
}


// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    console.log('🖱️ Extension icon clicked');
    handleOpenSidePanel(tab.id);
});

// Handle all-page scraping (Background controls page navigation)
async function handleAllPageScrape(payload: { tabId: number; scraperId: string; baseUrl: string }) {
    const { tabId, scraperId, baseUrl } = payload;
    
    // baseUrl을 정규화 (항상 pagenum=0로 설정 - 1페이지)
    const normalizedUrl = normalizeStartUrl(baseUrl);
    
    console.log('🔄 Starting all-page scrape for:', scraperId);
    console.log('📍 Normalized URL:', normalizedUrl);
    
    const allResults: any[] = [];
    let currentPage = 0; // domeme는 pagenum=0이 1페이지
    const MAX_RETRIES = 3;
    
    try {
        // 먼저 1페이지로 이동
        console.log('🔄 Navigating to page 1...');
        await chrome.tabs.update(tabId, { url: normalizedUrl });
        await waitForPageLoad(tabId);
        
        while (true) {
            console.log(`📄 Scraping page ${currentPage + 1} (pagenum=${currentPage})...`);
            
            let pageResults = null;
            let retryCount = 0;
            
            // 재시도 로직
            while (retryCount < MAX_RETRIES) {
                try {
                    // 현재 페이지 스크래핑 요청
                    const response = await chrome.tabs.sendMessage(tabId, {
                        type: 'START_SITE_SCRAPE',
                        payload: {
                            scraperId: scraperId,
                            options: { mode: 'current' },
                            _fromBackground: true
                        }
                    });
                    
                    if (response.success && response.results && response.results.length > 0) {
                        pageResults = response.results;
                        console.log(`✅ Page ${currentPage + 1}: ${pageResults.length} items collected`);
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
            
            // 결과 추가
            if (pageResults && pageResults.length > 0) {
                allResults.push(...pageResults);
            } else {
                console.warn(`⚠️ Page ${currentPage + 1}: Skipped after ${MAX_RETRIES} retries`);
            }
            
            // 다음 페이지 확인
            let hasNextPage = false;
            try {
                hasNextPage = await chrome.tabs.sendMessage(tabId, {
                    type: 'CHECK_NEXT_PAGE',
                    payload: { scraperId }
                });
                console.log(`📋 Has next page: ${hasNextPage}`);
            } catch (error) {
                console.error('Failed to check next page:', error);
            }
            
            if (!hasNextPage) {
                console.log('✅ No more pages. Scraping complete!');
                break;
            }
            
            // URL 기반으로 다음 페이지로 이동
            currentPage++;
            const nextPageUrl = buildNextPageUrl(normalizedUrl, currentPage);
            
            console.log(`🔄 Navigating to page ${currentPage + 1} (pagenum=${currentPage}): ${nextPageUrl}`);
            await chrome.tabs.update(tabId, { url: nextPageUrl });
            
            // 페이지 로드 완료 대기
            await waitForPageLoad(tabId);
        }
        
        // 모든 결과 저장
        const scrapeResult = {
            id: Date.now().toString(),
            scraperId: scraperId,
            scraperName: scraperId === 'domeme' ? '도매매' : scraperId,
            url: baseUrl,
            timestamp: Date.now(),
            totalItems: allResults.length,
            items: allResults
        };
        
        await chrome.storage.local.set({
            [`scrape_result_${scrapeResult.id}`]: scrapeResult
        });
        
        console.log(`🎉 Scraping complete! Total items: ${allResults.length}`);
        
        // 결과 페이지 열기
        await handleOpenResultPage({ resultId: scrapeResult.id });
        
    } catch (error) {
        console.error('❌ All-page scrape failed:', error);
    }
}

// Normalize URL to start from page 1 (pagenum=0)
function normalizeStartUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        urlObj.searchParams.set('pagenum', '0');
        return urlObj.toString();
    } catch (error) {
        console.error('Failed to normalize URL:', error);
        return url;
    }
}

// Build next page URL
function buildNextPageUrl(baseUrl: string, pageNum: number): string {
    try {
        const urlObj = new URL(baseUrl);
        urlObj.searchParams.set('pagenum', pageNum.toString());
        return urlObj.toString();
    } catch (error) {
        console.error('Failed to build next page URL:', error);
        return baseUrl;
    }
}

// Wait for page to fully load
function waitForPageLoad(tabId: number): Promise<void> {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.warn('⚠️ Page load timeout');
            resolve();
        }, 10000); // 10초 타임아웃

        const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                clearTimeout(timeout);
                chrome.tabs.onUpdated.removeListener(listener);
                // 추가 안정화 대기
                setTimeout(resolve, 1000);
            }
        };

        chrome.tabs.onUpdated.addListener(listener);
    });
}
