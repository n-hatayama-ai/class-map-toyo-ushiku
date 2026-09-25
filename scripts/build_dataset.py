"""Builds src/data/schoolsData.json and studentsData.json from the school
system's per-grade student exports (高1/高2/高3 学籍データ CSV, CP932).

Usage (from the project root):
    python3 scripts/build_dataset.py <高1.csv> <高2.csv> <高3.csv>

The raw CSVs contain student IDs and must never be committed. Only
non-identifying attributes (grade/course/class/school/gender) are written
to the bundled JSON, which is served publicly.
"""
import csv
import json
import math
import re
import sys
from collections import Counter

GEO_DB_PATH = "src/data/knownSchoolsGeo.json"
HIGH_SCHOOL_PATH = "src/data/highSchoolInfo.json"

# Same abbreviations the app's uploader normalizes (src/utils/dataParser.ts).
COURSE_ABBREVIATIONS = {
    "スポ": "スポーツサイエンス",
    "グロ": "グローバル",
    "理数フ": "理数フロンティア",
}

# Raw names in the exports that don't resolve automatically. Keys are raw
# 出身校名 values, values are keys of knownSchoolsGeo.json.
MANUAL_ALIASES: dict[str, str] = {}

DIRECTIONS = ["北", "北北東", "北東", "東北東", "東", "東南東", "南東", "南南東",
              "南", "南南西", "南西", "西南西", "西", "西北西", "北西", "北北西"]


def normalize(name: str) -> str:
    name = re.sub(r"[ヶケ箇ヵカ]", "ケ", name or "")
    name = name.replace("龍", "竜")
    return re.sub(r"[\s　]", "", name)


def haversine(lat1, lon1, lat2, lon2):
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    return round(r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 1)


def bearing(lat1, lon1, lat2, lon2):
    dlon = math.radians(lon2 - lon1)
    l1, l2 = math.radians(lat1), math.radians(lat2)
    y = math.sin(dlon) * math.cos(l2)
    x = math.cos(l1) * math.sin(l2) - math.sin(l1) * math.cos(l2) * math.cos(dlon)
    deg = (math.degrees(math.atan2(y, x)) + 360) % 360
    return DIRECTIONS[round(deg / 22.5) % 16]


def load_rows(path):
    raw = open(path, "rb").read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("cp932")
    return list(csv.DictReader(text.splitlines()))


def main(paths):
    geo_db = json.load(open(GEO_DB_PATH, encoding="utf-8"))
    hs = json.load(open(HIGH_SCHOOL_PATH, encoding="utf-8"))
    by_norm = {normalize(k): k for k in geo_db}

    def resolve(raw):
        if raw in MANUAL_ALIASES:
            return MANUAL_ALIASES[raw]
        if raw in geo_db:
            return raw
        n = normalize(raw)
        if n in by_norm:
            return by_norm[n]
        hits = [k for kn, k in by_norm.items() if kn in n or n in kn]
        return hits[0] if len(hits) == 1 else None

    students = []
    unresolved = Counter()
    for path in paths:
        for row in load_rows(path):
            raw_school = (row.get("出身校名") or "").strip()
            grade = int(row["学年"])
            if not raw_school or grade not in (1, 2, 3):
                continue
            school = resolve(raw_school)
            if school is None:
                unresolved[raw_school] += 1
                school = raw_school
            course_raw = (row.get("コース(略称)") or "").strip()
            gender = (row.get("性別") or "").strip() or None
            st = {
                "year": int(row["年度(西暦)"]),
                "schoolType": row["学校区分"],
                "grade": grade,
                "department": row["学科(略称)"],
                "course": COURSE_ABBREVIATIONS.get(course_raw, course_raw),
                "class": row["クラス"].strip(),
                "schoolName": school,
            }
            if gender in ("男", "女"):
                st["gender"] = gender
            students.append(st)

    if unresolved:
        print("座標データに見つからない出身校名（MANUAL_ALIASES に追加して再実行）:")
        for name, n in unresolved.most_common():
            print(f"  {n:3d}名  {name}")
        sys.exit(1)

    agg = {}
    for st in students:
        a = agg.setdefault(st["schoolName"], {"g": [0, 0, 0], "courses": {}, "classes": Counter(),
                                              "female": 0, "male": 0})
        g = st["grade"]
        a["g"][g - 1] += 1
        c = a["courses"].setdefault(st["course"], {"total": 0, "grade1": 0, "grade2": 0, "grade3": 0})
        c["total"] += 1
        c[f"grade{g}"] += 1
        a["classes"][st["class"]] += 1
        if st.get("gender") == "女":
            a["female"] += 1
        elif st.get("gender") == "男":
            a["male"] += 1

    schools = []
    for name, a in agg.items():
        geo = geo_db[name]
        schools.append({
            "id": f"sch_{sum(ord(ch) * (i + 1) for i, ch in enumerate(name)) % 1000000:06d}",
            "name": name,
            "lat": geo["lat"],
            "lng": geo["lng"],
            "prefecture": geo["pref"],
            "city": geo["city"],
            "distanceKm": haversine(hs["lat"], hs["lng"], geo["lat"], geo["lng"]),
            "bearing": bearing(hs["lat"], hs["lng"], geo["lat"], geo["lng"]),
            "totalCount": sum(a["g"]),
            "grade1Count": a["g"][0],
            "grade2Count": a["g"][1],
            "grade3Count": a["g"][2],
            "femaleCount": a["female"],
            "maleCount": a["male"],
            "primaryCourse": max(a["courses"].items(), key=lambda kv: kv[1]["total"])[0],
            "courses": a["courses"],
            "classes": dict(sorted(a["classes"].items())),
            "rank": 0,
        })
    schools.sort(key=lambda s: (-s["totalCount"], s["name"]))
    for i, s in enumerate(schools):
        s["rank"] = i + 1
    assert len({s["id"] for s in schools}) == len(schools), "school id collision"

    for path, data in (("src/data/studentsData.json", students), ("src/data/schoolsData.json", schools)):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")

    per_grade = Counter(st["grade"] for st in students)
    print(f"生徒 {len(students)}名 (1年 {per_grade[1]} / 2年 {per_grade[2]} / 3年 {per_grade[3]}), 中学校 {len(schools)}校")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(sys.argv[1:])
