# NEW_PAGE_GUIDE / 新頁面新增規範（輕量版）

目標：讓任何協作者都能用一致方式新增 sub-page，降低維護成本。

## 1) 命名規則
- 頁面檔名：`pages/<feature-name>.html`（小寫、kebab-case）
- 模組目錄：`js/modules/<feature-name>/`
- 模組入口：`js/modules/<feature-name>/index.js`
- DOM id：`feature-action-target`（例如 `receipt-filter-input`）
- CSS class：`feature__element--state`（可讀即可，不強制 BEM）

## 2) 建檔最小集合
每個新功能至少包含：
1. `pages/<feature-name>.html`
2. `js/modules/<feature-name>/index.js`
3. （可選）`js/modules/<feature-name>/ui.js`
4. （可選）`js/modules/<feature-name>/services.js`

## 3) 模組責任切分
- `index.js`：初始化、事件綁定、流程協調
- `ui.js`：DOM render/update（只處理畫面）
- `services.js`：資料讀寫（Firebase/API）

原則：
- 不要在 `ui.js` 直接打資料庫
- 不要在 `services.js` 直接操作 DOM

## 4) app.js 整合規則（過渡期）
- `app.js` 僅保留：
  - 頁面切換入口
  - 模組初始化呼叫
- 新功能不可直接把大量邏輯加回 `app.js`

## 5) 新頁面接線步驟
1. 建立 `pages/<feature-name>.html`
2. 建立 `js/modules/<feature-name>/index.js`
3. 在初始化流程中加入 `init<FeatureName>Module()`
4. 補上必要導覽入口（按鈕/連結）
5. 手動驗證：頁面可開、事件可觸發、無 console error

## 6) PR 建議清單（輕量）
- [ ] 只做單一功能主題
- [ ] 模組責任清楚（UI / Data 分離）
- [ ] 不把新邏輯堆回 `app.js`
- [ ] README 或 docs 有最小更新

## 7) 何時考慮升級框架
當同時發生以下 2 項以上再評估 React：
- 跨頁共享狀態快速增加
- 共用 UI 元件需求明顯變多
- 新功能開發速度被舊結構拖慢
