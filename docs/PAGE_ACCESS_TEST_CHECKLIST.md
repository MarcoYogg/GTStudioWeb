# Page Access 測試清單

## 目的
- 驗證 page registry 的 `canAccess` 是否在切頁前正確生效
- 驗證未授權時顯示「沒有權限」頁面，而不是進入原頁功能

## 前置條件
- 使用正式入口 [index.html](/C:/Users/choiy/OneDrive/Desktop/Github_GT_Web/GTStudioWeb/index.html) 啟動
- 已可切換 4 種角色帳號：`guest` / `member` / `finance` / `developer`
- 每次換角色後，先重新整理頁面一次

## 權限對照
- `list`: `can_view_receipts`
- `upload`: `can_upload_receipts`
- `tickets`: `can_view_tickets`
- `schedule`: `can_view_schedule`
- `admin`: `can_manage_members`
- `floorplan`: 開放（目前 `canAccess` 固定 `true`）

## 測試步驟
1. 以 `guest` 登入（或未登入），依序點 `list/upload/tickets/schedule/admin/floorplan`
- 預期：`schedule`、`floorplan` 可進入
- 預期：`list/upload/tickets/admin` 顯示「沒有權限」頁，並跳出無權限 toast

2. 以 `member` 登入，依序點 `list/upload/tickets/schedule/admin/floorplan`
- 預期：`list/upload/tickets/schedule/floorplan` 可進入
- 預期：`admin` 顯示「沒有權限」頁

3. 以 `finance` 登入，依序點 `list/upload/tickets/schedule/admin/floorplan`
- 預期：`list/upload/tickets/schedule/floorplan` 可進入
- 預期：`admin` 顯示「沒有權限」頁

4. 以 `developer` 登入，依序點 `list/upload/tickets/schedule/admin/floorplan`
- 預期：全部可進入

5. 在每個角色下，重複快速切頁兩輪
- 預期：不會出現空白頁
- 預期：不會因為重複綁定造成同一操作觸發多次 toast

## 驗收重點
- 任何未授權頁面都必須被 `canAccess` 阻擋，且不進入該頁渲染流程
- 有權限頁面必須維持既有功能（例如 receipts 載入、tickets 即時更新、schedule 行為）
