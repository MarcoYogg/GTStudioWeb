# Page Access 測試清單

## 目的
- 驗證 page registry 的 `canAccess` 是否在切頁前正確生效
- 驗證未授權時會顯示「沒有權限」頁，而不是進入原頁功能

## 前置條件
- 以正式入口 `index.html` 啟動
- 可切換 4 種角色：`guest` / `member` / `finance` / `developer`
- 每次換角色後先重新整理頁面一次

## 權限對照
| 頁面 | 權限 |
|---|---|
| `list` | `can_view_receipts` |
| `upload` | `can_upload_receipts` |
| `tickets` | `can_view_tickets` |
| `schedule` | `can_view_schedule` |
| `admin` | `can_manage_members` |
| `floorplan` | 目前開放 |

## 測試步驟
1. 用 `guest` 登入或未登入，依序點 `list/upload/tickets/schedule/admin/floorplan`
   - 預期：`schedule`、`floorplan` 可進入
   - 預期：`list/upload/tickets/admin` 顯示「沒有權限」頁，並跳出無權限 toast
2. 用 `member` 登入，依序點全部頁面
   - 預期：`list/upload/tickets/schedule/floorplan` 可進入
   - 預期：`admin` 顯示「沒有權限」頁
3. 用 `finance` 登入，依序點全部頁面
   - 預期：`list/upload/tickets/schedule/floorplan` 可進入
   - 預期：`admin` 顯示「沒有權限」頁
4. 用 `developer` 登入，依序點全部頁面
   - 預期：全部可進入
5. 快速切頁兩輪
   - 預期：不會空白
   - 預期：不會因重複綁定導致同一操作觸發多次 toast

## 驗收重點
- 未授權頁面必須被 `canAccess` 阻擋
- 有權限頁面必須維持既有功能
