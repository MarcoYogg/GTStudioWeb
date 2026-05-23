# GT Studio Web

GT Studio Web 是一個內部工作室管理網站，主要處理登入、權限、收據、排程、Tickets 與成員管理。

## 快速開始
1. 用 VS Code 開啟 `GTStudioWeb/`
2. 用 Live Server 開 `index.html`
3. 登入 Firebase 後開始操作

如果 Live Server 不方便，直接開 `index.html` 也可以，但某些瀏覽器對本機檔案權限較嚴格，登入或模組載入出問題時請改用 Live Server。

## 技術棧
| 層級 | 技術 |
|---|---|
| 前端 | 原生 JavaScript（ES Module） |
| 樣式 | CSS |
| 後端服務 | Firebase Auth / Firestore / Storage |
| 入口 | `app.js` |
| 模組 | `js/modules/*` |

## 目錄導覽
| 路徑 | 作用 |
|---|---|
| `index.html` | 主入口 |
| `app.js` | 初始化與啟動 |
| `pages/` | 各功能頁 |
| `js/` | Firebase 與共用 JS |
| `js/modules/` | 各功能模組 |
| `docs/` | 架構與維護文件 |

## 主要功能
- 登入與權限判斷
- 收據上傳、審核、報表
- 排程行事曆與活動管理
- Tickets 建立、列表、狀態切換、留言
- 成員與角色管理

## 推薦閱讀順序
1. `docs/PROJECT_OVERVIEW.md`
2. `docs/MODULE_BOUNDARY.md`
3. `docs/PAGE_ACCESS_TEST_CHECKLIST.md`（驗收時看）

## 協作原則
- 小步修改，避免一次大改
- 不要把新邏輯塞回 `app.js`
- 改動前先確認模組邊界

## 文件導覽
- `docs/PROJECT_OVERVIEW.md`：專案總覽與架構
- `docs/MODULE_BOUNDARY.md`：模組責任與公開介面
- `docs/PAGE_ACCESS_TEST_CHECKLIST.md`：權限驗收清單
- `docs/REACT_MIGRATION_BLUEPRINT.md`：未來 React 遷移藍圖
- `docs/REFACTOR_PLAN.md`：不換框架的重構計畫
- `docs/NEW_PAGE_GUIDE.md`：新增頁面規範
- `js/modules/README.md`：模組骨架說明
