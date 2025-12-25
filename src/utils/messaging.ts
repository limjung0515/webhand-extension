/**
 * Advanced Messaging System
 * 메시지 전송 헬퍼 함수 (타입 안전성, 에러 처리, 트레이싱)
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

interface TraceStep {
    location: string;              // e.g., "sidepanel/handleStart"
    timestamp: number;             // Step timestamp
    action: string;                // e.g., "sendToTab", "received"
}

export interface TraceInfo {
    id: string;                    // Unique trace ID
    startedAt: number;             // Start timestamp
    chain: TraceStep[];            // Message chain
    requestId?: string;            // Optional request ID for req/res matching
}

export interface RetryOptions {
    maxRetries?: number;           // Max retry attempts (default: 3)
    retryDelay?: number;           // Delay between retries in ms (default: 500)
    exponentialBackoff?: boolean;  // Use exponential backoff (default: true)
}

export interface RateLimitOptions {
    max: number;                   // Max messages per window
    window: number;                // Time window in ms
}

export interface ValidationSchema {
    type: string;                  // Required message type
    payload?: Record<string, 'string' | 'number' | 'boolean' | 'object' | string[]>;
}

export interface MessagingOptions {
    timeout?: number;              // Timeout in ms (default: 5000)
    trace?: TraceInfo;             // Existing trace to continue
    silent?: boolean;              // Suppress logs
    retry?: RetryOptions;          // Retry configuration
    rateLimit?: RateLimitOptions;  // Rate limiting
    validate?: ValidationSchema;   // Message validation schema
}

// ============================================================================
// Rate Limiter
// ============================================================================

class RateLimiter {
    private timestamps: Map<string, number[]> = new Map();

    check(key: string, options: RateLimitOptions): boolean {
        const now = Date.now();
        const timestamps = this.timestamps.get(key) || [];

        // Remove old timestamps outside the window
        const validTimestamps = timestamps.filter(ts => now - ts < options.window);

        if (validTimestamps.length >= options.max) {
            return false; // Rate limit exceeded
        }

        validTimestamps.push(now);
        this.timestamps.set(key, validTimestamps);
        return true;
    }

    cleanup(maxAge: number = 60000) {
        const now = Date.now();
        for (const [key, timestamps] of this.timestamps.entries()) {
            const valid = timestamps.filter(ts => now - ts < maxAge);
            if (valid.length === 0) {
                this.timestamps.delete(key);
            } else {
                this.timestamps.set(key, valid);
            }
        }
    }
}

const globalRateLimiter = new RateLimiter();

// Cleanup old entries every minute
setInterval(() => globalRateLimiter.cleanup(), 60000);

// ============================================================================
// Metrics & Analytics
// ============================================================================

interface MessageStats {
    sent: number;
    failed: number;
    totalLatency: number;
    avgLatency: number;
    byType: Record<string, { sent: number; failed: number; avgLatency: number }>;
}

class MessagingMetrics {
    private stats = {
        sent: 0,
        failed: 0,
        totalLatency: 0,
        byType: {} as Record<string, { sent: number; failed: number; totalLatency: number }>
    };

    recordSent(type: string, latency: number) {
        this.stats.sent++;
        this.stats.totalLatency += latency;

        if (!this.stats.byType[type]) {
            this.stats.byType[type] = { sent: 0, failed: 0, totalLatency: 0 };
        }
        this.stats.byType[type].sent++;
        this.stats.byType[type].totalLatency += latency;
    }

    recordFailed(type: string) {
        this.stats.failed++;
        if (!this.stats.byType[type]) {
            this.stats.byType[type] = { sent: 0, failed: 0, totalLatency: 0 };
        }
        this.stats.byType[type].failed++;
    }

    getStats(): MessageStats {
        const byType: Record<string, { sent: number; failed: number; avgLatency: number }> = {};

        for (const [type, stats] of Object.entries(this.stats.byType)) {
            byType[type] = {
                sent: stats.sent,
                failed: stats.failed,
                avgLatency: stats.sent > 0 ? stats.totalLatency / stats.sent : 0
            };
        }

        return {
            sent: this.stats.sent,
            failed: this.stats.failed,
            totalLatency: this.stats.totalLatency,
            avgLatency: this.stats.sent > 0 ? this.stats.totalLatency / this.stats.sent : 0,
            byType
        };
    }

    reset() {
        this.stats = {
            sent: 0,
            failed: 0,
            totalLatency: 0,
            byType: {}
        };
    }
}

const globalMetrics = new MessagingMetrics();

/**
 * Get messaging statistics
 */
export function getMessageStats(): MessageStats {
    return globalMetrics.getStats();
}

/**
 * Reset messaging statistics
 */
export function resetMessageStats(): void {
    globalMetrics.reset();
}

// ============================================================================
// Memory Management
// ============================================================================

interface TraceMemoryConfig {
    maxTraces: number;      // Max traces to keep in memory
    maxAge: number;         // Max age in ms
}

class TraceMemoryManager {
    private traces: Map<string, { trace: TraceInfo; timestamp: number }> = new Map();
    private config: TraceMemoryConfig = {
        maxTraces: 100,
        maxAge: 300000  // 5 minutes
    };

    track(trace: TraceInfo) {
        this.traces.set(trace.id, {
            trace,
            timestamp: Date.now()
        });
        this.cleanup();
    }

    cleanup() {
        const now = Date.now();
        const entries = Array.from(this.traces.entries());

        // Remove old traces
        for (const [id, data] of entries) {
            if (now - data.timestamp > this.config.maxAge) {
                this.traces.delete(id);
            }
        }

        // If still too many, remove oldest
        if (this.traces.size > this.config.maxTraces) {
            const sorted = Array.from(this.traces.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);

            const toRemove = this.traces.size - this.config.maxTraces;
            for (let i = 0; i < toRemove; i++) {
                this.traces.delete(sorted[i][0]);
            }
        }
    }

    get(traceId: string) {
        return this.traces.get(traceId)?.trace;
    }

    getStats() {
        return {
            count: this.traces.size,
            maxTraces: this.config.maxTraces,
            maxAge: this.config.maxAge
        };
    }
}

const traceMemory = new TraceMemoryManager();

// Periodic cleanup every 2 minutes
setInterval(() => traceMemory.cleanup(), 120000);

// ============================================================================
// Dead Letter Queue
// ============================================================================

interface DeadLetter {
    message: any;
    error: string;
    timestamp: number;
    attempts: number;
    trace?: TraceInfo;
}

class DeadLetterQueue {
    private queue: DeadLetter[] = [];
    private maxSize = 50;

    add(message: any, error: Error, trace?: TraceInfo, attempts: number = 1) {
        this.queue.push({
            message,
            error: error.message,
            timestamp: Date.now(),
            attempts,
            trace
        });

        // Keep queue size limited
        if (this.queue.length > this.maxSize) {
            this.queue.shift(); // Remove oldest
        }
    }

    getAll(): DeadLetter[] {
        return [...this.queue];
    }

    clear() {
        this.queue = [];
    }

    size() {
        return this.queue.length;
    }
}

const deadLetterQueue = new DeadLetterQueue();

/**
 * Get dead letter queue
 */
export function getDeadLetters(): DeadLetter[] {
    return deadLetterQueue.getAll();
}

/**
 * Clear dead letter queue
 */
export function clearDeadLetters(): void {
    deadLetterQueue.clear();
}

// ============================================================================
// Message Validation
// ============================================================================

function validateMessage(message: any, schema: ValidationSchema): { valid: boolean; error?: string } {
    if (!message || typeof message !== 'object') {
        return { valid: false, error: 'Message must be an object' };
    }

    if (message.type !== schema.type) {
        return { valid: false, error: `Expected type '${schema.type}', got '${message.type}'` };
    }

    if (schema.payload) {
        if (!message.payload || typeof message.payload !== 'object') {
            return { valid: false, error: 'Message payload must be an object' };
        }

        for (const [key, expectedType] of Object.entries(schema.payload)) {
            const value = message.payload[key];

            if (value === undefined) {
                return { valid: false, error: `Missing required field '${key}' in payload` };
            }

            if (Array.isArray(expectedType)) {
                // Enum validation
                if (!expectedType.includes(value)) {
                    return {
                        valid: false,
                        error: `Field '${key}' must be one of: ${expectedType.join(', ')}`
                    };
                }
            } else {
                // Type validation
                const actualType = typeof value;
                if (actualType !== expectedType) {
                    return {
                        valid: false,
                        error: `Field '${key}' must be ${expectedType}, got ${actualType}`
                    };
                }
            }
        }
    }

    return { valid: true };
}

// ============================================================================
// Trace Utilities
// ============================================================================

/**
 * Generate unique trace ID
 */
function generateTraceId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 5);
    return `trace-${timestamp}-${random}`;
}

/**
 * Start a new trace
 */
export function startTrace(source: string): TraceInfo {
    const now = Date.now();
    return {
        id: generateTraceId(),
        startedAt: now,
        chain: [{
            location: source,
            timestamp: now,
            action: 'start'
        }]
    };
}

/**
 * Continue existing trace or create new one
 */
export function continueTrace(trace: TraceInfo | undefined, location: string, action: string = 'step'): TraceInfo {
    if (!trace) {
        return startTrace(location);
    }

    return {
        ...trace,
        chain: [
            ...trace.chain,
            {
                location,
                timestamp: Date.now(),
                action
            }
        ]
    };
}

/**
 * Format trace output with tree visualization
 */
function formatTraceOutput(trace: TraceInfo, success: boolean, error?: any): string {
    const duration = Date.now() - trace.startedAt;
    const icon = success ? '🟢' : '🔴';
    const status = success ? 'completed' : 'failed';

    let output = `${icon} [${trace.id}] Message flow ${status} (${duration}ms)\n`;

    trace.chain.forEach((step, index) => {
        const isLast = index === trace.chain.length - 1;
        const prefix = isLast ? '   └─' : '   ├─';
        const elapsed = step.timestamp - trace.startedAt;
        const actionIcon = step.action === 'start' ? '🚀' :
            step.action === 'sendToTab' ? '📤→tab' :
                step.action === 'sendToBackground' ? '📤→bg' :
                    step.action === 'received' ? '📥' : '📍';

        output += `${prefix} ${actionIcon} ${step.location} (${elapsed}ms)\n`;
    });

    if (error) {
        output += `   └─ ❌ Error: ${error.message || error}\n`;
    } else if (success) {
        output += `   └─ ✅ Complete (${duration}ms)\n`;
    }

    return output;
}

/**
 * End trace and log output
 */
export function endTrace(trace: TraceInfo, success: boolean, error?: any): void {
    const output = formatTraceOutput(trace, success, error);

    // Track in memory
    traceMemory.track(trace);

    // Record metrics
    const latency = Date.now() - trace.startedAt;
    const messageType = trace.chain[0]?.location || 'unknown';

    if (success) {
        globalMetrics.recordSent(messageType, latency);
        console.log(output);
    } else {
        globalMetrics.recordFailed(messageType);
        console.error(output);
    }
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Check if error is expected messaging error
 */
function isExpectedMessagingError(error: any): boolean {
    if (!(error instanceof Error)) return false;

    const expectedMessages = [
        'Receiving end does not exist',
        'The message port closed',
        'No tab with id',
        'Could not establish connection'
    ];

    return expectedMessages.some(msg => error.message.includes(msg));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
    if (!(error instanceof Error)) return false;

    // Timeout errors are retryable
    if (error.message.includes('Timeout')) return true;

    // Connection errors might be temporary
    if (error.message.includes('Could not establish connection')) return true;

    return false;
}

// ============================================================================
// Retry Mechanism
// ============================================================================

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions,
    trace?: TraceInfo
): Promise<T> {
    const maxRetries = options.maxRetries ?? 3;
    const baseDelay = options.retryDelay ?? 500;
    const useExponentialBackoff = options.exponentialBackoff ?? true;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0 && trace) {
                const updatedTrace = continueTrace(trace, `retry-${attempt}`, 'retry');
                trace.chain = updatedTrace.chain;
            }

            return await fn();
        } catch (error: unknown) {
            lastError = error;

            const err = error as Error;

            // Don't retry if not retryable or last attempt
            if (!isRetryableError(err) || attempt === maxRetries) {
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = useExponentialBackoff ?
                baseDelay * Math.pow(2, attempt) :
                baseDelay;

            console.warn(`⚠️ Retry ${attempt + 1}/${maxRetries} after ${delay}ms:`, err.message);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

// ============================================================================
// Timeout Utilities
// ============================================================================

/**
 * Wrap promise with timeout
 */
function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    trace?: TraceInfo
): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            setTimeout(() => {
                const error = new Error(`Timeout after ${timeoutMs}ms`);
                if (trace) {
                    endTrace(
                        continueTrace(trace, 'timeout', 'timeout'),
                        false,
                        error
                    );
                }
                reject(error);
            }, timeoutMs);
        })
    ]);
}

// ============================================================================
// Messaging Functions
// ============================================================================

/**
 * Send message to background (enhanced with Phase 1 & 2 features)
 */
export async function sendToBackground<T = any>(
    message: any,
    options?: MessagingOptions
): Promise<{ success: boolean; data?: T; trace?: TraceInfo }> {
    // Validation
    if (options?.validate) {
        const validation = validateMessage(message, options.validate);
        if (!validation.valid) {
            console.error('❌ Message validation failed:', validation.error);
            return { success: false };
        }
    }

    // Rate limiting
    if (options?.rateLimit) {
        const allowed = globalRateLimiter.check(
            `bg-${message.type}`,
            options.rateLimit
        );
        if (!allowed) {
            console.warn('⚠️ Rate limit exceeded for:', message.type);
            return { success: false };
        }
    }

    const trace = options?.trace ?
        continueTrace(options.trace, 'sendToBackground', 'sendToBackground') :
        undefined;

    // Attach trace to message if available
    const messageWithTrace = trace ? { ...message, __trace: trace } : message;

    // Core send function
    const sendFn = async () => {
        const sendPromise = chrome.runtime.sendMessage(messageWithTrace);
        const timeoutMs = options?.timeout || 5000;

        const response = await (options?.timeout ?
            withTimeout(sendPromise, timeoutMs, trace) :
            sendPromise
        );

        if (chrome.runtime.lastError) {
            throw new Error(chrome.runtime.lastError.message);
        }

        return response;
    };

    try {
        const startTime = Date.now();

        // Apply retry if configured
        const response = options?.retry ?
            await withRetry(sendFn, options.retry, trace) :
            await sendFn();

        // Record success metrics
        if (message.type) {
            globalMetrics.recordSent(message.type, Date.now() - startTime);
        }

        return {
            success: true,
            data: response,
            trace: response?.__trace || trace
        };
    } catch (error: unknown) {
        const err = error as Error;
        const isExpected = isExpectedMessagingError(err);

        // Record failure metrics
        if (message.type) {
            globalMetrics.recordFailed(message.type);
        }

        // Add to dead letter queue if unexpected error
        if (!isExpected) {
            const attempts = options?.retry?.maxRetries ? (options.retry.maxRetries + 1) : 1;
            deadLetterQueue.add(message, err, trace, attempts);
        }

        if (!isExpected && !options?.silent) {
            console.error('❌ Unexpected runtime message error:', err);
            if (trace) {
                endTrace(trace, false, err);
            }
        }

        return { success: false, trace };
    }
}

/**
 * Send message to tab (enhanced with Phase 1 & 2 features)
 */
export async function sendToTab<T = any>(
    tabId: number,
    message: any,
    options?: MessagingOptions
): Promise<{ success: boolean; data?: T; trace?: TraceInfo }> {
    // Validation
    if (options?.validate) {
        const validation = validateMessage(message, options.validate);
        if (!validation.valid) {
            console.error('❌ Message validation failed:', validation.error);
            return { success: false };
        }
    }

    // Rate limiting
    if (options?.rateLimit) {
        const allowed = globalRateLimiter.check(
            `tab${tabId}-${message.type}`,
            options.rateLimit
        );
        if (!allowed) {
            console.warn(`⚠️ Rate limit exceeded for tab ${tabId}:`, message.type);
            return { success: false };
        }
    }

    const trace = options?.trace ?
        continueTrace(options.trace, `sendToTab(${tabId})`, 'sendToTab') :
        undefined;

    // Attach trace to message if available
    const messageWithTrace = trace ? { ...message, __trace: trace } : message;

    // Core send function
    const sendFn = async () => {
        const sendPromise = chrome.tabs.sendMessage(tabId, messageWithTrace);
        const timeoutMs = options?.timeout || 5000;

        const response = await (options?.timeout ?
            withTimeout(sendPromise, timeoutMs, trace) :
            sendPromise
        );

        return response;
    };

    try {
        const startTime = Date.now();

        // Apply retry if configured
        const response = options?.retry ?
            await withRetry(sendFn, options.retry, trace) :
            await sendFn();

        // Record success metrics
        if (message.type) {
            globalMetrics.recordSent(message.type, Date.now() - startTime);
        }

        return {
            success: true,
            data: response,
            trace: response?.__trace || trace
        };
    } catch (error: unknown) {
        const err = error as Error;
        const isExpected = isExpectedMessagingError(err);

        // Record failure metrics
        if (message.type) {
            globalMetrics.recordFailed(message.type);
        }

        // Add to dead letter queue if unexpected error
        if (!isExpected) {
            const attempts = options?.retry?.maxRetries ? (options.retry.maxRetries + 1) : 1;
            deadLetterQueue.add(message, err, trace, attempts);
        }

        // Expected errors are silently handled
        if (!isExpected && !options?.silent) {
            console.error(`❌ Unexpected tab message error (tab ${tabId}):`, err);
            if (trace) {
                endTrace(trace, false, err);
            }
        }

        return { success: false, trace };
    }
}

/**
 * Send message to side panel (fire and forget)
 */
export function notifySidePanel(message: any): void {
    chrome.runtime.sendMessage(message).catch(() => {
        // Side Panel may not exist - ignore error
    });
}

/**
 * Send message to tab (fire and forget)
 */
export function notifyTab(tabId: number, message: any): void {
    chrome.tabs.sendMessage(tabId, message).catch(() => {
        // Content script may not exist - ignore error
    });
}
