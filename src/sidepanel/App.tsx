import { useState, useEffect } from 'react';
import { MessageType } from '../types/messages';

function App() {
    const [currentUrl, setCurrentUrl] = useState<string>('');
    const [pageTitle, setPageTitle] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [scrapedData, setScrapedData] = useState<any>(null);

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
                    break;

                case MessageType.SCRAPE_ERROR:
                    console.error('❌ Error:', message.payload);
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

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('🔵 Current tab:', tab);

            if (!tab.id) {
                throw new Error('No active tab');
            }

            console.log('🔵 Sending READ_PAGE message to tab:', tab.id);
            const response = await chrome.tabs.sendMessage(tab.id, {
                type: MessageType.READ_PAGE
            });

            console.log('✅ Page content received:', response);
            setScrapedData(response.content);
        } catch (error) {
            console.error('❌ Failed to read page:', error);
            alert(`오류: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartScrape = async () => {
        console.log('🔵 handleStartScrape called');
        setIsLoading(true);

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('🔵 Current tab for scrape:', tab);

            if (!tab.id) {
                throw new Error('No active tab');
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
        } catch (error) {
            console.error('❌ Failed to start scrape:', error);
            alert(`오류: ${error instanceof Error ? error.message : String(error)}`);
            setIsLoading(false);
        }
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

                {scrapedData && (
                    <section className="results">
                        <h2>결과</h2>
                        <div className="result-card">
                            <pre>{JSON.stringify(scrapedData, null, 2)}</pre>
                        </div>
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
