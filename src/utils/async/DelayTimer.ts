/**
 * DelayTimer Utility
 * 페이지 전환 간 타이밍 제어를 위한 타이머
 */

export class DelayTimer {
    private startTime: number = 0;
    private targetDuration: number;

    constructor(targetMs: number = 3000) {
        this.targetDuration = targetMs;
    }

    // 시작 시 호출
    start() {
        this.startTime = Date.now();
    }

    restart() {
        this.start();
    }

    // 종료 및 대기 (한 번에 처리)
    async waitRemaining(): Promise<void> {
        const elapsed = Date.now() - this.startTime;
        const remaining = Math.max(0, this.targetDuration - elapsed);

        if (remaining > 0) {
            await new Promise(resolve => setTimeout(resolve, remaining));
        }
    }

    // 경과 시간 확인 (디버깅용)
    getElapsed(): number {
        return Date.now() - this.startTime;
    }
}
