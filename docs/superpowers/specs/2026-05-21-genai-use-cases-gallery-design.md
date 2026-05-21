# 設計文件：Real-World Gen AI Use Cases 互動圖鑑

- 日期：2026-05-21
- 作者：tingwei161803
- 狀態：設計待審

## 1. 目標

把 Google Cloud 的文章
[「Real-world gen AI use cases from the world's leading organizations」](https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders)
（原名 101，現已擴增至約 **1,302** 筆案例）做成一份**可互動、可分類、可搜尋、中英整頁切換**的單頁網站，視覺品質對齊既有的 `codex-use-cases` 專案（Material Design 3）。

### 成功標準

- 使用者可用**雙維度**（11 產業 × 6 agent 類型）篩選，並全文搜尋。
- 中／英可一鍵原地整頁切換，狀態記憶於 `localStorage`。
- 每筆案例為**經查證、附來源、不虛構**的擴寫內容（中英對照）。
- 右上角有 GitHub Star 連結（含即時星數），指向 `tingwei161803/real-world-genai-use-cases`。
- 1,302 張卡片下仍流暢（不一次塞滿 DOM）。
- 行動裝置、深淺主題、鍵盤與基本無障礙皆可用。

### 非目標（YAGNI）

- 不做後端、不做使用者帳號、不做 i18n 框架（手寫 string table 即可）。
- 不收錄文章中的趨勢論述段落，只收錄「公司 × 案例」條目。
- 不做即時從 Google 網站抓取；以一次性快照為資料來源。

## 2. 交付節奏（分階段）

**Phase 1 — 跑通一個產業（Automotive & Logistics，約 48 筆）**
端到端驗證整條管線：extract → 研究擴寫翻譯 → merge → 前端呈現。確認資料形狀、引用品質、前端體驗、成本後，再擴展。

**Phase 2 — 其餘 10 個產業**
以 agent team 並行，一產業一 agent，逐產業產出 chunk。

> 本設計文件涵蓋整體架構；實作計畫（writing-plans）會先只展開 Phase 1。

## 3. 架構總覽

三段式資料管線 + 靜態前端。

```
來源 HTML 快照 (data/source/gcp-usecases.html)
   │  ① extract.py            確定性解析，無 AI
   ▼
data/raw/usecases-en.json     原始抽取：id, industry, agentType, company, descEn, isNew
   │  ② 研究擴寫翻譯           agent team，一產業一 agent（含 WebSearch 查證）
   ▼
data/chunks/<industry>.json   雙語且擴寫、附來源的完整條目
   │  ③ merge.js              合併 + 筆數/結構校驗
   ▼
data/use-cases.js             window.USE_CASES / INDUSTRIES / AGENT_TYPES
   │
   ▼
index.html + assets/{styles.css, app.js}   單頁前端，原地中英切換
```

**切分理由**：抽取必須確定性（用 AI 抽 1,302 筆會漏、會幻覺）；研究擴寫與翻譯才適合並行 agent。產業是天然的批次邊界，各 agent 寫入各自 chunk 檔互不衝突，merge 時以總數與 schema 校驗把關。

## 4. 元件設計

### 4.1 `data/extract.py`（確定性抽取）

- 輸入：`data/source/gcp-usecases.html`（curl 快照，已存在 /tmp，將複製進 repo）。
- 解析規則：
  - 移除 `<script>/<style>`。
  - 依序掃描 `<b>/<strong>`。產業段落以「`<產業名><Customer Agents>`」串接 bold 起始；後續 agent 類型為裸 bold（6 種之一）；其餘 bold 視為公司，其後純文字（至下一個 bold）為 `descEn`。
  - 維護 `currentIndustry` / `currentAgentType` 狀態機。
- **雜訊清洗（已知風險）**：粗估腳本得到 ~1,558 筆 vs 實際 ~1,302，差異來自描述內的 inline bold 被誤判為公司，以及部分產業標題字串不一致（如 Retail 段落抓到 0）。extract.py 需：
  - 校正 11 個產業標題的**確切字串**（以快照為準）。
  - 過濾雜訊：描述極短/無描述、公司名過長（含句點/逗號的整句）、重複者剔除或標記。
  - 輸出筆數需落在合理範圍並印出每產業統計供人工核對。
- 輸出 schema（每筆）：
  ```json
  {
    "id": "automotive-logistics-customer-mercedes-benz",
    "industry": "automotive-logistics",
    "agentType": "customer",
    "company": "Mercedes-Benz",
    "descEn": "原文描述（逐字）",
    "isNew": false,
    "sourceAnchor": "https://cloud.google.com/.../#..."
  }
  ```

### 4.2 研究擴寫翻譯（agent team，每產業一支）

每個 agent 領一個產業的 EN 條目，逐筆：

1. 以 `descEn` 為事實基準，用 **WebSearch** 查證該公司的這項 Gen AI 應用（官方新聞稿、Google Cloud 客戶案例、可信媒體）。
2. 產出**擴寫但不虛構**的內容，中英對照：
   - `summary`：一句話摘要（卡片用）。
   - `overview`：2–4 句背景與做法。
   - `highlights`：3–5 條重點/成效（能量化就量化，皆須有來源支撐）。
   - `technologies`：技術標籤（Gemini、Vertex AI、BigQuery…）。
   - `sources`：`[{title, url}]`，**至少含 Google 文章本身**；擴寫所引事實須對應到某個 source。
3. **不虛構規則（硬約束）**：查不到佐證的數字/宣稱一律不寫；寧可保留原文事實也不腦補。每個 agent 在 chunk 檔頭標明「未找到額外來源」的條目，供覆核。
4. 寫回 `data/chunks/<industry>.json`。

chunk 條目 schema：
```json
{
  "id": "...","industry":"...","agentType":"...","company":"...",
  "isNew": false,
  "summary": {"en":"...","zh":"..."},
  "overview": {"en":"...","zh":"..."},
  "highlights": {"en":["..."],"zh":["..."]},
  "technologies": ["Gemini","Vertex AI"],
  "sources": [{"title":"...","url":"..."}]
}
```

### 4.3 `data/merge.js`（合併校驗）

- 讀取所有 `data/chunks/*.json`，依產業→agent→公司排序，產出 `data/use-cases.js`。
- 校驗：id 唯一、必填欄位齊全、每筆 `sources` 至少 1 筆、industry/agentType 屬合法枚舉。
- 產生 `window.INDUSTRIES`（key + en/zh + icon）與 `window.AGENT_TYPES`（6 種 + en/zh + icon）。
- 校驗失敗則中止並列出問題條目。

### 4.4 前端（`index.html` + `assets/styles.css` + `assets/app.js`）

沿用 codex-use-cases 的 MD3 骨架與互動模式（ripple、theme、dialog、deep link、toast），調整：

- **雙維度篩選**：兩排 chips。第一排 11 產業（含「全部」與計數），第二排 6 agent 類型（含「全部」與計數）。兩者為交集（AND）。第二排計數隨第一排選取動態更新。
- **搜尋**：跨 `company`、`summary`、`overview`、`technologies`、產業/agent 標籤；多關鍵字 AND。
- **卡片**：公司名（標題）＋ 產業 pill ＋ agent 類型 pill ＋ `summary` ＋（`isNew` 時）「新」徽章 ＋ 技術標籤（最多 3）。
- **詳情 dialog**：`overview` → `highlights`（清單）→ 技術標籤 → **Sources（引用連結清單）** → 連回 Google 原文 ＋ 上一筆/下一筆。
- **效能（1,302 卡）**：採「分批渲染 / 載入更多」或 `IntersectionObserver` 觸發的漸進渲染，避免一次建立上千 DOM 節點；搜尋/篩選在記憶體陣列上做，渲染只取目前可見批次。
- **i18n**：原地切換，沿用 `data-i18n` / `data-i18n-html` + per-field `{en,zh}`；`<html lang>` 同步更新。
- **右上角 GitHub Star**：連 `https://github.com/tingwei161803/real-world-genai-use-cases`，fetch 星數，失敗則靜默。
- 主題、深連結（`#<id>`）、空狀態、toast 沿用 codex 模式。

## 5. 資料流

1. 載入時 `app.js` 讀 `window.USE_CASES`，為每筆補 `n`（序號）。
2. state：`{lang, theme, industry, agentType, q}`，前三者存 `localStorage`。
3. 任一篩選/搜尋變動 → `computeFiltered()` → 重置可見批次 → 渲染第一批。
4. 捲動接近底部 → 載入下一批。
5. 點卡片 → 開 dialog、`history.replaceState('#id')`；分享連結可深連。

## 6. 錯誤處理

- extract.py：解析後筆數異常（過多/過少）即印警告並列每產業統計，要求人工確認後才續跑。
- 翻譯 agent：查無來源的條目不得編造，於 chunk 檔標記待覆核。
- merge.js：schema/枚舉/來源校驗失敗即中止並指出條目 id。
- 前端：資料缺欄位以安全預設呈現（如無 highlights 則不渲染該段）；GitHub 星數 fetch 失敗靜默。

## 7. 測試

- `extract.py`：對快照斷言「總筆數落在預期區間、11 產業皆 > 0、無空 company、無空 descEn」。Phase 1 另斷言 Automotive & Logistics ≈ 48（容許小幅誤差）。
- `merge.js`：對合併結果斷言 schema 與枚舉、id 唯一、每筆至少 1 source。
- 前端：手動 + 簡易 DOM 煙霧測試（篩選交集筆數正確、搜尋命中、語言切換後文字改變、dialog 開關與深連結）。

## 8. 目錄結構

```
real-world-genai-use-cases/
├── index.html
├── assets/{styles.css, app.js}
├── data/
│   ├── source/gcp-usecases.html      來源快照
│   ├── extract.py                    確定性抽取
│   ├── raw/usecases-en.json          抽取產物
│   ├── chunks/<industry>.json        每產業擴寫雙語產物
│   ├── merge.js                      合併校驗
│   └── use-cases.js                  前端載入的最終資料
├── .test/                            測試
├── docs/superpowers/specs/           本設計文件
├── README.md
└── .nojekyll
```

## 9. 已知風險

1. **抽取雜訊**：HTML 無語意化 class，靠 bold + 狀態機解析；需人工核對每產業筆數。Phase 1 先驗證解析正確性。
2. **研究成本/品質**：逐筆 WebSearch 查證 1,302 筆成本高；故先以 48 筆（Automotive）驗證單位成本與品質後再決定是否全量、抽樣或降級。
3. **來源可得性**：部分小公司可能查無公開佐證 → 退回僅呈現原文事實並標記，不虛構。
4. **效能**：1,302 卡需漸進渲染；先以實測確認捲動流暢。

## 10. 決策摘要（已與使用者確認）

- 收錄全部 ~1,302 筆，但**分階段**，先跑通 Automotive & Logistics。
- **雙維度**篩選（產業 × agent 類型）。
- **原地即時**中英切換。
- 內容**擴寫並查證、附來源、不虛構**。
- 視覺對齊 codex-use-cases；右上角 GitHub Star；作者 tingwei161803。
