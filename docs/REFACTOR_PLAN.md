# REFACTOR PLAN / 重構計畫（不換框架版本）

## Goal / 目標
在不改變使用者可見功能的前提下，降低 `app.js` 複雜度，提升多人協作效率。

## Principles / 原則
- 功能不回歸（No behavior regression）
- 一次只拆一塊（Small, reversible steps）
- 模組邊界先清楚，再做優化

## Phase 0: Baseline / 盤點基線
- [ ] 列出 `app.js` 主要功能區塊（auth/nav/schedule/receipt/ticket/admin）
- [ ] 確認每塊依賴（DOM selector、Firebase、全域變數）
- [ ] 建立「模組責任表」

## Phase 1: Structure / 建立結構
- [ ] 建立 `js/modules/` 目錄
- [ ] 建立初始模組檔（例如 `auth.js`, `navigation.js`）
- [ ] 在 `app.js` 保留 orchestrator 角色（初始化與串接）

## Phase 2: Incremental Extraction / 漸進拆分
- [ ] 先拆低風險模組（auth、navigation）
- [ ] 再拆中風險模組（schedule、receipt）
- [ ] 最後拆高耦合模組（admin、跨頁共享狀態）

## Phase 3: Cleanup / 收斂清理
- [ ] 移除 `app_backup.js`、`temp_app.js`（改由 Git 歷史追蹤）
- [ ] 補齊文件：模組介面、初始化順序
- [ ] 更新 README 的開發與目錄說明

## Optional Future: Framework Evaluation / 後續框架評估（可選）
當符合以下條件再評估 React：
- 元件重用需求明顯上升
- 狀態同步複雜度持續增加
- 團隊同意引入建置工具與依賴管理

評估輸出建議：
- 成本（學習/重構/部署）
- 收益（可維護性/重用性/開發效率）
- 風險（遷移期 bug 與時程）
