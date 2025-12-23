import { useState, useEffect } from 'react';
import { SUPPORTED_SITES, findAllScrapersForUrl, getSiteByUrl } from '@/scrapers/registry';
import type { ScrapeOptions, ScrapeResult } from '@/types/scraper';

type ScrapeMode = 'current' | 'all';

interface HistoryItem extends ScrapeResult {
    // ScrapeResult already has most fields we need
}

function App() {
    const [currentUrl, setCurrentUrl] = useState<string>('');
    const [pageTitle, setPageTitle] = useState<string>('');
    const [favicon, setFavicon] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [scrapeMode, setScrapeMode] = useState<ScrapeMode>('current');
    const [selectedScraperId, setSelectedScraperId] = useState<string | null>(null);
    const [showSiteDropdown, setShowSiteDropdown] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

    // 현재 URL에 맞는 스크래퍼들
    const availableScrapers = findAllScrapersForUrl(currentUrl);
    const isActive = availableScrapers.length > 0;

    // 자동으로 첫 번째 스크래퍼 선택
    useEffect(() => {
        if (availableScrapers.length > 0 && !selectedScraperId) {
            setSelectedScraperId(availableScrapers[0].id);
        } else if (availableScrapers.length === 0) {
            setSelectedScraperId(null);
        }
    }, [currentUrl, availableScrapers]);

    // 스크래핑 완료 메시지 리스너
    useEffect(() => {
        const handleMessage = (message: any) => {
            if (message.type === 'SCRAPE_COMPLETE') {
                setIsLoading(false);
            }
        };

        chrome.runtime.onMessage.addListener(handleMessage);

        return () => {
            chrome.runtime.onMessage.removeListener(handleMessage);
        };
    }, []);

    // 현재 탭 정보 업데이트 함수
    const updateCurrentTab = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                setCurrentUrl(tabs[0].url || '');
                setPageTitle(tabs[0].title || '');
                setFavicon(tabs[0].favIconUrl || '');
            }
        });
    };

    // 초기 로드 시 + 탭/페이지 변경 감지
    useEffect(() => {
        updateCurrentTab();

        const handleTabActivated = () => updateCurrentTab();
        const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id === tabId && changeInfo.url) {
                    updateCurrentTab();
                }
            });
        };
        const handleWindowFocusChanged = (windowId: number) => {
            if (windowId !== chrome.windows.WINDOW_ID_NONE) {
                updateCurrentTab();
            }
        };

        chrome.tabs.onActivated.addListener(handleTabActivated);
        chrome.tabs.onUpdated.addListener(handleTabUpdated);
        chrome.windows.onFocusChanged.addListener(handleWindowFocusChanged);

        return () => {
            chrome.tabs.onActivated.removeListener(handleTabActivated);
            chrome.tabs.onUpdated.removeListener(handleTabUpdated);
            chrome.windows.onFocusChanged.removeListener(handleWindowFocusChanged);
        };
    }, []);

    // 히스토리 로드
    const loadHistory = async () => {
        try {
            const data = await chrome.storage.local.get(null);
            const items: HistoryItem[] = [];

            for (const [key, value] of Object.entries(data)) {
                if (key.startsWith('scrape_result_')) {
                    items.push(value as HistoryItem);
                }
            }

            // 최신순 정렬
            items.sort((a, b) => b.timestamp - a.timestamp);
            setHistoryItems(items);
        } catch (err) {
            console.error('Failed to load history:', err);
        }
    };

    // 히스토리 열기
    const handleHistoryClick = () => {
        loadHistory();
        setShowHistory(true);
    };

    // 히스토리 닫기
    const handleCloseHistory = () => {
        setShowHistory(false);
    };

    // 히스토리 아이템 클릭 - 결과 페이지 열기
    const handleHistoryItemClick = (item: HistoryItem) => {
        chrome.runtime.sendMessage({
            type: 'OPEN_RESULT_PAGE',
            payload: { resultId: item.id }
        });
        setShowHistory(false);
    };

    // 히스토리 삭제
    const handleDeleteHistory = async (item: HistoryItem, e: React.MouseEvent) => {
        e.stopPropagation();

        if (confirm('이 히스토리를 삭제하시겠습니까?')) {
            try {
                await chrome.storage.local.remove(`scrape_result_${item.id}`);
                loadHistory(); // 다시 로드
            } catch (err) {
                console.error('Failed to delete history:', err);
            }
        }
    };

    const handleStartScrape = async () => {
        if (!isActive || !selectedScraperId) {
            alert('스크래핑 가능한 사이트가 아닙니다.');
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

            if (scrapeMode === 'all') {
                await chrome.runtime.sendMessage({
                    type: 'START_ALL_PAGE_SCRAPE',
                    payload: {
                        tabId: tab.id,
                        scraperId: 'domeme',
                        baseUrl: tab.url
                    }
                });
            } else {
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
            setIsLoading(false);
        }
    };

    const handleStopScrape = async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab.id) return;

            await chrome.tabs.sendMessage(tab.id, {
                type: 'STOP_SCRAPE'
            });

        } catch (err) {
            console.error('❌ Failed to stop scrape:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // 지원 사이트로 이동
    const handleSiteSelect = (url: string) => {
        chrome.tabs.create({ url });
        setShowSiteDropdown(false);
    };

    // 시간 포맷
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        if (days < 7) return `${days}일 전`;

        return date.toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="app">
            <header className="header">
                <h1>WebHand</h1>
                <button className="history-btn" onClick={handleHistoryClick} title="스크래핑 히스토리">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                </button>
            </header>

            <div className="main-content">
                {/* 기존 섹션들... */}
                <div className="section-container">
                    <h2 className="section-header">
                        <span className="section-number">1</span>
                        현재 사이트
                    </h2>
                    <div className="section-card">
                        <div
                            className={`site-selector ${isActive ? 'active' : 'inactive'}`}
                            onClick={() => setShowSiteDropdown(!showSiteDropdown)}
                        >
                            <div className="site-info">
                                {favicon && <img src={favicon} alt="" className="favicon" />}
                                <div className="site-details">
                                    <div className="site-title">{pageTitle || '페이지 제목 없음'}</div>
                                    <div className="site-url">{currentUrl ? new URL(currentUrl).hostname : ''}</div>
                                </div>
                            </div>
                            <div className="site-status-indicator">
                                <span className="status-dot"></span>
                                <svg className="chevron" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>

                        {showSiteDropdown && (
                            <div className="site-dropdown">
                                <div className="dropdown-header">지원 사이트로 이동</div>
                                {SUPPORTED_SITES.map(site => (
                                    <button
                                        key={site.domain}
                                        className="site-option"
                                        onClick={() => handleSiteSelect(site.url)}
                                    >
                                        <span className="site-icon">{site.icon}</span>
                                        <span>{site.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="section-container">
                    <h2 className="section-header">
                        <span className="section-number">2</span>
                        스크래퍼
                    </h2>
                    <div className="section-card">
                        <select
                            value={selectedScraperId || ''}
                            onChange={(e) => setSelectedScraperId(e.target.value)}
                            className="scraper-select"
                            disabled={!isActive}
                        >
                            {availableScrapers.length > 0 ? (
                                availableScrapers.map(scraper => (
                                    <option key={scraper.id} value={scraper.id}>
                                        {scraper.icon} {scraper.name}
                                    </option>
                                ))
                            ) : (
                                <option value="">사용 가능한 스크래퍼 없음</option>
                            )}
                        </select>
                    </div>
                </div>

                <div className="section-container">
                    <h2 className="section-header">
                        <span className="section-number">3</span>
                        스크래핑 범위
                    </h2>
                    <div className="section-card">
                        <div className="option-group">
                            <label className={`radio-label ${!isActive ? 'disabled' : ''}`}>
                                <input
                                    type="radio"
                                    checked={scrapeMode === 'current'}
                                    onChange={() => setScrapeMode('current')}
                                    disabled={!isActive}
                                />
                                <span>현재 페이지만</span>
                            </label>
                            <label className={`radio-label ${!isActive ? 'disabled' : ''}`}>
                                <input
                                    type="radio"
                                    checked={scrapeMode === 'all'}
                                    onChange={() => setScrapeMode('all')}
                                    disabled={!isActive}
                                />
                                <span>전체 페이지 (마지막까지)</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="actions">
                    <button
                        className={isLoading ? "btn-stop" : "btn-scrape"}
                        onClick={isLoading ? handleStopScrape : handleStartScrape}
                        disabled={!isActive}
                    >
                        {isLoading ? '스크래핑 중단' : '스크래핑 시작'}
                    </button>
                </div>
            </div>

            {/* 히스토리 모달 */}
            {showHistory && (
                <>
                    <div className="history-overlay" onClick={handleCloseHistory}></div>
                    <div className="history-modal">
                        <div className="history-header">
                            <h2>히스토리</h2>
                            <button className="close-btn" onClick={handleCloseHistory}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="history-divider"></div>
                        <div className="history-list">
                            {historyItems.length === 0 ? (
                                <div className="empty-history">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    <p>스크래핑 히스토리가 없습니다</p>
                                </div>
                            ) : (
                                historyItems.map(item => (
                                    <div
                                        key={item.id}
                                        className="history-item"
                                        onClick={() => handleHistoryItemClick(item)}
                                    >
                                        <div className="history-item-header">
                                            <div className="header-left">
                                                <span className={`status-badge ${item.totalItems > 0 ? 'success' : 'failed'}`}>
                                                    {item.totalItems > 0 ? '✓ 성공' : '✗ 실패'}
                                                </span>
                                                {item.totalItems > 0 && (
                                                    <span className="item-count">{item.totalItems}개</span>
                                                )}
                                            </div>
                                            <button
                                                className="delete-btn"
                                                onClick={(e) => handleDeleteHistory(item, e)}
                                                title="삭제"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="history-item-title-row">
                                            {item.favicon ? (
                                                <img src={item.favicon} alt="" className="history-favicon" />
                                            ) : (
                                                <div className="history-favicon-placeholder">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <line x1="2" y1="12" x2="22" y2="12" />
                                                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                                    </svg>
                                                </div>
                                            )}
                                            <div className="history-item-title">{item.pageTitle || '제목 없음'}</div>
                                        </div>
                                        {item.url && (
                                            <div className="history-item-url">{item.url}</div>
                                        )}
                                        <div className="history-item-meta">
                                            <span className="meta-item">
                                                {getSiteByUrl(item.url)?.name || '알 수 없음'} - {item.scraperName}
                                            </span>
                                            <span className="history-time">{formatTime(item.timestamp)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default App;
