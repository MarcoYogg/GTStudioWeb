# GTStudioWeb React 遷移藍圖

## 目標與原則
- 目標：將前端從目前 vanilla modules 漸進遷移到 `React + Vite`。
- 原則：不一次重寫、可分段上線、每一階段可回退。
- 邊界：Firebase（Auth / Firestore / Storage）與資料結構先不改。

## 為什麼現在適合遷移
- 已完成 page registry 與 `canAccess` 權限入口收斂。
- 模組邊界已比過去清楚，適合轉為 component + route guard。
- 已有可用的行為基線（登入、切頁、權限、各頁核心流程）。

## 技術選型（建議）
1. `React + Vite + React Router`
2. 狀態管理先用 `Context + hooks`，後續再評估外部套件
3. 樣式先沿用現有 CSS，之後再逐步元件化

## 分階段計畫

### Phase 0：基線凍結（1-2 天）
- 凍結新功能，只收 bugfix。
- 以現有系統整理驗收清單（角色 + 頁面 + 核心流程）。
- 這份驗收清單作為 React 版本對齊標準。

### Phase 1：建立 React 骨架（2-3 天）
- 建新目錄（建議：`GTStudioWeb-react/`）。
- 串接 Firebase 與環境變數。
- 建立 `AuthProvider`、`PermissionContext`、`ProtectedRoute`。
- 先遷低風險頁：`home`、`floorplan`。

### Phase 2：先遷高價值互動頁（3-5 天）
- 優先遷移 `tickets`（代表性高：表單、狀態切換、即時監聽）。
- 驗收重點：建立 / 篩選 / 改狀態 / 刪除 / 留言 / 權限顯示。

### Phase 3：遷移核心流程頁（4-7 天）
- 遷移 `receipts`（list/upload/report）與 `schedule`。
- 保持既有 Firestore 查詢與欄位不變。
- 將舊式事件綁定改為 React lifecycle + cleanup。

### Phase 4：遷移 admin 與共用元件收斂（2-4 天）
- 遷移 `admin`。
- 抽共用元件：`PageShell`、`DataTable`、`Modal`、`Toast`、`AccessDenied`。
- 權限檢查集中在 route config。

### Phase 5：切換上線與回退窗口（1-2 天）
- 以 feature flag 或路徑切換方式導流。
- 驗收通過後保留短期回退窗口（建議 1 週）。
- 回退窗口結束再移除舊入口。

## 路由與權限映射（對齊現況）
- `/receipts/list` -> `can_view_receipts`
- `/receipts/upload` -> `can_upload_receipts`
- `/tickets` -> `can_view_tickets`
- `/schedule` -> `can_view_schedule`
- `/admin` -> `can_manage_members`
- `/floorplan` -> 目前開放，後續可新增 `can_view_floorplan`

## 風險與控管
1. 不要同時改「框架」與「資料模型」。
2. 不要一次遷太多頁，避免回歸問題難定位。
3. 每遷一頁就跑四角色驗收：`guest/member/finance/developer`。
4. Auth 狀態更新要集中管理，不要分散在各頁。

## 建議時程（保守）
- 小團隊主流程遷移：`2-4 週`
- 若持續並行新功能，預留 `30-50%` 額外緩衝

## 下一步（可在新 session 直接接）
1. 建立 `Phase 1` 任務清單與檔案骨架（含 route/guard/provider）。
2. 決定新專案目錄名稱與是否採雙入口並行。
3. 選定第一個遷移頁（建議 `tickets`）。
