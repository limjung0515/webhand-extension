/**
 * Scrape Progress Modal
 * 스크래핑 진행 중 페이지에 표시되는 향상된 모달
 */

import type { ScrapeProgress } from '@/types/scraper';
import type { UnifiedProgress } from '@/utils/scrape-helpers';
import { OVERLAY_STYLES, MODAL_CONTAINER_STYLES, MODAL_ANIMATIONS } from './modal/ModalStyles';
import { ModalAnimator } from './modal/ModalAnimator';

export class ScrapeModal {
    private overlay: HTMLDivElement | null = null;
    private modal: HTMLDivElement | null = null;
    private progressBar: HTMLDivElement | null = null;
    private scrollAnimationId: number | null = null;
    private currentCount: number = 0; // 현재 표시 중인 숫자 (애니메이션용)

    // private pollingInterval: number | null = null;

    /**
     * 숫자 카운트업 애니메이션 (ModalAnimator 사용)
     */
    private animateCount(targetCount: number, duration: number = 1500) {
        const itemsElement = this.modal?.querySelector('#webhand-items-collected');
        if (itemsElement) {
            ModalAnimator.animateCount(itemsElement as HTMLElement, this.currentCount, targetCount, duration);
            this.currentCount = targetCount;
        }
    }


    /**
     * 모달 표시
     */
    show() {
        // 전체 화면 블러 오버레이
        this.overlay = document.createElement('div');
        this.overlay.id = 'webhand-scrape-overlay';
        this.overlay.style.cssText = OVERLAY_STYLES;

        // 클릭 차단
        this.overlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, true);

        // 모달 생성
        this.modal = document.createElement('div');
        this.modal.id = 'webhand-scrape-modal';
        this.modal.style.cssText = MODAL_CONTAINER_STYLES;

        this.modal.innerHTML = `
            <style>
                ${MODAL_ANIMATIONS}
            </style>
            
            <!-- 모달 내용 -->ㄱ
            <div style="padding: 32px 24px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="
                        font-size: 42px;
                        margin-bottom: 14px;
                    ">🔍</div>
                    <h2 id="webhand-modal-title" style="
                        margin: 0 0 8px 0;
                        font-size: 20px;
                        font-weight: 700;
                        color: #e8e8e8;
                        letter-spacing: -0.3px;
                    ">
                        스크래핑 준비 중
                    </h2>
                    <p id="webhand-modal-subtitle" style="
                        margin: 0;
                        font-size: 13px;
                        color: #b8b8b8;
                    ">
                        잠시만 기다려주세요
                    </p>
                </div>
                
                <!-- 진행상황 통계 -->
                <div id="webhand-progress-stats" style="
                    display: none;
                    padding: 16px;
                    background: #242528;
                    border-radius: 8px;
                    margin-bottom: 16px;
                ">
                    <div style="
                        display: flex;
                        justify-content: space-around;
                        gap: 16px;
                    ">
                        <div style="
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 6px;
                        ">
                            <div style="
                                font-size: 12px;
                                color: #9ca3af;
                            ">진행중</div>
                            <div id="webhand-page-progress" style="
                                font-size: 18px;
                                font-weight: 600;
                                color: #e8e8e8;
                            ">1 페이지</div>
                        </div>
                        <div style="
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 6px;
                        ">
                            <div style="
                                font-size: 12px;
                                color: #9ca3af;
                            ">수집</div>
                            <div id="webhand-items-collected" style="
                                font-size: 18px;
                                font-weight: 600;
                                color: #e8e8e8;
                            ">0개</div>
                        </div>
                    </div>
                    
                    <!-- 진행률 바 (스크롤 애니메이션용) -->
                    <div id="webhand-progress-bar-container" style="
                        display: block;
                        margin-top: 16px;
                    ">
                        <div style="
                            width: 100%;
                            height: 6px;
                            background: #3a3b40;
                            border-radius: 3px;
                            overflow: hidden;
                        ">
                            <div id="webhand-progress-bar-fill" style="
                                height: 100%;
                                width: 0%;
                                background: linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%);
                                transition: width 1.5s ease;
                                border-radius: 3px;
                            "></div>
                        </div>
                    </div>
                </div>
                
                <!-- 상태 메시지 -->
                <div id="webhand-status-message" style="
                    padding: 14px 18px;
                    background: #242528;
                    border-radius: 8px;
                    text-align: center;
                ">
                    <div style="
                        font-size: 12px;
                        color: #b8b8b8;
                        line-height: 1.5;
                    ">
                        자동으로 스크롤이 움직일 수 있습니다<br>
                        완료 후 자동으로 닫힙니다
                    </div>
                </div>
                
                <!-- 중단 버튼 -->
                <div id="webhand-stop-button-container" style="
                    margin-top: 16px;
                    text-align: center;
                    display: none;
                ">
                    <button id="webhand-stop-button" style="
                        padding: 10px 24px;
                        font-size: 14px;
                        font-weight: 500;
                        background: rgba(239, 68, 68, 0.2);
                        color: #ef4444;
                        border: 1px solid rgba(239, 68, 68, 0.3);
                        border-radius: 6px;
                        cursor: pointer;
                        transition: all 0.15s;
                    ">
                        중단하기
                    </button>
                </div>
            </div>
        `;

        this.overlay.appendChild(this.modal);
        document.body.appendChild(this.overlay);

        // 스크롤 방지 및 페이지 인터랙션 차단
        document.body.style.overflow = 'hidden';
        document.body.style.pointerEvents = 'none';

        // 프로그레스 바 참조 저장 (가운데 보라색 바를 진행률 표시용으로 사용)
        this.progressBar = this.modal.querySelector('#webhand-progress-bar-fill');

        // NOTE: 프로그레스바와 스크롤은 updateUnifiedProgress()에서 시작
    }

    /**
     * 페이지 최하단으로 부드럽게 스크롤 (ModalAnimator 사용)
     */
    private scrollToBottom() {
        this.scrollAnimationId = ModalAnimator.smoothScrollToBottom(1000);
    }

    /**
     * 진행률 업데이트
     */
    updateProgress(progress: ScrapeProgress) {
        if (!this.modal) return;

        const statusText = this.modal.querySelector('#webhand-status-text') as HTMLDivElement;
        const title = this.modal.querySelector('#webhand-modal-title') as HTMLElement;

        // 완료 또는 진행 중 시 (사용자에게는 여전히 진행중으로 표시)
        if (progress.status === 'complete' || progress.status === 'scraping') {
            // 타이틀과 상태는 그대로 유지 (진행중)
            if (statusText) {
                statusText.textContent = progress.message || '데이터 처리 중...';
            }
            // 프로그레스바는 이미 자동으로 채워지고 있음
        }
        // 에러 시
        else if (progress.status === 'error') {
            if (title) {
                title.textContent = '❌ 오류 발생';
                title.style.color = '#dc3545';
            }
            if (statusText) {
                statusText.textContent = progress.message || '스크래핑 중 오류가 발생했습니다.';
                statusText.style.color = '#dc3545';
            }

            if (this.progressBar) {
                this.progressBar.style.animation = 'none';
                this.progressBar.style.background = '#dc3545';
            }
        }
        // 진행 중
        else if (statusText) {
            statusText.textContent = progress.message || `데이터 수집 중... (${progress.current}/${progress.total || '?'})`;
        }
    }

    /**
     * 통합 진행률 업데이트 (단일/전체 페이지 모두 지원)
     */
    updateUnifiedProgress(progress: UnifiedProgress) {
        if (!this.modal) return;

        // ✅ 최상단으로 스크롤 (스크롤 다운 애니메이션 시작 전)
        if (this.progressBar && this.progressBar.style.width === '0%') {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }

        const statsContainer = this.modal.querySelector('#webhand-progress-stats') as HTMLDivElement;
        const pageProgress = this.modal.querySelector('#webhand-page-progress') as HTMLDivElement;
        const statusMessage = this.modal.querySelector('#webhand-status-message') as HTMLDivElement;
        const subtitle = this.modal.querySelector('#webhand-modal-subtitle') as HTMLElement;

        // ✅ 첫 업데이트 시 프로그레스바와 스크롤 시작
        if (this.progressBar && this.progressBar.style.width === '0%') {
            // 프로그레스바를 2초에 걸쳐 100%로 채우기
            setTimeout(() => {
                if (this.progressBar) {
                    this.progressBar.style.width = '100%';
                }
            }, 50);

            // 페이지 최하단으로 스크롤
            this.scrollToBottom();
        }

        // 통계 표시
        if (statsContainer) {
            statsContainer.style.display = 'block';
        }

        // 페이지 진행률
        if (pageProgress) {

            if (progress.mode === 'multi' && progress.totalPages) {
                // 전체 페이지: "1 / 7 페이지"
                const displayText = `${progress.currentPage} / ${progress.totalPages} 페이지`;
                pageProgress.textContent = displayText;
            } else {
                // 현재 페이지: URL에서 실제 페이지 번호 추출
                const currentPageFromUrl = this.getCurrentPageFromUrl();
                const displayText = `${currentPageFromUrl} 페이지`;
                pageProgress.textContent = displayText;
            }
        }

        // 수집 아이템 (애니메이션 적용)
        // UX 개선: 실제보다 1-2개 적게 표시해서 화면 전환이 자연스럽게 느껴지도록
        const displayCount = Math.max(0, progress.itemsCollected - Math.floor(Math.random() * 2));
        this.animateCount(displayCount, 1500);

        // (프로그레스 바는 첫 업데이트 시 위에서 100%로 채워짐)

        // 상태 메시지
        if (statusMessage && progress.message) {
            const messageDiv = statusMessage.querySelector('div');
            if (messageDiv) {
                messageDiv.innerHTML = progress.message;
            }
        }

        // 서브타이틀 업데이트
        if (subtitle) {
            if (progress.status === 'complete') {
                subtitle.textContent = '완료되었습니다!';
                subtitle.style.color = '#10b981';
            } else if (progress.status === 'error') {
                subtitle.textContent = '오류가 발생했습니다';
                subtitle.style.color = '#ef4444';
            } else {
                subtitle.textContent = '데이터를 수집하고 있습니다';
            }
        }
    }

    /**
     * URL에서 현재 페이지 번호 추출
     * 예: ?pagenum=0 → 1페이지, ?pagenum=1 → 2페이지
     */
    private getCurrentPageFromUrl(): number {
        try {
            const url = new URL(window.location.href);
            const pagenum = url.searchParams.get('pagenum');
            if (pagenum !== null) {
                return parseInt(pagenum, 10) + 1; // pagenum=0이 1페이지
            }
        } catch (error) {
            console.warn('Failed to extract page number from URL:', error);
        }
        return 1; // 기본값
    }

    /**
     * 모달 숨기기 (즉시)
     */
    hide() {
        // 폴링 중단
        // this.stopPolling();

        // 스크롤 애니메이션 즉시 중단
        if (this.scrollAnimationId !== null) {
            cancelAnimationFrame(this.scrollAnimationId);
            this.scrollAnimationId = null;
        }

        // 오버레이 즉시 제거
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
            this.modal = null;
            this.progressBar = null;
        }

        // 스크롤 및 인터랙션 복원
        document.body.style.overflow = '';
        document.body.style.pointerEvents = '';

        // count 리셋 (다음 모달에서 0부터 시작)
        this.currentCount = 0;

        // 중단 플래그 정리 (centralized cleanup)
        chrome.storage.session.remove('stop_all_scraping').catch(() => { });
    }

    // /**
    //  * 폴링 시작 - chrome.storage.session에서 전역 중단 플래그 확인 (200ms마다)
    //  */
    // startPolling() {
    //     // 이미 폴링 중이면 무시 (중복 방지)
    //     if (this.pollingInterval !== null) {
    //         console.warn('⚠️ Polling already active, skipping');
    //         return;
    //     }

    //     this.pollingInterval = window.setInterval(async () => {
    //         try {
    //             const result = await chrome.storage.session.get('stop_all_scraping');
    //             if (result.stop_all_scraping) {
    //                 console.log('🛑 Polling detected global stop flag - hiding modal');
    //                 this.hide();
    //             }
    //         } catch (error) {
    //             console.warn('Polling error:', error);
    //         }
    //     }, 200);

    //     console.log('✅ Modal polling started (200ms interval)');
    // }

    // /**
    //  * 폴링 중단
    //  */
    // private stopPolling() {
    //     if (this.pollingInterval !== null) {
    //         clearInterval(this.pollingInterval);
    //         this.pollingInterval = null;
    //         console.log('⏹️ Modal polling stopped');
    //     }
    // }
}
