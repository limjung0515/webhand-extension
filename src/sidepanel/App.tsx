import { useState, useEffect } from 'react';
import { MessageType } from '../types/messages';

function App() {
    const [currentUrl, setCurrentUrl] = useState<string>('');
    const [pageTitle, setPageTitle] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [scrapedData, setScrapedData] = useState<any>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        // Get current tab info
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                setCurrentUrl(tabs[0].url || '');
                setPageTitle(tabs[0].title || '');
            }
        });

        // Listen for messages
        const messageListener = (message: any) => {
            console.log('📨 Side panel received:', message);

            switch (message.type) {
                case MessageType.SCRAPE_PROGRESS:
                    console.log('⏳ Progress:', message.payload);
                    break;

                case MessageType.SCRAPE_COMPLETE:
                    setScrapedData(message.payload.data);
                    setIsLoading(false);
                    setError('');
                    break;

                case MessageType.SCRAPE_ERROR:
                    console.error('❌ Error:', message.payload);
                    setError(message.payload.error || '알 수 없는 오류');
                    setIsLoading(false);
                    break;
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);

        return () => {
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, []);

    const handleReadPage = async () => {
        console.log('🔵 handleReadPage called');
        setIsLoading(true);
        setError('');
        setScrapedData(null);

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('🔵 Current tab:', tab);

            if (!tab.id) {
                throw new Error('활성 탭을 찾을 수 없습니다');
            }

            console.log('🔵 Sending READ_PAGE message to tab:', tab.id);
            const response = await chrome.tabs.sendMessage(tab.id, {
                type: MessageType.READ_PAGE
            });

            console.log('✅ Page content received:', response);

            if (response && response.success) {
                setScrapedData(response.content);
            } else {
                throw new Error('페이지 읽기 실패');
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error('❌ Failed to read page:', errorMsg);
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartScrape = async () => {
        console.log('🔵 handleStartScrape called');
        setIsLoading(true);
        setError('');
        setScrapedData(null);

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('🔵 Current tab for scrape:', tab);

            if (!tab.id) {
                throw new Error('활성 탭을 찾을 수 없습니다');
            }

            console.log('🔵 Sending START_SCRAPE message to tab:', tab.id);
            await chrome.tabs.sendMessage(tab.id, {
                type: MessageType.START_SCRAPE,
                payload: {
                    url: currentUrl,
                    fields: ['title', 'content']
                }
            });
            console.log('✅ Scrape message sent successfully');
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error('❌ Failed to start scrape:', errorMsg);
            setError(errorMsg);
            setIsLoading(false);
        }
    };

    const handleCopyResult = () => {
        if (scrapedData) {
            const text = JSON.stringify(scrapedData, null, 2);
            navigator.clipboard.writeText(text);
            alert('📋 결과가 클립보드에 복사되었습니다!');
        }
    };

    const renderValue = (value: any): string => {
        if (Array.isArray(value)) {
            return `${value.length}개 항목`;
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return String(value);
    };

    return (
        <div className="app">
            <header className="header">
                <h1>📊 WebHand</h1>
                <p className="subtitle">한국 사이트 특화 웹 스크래핑</p>
            </header>

            <div className="content">
                <section className="page-info">
                    <h2>현재 페이지</h2>
                    <div className="info-card">
                        <div className="info-row">
                            <span className="label">제목:</span>
                            <span className="value">{pageTitle || '없음'}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">URL:</span>
                            <span className="value url">{currentUrl || '없음'}</span>
                        </div>
                    </div>
                </section>

                <section className="actions">
                    <h2>작업</h2>
                    <div className="button-group">
                        <button
                            className="btn btn-primary"
                            onClick={handleReadPage}
                            disabled={isLoading}
                        >
                            {isLoading ? '⏳ 읽는 중...' : '📖 페이지 읽기'}
                        </button>

                        <button
                            className="btn btn-secondary"
                            onClick={handleStartScrape}
                            disabled={isLoading}
                        >
                            {isLoading ? '⏳ 스크래핑 중...' : '🔍 스크래핑 시작'}
                        </button>
                    </div>
                </section>

                {error && (
                    <section className="error">
                        <div className="error-card">
                            <h3>❌ 오류 발생</h3>
                            <p>{error}</p>
                            <div className="error-hint">
                                <strong>해결 방법:</strong>
                                <ul>
                                    <li>페이지를 새로고침해보세요 (F5)</li>
                                    <li>확장프로그램을 새로고침해보세요</li>
                                    <li>콘솔(F12)에서 자세한 오류를 확인하세요</li>
                                </ul>
                            </div>
                        </div>
                    </section>
                )}

                {scrapedData && (
                    <section className="results">
                        <div className="results-header">
                            <h2>✅ 결과</h2>
                            <button className="btn btn-copy" onClick={handleCopyResult}>
                                📋 복사
                            </button>
                        </div>

                        {/* Table View */}
                        <div className="result-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>항목</th>
                                        <th>값</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(scrapedData).map(([key, value]) => (
                                        <tr key={key}>
                                            <td className="key">{key}</td>
                                            <td className="value">
                                                {Array.isArray(value) ? (
                                                    <details>
                                                        <summary>{value.length}개 항목 (클릭하여 보기)</summary>
                                                        <ul className="array-list">
                                                            {value.slice(0, 10).map((item, idx) => (
                                                                <li key={idx}>
                                                                    {typeof item === 'object'
                                                                        ? JSON.stringify(item)
                                                                        : String(item)}
                                                                </li>
                                                            ))}
                                                            {value.length > 10 && (
                                                                <li className="more">
                                                                    ... 외 {value.length - 10}개
                                                                </li>
                                                            )}
                                                        </ul>
                                                    </details>
                                                ) : typeof value === 'string' && value.length > 100 ? (
                                                    <details>
                                                        <summary>{value.substring(0, 100)}...</summary>
                                                        <p className="full-text">{value}</p>
                                                    </details>
                                                ) : (
                                                    renderValue(value)
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* JSON View (collapsible) */}
                        <details className="json-view">
                            <summary>📄 JSON 형식으로 보기</summary>
                            <div className="result-card">
                                <pre>{JSON.stringify(scrapedData, null, 2)}</pre>
                            </div>
                        </details>
                    </section>
                )}
            </div>

            <footer className="footer">
                <p>Made with ❤️ for 한국 웹사이트</p>
            </footer>
        </div>
    );
}

export default App;
