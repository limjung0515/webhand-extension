/**
 * Scraper Types
 */

export interface ScraperConfig {
    id: string;
    name: string;
    url: string;
    favicon: string;
    matcher: (url: string) => boolean;
}

export interface ScrapeOptions {
    mode: 'current' | 'all';
}

export interface ScrapeProgress {
    current: number;
    total: number;
    status: 'scraping' | 'complete' | 'error';
    message?: string;
}

export interface ScrapeResult {
    id: string;
    scraperId: string;
    scraperName: string;
    url: string;
    timestamp: number;
    totalItems: number;
    items: ProductItem[];
}

export interface ProductItem {
    name: string;
    productId: string;
    price: string;
    shipping: string;
    seller: string;
    imageUrl: string;
    productUrl: string;
}
