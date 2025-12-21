export interface ScrapedData {
    url: string;
    title: string;
    timestamp: number;
    fields: Record<string, any>;
}

export interface ScrapeResult {
    success: boolean;
    data?: ScrapedData[];
    error?: string;
}

export interface ExtensionSettings {
    apiKey?: string;
    autoSave: boolean;
    defaultFields: string[];
}
