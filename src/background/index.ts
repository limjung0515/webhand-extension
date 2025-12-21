/**
 * Background Service Worker
 * Handles message routing and manages extension state
 */

import { MessageType, type Message } from '../types/messages';

console.log('🚀 WebHand Background Service Worker loaded');

// Extension installed/updated handler
chrome.runtime.onInstalled.addListener((details) => {
    console.log('📦 Extension installed/updated:', details.reason);

    if (details.reason === 'install') {
        // First time installation
        chrome.storage.local.set({
            settings: {
                autoSave: true,
                defaultFields: ['title', 'content', 'date']
            }
        });
    }
});

// Message handler
chrome.runtime.onMessage.addListener((
    message: Message,
    sender
) => {
    console.log('📨 Message received in background:', message.type, sender.tab?.id);

    switch (message.type) {
        case MessageType.OPEN_SIDE_PANEL:
            handleOpenSidePanel(sender.tab?.id);
            break;

        case MessageType.START_SCRAPE:
            handleStartScrape(message.payload, sender.tab?.id);
            break;

        case MessageType.READ_PAGE:
            handleReadPage(sender.tab?.id);
            break;

        default:
            console.warn('⚠️ Unknown message type:', message.type);
    }

    return true; // Keep message channel open for async response
});

// Open side panel
async function handleOpenSidePanel(tabId?: number) {
    if (!tabId) return;

    try {
        await chrome.sidePanel.open({ tabId });
        console.log('✅ Side panel opened for tab:', tabId);
    } catch (error) {
        console.error('❌ Failed to open side panel:', error);
    }
}

// Start scraping
async function handleStartScrape(config: any, tabId?: number) {
    if (!tabId) return;

    console.log('🔧 Starting scrape with config:', config);

    try {
        // Forward to content script
        const response = await chrome.tabs.sendMessage(tabId, {
            type: MessageType.START_SCRAPE,
            payload: config
        });

        console.log('✅ Scrape started:', response);
    } catch (error) {
        console.error('❌ Scrape failed:', error);
    }
}

// Read page content
async function handleReadPage(tabId?: number) {
    if (!tabId) return;

    try {
        const response = await chrome.tabs.sendMessage(tabId, {
            type: MessageType.READ_PAGE
        });

        console.log('✅ Page content read:', response);
    } catch (error) {
        console.error('❌ Failed to read page:', error);
    }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    console.log('🖱️ Extension icon clicked');
    handleOpenSidePanel(tab.id);
});
