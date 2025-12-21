/**
 * Extract text content from element recursively
 * Based on Thunderbit's recursive extraction pattern
 */
export function extractText(element: Element): string {
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

/**
 * Detect repeating list patterns
 */
export function detectListPattern(container: Element) {
    const children = Array.from(container.children);
    const MIN_ITEMS = 3;

    if (children.length < MIN_ITEMS) {
        return { isPatternDetected: false, pattern: null };
    }

    // Create signature for each child
    const signatures = new Map<string, Element[]>();

    for (const child of children) {
        const signature = getElementSignature(child);
        const items = signatures.get(signature) || [];
        items.push(child);
        signatures.set(signature, items);
    }

    // Find most common signature
    let maxCount = 0;
    let commonSignature = '';

    for (const [sig, items] of signatures.entries()) {
        if (items.length > maxCount) {
            maxCount = items.length;
            commonSignature = sig;
        }
    }

    const isPatternDetected = maxCount >= MIN_ITEMS;

    return {
        isPatternDetected,
        pattern: commonSignature,
        count: maxCount,
        elements: signatures.get(commonSignature) || []
    };
}

/**
 * Get element signature for pattern matching
 */
function getElementSignature(element: Element): string {
    const tagName = element.tagName?.toLowerCase() || '';

    // Get top classes
    const classes = Array.from(element.classList || [])
        .slice(0, 3)
        .filter(cls => !/^(odd|even|[0-9]+)$/i.test(cls))
        .sort()
        .join('.');

    const classStr = classes ? `.${classes}` : '';

    // Include child structure
    const childTags = Array.from(element.children || [])
        .slice(0, 3)
        .map(child => child.tagName?.toLowerCase())
        .join(',');

    const childStr = childTags ? `|children:${childTags}` : '';

    return `${tagName}${classStr}${childStr}`;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
