# PROJECT OVERVIEW / 專案總覽

## 1. Project Purpose / 專案目的
GT Studio Web 是朋友群共用工作室的網站，用於管理資訊、排程、票務/收據流程與日常協作。

## 2. Current Architecture / 目前架構
- `index.html`：主入口頁（載入主要樣式與腳本）
- `style.css`：全域樣式
- `app.js`：目前核心互動邏輯（偏大型，後續會拆模組）
- `pages/`：各功能頁面（Home、Schedule、ticket、receipt、admin 等）
- `js/firebase-config.js`：Firebase 設定
- `js/auth_utf8.js`：身份驗證相關邏輯

## 3. Directory Guide / 目錄導覽
- `pages/`：功能頁 HTML
- `js/`：共用 JS 與第三方整合（Firebase/Auth）
- `.github/`：協作模板（Issue/PR）
- `docs/`：專案文件與規劃

## 4. Key Risks Now / 目前風險
- `app.js` 過大，功能耦合高，不利多人並行修改。
- 存在 `app_backup.js`、`temp_app.js`，容易造成版本混亂。
- 功能邊界與模組責任尚未文件化完成。

## 5. Collaboration Advice / 協作建議
- 小步提交，PR 聚焦單一主題。
- 改動前先看 `docs/team-working-agreement.md`。
- 新功能優先放在可拆分模組，不再把所有邏輯堆進 `app.js`。

## 6. Suggested Immediate Focus / 建議近期重點
1. 盤點 `app.js` 功能區塊並標註責任。
2. 先拆最穩定且獨立的模組（例如 auth / navigation）。
3. 逐步導入 `js/modules/*`，保留可回滾策略。
