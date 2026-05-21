# Gen AI 真實應用圖鑑 · Real-World Gen AI Use Cases

> Google Cloud 整理的數百家領先企業 **真實世界 Gen AI 應用** 的中英對照互動圖鑑。
> An interactive, searchable, **bilingual (中 / EN)** gallery of real-world generative AI use cases curated by Google Cloud.

純靜態網頁 — HTML + CSS + 一支 JS，無 build step、無相依套件。採 **Material Design 3**，支援亮 / 暗色、語言切換、**產業 × Agent 類型雙維度篩選**、全文搜尋、詳情彈窗（含資料來源）與可分享的深連結。

A pure static site — HTML + CSS + one JS file, no build step, no dependencies. Styled with **Material Design 3**, with light/dark themes, an in-place language toggle, **dual-axis filtering (industry × agent type)**, full-text search, a detail dialog with cited sources, and shareable deep links.

---

## 🌐 線上看 · Live site

| | 連結 · Link |
| --- | --- |
| **網站 · Website** | <https://tingwei161803.github.io/real-world-genai-use-cases/> |
| **原始碼 · Source** | <https://github.com/tingwei161803/real-world-genai-use-cases> |

---

## 🗂️ 資料管線 · Data pipeline

1. **`data/extract.py`** — 從 Google Cloud 文章快照（`data/source/`）確定性抽取（產業 / agent 類型 / 公司 / 描述），無 AI。
2. **`data/chunks/*.json`** — 逐產業以 AI 研究擴寫成中英雙語、附資料來源（不虛構，查無佐證者標記 `needsReview`）。
3. **`data/merge.js`** — 合併校驗成前端載入的 `data/use-cases.js`。

重建 · Rebuild：
```bash
python3 data/extract.py      # -> data/raw/usecases-en.json
# 逐產業研究擴寫 -> data/chunks/<industry>.json
node data/merge.js           # -> data/use-cases.js
```

目前進度 · Status：**全部 11 個產業、1,276 筆** 已完成中英雙語擴寫與來源查證。

---

## ✅ 測試 · Tests

```bash
python3 -m pytest .test/test_extract.py -q   # 抽取正確性
node .test/test_merge.js                     # 合併與 schema 校驗
```

本機預覽 · Local preview：
```bash
python3 -m http.server 8765   # 然後開 http://localhost:8765/
```

---

## 📝 來源 · Source

內容整理自 [Google Cloud — Real-world gen AI use cases](https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders)。本頁為非官方的中英對照學習用整理，各案例均附原始資料來源。

Content adapted from [Google Cloud — Real-world gen AI use cases](https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders). An unofficial bilingual study companion; each entry links its original source.
