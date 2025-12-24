/**
 * Content Script
 * Injected into web pages to perform scraping
 */

import { DomemeScraper } from '@/scrapers/domeme';
import { ScrapeModal } from './scrape-modal';
import { MessageType } from '@/types/messages';

console.log('🌐 WebHand Content Script loaded on:', window.location.href);

// Timestamped console log utility
function log(...args: any[]) {
    const now = new Date();
    const time = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const ms = now.getMilliseconds().toString().padStart(3, '0');
    console.log(`[${time}.${ms}]`, ...args);
}

// Global modal reference for stop functionality
let currentModal: any = null;
// Global stop flag for scraping interruption
let shouldStop = false;

// [테스트용] count 확인해서 모달 자동 표시 함수
async function checkAndShowModalFromCount() {
    try {
        const result = await chrome.storage.session.get('test_show_modal');
        if (result.test_show_modal && result.test_show_modal.count > 0) {
            log('🎬 [COUNT] Auto-showing modal (count:', result.test_show_modal.count, ')');

            // count 감소 먼저! (중복 실행 방지)
            await chrome.storage.session.set({
                test_show_modal: { ...result.test_show_modal, count: 0 }
            });
            log('✅ Modal count decremented to 0');

            // 그 다음 모달 표시
            const modal = new ScrapeModal();
            currentModal = modal;
            modal.show();

            // modal.updateUnifiedProgress({
            //     mode: 'multi',
            //     status: 'scraping',
            //     currentPage: result.test_show_modal.currentPage || 1,
            //     totalPages: result.test_show_modal.totalPages || null,
            //     itemsCollected: 0,
            //     message: '페이지 로딩 중...'
            // });
        }
    } catch (error) {
        console.log(error);
        // 에러 무시
    }
}

// 페이지 로드 시 자동 실행
checkAndShowModalFromCount();

// Message listener
chrome.runtime.onMessage.addListener((
    message: any,
    _sender,
    sendResponse
) => {
    console.log('📨 Message received in content script:', message.type);

    switch (message.type) {
        case MessageType.START_SITE_SCRAPE:
            console.log('#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#')
            // 동기 실행
            try {
                const result = executeScraping(message.payload.scraperId);
                sendResponse(result);
            } catch (error: any) {
                sendResponse({ error: error instanceof Error ? error.message : String(error) });
            }
            return false; // 동기 응답!

        case 'SHOW_MODAL':
            // 동기 방식: 즉시 모달 생성 (count 체크 없이)
            log('🎬 [SHOW_MODAL] Creating modal synchronously');

            const modal = new ScrapeModal();
            currentModal = modal;
            modal.show();

            sendResponse({ success: true });
            return false; // 동기 응답

        case 'PING':
            // Side Panel에서 Content Script 로드 상태 확인용
            sendResponse({ ready: true });
            return false;

        case 'HIDE_MODAL':
            // Background에서 중단 메시지 받음
            console.log('⛔ Hide modal requested from Background');
            shouldStop = true;

            // 모달 즉시 닫기
            if (currentModal) {
                console.log('🔴 [MODAL HIDE] Via HIDE_MODAL message');
                currentModal.hide();
            }
            currentModal = null;

            // count 리셋 (비동기 호출, await 없이)
            chrome.storage.session.set({ test_show_modal: { count: 0 } });

            sendResponse({ success: true });

            return false;

        case 'RESET_STATE':
            // Background에서 상태 리셋 요청
            console.log('🔄 Resetting Content Script state');
            currentModal = null;
            shouldStop = false;
            sendResponse({ success: true });
            return false;

        default:
            console.warn('⚠️ Unknown message type:', message.type);
    }

    return false;
});

// Unified scraping function
function executeScraping(scraperId: string): any {
    console.log(`🎯 Starting scraping: ${scraperId}`);

    if (scraperId === 'domeme-products') {
        const scraper = new DomemeScraper();
        let modal: any = currentModal; // 기존 모달 사용

        try {
            // 모달이 없으면 새로 생성 (현재 페이지 모드)
            // if (!modal) {
            //     console.log('🟢 [DEBUG] Creating modal...');
            //     shouldStop = false;
            //     modal = new ScrapeModal();
            //     currentModal = modal;
            //     console.log('🟢 [DEBUG] Modal created, calling show()...');
            //     modal.show();
            //     console.log('🟢 [DEBUG] Modal show() called');
            // } else {
            //     console.log('🟢 [DEBUG] Using existing modal');
            // }

            // 스크래핑 실행
            console.log('🟢 [DEBUG] Starting scraping...');
            const results = scraper.scrapeCurrentPage();
            console.log('🟢 [DEBUG] Scraping complete, results:', results.length);

            // 중단 확인
            if (shouldStop) {
                console.log('⛔ Scraping stopped by user');
                console.log('🔴 [MODAL HIDE] executeScraping - stopped during scraping');
                modal?.hide();
                currentModal = null;
                return { success: false, message: 'Stopped by user' };
            }

            console.log('modal');
            console.log(modal)
            // 진행상황 표시
            if (modal) {
                modal.updateUnifiedProgress({
                    mode: 'single',
                    status: 'scraping',
                    currentPage: 1,
                    totalPages: 10,
                    itemsCollected: results.length,
                    // message: `${results.length}개 수집 완료`
                    message: `잠시만요! 완료되면 결과를 보여드릴게요`
                });
            }

            // 결과 + 다음 페이지 정보 반환
            const nextButton = scraper.findNextButton();
            const hasNextPage = nextButton !== null;
            console.log('🔍 Next button:', nextButton?.getAttribute('href'));
            console.log('📋 hasNextPage:', hasNextPage);

            return {
                success: true,
                results: results,
                hasNextPage: hasNextPage
            };

        } catch (error) {
            if (modal) {
                modal.updateProgress({
                    current: 0,
                    total: 0,
                    status: 'error',
                    message: error instanceof Error ? error.message : '알 수 없는 오류'
                });

                // 에러 표시 후 즉시 던지기
                modal.hide();
            }

            throw error;
        }
    }

    throw new Error('Unsupported scraper: ' + scraperId);
}

// Add button to open side panel
function injectOpenButton() {
    // Safety check: ensure document.body exists
    if (!document.body) {
        console.warn('⚠️ document.body not ready, retrying...');
        setTimeout(injectOpenButton, 100);
        return;
    }

    try {
        // Check if button already exists
        if (document.getElementById('webhand-open-panel')) {
            console.log('✅ WebHand button already exists');
            return;
        }

        const button = document.createElement('button');
        button.id = 'webhand-open-panel';
        button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    padding: 12px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s;
  `;
        button.textContent = '📊 WebHand';

        button.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: MessageType.OPEN_SIDE_PANEL });
        });

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });

        document.body.appendChild(button);
        console.log('✅ WebHand button injected successfully');
    } catch (error) {
        console.error('❌ Failed to inject button:', error);
    }
}

// Initialize with multiple safety checks
function initialize() {
    if (document.readyState === 'loading') {
        console.log('⏳ Document still loading, waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', injectOpenButton);
    } else {
        console.log('✅ Document ready, injecting button...');
        injectOpenButton();
    }
}

// Start initialization
initialize();

