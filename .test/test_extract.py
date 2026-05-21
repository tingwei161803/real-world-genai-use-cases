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
