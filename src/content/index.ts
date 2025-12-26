/**
 * Content Script
 * Injected into web pages to perform scraping
 */

import { DomemeScraper } from '@/scrapers/domeme';
import { NaverLandScraper } from '@/scrapers/naver-land';
import { ScrapeModal } from './scrape-modal';
import { MessageType } from '@/types/messages';


// Timestamped console log utility

/**
 * Content Script 로컬 상태
 * Background state와는 별도로 관리됨 (execution context 분리)
 * UI 렌더링 및 로컬 제어에만 사용
 */
let activeModal: ScrapeModal | null = null;  // 현재 활성화된 모달 인스턴스
let isStoppedByUser = false;  // 사용자에 의한 중단 플래그

/**
 * 네이버 개발자도구 탐지 우회
 * web_accessible_resources를 사용하여 CSP 우회
 */
function bypassNaverDevToolsDetection() {
    // 네이버 부동산 페이지에서만 실행
    if (!window.location.href.includes('m.land.naver.com')) {
        return;
    }

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('bypass-devtools.js');
    script.onload = () => {
        script.remove(); // 실행 후 태그 제거
    };
    script.onerror = () => {
        console.warn('⚠️ DevTools bypass injection failed');
        script.remove();
    };

    (document.head || document.documentElement).appendChild(script);
}

// 페이지 로드 즉시 실행
bypassNaverDevToolsDetection();

// [테스트용] count 확인해서 모달 자동 표시 함수
async function checkAndShowModalFromCount() {
    try {
        const result = await chrome.storage.session.get('test_show_modal');
        if (result.test_show_modal && result.test_show_modal.count > 0) {

            // count 감소 먼저! (중복 실행 방지)
            await chrome.storage.session.set({
                test_show_modal: { ...result.test_show_modal, count: 0 }
            });

            // 그 다음 모달 표시
            const modal = new ScrapeModal();
            activeModal = modal;

            // 누적 카운트를 위해 previousCount로 초기화
            const previousCount = result.test_show_modal.previousCount || 0;
            (modal as any).currentCount = previousCount;

            modal.show();

            // // 진행 상황 초기화 표시
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

    switch (message.type) {
        case MessageType.START_SITE_SCRAPE:
        case 'SCRAPE_PAGE':  // New message type from migrated background
            // 비동기 실행
            executeScraping(message.payload.scraperId)
                .then(result => sendResponse(result))
                .catch((error: any) => {
                    sendResponse({ error: error instanceof Error ? error.message : String(error) });
                });
            return true; // 비동기 응답!

        case 'SHOW_MODAL':
            // 동기 방식: 즉시 모달 생성 (count 체크 없이)

            const modal = new ScrapeModal();
            activeModal = modal;
            modal.show();

            sendResponse({ success: true });
            return false; // 동기 응답

        case 'CHECK_MODAL_STORAGE':
            // Storage를 확인하고 모달 표시
            checkAndShowModalFromCount();
            sendResponse({ success: true });
            return false;

        case 'UPDATE_PROGRESS':
            // 진행 상황 업데이트
            if (activeModal && message.payload) {
                activeModal.updateUnifiedProgress({
                    mode: 'multi',
                    status: 'scraping',
                    currentPage: message.payload.currentPage,
                    totalPages: message.payload.totalPages || null,  // payload에서 받아옴 (전체 페이지 모드만)
                    itemsCollected: message.payload.count || 0,  // count를 itemsCollected로 매핑
                    total: message.payload.total,  // 전체 아이템 수 (네이버 부동산용)
                    // message: `${message.payload.itemsCollected}개 수집 완료`
                    message: `잠시만요, 완료되면 결과를 보여드릴게요`
                });
            }
            sendResponse({ success: true });
            return false;

        case 'PING':
            // Side Panel에서 Content Script 로드 상태 확인용
            sendResponse({ ready: true });
            return false;

        case 'GET_NAVER_LAND_COUNT':
            // 네이버 부동산 매물 개수 확인
            try {
                const countElement = document.querySelector('._article ._count') as HTMLElement;
                if (!countElement) {
                    sendResponse({ count: null });
                    return false;
                }

                const text = countElement.textContent?.trim() || '';
                const match = text.match(/(\d+)\+?/);
                const count = match ? parseInt(match[1], 10) : 0;

                sendResponse({ count });
            } catch (error) {
                sendResponse({ count: null });
            }
            return false;

        case 'HIDE_MODAL':
            // Background에서 중단 메시지 받음
            isStoppedByUser = true;

            // 모달 즉시 닫기
            if (activeModal) {
                activeModal.hide();
            }
            activeModal = null;

            // count 리셋 (비동기 호출, await 없이)
            chrome.storage.session.set({ test_show_modal: { count: 0 } });

            sendResponse({ success: true });

            return false;

        case 'RESET_STATE':
            // Background에서 상태 리셋 요청 (새 스크래핑 세션 시작 시)
            activeModal = null;
            isStoppedByUser = false;
            sendResponse({ success: true });
            return false;

        case 'ENSURE_SCROLL_ENABLED':
            // 스크롤 복원 안전장치
            document.body.style.overflow = '';
            document.body.style.pointerEvents = '';
            sendResponse({ success: true });
            return false;

        default:
            console.warn('⚠️ Unknown message type:', message.type);
    }

    return false;
});

// Unified scraping function
async function executeScraping(scraperId: string): Promise<any> {

    if (scraperId === 'domeme-products') {
        const scraper = new DomemeScraper();
        let modal: any = activeModal; // 기존 모달 사용

        try {
            // 전체 페이지 수 추출 (전체 모드에서만 사용)
            const totalPages = scraper.getTotalPages();

            // 모달이 없으면 새로 생성 (현재 페이지 모드)
            // if (!modal) {
            //     isStoppedByUser = false;
            //     modal = new ScrapeModal();
            //     activeModal = modal;
            //     modal.show();
            // } else {
            // }

            // 스크래핑 실행
            const results = scraper.scrapeCurrentPage();

            // 중단 확인
            if (isStoppedByUser) {
                modal?.hide();
                activeModal = null;
                return { success: false, message: 'Stopped by user' };
            }


            // 진행상황 표시는 background script의 UPDATE_PROGRESS에서만 처리
            // executeScraping은 단순히 현재 페이지 스크래핑만 담당
            // (전체 페이지 모드에서 results.length는 현재 페이지만의 값이므로 여기서 업데이트하면 안됨)

            // 결과 + 다음 페이지 정보 반환
            const nextButton = scraper.findNextButton();
            const hasNextPage = nextButton !== null;

            return {
                success: true,
                results: results,
                hasNextPage: hasNextPage,
                totalPages: totalPages  // 전체 페이지 수 포함
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

    if (scraperId === 'naver-land-map') {
        const scraper = new NaverLandScraper();

        // Background가 이미 모달을 생성했으므로 activeModal 사용
        let modal: any = activeModal;

        // 모달이 없으면 (직접 호출된 경우) 생성
        if (!modal) {
            console.warn('⚠️ 모달이 없습니다. Background를 통해 시작하세요.');
            isStoppedByUser = false;
            modal = new ScrapeModal();
            activeModal = modal;
            modal.show();
        }

        try {
            // 스크래핑 실행 (비동기)
            // 진행률을 Background로 전송
            const results = await scraper.scrapeAll(
                (progress) => {
                    if (!isStoppedByUser) {
                        console.log('📊 진행률 업데이트:', progress);
                        // Background로 진행률 전송
                        chrome.runtime.sendMessage({
                            type: 'NAVER_LAND_PROGRESS',
                            payload: {
                                current: progress.current,
                                total: progress.total,
                                status: progress.status,
                                message: progress.message
                            }
                        }).catch(() => { }); // 에러 무시
                    }
                },
                () => isStoppedByUser  // 중단 체크 콜백
            );

            // 중단 확인
            if (isStoppedByUser) {
                modal?.hide();
                activeModal = null;
                return { success: false, message: 'Stopped by user' };
            }

            return {
                success: true,
                results: results,
                hasNextPage: false,
                totalPages: 1
            };

        } catch (error) {
            console.error('❌ 스크래핑 에러:', error);
            if (modal) {
                modal.updateProgress({
                    current: 0,
                    total: 0,
                    status: 'error',
                    message: error instanceof Error ? error.message : '알 수 없는 오류'
                });

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
    } catch (error) {
        console.error('❌ Failed to inject button:', error);
    }
}

// Initialize with multiple safety checks
function initialize() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectOpenButton);
    } else {
        injectOpenButton();
    }
}

// Start initialization
initialize();

