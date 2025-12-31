# ⚙️ Configuration Guide

## Google Sheets & Email Export 설정

이 확장 프로그램은 Google Sheets와 Email 내보내기 기능을 지원합니다.
이를 사용하려면 사전 설정이 필요합니다.

---

## 📊 Google Apps Script 설정

### 1. Google Apps Script 생성

1. [Google Apps Script](https://script.google.com/) 접속
2. "새 프로젝트" 클릭
3. 다음 코드를 `Code.gs`에 붙여넣기:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // 액션 타입 확인 (sheets 또는 email)
    if (data.action === 'email') {
      return sendEmail(data);
    } else {
      return saveToSheets(data);
    }
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: error.toString() })
    );
  }
}

function saveToSheets(data) {
  const ss = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID');
  const sheet = ss.getSheetByName('Data') || ss.insertSheet('Data');

  // 헤더가 없으면 추가
  if (sheet.getLastRow() === 0) {
    const headers = ['Timestamp', 'Scraper', 'URL', 'Total Items', 'Items JSON'];
    sheet.appendRow(headers);
  }

  // 데이터 추가
  const row = [
    new Date(data.timestamp),
    data.scraperName,
    data.url,
    data.totalItems,
    JSON.stringify(data.items)
  ];

  sheet.appendRow(row);

  return ContentService.createTextOutput(
    JSON.stringify({ success: true })
  );
}

function sendEmail(data) {
  const recipient = data.recipientEmail;
  const subject = `[WebHand] ${data.scraperName} 스크래핑 결과`;

  const body = `
스크래핑 결과를 알려드립니다.

- 스크래퍼: ${data.scraperName}
- URL: ${data.url}
- 수집 시간: ${new Date(data.timestamp).toLocaleString('ko-KR')}
- 총 아이템: ${data.totalItems}개

자세한 내용은 첨부된 데이터를 확인해주세요.
  `;

  GmailApp.sendEmail(recipient, subject, body);

  return ContentService.createTextOutput(
    JSON.stringify({ success: true })
  );
}
```

4. **YOUR_SPREADSHEET_ID 교체:**
   - 구글 시트를 하나 만들고 URL에서 ID 복사
   - 예: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - `YOUR_SPREADSHEET_ID` 부분을 실제 ID로 교체

### 2. Apps Script 배포

1. 우측 상단 "배포" → "새 배포" 클릭
2. 설정:
   - **유형 선택:** 웹 앱
   - **설명:** WebHand Extension
   - **액세스 권한:**
     - 실행 사용자: **나**
     - 액세스 권한: **모든 사용자**
3. "배포" 클릭
4. **배포 ID (URL) 복사** - 나중에 사용

---

## 🔧 Chrome Extension 설정

### 방법 1: Chrome DevTools (간단)

1. Chrome에서 확장 프로그램 페이지 열기 (`chrome://extensions`)
2. WebHand Extension의 "서비스 워커" 클릭
3. DevTools Console에서 다음 실행:

```javascript
chrome.storage.sync.set({
  googleSheetsUrl: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  emailAddress: 'your-email@example.com'
});
```

4. `YOUR_DEPLOYMENT_ID`를 실제 배포 ID로, `your-email@example.com`을 본인 이메일로 교체

### 방법 2: 설정 페이지 (향후 추가 예정)

현재는 설정 UI가 없으므로 위 방법 1을 사용하세요.
향후 업데이트에서 설정 페이지를 추가할 예정입니다.

---

## ✅ 설정 확인

설정이 제대로 되었는지 확인:

```javascript
chrome.storage.sync.get(['googleSheetsUrl', 'emailAddress'], (result) => {
  console.log('현재 설정:', result);
});
```

예상 출력:
```javascript
{
  googleSheetsUrl: "https://script.google.com/macros/s/AKfyc.../exec",
  emailAddress: "your-email@example.com"
}
```

---

## 🧪 테스트

1. 스크래핑 실행 (도매매 또는 네이버 부동산)
2. 결과 페이지에서:
   - **"📊 Google Sheets"** 버튼 클릭 → 구글 시트 확인
   - **"📧 이메일"** 버튼 클릭 → 이메일 수신 확인

---

## 🔐 보안 고려사항

### Apps Script 권한

- Apps Script는 본인의 Google 계정으로 실행됩니다
- 배포 시 "액세스 권한: 모든 사용자"로 설정하면, URL만 알면 누구나 접근 가능
- **권장:** URL을 공개하지 마세요 (GitHub에 커밋하지 마세요)

### Chrome Storage 데이터

- `chrome.storage.sync`는 Google 계정에 동기화됩니다
- 다른 기기에서 같은 계정으로 로그인하면 설정이 자동 동기화됩니다

### 대안: Local Storage

더 높은 보안이 필요하면 `chrome.storage.local` 사용:

```javascript
chrome.storage.local.set({
  googleSheetsUrl: '...',
  emailAddress: '...'
});
```

단, 이 경우 다른 기기에서는 설정이 동기화되지 않습니다.

---

## 🚨 문제 해결

### "⚠️ Google Sheets URL이 설정되지 않았습니다"

→ 위 설정 방법대로 `chrome.storage.sync.set()` 실행했는지 확인

### Google Sheets에 데이터가 저장되지 않음

1. Apps Script 배포 ID가 올바른지 확인
2. Apps Script 로그 확인 (실행 → 실행 기록)
3. Spreadsheet ID가 올바른지 확인
4. Apps Script에 Sheets API 권한이 있는지 확인

### 이메일이 발송되지 않음

1. Gmail API 권한 확인
2. 수신 이메일 주소가 올바른지 확인
3. 스팸 폴더 확인

---

## 📝 참고 자료

- [Google Apps Script 문서](https://developers.google.com/apps-script)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Gmail API](https://developers.google.com/gmail/api)

---

**설정이 완료되면 모든 내보내기 기능을 사용할 수 있습니다!**
