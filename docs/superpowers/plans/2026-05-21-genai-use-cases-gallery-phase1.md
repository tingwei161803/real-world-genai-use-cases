# Gen AI Use Cases 互動圖鑑 — Phase 1 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Google Cloud「1,302 real-world gen AI use cases」文章做成可雙維度篩選、可搜尋、中英原地切換的單頁圖鑑；Phase 1 先把 Automotive & Logistics（約 48 筆）端到端跑通。

**Architecture:** 三段式資料管線（`extract.py` 確定性抽取 → agent 研究擴寫翻譯成 chunk → `merge.js` 合併校驗成 `use-cases.js`）+ 沿用 codex-use-cases 的 Material Design 3 靜態前端。前端純 HTML/CSS/單支 JS，無 build step。

**Tech Stack:** Python 3（抽取與測試 pytest）、Node.js（merge，無相依套件）、原生 HTML/CSS/JS、Material Design 3、Material Symbols 字型。

設計文件：`docs/superpowers/specs/2026-05-21-genai-use-cases-gallery-design.md`
參考專案：`/Users/peter_chang/Code/personal/codex-use-cases`

---

## 檔案結構

```
real-world-genai-use-cases/
├── index.html                         前端骨架
├── assets/styles.css                  MD3 樣式（自 codex 改寫）
├── assets/app.js                      互動：i18n / 雙篩選 / 搜尋 / 漸進渲染 / dialog
├── data/source/gcp-usecases.html      來源快照
├── data/extract.py                    確定性抽取
├── data/raw/usecases-en.json          抽取產物（11 產業全量 EN）
├── data/chunks/automotive-logistics.json   Phase 1 擴寫雙語產物
├── data/merge.js                      合併校驗 → use-cases.js
├── data/use-cases.js                  前端載入的最終資料
├── .test/test_extract.py              extract 測試
├── .test/test_merge.js                merge 測試
├── .nojekyll
└── README.md
```

**資料模型（最終 `use-cases.js`）**
```js
window.AGENT_TYPES = [{ key, en, zh, icon }];   // 6 種
window.INDUSTRIES  = [{ key, en, zh, icon }];   // 11 種
window.USE_CASES = [{
  id, industry, agentType, company, isNew,
  summary:   { en, zh },
  overview:  { en, zh },
  highlights:{ en:[], zh:[] },
  technologies: [],
  sources: [{ title, url }],
}];
```
卡片強調色以 **agentType**（6 色）為主軸，industry 作為前導 pill。

---

## Task 1: 專案骨架與來源快照

**Files:**
- Create: `.nojekyll`, `.gitignore`, `data/source/gcp-usecases.html`, `data/raw/.gitkeep`, `data/chunks/.gitkeep`, `.test/.gitkeep`

- [ ] **Step 1: 建立目錄與來源快照**

來源快照已在 `/tmp/gcp_usecases.html`（先前以 curl 取得）。複製進 repo：

```bash
cd /Users/peter_chang/Code/personal/real-world-genai-use-cases
mkdir -p data/source data/raw data/chunks .test assets
cp /tmp/gcp_usecases.html data/source/gcp-usecases.html
touch data/raw/.gitkeep data/chunks/.gitkeep .test/.gitkeep .nojekyll
printf '%s\n' '.DS_Store' 'node_modules/' '__pycache__/' '*.pyc' > .gitignore
ls -la data/source && wc -c data/source/gcp-usecases.html
```

Expected: `gcp-usecases.html` 約 1.6–1.7 MB。

> 若 `/tmp/gcp_usecases.html` 已不存在，重新抓取：
> `curl -sL -A "Mozilla/5.0" "https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders" -o data/source/gcp-usecases.html`

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: 專案骨架與來源快照"
```

---

## Task 2: 確定性抽取 `data/extract.py`

把快照解析成 `data/raw/usecases-en.json`。先寫測試，再實作。

**Files:**
- Create: `data/extract.py`
- Test: `.test/test_extract.py`

- [ ] **Step 1: 寫失敗測試**

`.test/test_extract.py`：

```python
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "usecases-en.json"

INDUSTRY_KEYS = {
    "automotive-logistics", "business-professional-services", "financial-services",
    "healthcare-life-sciences", "hospitality-travel", "manufacturing-industrial-electronics",
    "media-marketing-gaming", "public-sector-nonprofits", "retail", "technology",
    "telecommunications",
}
AGENT_KEYS = {"customer", "employee", "creative", "code", "data", "security"}


def setup_module(_):
    subprocess.run([sys.executable, str(ROOT / "data" / "extract.py")], check=True)


def load():
    return json.loads(RAW.read_text(encoding="utf-8"))


def test_total_in_expected_range():
    rows = load()
    assert 1100 <= len(rows) <= 1500, f"unexpected total: {len(rows)}"


def test_all_industries_present_and_nonempty():
    rows = load()
    by_ind = {}
    for r in rows:
        by_ind.setdefault(r["industry"], 0)
        by_ind[r["industry"]] += 1
    assert set(by_ind) == INDUSTRY_KEYS, by_ind
    assert all(v > 0 for v in by_ind.values()), by_ind


def test_automotive_count_reasonable():
    rows = load()
    n = sum(1 for r in rows if r["industry"] == "automotive-logistics")
    assert 40 <= n <= 60, f"automotive count {n}"


def test_fields_valid():
    rows = load()
    ids = set()
    for r in rows:
        assert r["agentType"] in AGENT_KEYS, r
        assert r["company"].strip() and not r["company"].endswith("Agents"), r
        assert len(r["descEn"].strip()) >= 20, r
        assert r["id"] not in ids, f"dup id {r['id']}"
        ids.add(r["id"])
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `python3 -m pytest .test/test_extract.py -q`
Expected: FAIL（`extract.py` 不存在 / 無 `usecases-en.json`）。

- [ ] **Step 3: 實作 `data/extract.py`**

```python
"""Deterministically extract gen-AI use cases from the Google Cloud snapshot.

Source DOM shape:
  industry+agent heading:  <h3><strong>RetailCustomer Agents</strong></h3>
  bare agent heading:       <h3><strong>Employee Agents</strong></h3>
  use case entry:           <li ...><p><strong>Company</strong><span>desc...</span></p></li>

Output: data/raw/usecases-en.json
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "source" / "gcp-usecases.html"
OUT = ROOT / "data" / "raw" / "usecases-en.json"

# (顯示名, key) — 顯示名須與快照中 <strong> 內文字完全一致（依長到短排序避免前綴誤判）
INDUSTRIES = [
    ("Business & Professional Services", "business-professional-services"),
    ("Manufacturing, Industrial & Electronics", "manufacturing-industrial-electronics"),
    ("Public Sector & Nonprofits", "public-sector-nonprofits"),
    ("Healthcare & Life Sciences", "healthcare-life-sciences"),
    ("Media, Marketing & Gaming", "media-marketing-gaming"),
    ("Automotive & Logistics", "automotive-logistics"),
    ("Hospitality & Travel", "hospitality-travel"),
    ("Financial Services", "financial-services"),
    ("Telecommunications", "telecommunications"),
    ("Technology", "technology"),
    ("Retail", "retail"),
]
AGENTS = [
    ("Customer Agents", "customer"), ("Employee Agents", "employee"),
    ("Creative Agents", "creative"), ("Code Agents", "code"),
    ("Data Agents", "data"), ("Security Agents", "security"),
]
AGENT_BY_LABEL = {label: key for label, key in AGENTS}

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")

# 單次有序掃描：交替匹配 (A) 標題 strong  或 (B) li 條目
SCAN_RE = re.compile(
    r"<h3[^>]*>\s*<strong[^>]*>(?P<head>.*?)</strong>\s*</h3>"
    r"|<li[^>]*>\s*<p[^>]*>\s*<strong[^>]*>(?P<company>.*?)</strong>(?P<rest>.*?)</p>",
    re.S,
)


def clean(s: str) -> str:
    return WS_RE.sub(" ", html.unescape(TAG_RE.sub(" ", s))).strip()


def slugify(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s or "x"


def parse_head(text: str):
    """Return (industry_key|None, agent_key|None) for a heading strong."""
    t = clean(text)
    for label, key in INDUSTRIES:  # 長到短，先比對含產業前綴者
        if t.startswith(label):
            rest = t[len(label):].strip()
            return key, AGENT_BY_LABEL.get(rest)
    if t in AGENT_BY_LABEL:
        return None, AGENT_BY_LABEL[t]
    return None, None


def main() -> int:
    raw = SRC.read_text(encoding="utf-8", errors="ignore")
    body = re.sub(r"<script.*?</script>", "", raw, flags=re.S)
    body = re.sub(r"<style.*?</style>", "", body, flags=re.S)

    rows = []
    seen = set()
    cur_ind = cur_agent = None
    counts = {}

    for m in SCAN_RE.finditer(body):
        if m.group("head") is not None:
            ind, agent = parse_head(m.group("head"))
            if ind:
                cur_ind = ind
            if agent:
                cur_agent = agent
            continue

        company = clean(m.group("company"))
        desc = clean(m.group("rest"))
        if not cur_ind or not cur_agent:
            continue
        if not company or company.endswith("Agents") or len(desc) < 20:
            continue

        base = f"{cur_ind}-{cur_agent}-{slugify(company)}"
        uid = base
        i = 2
        while uid in seen:
            uid = f"{base}-{i}"
            i += 1
        seen.add(uid)

        is_new = company.endswith("*")
        rows.append({
            "id": uid,
            "industry": cur_ind,
            "agentType": cur_agent,
            "company": company.rstrip("* ").strip(),
            "descEn": desc,
            "isNew": is_new,
            "sourceUrl": "https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders",
        })
        counts[cur_ind] = counts.get(cur_ind, 0) + 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"extracted {len(rows)} use cases", file=sys.stderr)
    for _, key in INDUSTRIES:
        print(f"  {counts.get(key, 0):4d}  {key}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: 跑測試確認通過**

Run: `python3 -m pytest .test/test_extract.py -q`
Expected: PASS（4 tests）。同時 `python3 data/extract.py` 的 stderr 會印出每產業統計，**人工核對** Automotive ≈ 48、11 產業皆 > 0、無 0 值。

> 若某產業為 0 或總數異常：對照 `data/source/gcp-usecases.html` 檢查該產業 `<strong>` 標題字串是否與 `INDUSTRIES` 表一致，修正顯示名後重跑。

- [ ] **Step 5: Commit**

```bash
git add data/extract.py .test/test_extract.py data/raw/usecases-en.json
git commit -m "feat: 確定性抽取 1,302 筆 use cases (extract.py + 測試)"
```

---

## Task 3: 研究擴寫翻譯 Automotive chunk（agent 任務）

把 `usecases-en.json` 中 `industry == automotive-logistics` 的條目（約 48 筆）研究擴寫成中英雙語、附來源的 chunk。此任務由執行者**派發一支 agent**（建議 `general-purpose`，須有 WebSearch）完成；以下為交付給該 agent 的完整規格。

**Files:**
- Create: `data/chunks/automotive-logistics.json`

- [ ] **Step 1: 派發 agent，提供下列指令**

> 你要產出 `data/chunks/automotive-logistics.json`。輸入是 `data/raw/usecases-en.json` 裡 `industry=="automotive-logistics"` 的所有條目。
>
> 對每一筆：
> 1. 以 `descEn` 為事實基準，用 WebSearch 查證該公司的這項 Google/Gemini/Vertex AI 應用（優先：公司官方新聞稿、Google Cloud 官方 customer story、可信媒體報導）。
> 2. 產出以下欄位，**中英對照**，內容豐富但**嚴禁虛構**——查不到佐證的數字或宣稱一律不寫：
>    - `summary` {en,zh}：一句話摘要（≤ 30 字／20 詞，卡片用）。
>    - `overview` {en,zh}：2–4 句背景與做法。
>    - `highlights` {en,zh}：3–5 條重點/成效；能量化就量化，每條都要有來源支撐。
>    - `technologies`：技術標籤陣列（如 "Gemini", "Vertex AI", "BigQuery"）。
>    - `sources`：`[{title,url}]`，**至少含 Google 原文**（`sourceUrl`）；任何擴寫事實都要對應到某個 source。
> 3. 保留原條目的 `id`、`industry`、`agentType`、`company`、`isNew`。
> 4. zh 一律繁體中文（zh-TW），技術名詞與產品名保留原文。
>
> 輸出格式：JSON 陣列，每筆 schema：
> ```json
> {"id":"...","industry":"automotive-logistics","agentType":"...","company":"...","isNew":false,
>  "summary":{"en":"...","zh":"..."},"overview":{"en":"...","zh":"..."},
>  "highlights":{"en":["..."],"zh":["..."]},"technologies":["..."],
>  "sources":[{"title":"...","url":"..."}]}
> ```
> 若某筆查無任何額外可信來源：`overview`/`highlights` 僅根據原文事實撰寫，`sources` 只放 Google 原文，並在該筆額外加 `"needsReview": true`。
> 最後把陣列寫入 `data/chunks/automotive-logistics.json`（UTF-8、`indent=2`）。

- [ ] **Step 2: 驗證 chunk 結構**

Run:
```bash
python3 - <<'PY'
import json
rows=json.load(open('data/chunks/automotive-logistics.json',encoding='utf-8'))
raw=[r for r in json.load(open('data/raw/usecases-en.json',encoding='utf-8')) if r['industry']=='automotive-logistics']
assert len(rows)==len(raw), f"chunk {len(rows)} vs raw {len(raw)}"
for r in rows:
    for k in ['id','industry','agentType','company','summary','overview','highlights','technologies','sources']:
        assert k in r, (r.get('id'),k)
    assert r['summary']['en'] and r['summary']['zh']
    assert len(r['sources'])>=1
print("chunk ok:",len(rows),"rows; needsReview:",sum(1 for r in rows if r.get('needsReview')))
PY
```
Expected: `chunk ok: ~48 rows`，筆數與 raw 相符、欄位齊全。人工抽查 3–5 筆的 `sources` 連結真實可達、`highlights` 與來源一致。

- [ ] **Step 3: Commit**

```bash
git add data/chunks/automotive-logistics.json
git commit -m "feat: Automotive & Logistics 產業研究擴寫雙語 chunk"
```

---

## Task 4: 合併校驗 `data/merge.js`

把所有 chunk 合併成 `data/use-cases.js`，附 `INDUSTRIES` / `AGENT_TYPES` 表與校驗。

**Files:**
- Create: `data/merge.js`
- Test: `.test/test_merge.js`

- [ ] **Step 1: 寫失敗測試**

`.test/test_merge.js`（純 Node，無框架）：

```js
const { execSync } = require('child_process');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
execSync('node data/merge.js', { cwd: ROOT, stdio: 'inherit' });

// 載入產物
global.window = {};
require(path.join(ROOT, 'data', 'use-cases.js'));
const { USE_CASES, INDUSTRIES, AGENT_TYPES } = global.window;

assert(Array.isArray(USE_CASES) && USE_CASES.length > 0, 'USE_CASES empty');
assert(INDUSTRIES.length === 11, `INDUSTRIES ${INDUSTRIES.length}`);
assert(AGENT_TYPES.length === 6, `AGENT_TYPES ${AGENT_TYPES.length}`);

const indKeys = new Set(INDUSTRIES.map((x) => x.key));
const agKeys = new Set(AGENT_TYPES.map((x) => x.key));
const ids = new Set();
for (const u of USE_CASES) {
  assert(indKeys.has(u.industry), `bad industry ${u.industry}`);
  assert(agKeys.has(u.agentType), `bad agentType ${u.agentType}`);
  assert(u.summary && u.summary.en && u.summary.zh, `bad summary ${u.id}`);
  assert(Array.isArray(u.sources) && u.sources.length >= 1, `no sources ${u.id}`);
  assert(!ids.has(u.id), `dup id ${u.id}`);
  ids.add(u.id);
}
console.log('merge test ok:', USE_CASES.length, 'use cases');
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node .test/test_merge.js`
Expected: FAIL（`merge.js` 不存在）。

- [ ] **Step 3: 實作 `data/merge.js`**

```js
/* Merge data/chunks/*.json into data/use-cases.js (window.USE_CASES).
   Run: node data/merge.js */
const fs = require('fs');
const path = require('path');

const CHUNK_DIR = path.join(__dirname, 'chunks');
const OUT = path.join(__dirname, 'use-cases.js');
const SOURCE_URL =
  'https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders';

const INDUSTRIES = [
  { key: 'automotive-logistics', en: 'Automotive & Logistics', zh: '汽車與物流', icon: 'local_shipping' },
  { key: 'business-professional-services', en: 'Business & Professional Services', zh: '商業與專業服務', icon: 'business_center' },
  { key: 'financial-services', en: 'Financial Services', zh: '金融服務', icon: 'account_balance' },
  { key: 'healthcare-life-sciences', en: 'Healthcare & Life Sciences', zh: '醫療與生命科學', icon: 'health_and_safety' },
  { key: 'hospitality-travel', en: 'Hospitality & Travel', zh: '旅宿與旅遊', icon: 'flight' },
  { key: 'manufacturing-industrial-electronics', en: 'Manufacturing, Industrial & Electronics', zh: '製造與工業電子', icon: 'precision_manufacturing' },
  { key: 'media-marketing-gaming', en: 'Media, Marketing & Gaming', zh: '媒體、行銷與遊戲', icon: 'movie' },
  { key: 'public-sector-nonprofits', en: 'Public Sector & Nonprofits', zh: '公部門與非營利', icon: 'account_balance_wallet' },
  { key: 'retail', en: 'Retail & Consumer Goods', zh: '零售與消費品', icon: 'shopping_cart' },
  { key: 'technology', en: 'Technology', zh: '科技', icon: 'memory' },
  { key: 'telecommunications', en: 'Telecommunications', zh: '電信', icon: 'cell_tower' },
];
const AGENT_TYPES = [
  { key: 'customer', en: 'Customer Agents', zh: '顧客型', icon: 'support_agent' },
  { key: 'employee', en: 'Employee Agents', zh: '員工型', icon: 'badge' },
  { key: 'creative', en: 'Creative Agents', zh: '創意型', icon: 'palette' },
  { key: 'code', en: 'Code Agents', zh: '程式型', icon: 'code' },
  { key: 'data', en: 'Data Agents', zh: '資料型', icon: 'bar_chart' },
  { key: 'security', en: 'Security Agents', zh: '資安型', icon: 'security' },
];

const indOrder = new Map(INDUSTRIES.map((x, i) => [x.key, i]));
const agOrder = new Map(AGENT_TYPES.map((x, i) => [x.key, i]));

function readChunks() {
  if (!fs.existsSync(CHUNK_DIR)) return [];
  return fs
    .readdirSync(CHUNK_DIR)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(CHUNK_DIR, f), 'utf-8')));
}

function validate(rows) {
  const ids = new Set();
  for (const u of rows) {
    if (!indOrder.has(u.industry)) throw new Error(`bad industry: ${u.industry} (${u.id})`);
    if (!agOrder.has(u.agentType)) throw new Error(`bad agentType: ${u.agentType} (${u.id})`);
    if (!u.summary || !u.summary.en || !u.summary.zh) throw new Error(`bad summary: ${u.id}`);
    if (!Array.isArray(u.sources) || u.sources.length < 1) throw new Error(`no sources: ${u.id}`);
    if (ids.has(u.id)) throw new Error(`dup id: ${u.id}`);
    ids.add(u.id);
    if (!u.sources.some((s) => s.url === SOURCE_URL)) {
      u.sources.push({ title: 'Google Cloud — 1,302 real-world gen AI use cases', url: SOURCE_URL });
    }
  }
}

function main() {
  const rows = readChunks();
  validate(rows);
  rows.sort((a, b) => {
    const di = indOrder.get(a.industry) - indOrder.get(b.industry);
    if (di) return di;
    const da = agOrder.get(a.agentType) - agOrder.get(b.agentType);
    if (da) return da;
    return a.company.localeCompare(b.company);
  });

  const banner = `/* Auto-generated by data/merge.js — do not edit by hand.\n   ${rows.length} gen AI use cases, bilingual (en / zh-TW).\n   Source: ${SOURCE_URL} */\n`;
  const out =
    banner +
    `window.INDUSTRIES = ${JSON.stringify(INDUSTRIES, null, 2)};\n` +
    `window.AGENT_TYPES = ${JSON.stringify(AGENT_TYPES, null, 2)};\n` +
    `window.USE_CASES = ${JSON.stringify(rows, null, 2)};\n`;
  fs.writeFileSync(OUT, out, 'utf-8');
  console.log(`merged ${rows.length} use cases -> ${path.relative(process.cwd(), OUT)}`);
}

main();
```

- [ ] **Step 4: 跑測試確認通過**

Run: `node .test/test_merge.js`
Expected: PASS，印出 `merge test ok: ~48 use cases`。

- [ ] **Step 5: Commit**

```bash
git add data/merge.js .test/test_merge.js data/use-cases.js
git commit -m "feat: 合併校驗管線 merge.js + use-cases.js"
```

---

## Task 5: 前端骨架 `index.html`

**Files:**
- Create: `index.html`

- [ ] **Step 1: 建立 `index.html`**

```html
<!doctype html>
<html lang="zh-Hant" data-theme="light">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Gen AI 真實應用圖鑑 · Real-World Gen AI Use Cases</title>
  <meta name="description" content="Google Cloud 1,302 個真實世界 Gen AI 企業應用的中英對照互動圖鑑 · An interactive bilingual gallery of 1,302 real-world generative AI use cases." />
  <meta property="og:title" content="Gen AI 真實應用圖鑑 · Real-World Gen AI Use Cases" />
  <meta property="og:description" content="Google Cloud 1,302 個真實世界 Gen AI 企業應用的中英對照互動圖鑑。" />
  <meta property="og:type" content="website" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Flex:opsz,wght@8..144,400..700&family=Roboto+Mono:wght@400;500&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet" />

  <link rel="stylesheet" href="assets/styles.css" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='24' fill='%231a73e8'/><text x='50' y='70' font-size='60' text-anchor='middle'>✨</text></svg>" />
</head>
<body>
  <header class="appbar">
    <div class="appbar__brand">
      <span class="brand-mark"><span class="material-symbols-rounded">auto_awesome</span></span>
      <span>
        <span data-i18n="brand">Gen AI 真實應用圖鑑</span><br />
        <span class="brand-sub" data-i18n="brandSub">取材自 Google Cloud</span>
      </span>
    </div>

    <a class="ghstar ripple-host" href="https://github.com/tingwei161803/real-world-genai-use-cases" target="_blank" rel="noopener" aria-label="Star on GitHub">
      <svg class="ghstar__logo" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
      <span class="ghstar__star" aria-hidden="true">★</span>
      <span class="ghstar__text">Star</span>
      <span class="ghstar__count" id="gh-count" hidden></span>
    </a>

    <div class="seg" role="group" aria-label="Language">
      <button id="lang-zh" data-lang="zh" aria-pressed="true"><span class="lbl">中文</span></button>
      <button id="lang-en" data-lang="en" aria-pressed="false"><span class="lbl">EN</span></button>
    </div>
    <button class="icon-btn ripple-host" id="theme-toggle" aria-label="Toggle theme" title="切換深淺色">
      <span class="material-symbols-rounded" id="theme-icon">dark_mode</span>
    </button>
  </header>

  <section class="hero">
    <span class="hero__eyebrow"><span class="dot"></span><span data-i18n="eyebrow">取材自 Google Cloud 官方文章</span></span>
    <h1 data-i18n-html="heroTitle">全世界都在用 <span class="grad">Gen AI</span> 做的事</h1>
    <p data-i18n="heroDesc">把 Google Cloud 整理的數百家領先企業真實 Gen AI 應用，做成一份可互動、可雙維度篩選、可搜尋的中英對照圖鑑。每筆都經查證並附上資料來源。</p>
    <div class="hero__stats">
      <div class="hero__stat"><b id="stat-total">0</b><span data-i18n="statCases">應用案例</span></div>
      <div class="hero__stat"><b id="stat-inds">11</b><span data-i18n="statInds">產業領域</span></div>
      <div class="hero__stat"><b>6</b><span data-i18n="statAgents">Agent 類型</span></div>
    </div>
  </section>

  <section class="controls">
    <div class="search ripple-host">
      <span class="material-symbols-rounded">search</span>
      <input id="search" type="search" autocomplete="off" />
      <button class="icon-btn search__clear" id="search-clear" aria-label="Clear">
        <span class="material-symbols-rounded">close</span>
      </button>
    </div>
    <div class="filter-row">
      <span class="filter-row__label" data-i18n="filterIndustry">產業</span>
      <div class="chips" id="chips-industry" role="group" aria-label="Industries"></div>
    </div>
    <div class="filter-row">
      <span class="filter-row__label" data-i18n="filterAgent">Agent 類型</span>
      <div class="chips" id="chips-agent" role="group" aria-label="Agent types"></div>
    </div>
    <div class="result-count" id="result-count" aria-live="polite"></div>
  </section>

  <main class="grid" id="grid" aria-live="polite"></main>
  <div class="load-sentinel" id="load-sentinel" hidden></div>

  <footer class="site-foot">
    <p data-i18n-html="footer">內容整理自 <a href="https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders" target="_blank" rel="noopener">Google Cloud — Real-world gen AI use cases</a>。本頁為非官方的中英對照學習用整理，各案例均附原始資料來源。</p>
  </footer>

  <div class="scrim" id="scrim" role="dialog" aria-modal="true" aria-labelledby="dlg-title" hidden>
    <div class="dialog" id="dialog"></div>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>

  <script src="data/use-cases.js"></script>
  <script src="assets/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: 前端骨架 index.html"
```

---

## Task 6: 樣式 `assets/styles.css`

自 codex 樣式改寫：把 8 個分類色換成 6 個 agent 色，加上第二排篩選列、Sources 清單、新徽章、載入哨兵與結果計數。

**Files:**
- Create: `assets/styles.css`

- [ ] **Step 1: 以 codex 樣式為基底複製**

```bash
cp /Users/peter_chang/Code/personal/codex-use-cases/assets/styles.css assets/styles.css
```

- [ ] **Step 2: 替換分類色變數為 agent 色**

在 `assets/styles.css` 找到 `:root` 中以 `--c-` 開頭的 8 行分類色變數（`--c-productivity` … `--c-finance`），整段替換為下列 6 個 agent 色：

```css
  --c-customer: #1a73e8;
  --c-employee: #12a150;
  --c-creative: #d93025;
  --c-code:     #8430ce;
  --c-data:     #e8710a;
  --c-security: #00897b;
```

> 卡片與 chip 用 `style="--cat:var(--c-<agentType>)"`，故只需 agent 色；industry chip 不帶強調色（用中性樣式）。

- [ ] **Step 3: 追加新元件樣式**

在 `assets/styles.css` 檔尾追加：

```css
/* ---- 雙排篩選列 ---- */
.filter-row { display:flex; align-items:flex-start; gap:10px; margin-top:10px; }
.filter-row__label {
  flex:0 0 auto; padding-top:9px; font-size:12px; font-weight:600;
  color:var(--on-surface-variant); min-width:62px; letter-spacing:.02em;
}
.result-count { margin-top:12px; font-size:13px; color:var(--on-surface-variant); }

/* industry chips 用中性外觀（無 agent 強調色） */
#chips-industry .chip[aria-pressed="true"] { --cat: var(--primary); }

/* ---- 新徽章 ---- */
.badge-new {
  display:inline-flex; align-items:center; gap:3px; padding:1px 7px;
  font-size:11px; font-weight:700; border-radius:999px;
  background:color-mix(in srgb, var(--c-creative) 16%, transparent);
  color:var(--c-creative);
}

/* ---- dialog Sources ---- */
.sources { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px; }
.sources li a {
  display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:12px;
  background:var(--surface-2); color:var(--on-surface); text-decoration:none;
  font-size:14px; transition:background .15s;
}
.sources li a:hover { background:var(--surface-3); }
.sources li a .material-symbols-rounded { font-size:18px; color:var(--on-surface-variant); }

/* ---- 載入哨兵 ---- */
.load-sentinel { height:1px; }
.tech-tags { display:flex; flex-wrap:wrap; gap:6px; }

/* ---- 卡片/對話框的產業列 ---- */
.ind-line {
  display:inline-flex; align-items:center; gap:4px; margin:6px 0 2px;
  font-size:12px; font-weight:500; color:var(--on-surface-variant);
}
.dialog__title .ind-line { margin-top:8px; }
```

> 若 codex 樣式無 `--surface-2/3`、`--primary` 等變數，沿用其既有 surface 變數名（開啟 codex `styles.css` 的 `:root` 對照替換）。

- [ ] **Step 4: Commit**

```bash
git add assets/styles.css
git commit -m "feat: MD3 樣式（agent 色 + 雙篩選列 + sources）"
```

---

## Task 7: 互動 `assets/app.js`

i18n、雙維度篩選、搜尋、漸進渲染、含 sources 的 dialog、主題、深連結、GitHub 星數。

**Files:**
- Create: `assets/app.js`

- [ ] **Step 1: 建立 `assets/app.js`**

```js
/* Real-World Gen AI Use Cases — interactivity
   i18n · dual-axis filter · search · progressive render · detail dialog
   sources · theme · ripple · deep links */
(() => {
  'use strict';

  const DATA = (window.USE_CASES || []).map((d, i) => ({ ...d, n: i + 1 }));
  const INDUSTRIES = window.INDUSTRIES || [];
  const AGENT_TYPES = window.AGENT_TYPES || [];
  const BATCH = 60;

  const indLabel = (k, lang) => (INDUSTRIES.find((x) => x.key === k) || {})[lang] || k;
  const agLabel = (k, lang) => (AGENT_TYPES.find((x) => x.key === k) || {})[lang] || k;
  const agIcon = (k) => (AGENT_TYPES.find((x) => x.key === k) || {}).icon || 'smart_toy';
  const indIcon = (k) => (INDUSTRIES.find((x) => x.key === k) || {}).icon || 'label';

  const I18N = {
    zh: {
      brand: 'Gen AI 真實應用圖鑑', brandSub: '取材自 Google Cloud',
      eyebrow: '取材自 Google Cloud 官方文章',
      heroTitle: '全世界都在用 <span class="grad">Gen AI</span> 做的事',
      heroDesc: '把 Google Cloud 整理的數百家領先企業真實 Gen AI 應用，做成一份可互動、可雙維度篩選、可搜尋的中英對照圖鑑。每筆都經查證並附上資料來源。',
      statCases: '應用案例', statInds: '產業領域', statAgents: 'Agent 類型',
      footer: '內容整理自 <a href="https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders" target="_blank" rel="noopener">Google Cloud — Real-world gen AI use cases</a>。本頁為非官方的中英對照學習用整理，各案例均附原始資料來源。',
      searchPlaceholder: '搜尋公司、應用、技術或關鍵字…',
      filterIndustry: '產業', filterAgent: 'Agent 類型', all: '全部',
      cardCta: '查看細節', badgeNew: '新',
      secOverview: '應用概述', secHighlights: '重點與成效', secTech: '使用技術', secSources: '資料來源',
      original: '看 Google 原文', prev: '上一個', next: '下一個',
      emptyTitle: '找不到符合的案例', emptyDesc: '換個關鍵字，或清除篩選條件試試。',
      results: (n) => `${n} 個案例`,
      themeDark: '切換深色', themeLight: '切換淺色', loadMore: '載入更多',
    },
    en: {
      brand: 'Real-World Gen AI Use Cases', brandSub: 'Sourced from Google Cloud',
      eyebrow: 'Sourced from a Google Cloud article',
      heroTitle: 'What the whole world is doing with <span class="grad">Gen AI</span>',
      heroDesc: "Hundreds of leading organizations' real-world generative AI applications, curated by Google Cloud into one interactive, dual-filterable, searchable bilingual gallery. Every entry is researched and cited.",
      statCases: 'Use cases', statInds: 'Industries', statAgents: 'Agent types',
      footer: 'Content adapted from <a href="https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders" target="_blank" rel="noopener">Google Cloud — Real-world gen AI use cases</a>. An unofficial bilingual study companion; each entry links its original source.',
      searchPlaceholder: 'Search companies, applications, tech or keywords…',
      filterIndustry: 'Industry', filterAgent: 'Agent type', all: 'All',
      cardCta: 'View details', badgeNew: 'New',
      secOverview: 'Overview', secHighlights: 'Highlights & outcomes', secTech: 'Technologies', secSources: 'Sources',
      original: 'Read on Google Cloud', prev: 'Previous', next: 'Next',
      emptyTitle: 'No matching use cases', emptyDesc: 'Try a different keyword or clear the filters.',
      results: (n) => `${n} use case${n === 1 ? '' : 's'}`,
      themeDark: 'Switch to dark', themeLight: 'Switch to light', loadMore: 'Load more',
    },
  };

  const state = {
    lang: localStorage.getItem('genai.lang') || 'zh',
    theme: localStorage.getItem('genai.theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    industry: 'all',
    agent: 'all',
    q: '',
  };
  let filtered = DATA.slice();
  let shown = 0;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const t = (k) => I18N[state.lang][k];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function attachRipple(el) {
    el.addEventListener('pointerdown', (e) => {
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = size + 'px';
      span.style.left = (e.clientX - r.left - size / 2) + 'px';
      span.style.top = (e.clientY - r.top - size / 2) + 'px';
      el.appendChild(span);
      span.addEventListener('animationend', () => span.remove());
    });
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    const dark = state.theme === 'dark';
    $('#theme-icon').textContent = dark ? 'light_mode' : 'dark_mode';
    $('#theme-toggle').title = dark ? t('themeLight') : t('themeDark');
  }
  $('#theme-toggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('genai.theme', state.theme);
    applyTheme();
  });

  function applyStaticI18n() {
    document.documentElement.lang = state.lang === 'zh' ? 'zh-Hant' : 'en';
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    $('#search').placeholder = t('searchPlaceholder');
    $('#lang-zh').setAttribute('aria-pressed', String(state.lang === 'zh'));
    $('#lang-en').setAttribute('aria-pressed', String(state.lang === 'en'));
    applyTheme();
  }
  function setLang(lang) {
    if (lang === state.lang) return;
    state.lang = lang;
    localStorage.setItem('genai.lang', lang);
    applyStaticI18n();
    renderChips();
    renderCards();
    if (openIndex >= 0) renderDialog();
  }
  $('#lang-zh').addEventListener('click', () => setLang('zh'));
  $('#lang-en').addEventListener('click', () => setLang('en'));

  /* ---- chips：兩排（產業 + agent），交集篩選 ---- */
  function countBy(getKey, predicate) {
    const c = {};
    DATA.forEach((d) => { if (predicate(d)) c[getKey(d)] = (c[getKey(d)] || 0) + 1; });
    return c;
  }
  function renderChips() {
    // 產業排：計數受目前 agent 篩選影響
    const indCounts = countBy((d) => d.industry, (d) => state.agent === 'all' || d.agentType === state.agent);
    const indItems = [{ key: 'all', label: t('all'), count: DATA.filter((d) => state.agent === 'all' || d.agentType === state.agent).length, icon: 'apps' }]
      .concat(INDUSTRIES.map((c) => ({ key: c.key, label: c[state.lang], count: indCounts[c.key] || 0, icon: c.icon })));
    fillChips($('#chips-industry'), indItems, state.industry, (key) => { state.industry = key; renderChips(); renderCards(); });

    // agent 排：計數受目前產業篩選影響
    const agCounts = countBy((d) => d.agentType, (d) => state.industry === 'all' || d.industry === state.industry);
    const agItems = [{ key: 'all', label: t('all'), count: DATA.filter((d) => state.industry === 'all' || d.industry === state.industry).length, icon: 'apps' }]
      .concat(AGENT_TYPES.map((c) => ({ key: c.key, label: c[state.lang], count: agCounts[c.key] || 0, icon: c.icon, accent: c.key })));
    fillChips($('#chips-agent'), agItems, state.agent, (key) => { state.agent = key; renderChips(); renderCards(); });
  }
  function fillChips(wrap, items, active, onPick) {
    wrap.innerHTML = items.map((it) => `
      <button class="chip ripple-host" data-key="${it.key}" aria-pressed="${active === it.key}"
        ${it.accent ? `style="--cat:var(--c-${it.accent})"` : ''}>
        <span class="leadcheck"><span class="material-symbols-rounded">check</span></span>
        <span class="material-symbols-rounded" style="font-size:18px">${it.icon}</span>
        ${esc(it.label)} <span class="count">${it.count}</span>
      </button>`).join('');
    $$('.chip', wrap).forEach((b) => {
      attachRipple(b);
      b.addEventListener('click', () => onPick(b.dataset.key));
    });
  }

  /* ---- filtering ---- */
  function matches(d, q) {
    if (!q) return true;
    const hay = [
      d.company, d.summary.en, d.summary.zh, d.overview.en, d.overview.zh,
      (d.technologies || []).join(' '), indLabel(d.industry, 'en'), indLabel(d.industry, 'zh'),
      agLabel(d.agentType, 'en'), agLabel(d.agentType, 'zh'),
    ].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every((term) => hay.includes(term));
  }
  function computeFiltered() {
    filtered = DATA.filter((d) =>
      (state.industry === 'all' || d.industry === state.industry) &&
      (state.agent === 'all' || d.agentType === state.agent) &&
      matches(d, state.q));
  }

  function cardHTML(d, i) {
    const lang = state.lang;
    const tags = (d.technologies || []).slice(0, 3).map((tg) => `<span class="tag">${esc(tg)}</span>`).join('');
    return `
      <button class="card" data-id="${d.id}" style="--cat:var(--c-${d.agentType}); animation-delay:${Math.min(i, 12) * 28}ms">
        <div class="card__top">
          <span class="cat-pill"><span class="ic"></span>${esc(agLabel(d.agentType, lang))}</span>
          ${d.isNew ? `<span class="badge-new">${t('badgeNew')}</span>` : `<span class="card__num">#${String(d.n).padStart(3, '0')}</span>`}
        </div>
        <span class="ind-line"><span class="material-symbols-rounded" style="font-size:15px">${indIcon(d.industry)}</span>${esc(indLabel(d.industry, lang))}</span>
        <h3>${esc(d.company)}</h3>
        <p>${esc(d.summary[lang])}</p>
        <div class="card__tags">${tags}</div>
        <span class="card__cta">${t('cardCta')}<span class="material-symbols-rounded">arrow_forward</span></span>
      </button>`;
  }

  function renderCards() {
    computeFiltered();
    shown = 0;
    const grid = $('#grid');
    $('#result-count').textContent = t('results')(filtered.length);
    if (!filtered.length) {
      grid.innerHTML = `<div class="empty">
        <span class="material-symbols-rounded">search_off</span>
        <h3>${t('emptyTitle')}</h3><p>${t('emptyDesc')}</p></div>`;
      $('#load-sentinel').hidden = true;
      return;
    }
    grid.innerHTML = '';
    appendBatch();
  }
  function appendBatch() {
    const grid = $('#grid');
    const slice = filtered.slice(shown, shown + BATCH);
    const frag = document.createElement('div');
    frag.innerHTML = slice.map((d, i) => cardHTML(d, shown + i)).join('');
    Array.from(frag.children).forEach((c) => {
      c.addEventListener('click', () => openDialog(filtered.findIndex((d) => d.id === c.dataset.id)));
      grid.appendChild(c);
    });
    shown += slice.length;
    $('#load-sentinel').hidden = shown >= filtered.length;
  }

  /* progressive render via IntersectionObserver */
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting) && shown < filtered.length) appendBatch();
  }, { rootMargin: '600px' });
  io.observe($('#load-sentinel'));

  /* ---- search ---- */
  const searchEl = $('#search');
  const clearEl = $('#search-clear');
  let searchTimer;
  searchEl.addEventListener('input', () => {
    clearEl.classList.toggle('show', !!searchEl.value);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = searchEl.value.trim(); renderCards(); }, 120);
  });
  clearEl.addEventListener('click', () => {
    searchEl.value = ''; state.q = ''; clearEl.classList.remove('show'); renderCards(); searchEl.focus();
  });

  /* ---- dialog ---- */
  const scrim = $('#scrim');
  const dialog = $('#dialog');
  let openIndex = -1;
  let lastFocus = null;

  function listItems(arr) { return (arr || []).map((x) => `<li>${esc(x)}</li>`).join(''); }
  function sourceItems(arr) {
    return (arr || []).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">
      <span class="material-symbols-rounded">link</span>${esc(s.title || s.url)}</a></li>`).join('');
  }

  function renderDialog() {
    const d = filtered[openIndex];
    if (!d) return;
    const lang = state.lang;
    const hl = (d.highlights && d.highlights[lang]) || [];
    const tech = (d.technologies || []).map((tg) => `<span class="tag">${esc(tg)}</span>`).join('');
    dialog.innerHTML = `
      <div class="dialog__head" style="--cat:var(--c-${d.agentType})">
        <div class="dialog__title">
          <span class="cat-pill"><span class="ic"></span>${esc(agLabel(d.agentType, lang))}</span>
          <span class="ind-line"><span class="material-symbols-rounded" style="font-size:15px">${indIcon(d.industry)}</span>${esc(indLabel(d.industry, lang))}</span>
          <h2 id="dlg-title">${esc(d.company)}${d.isNew ? ` <span class="badge-new">${t('badgeNew')}</span>` : ''}</h2>
        </div>
        <button class="icon-btn ripple-host dialog__close" id="dlg-close" aria-label="Close">
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
      <div class="dialog__body">
        <section>
          <h4><span class="material-symbols-rounded">info</span>${t('secOverview')}</h4>
          <p class="lead">${esc(d.overview[lang])}</p>
        </section>
        ${hl.length ? `<section>
          <h4><span class="material-symbols-rounded">trophy</span>${t('secHighlights')}</h4>
          <ul>${listItems(hl)}</ul>
        </section>` : ''}
        ${tech ? `<section>
          <h4><span class="material-symbols-rounded">build</span>${t('secTech')}</h4>
          <div class="tech-tags">${tech}</div>
        </section>` : ''}
        <section>
          <h4><span class="material-symbols-rounded">menu_book</span>${t('secSources')}</h4>
          <ul class="sources">${sourceItems(d.sources)}</ul>
        </section>
        <div class="dialog__foot">
          <a class="btn-filled ripple-host" href="${esc((d.sources && d.sources[0] && d.sources[0].url) || '#')}" target="_blank" rel="noopener">
            <span class="material-symbols-rounded">open_in_new</span>${t('original')}
          </a>
          <div class="dialog__nav">
            <button class="btn-text ripple-host" id="dlg-prev"><span class="material-symbols-rounded">arrow_back</span>${t('prev')}</button>
            <button class="btn-text ripple-host" id="dlg-next">${t('next')}<span class="material-symbols-rounded">arrow_forward</span></button>
          </div>
        </div>
      </div>`;
    $$('.ripple-host', dialog).forEach(attachRipple);
    $('#dlg-close').addEventListener('click', closeDialog);
    $('#dlg-prev').addEventListener('click', () => openDialog((openIndex - 1 + filtered.length) % filtered.length));
    $('#dlg-next').addEventListener('click', () => openDialog((openIndex + 1) % filtered.length));
    dialog.scrollTop = 0;
  }

  function openDialog(index) {
    if (index < 0 || index >= filtered.length) return;
    const firstOpen = openIndex < 0;
    openIndex = index;
    renderDialog();
    history.replaceState(null, '', '#' + filtered[openIndex].id);
    if (firstOpen) {
      lastFocus = document.activeElement;
      scrim.hidden = false;
      requestAnimationFrame(() => scrim.classList.add('open'));
      document.body.style.overflow = 'hidden';
    }
    $('#dlg-close').focus();
  }
  function closeDialog() {
    if (openIndex < 0) return;
    openIndex = -1;
    scrim.classList.remove('open');
    document.body.style.overflow = '';
    history.replaceState(null, '', location.pathname + location.search);
    setTimeout(() => { scrim.hidden = true; }, 280);
    if (lastFocus) lastFocus.focus();
  }
  scrim.addEventListener('click', (e) => { if (e.target === scrim) closeDialog(); });
  document.addEventListener('keydown', (e) => {
    if (openIndex < 0) return;
    if (e.key === 'Escape') closeDialog();
    else if (e.key === 'ArrowLeft') openDialog((openIndex - 1 + filtered.length) % filtered.length);
    else if (e.key === 'ArrowRight') openDialog((openIndex + 1) % filtered.length);
  });

  /* ---- toast ---- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  /* ---- init ---- */
  $$('.ripple-host').forEach(attachRipple);
  fetch('https://api.github.com/repos/tingwei161803/real-world-genai-use-cases')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (!j || typeof j.stargazers_count !== 'number') return;
      const el = $('#gh-count');
      el.textContent = j.stargazers_count >= 1000 ? (j.stargazers_count / 1000).toFixed(1) + 'k' : j.stargazers_count;
      el.hidden = false;
    })
    .catch(() => {});

  $('#stat-total').textContent = DATA.length;
  $('#stat-inds').textContent = INDUSTRIES.length;
  applyStaticI18n();
  renderChips();
  renderCards();

  function openFromHash() {
    const id = decodeURIComponent(location.hash.replace('#', ''));
    if (!id) { if (openIndex >= 0) closeDialog(); return; }
    if (openIndex >= 0 && filtered[openIndex] && filtered[openIndex].id === id) return;
    const idx = filtered.findIndex((d) => d.id === id);
    if (idx >= 0) openDialog(idx);
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);

  void toast; // reserved for future copy actions
})();
```

- [ ] **Step 2: Commit**

```bash
git add assets/app.js
git commit -m "feat: 互動 app.js（i18n / 雙篩選 / 漸進渲染 / dialog+sources）"
```

---

## Task 8: 煙霧測試、README 與收尾

**Files:**
- Create: `README.md`

- [ ] **Step 1: 本機開站煙霧測試**

```bash
python3 -m http.server 8765 >/dev/null 2>&1 &
sleep 1
curl -s http://localhost:8765/ | grep -c "Real-World Gen AI Use Cases"
curl -s http://localhost:8765/data/use-cases.js | grep -c "window.USE_CASES"
kill %1 2>/dev/null
```
Expected: 兩者皆 ≥ 1。接著在瀏覽器手動驗證：
- 卡片顯示、產業 chip + agent chip **交集**篩選筆數正確、計數隨對向篩選更新。
- 搜尋公司/技術可命中；清除可復原。
- 中／EN 切換後標題、chip、卡片、dialog 全部換語言。
- 點卡片開 dialog：Overview / Highlights / Technologies / **Sources（連結可點）** 正常；上一筆/下一筆、Esc、深連結 `#id` 可用。
- 深淺主題切換、行動裝置版面正常。

- [ ] **Step 2: 撰寫 `README.md`**

```markdown
# Gen AI 真實應用圖鑑 · Real-World Gen AI Use Cases

> Google Cloud 整理的數百家領先企業 **真實世界 Gen AI 應用** 的中英對照互動圖鑑。
> An interactive, searchable, **bilingual (中 / EN)** gallery of real-world generative AI use cases curated by Google Cloud.

純靜態網頁 — HTML + CSS + 一支 JS，無 build step、無相依套件。採 **Material Design 3**，支援亮/暗色、語言切換、**產業 × Agent 類型雙維度篩選**、全文搜尋、詳情彈窗（含資料來源）與可分享的深連結。

## 🌐 線上看 · Live site
- 網站：<https://tingwei161803.github.io/real-world-genai-use-cases/>
- 原始碼：<https://github.com/tingwei161803/real-world-genai-use-cases>

## 🗂️ 資料管線 · Data pipeline
1. `data/extract.py` — 從 Google Cloud 文章快照確定性抽取（產業 / agent 類型 / 公司 / 描述）。
2. `data/chunks/*.json` — 逐產業以 AI 研究擴寫成中英雙語、附資料來源（不虛構）。
3. `data/merge.js` — 合併校驗成 `data/use-cases.js`。

重建：
```bash
python3 data/extract.py      # -> data/raw/usecases-en.json
# 逐產業擴寫 -> data/chunks/<industry>.json
node data/merge.js           # -> data/use-cases.js
```

## ✅ 測試
```bash
python3 -m pytest .test/test_extract.py -q
node .test/test_merge.js
```

## 📝 來源 · Source
內容整理自 [Google Cloud — Real-world gen AI use cases](https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders)。本頁為非官方學習用整理，各案例均附原始資料來源。
```

- [ ] **Step 3: 最終 Commit**

```bash
git add README.md
git commit -m "docs: README（線上連結、資料管線、測試說明）"
```

---

## Phase 1 完成後

驗證項目：抽取正確（48 筆）、擴寫品質與來源真實、前端雙篩選/搜尋/切換/dialog 全通、效能流暢。確認後再規劃 Phase 2（其餘 10 產業以 agent team 並行擴寫，逐一產出 chunk 後重跑 `merge.js`）。
