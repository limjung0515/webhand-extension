/**
 * Safe querySelector wrapper with error handling
 * Based on Thunderbit's pattern
 */
export function safeQuerySelector<T extends Element = Element>(
    selector: string,
    parent: Document | Element = document
): T | null {
    try {
        return parent.querySelector<T>(selector);
    } catch (error) {
        console.error('querySelector failed:', error);
        return null;
    }
}

/**
 * Safe querySelectorAll wrapper
 */
export function safeQuerySelectorAll<T extends Element = Element>(
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

/**
 * Check if element is visible
 */
export function isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);

    return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        !element.hidden &&
        element.getAttribute('aria-hidden') !== 'true'
    );
}

/**
 * Wait for element to appear
 */
export function waitForElement(
    selector: string,
    timeout = 5000
): Promise<Element> {
    return new Promise((resolve, reject) => {
        const element = safeQuerySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver(() => {
            const element = safeQuerySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}
