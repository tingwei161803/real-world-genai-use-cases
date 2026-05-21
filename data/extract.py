"""Deterministically extract gen-AI use cases from the Google Cloud snapshot.

Actual source DOM shape (verified against gcp-usecases.html):
  industry marker:   <p>Automotive &amp; Logistics</p>   (bare paragraph, HTML-escaped)
  agent heading:     <h3><strong ...>Customer Agents</strong></h3>
  use case entry:    <li ...>
                       <p>[<span>*</span>]<strong>Company</strong><span>desc</span></p>
                     </li>
  lone entry (rare): <p>[<span>*</span>]<strong>Company</strong><span>desc</span></p>
                     (directly after agent h3, not in a li — one known case: Priceline)

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

# (HTML-escaped display name as it appears in <p> tags, key)
# Sorted longest-first to prevent prefix mismatches.
INDUSTRIES = [
    ("Business &amp; Professional Services", "business-professional-services"),
    ("Manufacturing, Industrial &amp; Electronics", "manufacturing-industrial-electronics"),
    ("Public Sector &amp; Nonprofits", "public-sector-nonprofits"),
    ("Healthcare &amp; Life Sciences", "healthcare-life-sciences"),
    ("Media, Marketing &amp; Gaming", "media-marketing-gaming"),
    ("Automotive &amp; Logistics", "automotive-logistics"),
    ("Hospitality &amp; Travel", "hospitality-travel"),
    ("Financial Services", "financial-services"),
    ("Telecommunications", "telecommunications"),
    ("Technology", "technology"),
    ("Retail", "retail"),
]
# Build a set of full <p>IndustryName</p> strings for exact matching
INDUSTRY_P = {f"<p>{name}</p>": key for name, key in INDUSTRIES}

AGENTS = [
    ("Customer Agents", "customer"),
    ("Employee Agents", "employee"),
    ("Creative Agents", "creative"),
    ("Code Agents", "code"),
    ("Data Agents", "data"),
    ("Security Agents", "security"),
]
AGENT_BY_LABEL = {label: key for label, key in AGENTS}

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")

# Combined scanner regex — matches:
#   (1) industry paragraph: <p>IndustryName</p>
#   (2) agent h3:           <h3><strong ...>X Agents</strong></h3>
#   (3) li use-case entry:  <li ...><p>[<span>*</span>]<strong>Company</strong><span>desc</span>
#   (4) standalone p entry: <p>[<span>*</span>]<strong>Company</strong><span>desc</span>
#                           (the leading whitespace-or-nothing after > is handled by \s*)
SCAN_RE = re.compile(
    # (1) industry: bare <p>text</p> where text has no tags
    r"(?P<ind_p><p>[^<>]+</p>)"
    # (2) agent heading
    r"|<h3[^>]*>\s*<strong[^>]*>(?P<agent_head>[^<]+)</strong>\s*</h3>"
    # (3) li entry (with or without leading *-span)
    r"|<li[^>]*>\s*<p[^>]*>\s*(?:<span[^>]*>(?P<li_star>[^<]*)</span>)?"
    r"<strong[^>]*>(?P<li_company>[^<]+)</strong>(?P<li_rest>.*?)</p>"
    # (4) standalone p entry (not inside li — caught when no li match above fires)
    r"|(?P<lone_p_start><p[^>]*>)\s*(?:<span[^>]*>(?P<lone_star>[^<]*)</span>)?"
    r"<strong[^>]*>(?P<lone_company>[^<]+)</strong>(?P<lone_rest>.*?)</p>",
    re.S,
)


def clean(s: str) -> str:
    return WS_RE.sub(" ", html.unescape(TAG_RE.sub(" ", s))).strip()


def slugify(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s or "x"


def add_entry(rows, seen, counts, cur_ind, cur_agent, company_raw, rest_raw, is_new):
    company = clean(company_raw)
    desc = clean(rest_raw)

    if not cur_ind or not cur_agent:
        return
    if not company or company.endswith("Agents") or len(desc) < 20:
        return
    # Filter intro trend-headings (they end with ': ' or ':')
    if company.rstrip().endswith(":"):
        return

    base = f"{cur_ind}-{cur_agent}-{slugify(company)}"
    uid = base
    i = 2
    while uid in seen:
        uid = f"{base}-{i}"
        i += 1
    seen.add(uid)

    rows.append({
        "id": uid,
        "industry": cur_ind,
        "agentType": cur_agent,
        "company": company.rstrip("* ").strip(),
        "descEn": desc,
        "isNew": is_new,
        "sourceUrl": (
            "https://cloud.google.com/transform/"
            "101-real-world-generative-ai-use-cases-from-industry-leaders"
        ),
    })
    counts[cur_ind] = counts.get(cur_ind, 0) + 1


def main() -> int:
    raw = SRC.read_text(encoding="utf-8", errors="ignore")
    body = re.sub(r"<script.*?</script>", "", raw, flags=re.S)
    body = re.sub(r"<style.*?</style>", "", body, flags=re.S)

    rows = []
    seen: set[str] = set()
    cur_ind = cur_agent = None
    counts: dict[str, int] = {}

    # Track whether the last token was an agent h3 (for lone-p detection)
    last_was_agent_h3 = False

    for m in SCAN_RE.finditer(body):
        # (1) Industry paragraph
        if m.group("ind_p") is not None:
            tag = m.group("ind_p")
            if tag in INDUSTRY_P:
                cur_ind = INDUSTRY_P[tag]
                last_was_agent_h3 = False
            continue

        # (2) Agent heading
        if m.group("agent_head") is not None:
            label = m.group("agent_head").strip()
            if label in AGENT_BY_LABEL:
                cur_agent = AGENT_BY_LABEL[label]
                last_was_agent_h3 = True
            else:
                last_was_agent_h3 = False
            continue

        # (3) li entry
        if m.group("li_company") is not None:
            star_text = m.group("li_star") or ""
            is_new = "*" in star_text
            add_entry(
                rows, seen, counts, cur_ind, cur_agent,
                m.group("li_company"), m.group("li_rest"), is_new,
            )
            last_was_agent_h3 = False
            continue

        # (4) Standalone p entry — only accept immediately after agent h3
        if m.group("lone_company") is not None and last_was_agent_h3:
            star_text = m.group("lone_star") or ""
            is_new = "*" in star_text
            add_entry(
                rows, seen, counts, cur_ind, cur_agent,
                m.group("lone_company"), m.group("lone_rest"), is_new,
            )
            last_was_agent_h3 = False
            continue

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"extracted {len(rows)} use cases", file=sys.stderr)
    for _, key in INDUSTRIES:
        print(f"  {counts.get(key, 0):4d}  {key}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
