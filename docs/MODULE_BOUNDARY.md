# 模組邊界規範（MODULE BOUNDARY）

本文件定義 GTStudioWeb 目前各模組的責任、公開介面與禁止行為，
目的是降低耦合（模組互相牽連）並提升可維護性。

## 1. 全域原則

- 正式入口：`app.js`
- 正式模組：`js/modules/*`
- 模組初始化一律由協調層（`js/modules/app.js`）負責
- 模組之間不得直接呼叫彼此內部函式
- 共用依賴（`db`、`auth`、`storage`、`appState`、`showToast`）由初始化參數注入

> 為什麼：
> 用參數注入比全域讀取更容易追蹤來源，未來替換服務（例如改後端）也較安全。

## 2. 模組責任與公開 API

### `auth.js`
- **責任**：登入 / 登出、使用者狀態同步
- **可用依賴**：`auth`、`googleProvider`、`appState`、`showToast`
- **公開 API**：`initAuthModule(...)`
- **禁止**：直接渲染其他頁面內容

### `navigation.js`
- **責任**：導覽按鈕切換、頁面切換事件（`pageChange`）
- **可用依賴**：`appState`、`hasPermission`
- **公開 API**：`initNavigationModule(...)`
- **禁止**：直接存取 Firebase 資料

### `receipts.js`
- **責任**：收據上傳、清單顯示、審核流程
- **可用依賴**：`db`、`storage`、`appState`、`hasPermission`、`showToast`
- **公開 API**：`initReceiptsModule(...)`
- **禁止**：維護登入狀態或導覽狀態

### `schedule.js`
- **責任**：行事曆渲染、排程建立與更新
- **可用依賴**：`db`、`appState`、`hasPermission`、`showToast`
- **公開 API**：`initScheduleModule(...)`
- **禁止**：直接控制 admin / ticket 頁面狀態

### `admin.js`
- **責任**：成員管理、角色設定、權限資料讀寫
- **可用依賴**：`db`、`appState`、`hasPermission`、`showToast`
- **公開 API**：`initAdminModule(...)`
- **禁止**：處理收據與票務業務邏輯

### `tickets.js`
- **責任**：Ticket 建立、列表、狀態變更、留言
- **可用依賴**：`db`、`storage`、`appState`、`hasPermission`、`showToast`
- **公開 API**：`initTicketsModule(...)`
- **禁止**：維護成員角色資料

## 3. 目前已知邊界風險（待改善）

1. 部分模組仍透過 `window.*` 掛載操作函式（例如編輯、刪除、狀態切換）。
2. 頁面重進時會重綁事件，若未清理可能造成重複觸發。
3. 個別模組內仍有「渲染 + 資料存取 + 事件綁定」混在同函式的情況。

## 4. 短期重構規範（兩週內）

1. 新增 `appContext` 物件，集中注入所有模組依賴。
2. 逐步移除 `window.*`，改為事件代理或模組內閉包處理。
3. 每個模組拆成三層：
   - `render*`（只負責畫面）
   - `bind*`（只負責事件）
   - `service*`（只負責資料讀寫）

## 5. 協作提交規範

- 修改任一模組時，PR 描述需包含：
  1) 影響哪個模組邊界
  2) 新增/變更的公開 API
  3) 是否新增任何全域依賴

- 若新增全域依賴，必須在 PR 說明原因與退場計畫。

---

最後更新：2026-05-23
