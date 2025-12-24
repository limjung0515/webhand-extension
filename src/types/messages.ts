// Message types for cross-script communication
export enum MessageType {
    // Scraping (unified)
    START_SCRAPE = 'START_SCRAPE',  // Side Panel → Background
    STOP_SCRAPE = 'STOP_SCRAPE',
    SCRAPE_COMPLETE = 'SCRAPE_COMPLETE',
    SCRAPE_ERROR = 'SCRAPE_ERROR',

    // Site-specific scraping
    START_SITE_SCRAPE = 'START_SITE_SCRAPE',

    // Page Reading
    READ_PAGE = 'READ_PAGE',
    READ_PAGE_RESPONSE = 'READ_PAGE_RESPONSE',

    // Panel Control
    OPEN_SIDE_PANEL = 'OPEN_SIDE_PANEL',
    CLOSE_SIDE_PANEL = 'CLOSE_SIDE_PANEL',

    // Storage
    SAVE_DATA = 'SAVE_DATA',
    LOAD_DATA = 'LOAD_DATA',

    // Settings
    UPDATE_SETTINGS = 'UPDATE_SETTINGS',

    // Results
    OPEN_RESULT_PAGE = 'OPEN_RESULT_PAGE',
}

export interface Message<T = any> {
    type: MessageType;
    payload?: T;
    timestamp?: number;
}

// 타입 안전한 메시지 타입 정의
export type StartScrapeMessage = Message<{
    tabId: number;
    scraperId: string;
    baseUrl: string;
    mode: 'current' | 'all';
}>;

export type ScrapeCompleteMessage = Message<{
    count?: number;
}>;

export type ScrapeErrorMessage = Message<{
    error: string;
}>;

