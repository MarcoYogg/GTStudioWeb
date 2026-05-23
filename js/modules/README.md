# js/modules 說明

此目錄是 `app.js` 漸進式拆分骨架。

## 模組責任
- `auth.js`：登入狀態、權限前置檢查
- `navigation.js`：導覽與頁面切換可見性
- `receipts.js`：收據流程與報表
- `schedule.js`：排程行事曆
- `admin.js`：管理員、角色、成員管理
- `tickets.js`：票務流程
- `index.js`：統一匯出入口

## 使用原則
- 先新增、後遷移，不一次重寫
- 每次只搬一小塊功能，確保可回滾
- 新功能優先放入對應模組，避免再擴大 `app.js`
