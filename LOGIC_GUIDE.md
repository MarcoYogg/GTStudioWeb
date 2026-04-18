# GT Studio 網站邏輯說明

這份文件用白話文說明整個網站的運作邏輯，方便日後維護或交接。

---

## 一、網站用途

這是 GT Studio 的**內部管理系統**，主要功能是讓員工上傳費用收據，並讓管理員審核。

---

## 二、用到的服務（Firebase）

整個網站後端用的是 Google 的 **Firebase** 雲端服務，有三個部分：

| 服務 | 用途 |
|---|---|
| **Firebase Auth** | 負責 Google 帳號登入／登出 |
| **Firestore** | 資料庫，存收據的文字資料（標題、金額、狀態等）|
| **Firebase Storage** | 雲端儲存空間，存收據的圖片或 PDF 檔案 |

設定檔在 `firebase-config.js`，裡面包含連接 Firebase 專案所需的金鑰資訊。

---

## 三、頁面結構

導覽列有四個頁面，點按鈕就會切換顯示，其他頁面會隱藏：

1. **首頁** — 歡迎畫面，顯示是否已登入
2. **上傳收據** — 填表單、上傳檔案
3. **收據清單** — 查看所有收據的歷史記錄
4. **平面圖** — 顯示工作室平面圖圖片（`floorplan-placeholder.jpg`）

---

## 四、主要邏輯說明

### 1. 登入 / 登出（Google 帳號）
- 點「Google 登入」→ 跳出 Google 帳號選擇視窗
- 登入成功後，右上角顯示你的 Email，「登出」按鈕出現
- 登出後恢復未登入狀態
- **沒有登入就無法上傳收據**

---

### 2. 上傳收據（需登入）
使用者填完表單後按「開始上傳」，會依序做兩件事：

```
步驟 A：把選擇的圖片/PDF 上傳到 Firebase Storage
         ↓
步驟 B：把標題、金額、備註、上傳者 Email、檔案連結等資料存到 Firestore 資料庫
         ↓
上傳完成 → 顯示「上傳成功！」→ 表單清空
```

每筆收據儲存的資料：

| 欄位 | 說明 |
|---|---|
| `title` | 收據標題 |
| `amount` | 金額 |
| `note` | 備註 |
| `fileUrl` | 檔案下載連結 |
| `uploadedBy` | 上傳者的 Email |
| `status` | 初始為 `pending`（待審核）|
| `createdAt` | 上傳時間（由伺服器自動記錄）|

---

### 3. 讀取收據清單
- 每次點進「收據清單」頁面，就會自動從 Firestore 撈資料
- 資料依照**最新的排在最上面**的順序顯示
- 每筆收據的狀態：
  - 🟡 **待審核**（pending）
  - ✅ **已核准**（approved）

---

### 4. 管理員審核功能
- 管理員名單設定在 `app.js` 最上方的 `ADMIN_EMAILS` 陣列：
  ```js
  const ADMIN_EMAILS = ['choiyinyul721@gmail.com'];
  ```
- **只有管理員帳號登入時**，「待審核」的收據旁邊才會出現「核准」按鈕
- 點「核准」→ 跳出確認視窗 → 確認後把資料庫裡的 `status` 從 `pending` 改成 `approved` → 清單自動刷新

---

### 5. 平面圖
- 靜態顯示一張圖片，檔名是 `floorplan-placeholder.jpg`
- 圖片要放在**專案根目錄**（跟 `index.html` 同一層）
- 如需更換圖片，直接替換同名檔案，或修改 `index.html` 裡的 `src` 路徑

---

## 五、如何新增管理員

打開 `app.js`，找到最上方這行，把新的 Email 加進去：

```js
const ADMIN_EMAILS = ['choiyinyul721@gmail.com', '新管理員@gmail.com'];
```

---

## 六、檔案總覽

| 檔案 | 說明 |
|---|---|
| `index.html` | 網頁骨架，所有頁面的 HTML 結構 |
| `style.css` | 所有視覺樣式設定 |
| `app.js` | 所有互動邏輯（登入、上傳、審核等）|
| `firebase-config.js` | Firebase 連線設定與金鑰 |
| `floorplan-placeholder.jpg` | 工作室平面圖圖片（放根目錄）|
| `LOGIC_GUIDE.md` | 本說明文件 |
