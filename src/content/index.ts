/**
 * Content Script
 * Injected into web pages to perform scraping
 */

import { DomemeScraper } from '@/scrapers/domeme';
import { ScrapeModal } from './scrape-modal';

// Inline message types to avoid imports
const MessageType = {
    START_SCRAPE: 'START_SCRAPE',
    STOP_SCRAPE: 'STOP_SCRAPE',
    SCRAPE_PROGRESS: 'SCRAPE_PROGRESS',
    SCRAPE_COMPLETE: 'SCRAPE_COMPLETE',
    SCRAPE_ERROR: 'SCRAPE_ERROR',
    READ_PAGE: 'READ_PAGE',
    READ_PAGE_RESPONSE: 'READ_PAGE_RESPONSE',
    OPEN_SIDE_PANEL: 'OPEN_SIDE_PANEL',
    CLOSE_SIDE_PANEL: 'CLOSE_SIDE_PANEL',
    SAVE_DATA: 'SAVE_DATA',
    LOAD_DATA: 'LOAD_DATA',
    UPDATE_SETTINGS: 'UPDATE_SETTINGS',
    START_SITE_SCRAPE: 'START_SITE_SCRAPE',
} as const;

// Inline utility functions
function safeQuerySelectorAll<T extends Element = Element>(
    selector: string,
    parent: Document | Element = document
): T[] {
    try {
        return Array.from(parent.querySelectorAll<T>(selector));
    } catch (error) {
        console.error('querySelectorAll failed:', error);
        return [];
    }
}

function extractText(element: Element): string {
    if (!element) return '';

    let text = '';

    for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            const content = node.textContent
                ?.replace(/\s\s+/g, ' ')
                .replace(/\n/g, ' ')
                .trim();

            if (content && content.length > 0) {
                text += content + ' ';
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;

            // Skip hidden or script elements
            if (
                el.classList?.contains('visually-hidden') ||
                /^(script|style|noscript)$/i.test(el.tagName)
            ) {
                continue;
            }

            text += extractText(el);
        }
    }

    return text.replace(/\s\s+/g, ' ').trim();
}

console.log('🌐 WebHand Content Script loaded on:', window.location.href);

// Message listener
chrome.runtime.onMessage.addListener((
    message: any,
    _sender,
    sendResponse
) => {
    console.log('📨 Message received in content script:', message.type);

    switch (message.type) {
        case MessageType.START_SCRAPE:
            handleStartScrape(message.payload)
                .then(sendResponse)
                .catch(error => sendResponse({ error: error instanceof Error ? error.message : String(error) }));
            return true; // Async response

        case MessageType.READ_PAGE:
            handleReadPage()
                .then(sendResponse)
                .catch(error => sendResponse({ error: error instanceof Error ? error.message : String(error) }));
            return true;

        case MessageType.START_SITE_SCRAPE:
            handleSiteScrape(message.payload)
                .then(sendResponse)
                .catch(error => sendResponse({ error: error instanceof Error ? error.message : String(error) }));
            return true;

        default:
            console.warn('⚠️ Unknown message type:', message.type);
    }

    return false;
});

// Start scraping
async function handleStartScrape(config: any) {
    console.log('🔧 Starting scrape...', config);

    try {
        const data = {
            url: window.location.href,
            title: document.title,
            timestamp: Date.now(),
            fields: {
                // Basic extraction
                bodyText: extractText(document.body).substring(0, 1000),
                headings: safeQuerySelectorAll('h1, h2, h3')
                    .map(el => el.textContent?.trim())
                    .filter(Boolean)
            }
        };

        // Send progress update
        chrome.runtime.sendMessage({
            type: MessageType.SCRAPE_PROGRESS,
            payload: { current: 1, total: 1 }
        });

        // Send completion
        chrome.runtime.sendMessage({
            type: MessageType.SCRAPE_COMPLETE,
            payload: { data: [data] }
        });

        return { success: true, data: [data] };
    } catch (error) {
        console.error('❌ Scrape error:', error);

        chrome.runtime.sendMessage({
            type: MessageType.SCRAPE_ERROR,
            payload: { error: error instanceof Error ? error.message : String(error) }
        });

        throw error;
    }
}

// Read page content
async function handleReadPage() {
    console.log('📖 Reading page content...');

    const content = {
        url: window.location.href,
        title: document.title,
        text: extractText(document.body),
        links: safeQuerySelectorAll('a')
            .map(a => ({
                text: (a as HTMLAnchorElement).textContent?.trim(),
                href: (a as HTMLAnchorElement).href
            }))
            .filter(link => link.text && link.href)
            .slice(0, 50) // Limit to 50 links
    };

    return { success: true, content };
}

// Site-specific scraping
async function handleSiteScrape(payload: any) {
    console.log('🎯 Starting site scrape:', payload);

    const { scraperId, options } = payload;

    // 도매매 스크래퍼
    if (scraperId === 'domeme') {
        const scraper = new DomemeScraper();
        const modal = new ScrapeModal();

        try {
            modal.show();

            let results;

            if (options.mode === 'current') {
                // 현재 페이지만
                results = scraper.scrapeCurrentPage();

                modal.updateProgress({
                    current: 1,
                    total: 1,
                    status: 'complete',
                    message: '스크래핑 완료!'
                });
            } else {
                // 전체 페이지
                results = await scraper.scrapeAllPages((progress) => {
                    modal.updateProgress(progress);

                    // Background에도 전송
                    chrome.runtime.sendMessage({
                        type: MessageType.SCRAPE_PROGRESS,
                        payload: progress
                    });
                });
            }

            // 결과 저장
            const scrapeResult = {
                id: Date.now().toString(),
                scraperId: 'domeme',
                scraperName: '도매매',
                url: window.location.href,
                timestamp: Date.now(),
                totalItems: results.length,
                items: results
            };

            // Chrome Storage에 저장
            await chrome.storage.local.set({
                [`scrape_result_${scrapeResult.id}`]: scrapeResult
            });

            // 완료 대기 (사용자가 확인할 시간)
            await new Promise(r => setTimeout(r, 1000));

            modal.hide();

            // 결과 페이지 열기
            chrome.runtime.sendMessage({
                type: 'OPEN_RESULT_PAGE',
                payload: { resultId: scrapeResult.id }
            });

            return { success: true, resultId: scrapeResult.id };

        } catch (error) {
            modal.updateProgress({
                current: 0,
                total: 0,
                status: 'error',
                message: error instanceof Error ? error.message : '알 수 없는 오류'
            });

            await new Promise(r => setTimeout(r, 2000));
            modal.hide();

            throw error;
        }
    }

    throw new Error('Unsupported scraper: ' + scraperId);
}

// Add button to open side panel
function injectOpenButton() {
    // Safety check: ensure document.body exists
    if (!document.body) {
        console.warn('⚠️ document.body not ready, retrying...');
        setTimeout(injectOpenButton, 100);
        return;
    }

    try {
        // Check if button already exists
        if (document.getElementById('webhand-open-panel')) {
            console.log('✅ WebHand button already exists');
            return;
        }

        const button = document.createElement('button');
        button.id = 'webhand-open-panel';
        button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    padding: 12px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s;
  `;
        button.textContent = '📊 WebHand';

        button.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: MessageType.OPEN_SIDE_PANEL });
        });

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });

        document.body.appendChild(button);
        console.log('✅ WebHand button injected successfully');
    } catch (error) {
        console.error('❌ Failed to inject button:', error);
    }
}

// Initialize with multiple safety checks
function initialize() {
    if (document.readyState === 'loading') {
        console.log('⏳ Document still loading, waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', injectOpenButton);
    } else {
        console.log('✅ Document ready, injecting button...');
        injectOpenButton();
    }
}

// Start initialization
initialize();
