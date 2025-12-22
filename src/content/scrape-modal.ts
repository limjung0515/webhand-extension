/**
 * Scrape Progress Overlay
 * 스크래핑 진행 중 페이지 전체를 덮는 오버레이
 */

import type { ScrapeProgress } from '@/types/scraper';

export class ScrapeModal {
    private overlay: HTMLDivElement | null = null;
    private modal: HTMLDivElement | null = null;

    /**
     * 모달 표시
     */
    show() {
        // 전체 화면 오버레이 생성
        this.overlay = document.createElement('div');
        this.overlay.id = 'webhand-scrape-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
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

        // 모달 컨텐츠
        this.modal = document.createElement('div');
        this.modal.id = 'webhand-scrape-modal';
        this.modal.style.cssText = `
            background: white;
            border-radius: 16px;
            padding: 48px 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            min-width: 450px;
            max-width: 500px;
            text-align: center;
            animation: webhand-fade-in 0.3s ease-out;
        `;

        this.modal.innerHTML = `
            <style>
                @keyframes webhand-fade-in {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                @keyframes webhand-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
            
            <div style="margin-bottom: 32px;">
                <div style="
                    width: 60px;
                    height: 60px;
                    margin: 0 auto 20px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #667eea;
                    border-radius: 50%;
                    animation: webhand-spin 1s linear infinite;
                "></div>
                <h2 id="webhand-title" style="
                    margin: 0 0 12px 0;
                    font-size: 24px;
                    font-weight: 700;
                    color: #333;
                ">
                    스크래핑 진행 중
                </h2>
                <p style="
                    margin: 0;
                    font-size: 14px;
                    color: #666;
                    line-height: 1.6;
                ">
                    잠시만 기다려주세요...<br>
                    페이지를 클릭하거나 스크롤하지 마세요
                </p>
            </div>
            
            <div id="webhand-progress-container" style="margin-bottom: 24px;">
                <div style="
                    background: #f0f0f0;
                    border-radius: 10px;
                    height: 10px;
                    overflow: hidden;
                    margin-bottom: 12px;
                ">
                    <div id="webhand-progress-bar" style="
                        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                        height: 100%;
                        width: 0%;
                        transition: width 0.3s ease;
                    "></div>
                </div>
                <div id="webhand-progress-text" style="
                    font-size: 15px;
                    color: #666;
                    font-weight: 500;
                ">
                    페이지 1 스크래핑 중...
                </div>
            </div>
            
            <div style="
                padding: 16px;
                background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%);
                border: 2px solid #ffc107;
                border-radius: 10px;
                font-size: 13px;
                color: #856404;
                font-weight: 500;
            ">
                ⚠️ 스크래핑이 완료될 때까지 기다려주세요
            </div>
        `;

        this.overlay.appendChild(this.modal);
        document.body.appendChild(this.overlay);

        // 스크롤 방지 및 페이지 인터랙션 차단
        document.body.style.overflow = 'hidden';
        document.body.style.pointerEvents = 'none';

        // 시각 효과: 스크롤을 천천히 바닥으로
        this.scrollToBottom();
    }

    /**
     * 스크롤을 바닥으로 (시각 효과)
     */
    private scrollToBottom() {
        const duration = 1500; // 1.5초
        const start = window.pageYOffset;
        const end = document.body.scrollHeight;
        const distance = end - start;
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
                requestAnimationFrame(scroll);
            }
        };

        requestAnimationFrame(scroll);
    }

    /**
     * 진행률 업데이트
     */
    updateProgress(progress: ScrapeProgress) {
        if (!this.modal) return;

        const progressBar = this.modal.querySelector('#webhand-progress-bar') as HTMLDivElement;
        const progressText = this.modal.querySelector('#webhand-progress-text') as HTMLDivElement;

        if (progressBar && progressText) {
            if (progress.total > 0) {
                const percent = (progress.current / progress.total) * 100;
                progressBar.style.width = `${percent}%`;
                progressText.textContent = `${progress.current}/${progress.total} 페이지 (${Math.round(percent)}%)`;
            } else {
                // total을 모르는 경우
                progressText.textContent = progress.message || `페이지 ${progress.current} 스크래핑 중...`;
            }
        }

        // 완료 시 메시지 변경
        if (progress.status === 'complete') {
            const title = this.modal.querySelector('#webhand-title') as HTMLElement;
            if (title) {
                title.textContent = '✅ 스크래핑 완료!';
                title.style.color = '#28a745';
            }
            if (progressText) {
                progressText.textContent = progress.message || '결과 페이지로 이동합니다...';
                progressText.style.color = '#28a745';
            }
        }

        // 에러 시
        if (progress.status === 'error') {
            const title = this.modal.querySelector('#webhand-title') as HTMLElement;
            if (title) {
                title.textContent = '❌ 오류 발생';
                title.style.color = '#dc3545';
            }
            if (progressText) {
                progressText.textContent = progress.message || '스크래핑 중 오류가 발생했습니다.';
                progressText.style.color = '#dc3545';
            }
        }
    }

    /**
     * 모달 숨기기
     */
    hide() {
        if (this.overlay) {
            // Fade out 효과
            this.overlay.style.opacity = '0';
            this.overlay.style.transition = 'opacity 0.3s ease-out';

            setTimeout(() => {
                if (this.overlay) {
                    this.overlay.remove();
                    this.overlay = null;
                    this.modal = null;
                }
            }, 300);
        }

        // 스크롤 및 인터랙션 복원
        document.body.style.overflow = '';
        document.body.style.pointerEvents = '';
    }
}
