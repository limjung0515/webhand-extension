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
    }, []);

    const handleStartScrape = async () => {
        if (!isDomeme) {
            alert('도매매 사이트에서만 사용할 수 있습니다.');
            return;
        }

        setIsLoading(true);

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab.id) {
                throw new Error('활성 탭을 찾을 수 없습니다');
            }

            const options: ScrapeOptions = {
                mode: scrapeMode
            };

            await chrome.tabs.sendMessage(tab.id, {
                type: 'START_SITE_SCRAPE',
                payload: {
                    scraperId: 'domeme',
                    options
                }
            });

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
                <button
                    className="btn-scrape"
                    onClick={handleStartScrape}
                    disabled={!isDomeme || isLoading}
                >
                    {isLoading ? '⏳ 스크래핑 중...' : '🔍 스크래핑 시작'}
                </button>
            </section>
        </div>
    );
}

export default App;
