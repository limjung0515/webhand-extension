import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import type { ScrapeResult } from '@/types/scraper';
import './results.css';

function ResultsPage() {
    const [result, setResult] = useState<ScrapeResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dataType, setDataType] = useState<'product' | 'naverland'>('product');

    // 하드코딩된 설정
    const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbw1xtMtnFkT2zCR1r6YuOWcQcjdplW2zt0NeZUNCora_te7j3VnppVrkCqU8Xprj1M/exec';
    const EMAIL_ADDRESS = 'prohoon91@gmail.com';

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

            // 데이터 타입 감지
            if (scrapeResult.items.length > 0) {
                const firstItem = scrapeResult.items[0];
                if ('itemId' in firstItem && 'propertyType' in firstItem) {
                    setDataType('naverland');
                } else {
                    setDataType('product');
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '알 수 없는 오류');
        } finally {
            setLoading(false);
        }
    }

    function downloadCSV() {
        if (!result) return;

        let headers: string[];
        let rows: any[][];

        if (dataType === 'naverland') {
            // 네이버 부동산 CSV
            headers = ['번호', '매물ID', '이미지', '뱃지', '매물타입', '거래유형', '가격', '면적', '층수', '방향', '설명', '태그', '중개사', '확인날짜'];
            rows = result.items.map((item: any, index) => [
                index + 1,
                item.itemId,
                item.thumbnailUrl,
                item.badge || '',
                item.propertyType,
                item.dealType,
                item.price,
                item.area || '',
                item.floor || '',
                item.direction || '',
                item.description || '',
                item.tags.join('; '),
                item.agentName || '',
                item.confirmedDate || ''
            ]);
        } else {
            // 도매매 상품 CSV
            headers = ['번호', '이미지', '상품명', '가격', '배송비', '판매자', '판매자 ID', '판매자 등급', '상품번호'];
            rows = result.items.map((item: any, index) => [
                index + 1,
                item.imageUrl,
                item.name,
                item.price,
                item.shipping,
                item.seller,
                item.sellerId || '',
                item.sellerGrade || '',
                item.productId
            ]);
        }

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

    // Google Sheets로 전송
    async function sendToGoogleSheets() {
        if (!GOOGLE_SHEETS_URL) {
            alert('⚠️ Google Sheets URL이 설정되지 않았습니다');
            return;
        }

        console.log('📊 Google Sheets 전송 시작...');
        console.log('URL:', GOOGLE_SHEETS_URL);
        console.log('데이터:', result);

        try {
            const response = await fetch(GOOGLE_SHEETS_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(result)
            });

            console.log('✅ 요청 완료:', response);
            alert('✅ Google Sheets로 전송 완료!');
        } catch (err) {
            console.error('❌ 전송 에러:', err);
            alert('❌ 전송 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
        }
    }

    // 이메일로 보내기
    async function sendEmail() {
        console.log('📧 이메일 전송 시작...');

        try {
            const emailData = {
                ...result,
                action: 'email'
            };

            await fetch(GOOGLE_SHEETS_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(emailData)
            });

            console.log('✅ 이메일 전송 완료');
            alert(`✅ ${EMAIL_ADDRESS}로 이메일 전송 완료!`);
        } catch (err) {
            console.error('❌ 이메일 전송 에러:', err);
            alert('❌ 전송 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
        }
    }

    // 카카오톡으로 보내기
    function sendToKakao() {
        alert('🚧 카카오톡 기능은 준비 중입니다');
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
                    <button onClick={sendToGoogleSheets} className="btn-share">
                        📊 Google Sheets
                    </button>
                    <button onClick={sendEmail} className="btn-share">
                        📧 이메일
                    </button>
                    <button onClick={sendToKakao} className="btn-share">
                        💬 카카오톡
                    </button>
                </div>
            </header>

            {/* Table */}
            <div className="table-container">
                {dataType === 'naverland' ? (
                    <table className="results-table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>이미지</th>
                                <th>매물 타입</th>
                                <th>거래 유형</th>
                                <th>가격</th>
                                <th>면적</th>
                                <th>층수</th>
                                <th>방향</th>
                                <th>태그</th>
                                <th>중개사</th>
                                <th>확인 날짜</th>
                                <th>매물 ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result.items.map((item: any, index) => (
                                <tr key={index}>
                                    <td className="td-number">{index + 1}</td>
                                    <td className="td-image">
                                        {item.thumbnailUrl ? (
                                            <img src={item.thumbnailUrl} alt={item.propertyType} />
                                        ) : (
                                            <div className="no-image">No Image</div>
                                        )}
                                    </td>
                                    <td className="td-name">
                                        <a
                                            href={`https://fin.land.naver.com/articles/${item.itemId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                color: '#333',
                                                textDecoration: 'none',
                                                fontWeight: '500',
                                                display: 'block',
                                                width: '100%'
                                            }}
                                        >
                                            {item.badge && <span style={{
                                                background: '#4CAF50',
                                                color: 'white',
                                                padding: '2px 6px',
                                                borderRadius: '3px',
                                                fontSize: '11px',
                                                marginRight: '6px'
                                            }}>{item.badge}</span>}
                                            <span style={{ color: '#1976D2' }}>{item.propertyType}</span>
                                            {item.description && (
                                                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                                    {item.description}
                                                </div>
                                            )}
                                        </a>
                                    </td>
                                    <td>{item.dealType}</td>
                                    <td className="td-price">{item.price}</td>
                                    <td>{item.area || '-'}</td>
                                    <td>{item.floor || '-'}</td>
                                    <td>{item.direction || '-'}</td>
                                    <td className="td-tags">
                                        {item.tags.map((tag: string, i: number) => (
                                            <span key={i} style={{
                                                background: '#E3F2FD',
                                                color: '#1976D2',
                                                padding: '2px 6px',
                                                borderRadius: '3px',
                                                fontSize: '11px',
                                                marginRight: '4px',
                                                display: 'inline-block',
                                                marginBottom: '2px'
                                            }}>{tag}</span>
                                        ))}
                                    </td>
                                    <td>{item.agentName || '-'}</td>
                                    <td>{item.confirmedDate || '-'}</td>
                                    <td className="td-id">{item.itemId}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table className="results-table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>이미지</th>
                                <th>상품명</th>
                                <th>가격</th>
                                <th>배송비</th>
                                <th>판매 정보</th>
                                <th>판매자 ID</th>
                                <th>판매자 등급</th>
                                <th>상품번호</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result.items.map((item: any, index) => (
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
                                    <td className="td-name">
                                        <a
                                            href={`https://domeme.domeggook.com/s/${item.productId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="product-link"
                                        >
                                            {item.name}
                                        </a>
                                    </td>
                                    <td className="td-price">{item.price}</td>
                                    <td className="td-shipping">{item.shipping}</td>
                                    <td className="td-seller">
                                        {item.seller}
                                        {item.sellType && (
                                            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                                {item.sellType}
                                            </div>
                                        )}
                                    </td>
                                    <td className="td-seller-id">{item.sellerId || '-'}</td>
                                    <td className="td-seller-grade">{item.sellerGrade || '-'}</td>
                                    <td className="td-id">{item.productId}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
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
