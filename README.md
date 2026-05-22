# GT Studio Web

共用工作室網站專案。此專案提供資訊管理、任務追蹤與日常流程整合。

Shared studio website project for information management, task tracking, and daily workflows.

## 快速開始 Quick Start

### 1) 取得程式碼 Clone
```bash
git clone <your-repo-url>
cd GTStudioWeb
```

### 2) 安裝與執行 Install & Run
目前此專案為 **純前端靜態頁 + Firebase Web SDK（CDN 模組）**。

#### 建議方式（Recommended）
使用 VS Code Live Server：
1. 在專案根目錄開啟 `index.html`
2. 右鍵 `Open with Live Server`
3. 瀏覽器開啟後即可使用

#### 備用方式（Fallback）
直接雙擊 `index.html` 也可開啟，但部分瀏覽器對本機檔案權限限制較多，
若遇到模組載入或登入問題，請改用 Live Server。

### 3) 開發流程 Development Flow (GitHub Flow)
1. 從 `main` 開新分支：`feature/<topic>` 或 `fix/<topic>`
2. 完成修改後送出 PR 到 `main`
3. 至少 1 位 reviewer 通過再 merge

## 協作規範 Collaboration
- 提交前請確保修改範圍清楚且可回溯。
- 請使用 PR 模板與 Issue 模板。
- 文件優先中英雙語（至少標題雙語）。

## 分支命名 Branch Naming
- `feature/<short-description>`
- `fix/<short-description>`
- `docs/<short-description>`
- `chore/<short-description>`

## Commit 建議 Commit Suggestions
- `feat: add task card drag behavior`
- `fix: resolve null check in app init`
- `docs: update onboarding steps`
- `chore: reorganize static assets`

## Pull Request 檢查清單 PR Checklist
- [ ] 變更目的清楚
- [ ] 只包含本次任務相關修改
- [ ] 已更新必要文件
- [ ] 無明顯 UI/功能回歸

## 專案文件 Docs
- `CONTRIBUTING.md`：詳細協作流程
- `.github/ISSUE_TEMPLATE/`：Issue 樣板
- `.github/PULL_REQUEST_TEMPLATE.md`：PR 樣板
- `docs/team-working-agreement.md`：輕量協作公約（適合信任型小團隊）
- `docs/PROJECT_OVERVIEW.md`：專案快速導覽（給新加入開發者）
- `docs/REFACTOR_PLAN.md`：不換框架的漸進式重構路線
- `docs/APP_JS_MAP.md`：`app.js` 粗粒度功能地圖與拆分優先序
- `docs/NEW_PAGE_GUIDE.md`：新 sub-page 新增規範（輕量協作版）
