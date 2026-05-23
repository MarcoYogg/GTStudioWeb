# PROJECT OVERVIEW / 專案總覽

## 1. 專案是什麼
GT Studio Web 是內部工作室管理網站，用來處理登入、權限、收據、排程、Tickets 與成員管理。

## 2. 目前技術棧
| 層級 | 技術 |
|---|---|
| 前端 | 原生 JavaScript（ES Module） |
| 樣式 | CSS |
| 服務 | Firebase Auth / Firestore / Storage |
| 入口 | `app.js` |
| 功能模組 | `js/modules/*` |

## 3. 目前架構
- `index.html`：主入口頁
- `app.js`：初始化與啟動流程
- `pages/`：各功能頁面
- `js/firebase-config.js`：Firebase 設定
- `js/modules/`：功能模組

## 4. 核心模組
| 模組 | 職責 |
|---|---|
| auth | 登入 / 登出 / 使用者狀態 |
| navigation | 頁面切換與導覽狀態 |
| receipts | 收據上傳、清單、審核、報表 |
| schedule | 行事曆與排程互動 |
| admin | 成員與權限設定 |
| tickets | Ticket 建立、列表、狀態與留言 |

## 5. 目錄導覽
| 路徑 | 作用 |
|---|---|
| `pages/` | 功能頁 HTML |
| `js/` | Firebase 與共用 JS |
| `js/modules/` | 各功能模組 |
| `docs/` | 架構與維護文件 |
| `docs/archive/` | 舊版本與封存文件 |

## 6. 目前風險
1. `app.js` 仍是入口協調中心，若堆太多邏輯會變難維護。
2. 若模組邊界不清楚，容易發生跨頁耦合。
3. 文件很多，若不分層，新人會不知道先看哪份。

## 7. 建議閱讀順序
1. `README.md`
2. `docs/MODULE_BOUNDARY.md`
3. `docs/PAGE_ACCESS_TEST_CHECKLIST.md`
4. 需要重構時再看 `docs/REFACTOR_PLAN.md` / `docs/REACT_MIGRATION_BLUEPRINT.md`
