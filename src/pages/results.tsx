import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import type { ScrapeResult } from '@/types/scraper';
import './results.css';

function ResultsPage() {
    const [result, setResult] = useState<ScrapeResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadResult();
    }, []);

    async function loadResult() {
        try {
            // URL에서 resultId 가져오기
            const params = new URLSearchParams(window.location.search);
            const resultId = params.get('id');

            if (!resultId) {
                throw new Error('결과 ID가 없습니다');
            }

            // Chrome Storage에서 로드
            const data = await chrome.storage.local.get(`scrape_result_${resultId}`);
            const scrapeResult = data[`scrape_result_${resultId}`];

            if (!scrapeResult) {
                throw new Error('스크래핑 결과를 찾을 수 없습니다');
            }

            setResult(scrapeResult);
        } catch (err) {
            setError(err instanceof Error ? err.message : '알 수 없는 오류');
        } finally {
            setLoading(false);
        }
    }

    function downloadCSV() {
        if (!result) return;

        const headers = ['번호', '상품명', '가격', '배송비', '판매자', '상품번호', '상품 URL'];
        const rows = result.items.map((item, index) => [
            index + 1,
            item.name,
            item.price,
            item.shipping,
            item.seller,
            item.productId,
            item.productUrl
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `webhand_${result.scraperName}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>결과를 불러오는 중...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <h2>❌ 오류</h2>
                <p>{error}</p>
            </div>
        );
    }

    if (!result) {
        return null;
    }

    return (
        <div className="results-container">
            {/* Header */}
            <header className="results-header">
                <div className="header-content">
                    <h1>📊 스크래핑 결과</h1>
                    <div className="header-meta">
                        <span className="site-badge">{result.scraperName}</span>
                        <span className="time">{new Date(result.timestamp).toLocaleString('ko-KR')}</span>
                        <span className="count">{result.totalItems}개 수집</span>
                    </div>
                </div>
                <div className="header-actions">
                    <button onClick={downloadCSV} className="btn-download">
                        📥 CSV 다운로드
                    </button>
                </div>
            </header>

            {/* Table */}
            <div className="table-container">
                <table className="results-table">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>이미지</th>
                            <th>상품명</th>
                            <th>가격</th>
                            <th>배송비</th>
                            <th>판매자</th>
                            <th>상품번호</th>
                            <th>링크</th>
                        </tr>
                    </thead>
                    <tbody>
                        {result.items.map((item, index) => (
                            <tr key={index}>
                                <td className="td-number">{index + 1}</td>
                                <td className="td-image">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} />
                                    ) :
                                        (
                                            <div className="no-image">No Image</div>
                                        )}
                                </td>
                                <td className="td-name">{item.name}</td>
                                <td className="td-price">{item.price}</td>
                                <td className="td-shipping">{item.shipping}</td>
                                <td className="td-seller">{item.seller}</td>
                                <td className="td-id">{item.productId}</td>
                                <td className="td-link">
                                    {item.productUrl && (
                                        <a href={item.productUrl} target="_blank" rel="noopener noreferrer">
                                            🔗 상세보기
                                        </a>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <footer className="results-footer">
                <p>총 {result.totalItems}개 항목</p>
            </footer>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<ResultsPage />);
