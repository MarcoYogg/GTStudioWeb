# APP_JS_MAP / app.js 粗粒度功能地圖

> 檔案：`app.js`  
> 目的：幫助多人協作時快速定位功能、降低衝突。

## 1) 全域與權限基礎（約 L1-L120）
- 匯入 Firebase/Auth/Firestore/Storage。
- 基礎工具函式：權限檢查、Toast 顯示。
- 導覽 UI 更新（依角色/登入狀態調整可見性）。

主要函式：
- `hasPermission`（L86）
- `showToast`（L99）
- `updateNavigationUI`（L112）

## 2) 頁面載入與初始化路由（約 L190-L290）
- 依 section/page 載入對應內容。
- 呼叫各頁面 init 函式（upload/receipt/admin/schedule/ticket）。

主要函式：
- `loadAndInitPage`（L191）
- `initializePage`（L208）
- `updatePageAuthUI`（L218）
- `initUploadPage`（L225）
- `initReceiptPage`（L230）
- `initAdminPage`（L245）
- `initSchedulePage`（L277）
- `initTicketsPage`（L282）

## 3) 收據與報表流程（約 L287-L410 + L638-L800）
- 報表產生、上傳 submit。
- 收據清單讀取、細節顯示、審核/退回/刪除。

主要函式：
- `handleGenerateReport`（L287）
- `generateReport`（L301）
- `handleUploadSubmit`（L334）
- `loadReceipts`（L638）
- `showReceiptDetail`（L701）
- `approveReceipt`（L757）
- `rejectReceipt`（L769）
- `deleteReceipt`（L790）

## 4) 管理員與成員管理（約 L458-L817）
- 開關 modal、成員篩選、成員表單提交。
- 角色設定儲存、角色表格渲染。

主要函式：
- `openAddMemberModal`（L458）
- `filterMembers`（L469）
- `handleMemberFormSubmit`（L482）
- `saveRolesSettings`（L517）
- `renderRolesTable`（L612）
- `loadMembers`（L803）
- `renderMembers`（L817）

## 5) 排程（行事曆）模組（約 L368-L1094）
- 行事曆切換、事件建立、日曆渲染、當日 modal。

主要函式：
- `setupScheduleControls`（L368）
- `initSchedule`（L879）
- `renderCalendar`（L918）
- `openDayModal`（L965）
- `renderDayModal`（L973）

## 6) 票務模組（約 L415-Lend）
- 票務表單送出、票務資料渲染。

主要函式：
- `setupTicketControls`（L415）
- `handleTicketSubmit`（L420）
- `initTickets`（L1095）
- `renderTickets`（L1118）

## 7) 認證與事件綁定（散落區塊）
- 登入/登出按鈕綁定。
- `onAuthStateChanged` 觸發初始化與 UI 同步。
- 多個 `addEventListener` 分散在各區塊。

## 協作風險（為什麼大檔不好協作）
- 單檔多人同改，merge conflict 機率高。
- 事件綁定分散，改一處容易漏改另一處。
- 功能邊界不明，review 難判斷副作用。

## 建議拆分優先順序（粗粒度）
1. `auth + navigation`（低風險，先拆）
2. `receipts`（中風險，流程明確）
3. `schedule`（中高風險，UI/狀態較多）
4. `admin/member`（中高風險，權限邏輯）
5. `tickets`（視依賴情況收尾）

## 建議目標結構（草案）
- `js/modules/auth.js`
- `js/modules/navigation.js`
- `js/modules/receipts.js`
- `js/modules/schedule.js`
- `js/modules/admin.js`
- `js/modules/tickets.js`
- `app.js`（只保留初始化與模組串接）
