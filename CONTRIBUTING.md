# Contributing Guide / 協作指南

感謝你一起開發 GT Studio Web！  
Thanks for contributing to GT Studio Web!

## 1. Workflow / 工作流程

我們採用 **GitHub Flow**：
1. 從 `main` 建立分支（`feature/*`, `fix/*`, `docs/*`, `chore/*`）
2. 在分支開發並保持單一主題
3. 發 PR 到 `main`
4. Review 通過後再 merge

## 2. Branch Rules / 分支規則

- `main` 永遠保持可用
- 禁止直接 push 到 `main`（建議在 GitHub 啟用保護規則）
- 每個 PR 盡量小而可審查

## 3. Commit Convention / 提交格式

建議格式：`type: short summary`

可用 type：
- `feat`：新功能
- `fix`：修正
- `docs`：文件
- `refactor`：重構
- `chore`：維護

範例：
- `feat: add editable profile panel`
- `fix: prevent undefined state on page load`

## 4. Pull Request Rules / PR 規範

- 使用 PR 模板填寫背景與測試方式
- PR 標題請簡潔描述變更
- 變更包含 UI 時，附上截圖或短影片
- 優先處理 reviewer 提出的 blocking comments

## 5. Issue Rules / Issue 規範

- Bug 請用 Bug Report 模板
- 新功能請用 Feature Request 模板
- 提供重現步驟與預期行為

## 6. Coding Notes / 開發備註

- 優先小步提交，避免一次巨大改動
- 儘量維持模組可讀性與可替換性
- 新增設定請同步更新文件（README / 本檔）
