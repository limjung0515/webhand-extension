/**
 * ScrapingStateManager
 * 스크래핑 상태를 중앙에서 관리하는 싱글톤 서비스
 * Session storage를 단일 진실의 원천(Single Source of Truth)으로 사용
 */

export interface ScrapingState {
    // 진행 상태
    isActive: boolean;
    mode: 'idle' | 'scraping' | 'paused' | 'stopping';

    // 페이지 정보
    currentPage: number;
    totalPages: number | null;
    itemsCollected: number;

    // 제어 플래그
    shouldStop: boolean;

    // 모달 상태
    modalVisible: boolean;
    modalCount: number;

    // 메타데이터
    tabId: number | null;
    scraperId: string | null;
    startedAt: number | null;
}

type StateListener = (state: ScrapingState) => void;

const DEFAULT_STATE: ScrapingState = {
    isActive: false,
    mode: 'idle',
    currentPage: 0,
    totalPages: null,
    itemsCollected: 0,
    shouldStop: false,
    modalVisible: false,
    modalCount: 0,
    tabId: null,
    scraperId: null,
    startedAt: null,
};

export class ScrapingStateManager {
    private static instance: ScrapingStateManager;
    private listeners: Set<StateListener> = new Set();
    private static readonly STORAGE_KEY = 'scraping_state';

    private constructor() {
        // 싱글톤
    }

    /**
     * 싱글톤 인스턴스 가져오기
     */
    static getInstance(): ScrapingStateManager {
        if (!ScrapingStateManager.instance) {
            ScrapingStateManager.instance = new ScrapingStateManager();
        }
        return ScrapingStateManager.instance;
    }

    /**
     * 현재 상태 가져오기
     */
    async getState(): Promise<ScrapingState> {
        try {
            const result = await chrome.storage.session.get(ScrapingStateManager.STORAGE_KEY);
            return result[ScrapingStateManager.STORAGE_KEY] || DEFAULT_STATE;
        } catch (error) {
            console.error('Failed to get scraping state:', error);
            return DEFAULT_STATE;
        }
    }

    /**
     * 상태 업데이트 (부분 업데이트 지원)
     */
    async updateState(partial: Partial<ScrapingState>): Promise<void> {
        try {
            const currentState = await this.getState();
            const newState = { ...currentState, ...partial };

            await chrome.storage.session.set({
                [ScrapingStateManager.STORAGE_KEY]: newState
            });

            // 리스너들에게 통지
            this.notifyListeners(newState);
        } catch (error) {
            console.error('Failed to update scraping state:', error);
        }
    }

    /**
     * 상태 초기화
     */
    async reset(): Promise<void> {
        await this.updateState(DEFAULT_STATE);
    }

    /**
     * 편의 메서드: 스크래핑 시작
     */
    async startScraping(tabId: number, scraperId: string): Promise<void> {
        await this.updateState({
            isActive: true,
            mode: 'scraping',
            shouldStop: false,
            tabId,
            scraperId,
            startedAt: Date.now(),
            currentPage: 0,
            itemsCollected: 0,
        });
    }

    /**
     * 편의 메서드: 스크래핑 중단 요청
     */
    async stopScraping(): Promise<void> {
        await this.updateState({
            shouldStop: true,
            mode: 'stopping',
        });
    }

    /**
     * 편의 메서드: 진행 상황 업데이트
     */
    async updateProgress(currentPage: number, itemsCollected: number): Promise<void> {
        await this.updateState({
            currentPage,
            itemsCollected,
        });
    }

    /**
     * 편의 메서드: 모달 표시 상태 업데이트
     */
    async showModal(currentPage: number, totalPages: number | null = null): Promise<void> {
        await this.updateState({
            modalVisible: true,
            modalCount: 1,
            currentPage,
            totalPages,
        });
    }

    /**
     * 편의 메서드: 모달 숨기기
     */
    async hideModal(): Promise<void> {
        await this.updateState({
            modalVisible: false,
            modalCount: 0,
        });
    }

    /**
     * 상태 변경 구독
     */
    subscribe(listener: StateListener): () => void {
        this.listeners.add(listener);

        // 구독 해제 함수 반환
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * 리스너들에게 상태 변경 통지
     */
    private notifyListeners(state: ScrapingState): void {
        this.listeners.forEach(listener => {
            try {
                listener(state);
            } catch (error) {
                console.error('Error in state listener:', error);
            }
        });
    }
}
