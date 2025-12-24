/**
 * Modal Animator
 * 모달 관련 애니메이션 처리
 */

export class ModalAnimator {
    /**
     * 숫자 카운트업 애니메이션
     * @param targetElement HTML 요소
     * @param startValue 시작 값
     * @param targetValue 목표 값
     * @param duration 애니메이션 기간 (ms)
     */
    static animateCount(
        targetElement: HTMLElement,
        startValue: number,
        targetValue: number,
        duration: number = 600
    ): void {
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // ease-in-out (천천히 시작 → 빠르게 → 천천히 끝)
            const easedProgress = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            const currentValue = Math.floor(startValue + (targetValue - startValue) * easedProgress);
            targetElement.textContent = `${currentValue}개`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // 애니메이션 완료 시 정확한 값으로 설정
                targetElement.textContent = `${targetValue}개`;
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * 페이지 최하단으로 부드럽게 스크롤
     * @param duration 스크롤 기간 (ms)
     * @returns 취소 가능한 ID
     */
    static smoothScrollToBottom(duration: number = 1000): number {
        const start = window.scrollY;
        const target = document.documentElement.scrollHeight - window.innerHeight;
        const distance = target - start;
        const startTime = Date.now();

        let animationId: number;

        const scroll = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // easing: ease-in-out
            const easedProgress = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            window.scrollTo(0, start + distance * easedProgress);

            if (progress < 1) {
                animationId = requestAnimationFrame(scroll);
            }
        };

        animationId = requestAnimationFrame(scroll);
        return animationId;
    }
}
