import { useState, useEffect } from 'react';
import { DOMEME_CONFIG } from '@/scrapers/domeme';
import type { ScrapeOptions } from '@/types/scraper';

function App() {
    const [currentUrl, setCurrentUrl] = useState<string>('');
    const [pageTitle, setPageTitle] = useState<string>('');
    const [favicon, setFavicon] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [scrapeMode, setScrapeMode] = useState<'current' | 'all'>('current');

    // 현재 사이트가 도매매인지 확인
    const isDomeme = DOMEME_CONFIG.matcher(currentUrl);

    useEffect(() => {
        // Get current tab info
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                setCurrentUrl(tabs[0].url || '');
                setPageTitle(tabs[0].title || '');
                setFavicon(tabs[0].favIconUrl || '');
            }
        });

        // Listen for scraping finished message
        // Listen for scraping status messages
        const messageListener = (message: any) => {
            if (message.type === 'SCRAPE_FINISHED') {
                console.log('📨 Scraping finished, restoring UI state');
                setIsLoading(false);
            } else if (message.type === 'SCRAPE_STARTED') {
                console.log('📨 Scraping started');
                setIsLoading(true);
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);

        return () => {
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, []);

    const handleStopScrape = async () => {
        try {
            await chrome.runtime.sendMessage({
                type: 'STOP_SCRAPE'
            });
            setIsLoading(false);
        } catch (err) {
            console.error('Failed to stop scrape:', err);
        }
    };

    const handleStartScrape = async () => {
        if (!isDomeme) {
            alert('도매매 사이트에서만 사용할 수 있습니다.');
            return;
        }

        setIsLoading(true);

        try {
            // Get the current window first
            const currentWindow = await chrome.windows.getCurrent();

            // Query for active tab in the current window
            const tabs = await chrome.tabs.query({
                active: true,
                windowId: currentWindow.id
            });

            const tab = tabs.find(t => !t.url?.startsWith('chrome-extension://'));

            if (!tab || !tab.id) {
                throw new Error('도매매 탭을 찾을 수 없습니다. 도매매 페이지에서 다시 시도해주세요.');
            }

            console.log('🎯 Sending scrape message to tab:', tab.id, tab.url);

            const options: ScrapeOptions = {
                mode: scrapeMode
            };

            // 즉시 블러 UI 표시 (UX 최우선)
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'SHOW_SCRAPE_MODAL'
                });
            } catch (e) {
                console.warn('Failed to show modal immediately:', e);
            }

            if (scrapeMode === 'all') {
                // 전체 페이지 모드: Background에서 처리
                await chrome.runtime.sendMessage({
                    type: 'START_ALL_PAGE_SCRAPE',
                    payload: {
                        tabId: tab.id,
                        scraperId: 'domeme',
                        baseUrl: tab.url
                    }
                });
            } else {
                // 현재 페이지만: Content script에서 직접 처리
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'START_SITE_SCRAPE',
                    payload: {
                        scraperId: 'domeme',
                        options
                    }
                });
            }

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error('❌ Failed to start scrape:', errorMsg);
            alert('스크래핑 시작 실패: ' + errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="app">
            <header className="header">
                <h1>📊 WebHand</h1>
                <p className="subtitle">한국 사이트 전용 스크래퍼</p>
            </header>

            {/* 현재 사이트 정보 */}
            <section className="current-site">
                <h2>🌐 현재 사이트</h2>
                <div className="site-card">
                    <div className="site-info">
                        {favicon && <img src={favicon} alt="" className="favicon" />}
                        <div>
                            <div className="site-title">{pageTitle}</div>
                            <div className="site-url">{new URL(currentUrl || 'https://example.com').hostname}</div>
                        </div>
                    </div>
                    <div className={`site-status ${isDomeme ? 'supported' : 'unsupported'}`}>
                        <span className="icon">{isDomeme ? '✅' : '❌'}</span>
                        <span>{isDomeme ? '스크래핑 가능' : '지원하지 않음'}</span>
                    </div>
                </div>
            </section>

            {/* 지원 사이트 목록 */}
            <section className="supported-sites">
                <h2>🎯 지원 사이트</h2>
                <div className="site-list">
                    <button
                        className="site-button"
                        onClick={() => {
                            chrome.tabs.create({ url: DOMEME_CONFIG.url });
                        }}
                    >
                        <span className="site-icon">🏪</span>
                        <span>{DOMEME_CONFIG.name}</span>
                        <span className="arrow">→</span>
                    </button>
                </div>
            </section>

            {/* 스크래핑 범위 */}
            {isDomeme && (
                <section className="scrape-options">
                    <h2>📏 스크래핑 범위</h2>
                    <div className="option-group">
                        <label className="radio-label">
                            <input
                                type="radio"
                                checked={scrapeMode === 'current'}
                                onChange={() => setScrapeMode('current')}
                            />
                            <span>현재 페이지만</span>
                        </label>
                        <label className="radio-label">
                            <input
                                type="radio"
                                checked={scrapeMode === 'all'}
                                onChange={() => setScrapeMode('all')}
                            />
                            <span>전체 페이지 (마지막까지)</span>
                        </label>
                    </div>
                </section>
            )}

            {/* 스크래핑 버튼 */}
            <section className="actions">
                {isLoading ? (
                    <button
                        className="btn-stop"
                        onClick={handleStopScrape}
                    >
                        ⛔ 스크래핑 중단
                    </button>
                ) : (
                    <button
                        className="btn-scrape"
                        onClick={handleStartScrape}
                        disabled={!isDomeme}
                    >
                        🔍 스크래핑 시작
                    </button>
                )}
            </section>
        </div>
    );
}

export default App;
