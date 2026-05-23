# 模組邊界規範（MODULE BOUNDARY）

本文件定義 GTStudioWeb 目前各模組的責任、公開介面與禁止行為，目的是降低耦合並提升可維護性。

## 1. 全域原則
- 正式入口：`app.js`
- 正式模組：`js/modules/*`
- 模組初始化由 `js/modules/app.js` 協調
- 模組之間不得直接呼叫彼此內部函式
- 共用依賴由初始化參數注入，不要到處讀全域狀態

## 2. 模組責任
| 模組 | 責任 | 公開 API |
|---|---|---|
| `auth.js` | 登入 / 登出 / 使用者狀態同步 | `initAuthModule(...)` |
| `navigation.js` | 導覽與頁面切換事件 | `initNavigationModule(...)` |
| `receipts.js` | 收據上傳、清單顯示、審核流程 | `initReceiptsModule(...)` |
| `schedule.js` | 行事曆渲染、排程建立與更新 | `initScheduleModule(...)` |
| `admin.js` | 成員管理、角色設定、權限資料讀寫 | `initAdminModule(...)` |
| `tickets.js` | Ticket 建立、列表、狀態變更、留言 | `initTicketsModule(...)` |

## 3. 模組禁止事項
- `auth` 不可直接渲染其他頁面內容
- `navigation` 不可直接存取 Firebase 資料
- `receipts` 不可維護登入狀態
- `schedule` 不可直接控制 admin / tickets 狀態
- `admin` 不可處理收據與票務邏輯
- `tickets` 不可維護成員角色資料

## 4. 目前已知風險
1. 部分模組仍可能使用 `window.*`
2. 頁面重進時若未清理事件，可能重複觸發
3. 個別函式仍混有 render + data + event 三種責任

## 5. 短期方向
1. 建立 `appContext`，集中注入依賴
2. 逐步移除 `window.*`
3. 每個模組拆成 `render` / `bind` / `service` 三層
