// Message types for cross-script communication
export enum MessageType {
    // Scraping
    START_SCRAPE = 'START_SCRAPE',
    STOP_SCRAPE = 'STOP_SCRAPE',
    SCRAPE_PROGRESS = 'SCRAPE_PROGRESS',
    SCRAPE_COMPLETE = 'SCRAPE_COMPLETE',
    SCRAPE_ERROR = 'SCRAPE_ERROR',

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
}

export interface Message<T = any> {
    type: MessageType;
    payload?: T;
    timestamp?: number;
}

export interface ScrapeConfig {
    url: string;
    fields?: string[];
    maxPages?: number;
    useAI?: boolean;
}

export interface ScrapeProgress {
    current: number;
    total: number;
}
