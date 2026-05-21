# Team Working Agreement / 團隊協作公約（輕量版）

> 目的：提供方向，不綁死流程。  
> Purpose: Provide guidance without rigid constraints.

## 1) Shared Goal / 共同目標
- 讓網站可持續演進、易於維護、容易交接。
- Focus on maintainability, extensibility, and smooth handoff.

## 2) Collaboration Style / 協作風格
- 預設信任、直接溝通、快速迭代。
- Prefer small, understandable changes over big-bang rewrites.
- 不熟悉的區塊先開 Issue 討論再改。

## 3) Decision Making / 技術決策
- 先追求「可維護的簡單解」，再追求最炫技巧。
- 若有多方案，優先：可讀性 > 可測性 > 效能微優化。
- 重大改動先寫短提案（問題、方案、取捨、回滾方式）。

## 4) Branch & PR (Recommended) / 分支與 PR（建議）
- 可直接 push `main`（小團隊信任模式）。
- 非緊急改動仍建議走 PR，方便留下決策脈絡。
- PR 盡量聚焦單一主題，便於 review。

## 5) Code Quality / 程式碼品質
- 命名清楚、模組邊界清楚、避免隱性耦合。
- 優先可擴充（config-driven / customizable）設計。
- 修改舊程式碼時，順手補文件說明「改了什麼、為什麼」。

## 6) Documentation / 文件原則
- 文件以「讓下一位 10 分鐘上手」為標準。
- 重要決策要留痕（Issue、PR、docs 任一處皆可）。
- 中英雙語可並存，至少關鍵標題雙語。

## 7) Conflict Handling / 分歧處理
- 先對齊目標與約束，再討論工具與寫法。
- 有爭議時先採可回滾方案，避免卡住進度。
- 若無法一致，採「最小可行方案先落地，再迭代」。

## 8) Release Rhythm / 發布節奏（彈性）
- 不強制固定週期；以「功能完整且風險可控」為主。
- 重要更新前，至少一人做快速 smoke check。

## 9) Ownership / 責任歸屬
- 誰改誰維護到穩定（至少在該 PR/變更週期內）。
- 跨模組調整需主動 tag 相關成員。
