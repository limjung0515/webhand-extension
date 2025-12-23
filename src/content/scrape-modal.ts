/**
 * Scrape Progress Modal
 * 스크래핑 진행 중 페이지에 표시되는 향상된 모달
 */

import type { ScrapeProgress } from '@/types/scraper';

export class ScrapeModal {
    private overlay: HTMLDivElement | null = null;
    private modal: HTMLDivElement | null = null;
    private progressBar: HTMLDivElement | null = null;
    private scrollAnimationId: number | null = null;

    /**
     * 모달 표시
     */
    show() {
        // 전체 화면 블러 오버레이
        this.overlay = document.createElement('div');
        this.overlay.id = 'webhand-scrape-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
        `;

        // 클릭 차단
        this.overlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, true);

        // 모달 생성
        this.modal = document.createElement('div');
        this.modal.id = 'webhand-scrape-modal';
        this.modal.style.cssText = `
            position: relative;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
            min-width: 450px;
            max-width: 500px;
        `;

        this.modal.innerHTML = `
            <style>
                @keyframes webhand-modal-appear {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                @keyframes webhand-progress-indeterminate {
                    0% {
                        left: -50%;
                    }
                    100% {
                        left: 100%;
                    }
                }
            </style>
            
            <!-- 상단 프로그레스 바 -->
            <div style="
                position: relative;
                height: 4px;
                background: #e0e0e0;
                overflow: hidden;
            ">
                <div id="webhand-top-progress-bar" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    height: 100%;
                    width: 0%;
                    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                    transition: width 2s linear;
                "></div>
            </div>
            
            <!-- 모달 내용 -->
            <div style="padding: 36px 28px;">
                <div style="text-align: center; margin-bottom: 28px;">
                    <div style="
                        font-size: 42px;
                        margin-bottom: 14px;
                    ">🔍</div>
                    <h2 id="webhand-modal-title" style="
                        margin: 0 0 8px 0;
                        font-size: 20px;
                        font-weight: 700;
                        color: #333;
                        letter-spacing: -0.3px;
                    ">
                        스크래핑 진행 중
                    </h2>
                    <p style="
                        margin: 0;
                        font-size: 13px;
                        color: #999;
                    ">
                        잠시만 기다려주세요
                    </p>
                </div>
                
                <!-- 간결한 안내 -->
                <div style="
                    padding: 14px 18px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    text-align: center;
                ">
                    <div style="
                        font-size: 12px;
                        color: #666;
                        line-height: 1.5;
                    ">
                        자동으로 스크롤이 움직일 수 있습니다<br>
                        완료 후 자동으로 닫힙니다
                    </div>
                </div>
            </div>
        `;

        this.overlay.appendChild(this.modal);
        document.body.appendChild(this.overlay);

        // 스크롤 방지 및 페이지 인터랙션 차단
        document.body.style.overflow = 'hidden';
        document.body.style.pointerEvents = 'none';

        // 프로그레스 바 참조 저장
        this.progressBar = this.modal.querySelector('#webhand-top-progress-bar');

        // 프로그레스바를 2초에 걸쳐 100%로 채우기 (비동기로 시작)
        setTimeout(() => {
            if (this.progressBar) {
                this.progressBar.style.width = '100%';
            }
        }, 50); // 약간의 지연 후 시작 (transition이 제대로 작동하도록)

        // 페이지 최하단으로 스크롤 (UX)
        this.scrollToBottom();
    }

    /**
     * 페이지 최하단으로 부드럽게 스크롤
     */
    private scrollToBottom() {
        const duration = 1500; // 1.5초 (더 천천히)
        const start = window.pageYOffset;
        const end = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
        ) - window.innerHeight;
        const distance = end - start;

        if (distance <= 0) return; // 이미 하단이면 스킵

        const startTime = performance.now();

        const scroll = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-in-out)
            const easeProgress = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            window.scrollTo(0, start + distance * easeProgress);

            if (progress < 1) {
                this.scrollAnimationId = requestAnimationFrame(scroll);
            } else {
                this.scrollAnimationId = null;
            }
        };

        this.scrollAnimationId = requestAnimationFrame(scroll);
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
     * 모달 숨기기 (즉시)
     */
    hide() {
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
    }
}
