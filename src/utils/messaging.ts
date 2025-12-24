/**
 * Message Utilities
 * 메시지 전송 헬퍼 함수 (타입 안전성 & 에러 처리)
 */

import type { Message } from '@/types/messages';

/**
 * Background로 메시지 전송 (에러 처리 포함)
 */
export async function sendToBackground<T = any>(message: Message): Promise<T> {
    try {
        const response = await chrome.runtime.sendMessage(message);

        if (chrome.runtime.lastError) {
            console.error('❌ Message failed:', chrome.runtime.lastError);
            throw new Error(chrome.runtime.lastError.message);
        }

        return response;
    } catch (error) {
        console.error('❌ Failed to send message:', error);
        throw error;
    }
}

/**
 * 특정 탭으로 메시지 전송
 */
export async function sendToTab<T = any>(tabId: number, message: Message): Promise<T> {
    try {
        const response = await chrome.tabs.sendMessage(tabId, message);
        return response;
    } catch (error) {
        console.error(`❌ Failed to send message to tab ${tabId}:`, error);
        throw error;
    }
}

/**
 * Side Panel로 메시지 전송 (에러 무시)
 */
export function notifySidePanel(message: Message): void {
    chrome.runtime.sendMessage(message).catch(() => {
        // Side Panel이 없을 수 있으므로 에러 무시
    });
}
