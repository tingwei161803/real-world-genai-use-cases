# Gen AI 真實應用圖鑑 · Real-World Gen AI Use Cases

> Google Cloud 整理的數百家領先企業 **真實世界 Gen AI 應用** 的中英對照互動圖鑑。
> An interactive, searchable, **bilingual (中 / EN)** gallery of real-world generative AI use cases curated by Google Cloud.

純靜態網頁 — HTML + CSS + 一支 JS，無 build step、無相依套件。版面是一本「企業 Gen AI 野外圖鑑」：首屏的 **產業 × Agent 類型熱度矩陣** 同時就是篩選器（點格子、列或欄），每種 Agent 類型一個顏色、標在卡片左側的色脊上。另有全文搜尋、卡片 / 清單兩種檢視、詳情彈窗（含資料來源）、可分享的深連結，支援亮 / 暗色（預設跟隨系統）與中英兩個網址。

A pure static site — HTML + CSS + one JS file, no build step, no dependencies. It reads like a field guide to enterprise Gen AI: the hero's **industry × agent-type heatmap** doubles as the filter (pick a cell, row or column), and each agent type has one colour, shown as a spine on every card. Also: full-text search, card / list views, a detail dialog with cited sources, shareable deep links, light/dark themes (follows the system by default) and one URL per language.

---

## 🌐 線上看 · Live site

| | 連結 · Link |
| --- | --- |
| **網站 · Website** | <https://real-world-genai-use-cases.peteraim.com/> |
| **原始碼 · Source** | <https://github.com/tingwei161803/real-world-genai-use-cases> |

---

## 🗂️ 資料管線 · Data pipeline

1. **`data/extract.py`** — 從 Google Cloud 文章快照（`data/source/`）確定性抽取（產業 / agent 類型 / 公司 / 描述），無 AI。
2. **`data/chunks/*.json`** — 逐產業以 AI 研究擴寫成中英雙語、附資料來源（不虛構，查無佐證者標記 `needsReview`）。
3. **`data/merge.js`** — 合併校驗成前端載入的 `data/use-cases.js`。

重建 · Rebuild：
```bash
uv run python data/extract.py   # -> data/raw/usecases-en.json
# 逐產業研究擴寫 -> data/chunks/<industry>.json
node data/merge.js              # -> data/use-cases.js
```

首頁 `index.html` / `en/index.html` 的 `<main>` 裡預先寫好了全部案例卡片與矩陣（給搜尋引擎與關掉 JS 的訪客）。`data/use-cases.js` 有變動時，要用瀏覽器跑完 `app.js` 的渲染結果重新寫回這兩個區塊；資料、語言或篩選對不上時，`app.js` 會自己重畫，不會顯示過期內容。

目前進度 · Status：**全部 11 個產業、1,276 筆** 已完成中英雙語擴寫與來源查證。

---

## ✅ 測試 · Tests

```bash
uv run --with pytest pytest .test/test_extract.py -q   # 抽取正確性
node .test/test_merge.js                               # 合併與 schema 校驗
```

本機預覽 · Local preview：
```bash
uv run python -m http.server 8765   # 然後開 http://localhost:8765/
```

---

## 📝 來源 · Source

內容整理自 [Google Cloud — Real-world gen AI use cases](https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders)。本頁為非官方的中英對照學習用整理，各案例均附原始資料來源。

Content adapted from [Google Cloud — Real-world gen AI use cases](https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders). An unofficial bilingual study companion; each entry links its original source.
