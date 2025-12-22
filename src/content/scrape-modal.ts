/**
 * Scrape Progress Modal
 * 스크래핑 진행 중 페이지에 표시되는 모달
 */

import type { ScrapeProgress } from '@/types/scraper';

export class ScrapeModal {
    private overlay: HTMLDivElement | null = null;
    private modal: HTMLDivElement | null = null;

    /**
     * 모달 표시
     */
    show() {
        // 오버레이 생성 (블러 배경)
        this.overlay = document.createElement('div');
        this.overlay.id = 'webhand-scrape-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(5px);
            z-index: 999998;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // 모달 생성
        this.modal = document.createElement('div');
        this.modal.id = 'webhand-scrape-modal';
        this.modal.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            min-width: 400px;
            max-width: 500px;
            text-align: center;
        `;

        this.modal.innerHTML = `
            <div style="margin-bottom: 24px;">
                <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
                <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #333;">
                    스크래핑 중...
                </h2>
            </div>
            
            <div id="webhand-progress-container" style="margin-bottom: 16px;">
                <div style="background: #f0f0f0; border-radius: 8px; height: 8px; overflow: hidden; margin-bottom: 8px;">
                    <div id="webhand-progress-bar" style="
                        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                        height: 100%;
                        width: 0%;
                        transition: width 0.3s ease;
                    "></div>
                </div>
                <div id="webhand-progress-text" style="font-size: 14px; color: #666;">
                    페이지 1 스크래핑 중...
                </div>
            </div>
            
            <div style="
                padding: 12px;
                background: #fff3cd;
                border: 1px solid #ffc107;
                border-radius: 6px;
                font-size: 13px;
                color: #856404;
            ">
                ⚠️ 스크래핑 중에는 페이지를 클릭하거나 스크롤하지 마세요.
            </div>
        `;

        this.overlay.appendChild(this.modal);
        document.body.appendChild(this.overlay);

        // 스크롤 방지
        document.body.style.overflow = 'hidden';
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
            const title = this.modal.querySelector('h2');
            if (title) {
                title.textContent = '✅ 스크래핑 완료!';
            }
            if (progressText) {
                progressText.textContent = progress.message || '결과 페이지로 이동합니다...';
            }
        }

        // 에러 시
        if (progress.status === 'error') {
            const title = this.modal.querySelector('h2');
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
            this.overlay.remove();
            this.overlay = null;
            this.modal = null;
        }

        // 스크롤 복원
        document.body.style.overflow = '';
    }
}
