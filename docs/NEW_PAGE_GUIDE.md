# NEW_PAGE_GUIDE / 新頁面新增規範（輕量版）

目標：讓任何協作者都能用一致方式新增 sub-page，降低維護成本。

## 1) 命名規則
- 頁面檔名：`pages/<feature-name>.html`
- 模組目錄：`js/modules/<feature-name>/`
- 模組入口：`js/modules/<feature-name>/index.js`
- DOM id：`feature-action-target`
- CSS class：`feature__element--state`

## 2) 最小集合
每個新功能至少包含：
1. `pages/<feature-name>.html`
2. `js/modules/<feature-name>/index.js`
3. （可選）`ui.js`
4. （可選）`services.js`

## 3) 責任切分
- `index.js`：初始化、事件綁定、流程協調
- `ui.js`：DOM render/update
- `services.js`：資料讀寫（Firebase/API）

原則：
- 不要在 `ui.js` 直接打資料庫
- 不要在 `services.js` 直接操作 DOM

## 4) app.js 整合規則
- `app.js` 只保留頁面切換入口與模組初始化
- 新功能不要把大量邏輯加回 `app.js`

## 5) 新頁面接線步驟
1. 建立頁面 HTML
2. 建立模組入口
3. 在初始化流程加入 `init<FeatureName>Module()`
4. 補上導覽入口
5. 手動驗證頁面可開、事件可觸發、無 console error

## 6) 何時考慮升級框架
當同時發生以下 2 項以上再評估 React：
- 跨頁共享狀態快速增加
- 共用 UI 元件需求明顯變多
- 新功能開發速度被舊結構拖慢
