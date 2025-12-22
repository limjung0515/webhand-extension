/**
 * Content Script
 * Injected into web pages to perform scraping
 */

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

// Add button to open side panel
function injectOpenButton() {
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
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectOpenButton);
} else {
    injectOpenButton();
}
