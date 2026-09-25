import urllib.request
import re
import json

headers = {"User-Agent": "Mozilla/5.0"}
urls = [
    ("茨城県", "https://ja.wikipedia.org/wiki/%E8%8C%A8%E5%9F%8E%E7%9C%8C%E4%B8%AD%E5%AD%A6%E6%A0%A1%E4%B8%80%E8%A6%A7"),
    ("千葉県", "https://ja.wikipedia.org/wiki/%E5%8D%83%E8%91%89%E7%9C%8C%E4%B8%AD%E5%AD%A6%E6%A0%A1%E4%B8%80%E8%A6%A7"),
    ("埼玉県", "https://ja.wikipedia.org/wiki/%E5%9F%BC%E7%8E%89%E7%9C%8C%E4%B8%AD%E5%AD%A6%E6%A0%A1%E4%B8%80%E8%A6%A7"),
    ("東京都", "https://ja.wikipedia.org/wiki/%E6%9D%B1%E4%BA%AC%E9%83%BD%E4%B8%AD%E5%AD%A6%E6%A0%A1%E4%B8%80%E8%A6%A7"),
]

candidate_schools = set()

# Also manually add private / national / combined schools in the region
extras = [
    "東洋大学附属牛久中学校", "茗溪学園中学校", "江戸川学園取手中学校", "芝浦工業大学柏中学校", "麗澤中学校", "流通経済大学付属柏中学校",
    "専修大学松戸中学校", "開智望小学校・中等教育学校", "開智中学校", "土浦日本大学中等教育学校", "常総学院中学校", "霞ヶ浦高等学校附属中学校",
    "茨城キリスト教学園中学校", "茨城中学校", "水戸英宏中学校", "大成女子高等学校附属中等部", "智学館中等教育学校",
    "愛国学園大学附属四街道中学校", "光英VERITAS中学校", "聖徳大学附属女子中学校", "昭和学院中学校", "市川中学校",
    "東邦大学付属東邦中学校", "渋谷教育学園幕張中学校", "八千代松陰中学校", "二松學舍大学附属柏中学校",
    "千葉日本大学第一中学校", "和洋国府台女子中学校", "国府台女子学院中学部",
    # Additional municipal forms
    "つくばみらい市立陽光台小学校・伊奈中学校", "つくば市立秀峰筑波義務教育学校", "つくば市立春日学園義務教育学校",
    "つくば市立学園の森義務教育学校", "つくば市立みどりの学園義務教育学校", "土浦市立新治学園義務教育学校",
    "河内町立かわち学園", "つくば市立みどりの学園義務教育学校", "つくば市立秀峰筑波義務教育学校",
    "稲敷市立東中学校", "稲敷市立あずま中学校",
    # Chiba
    "松戸市立新松戸南中学校", "松戸市立旭町中学校", "松戸市立金ケ作中学校",
    "柏市立光ケ丘中学校", "柏市立豊四季中学校", "柏市立酒井根中学校",
    "我孫子市立湖北台中学校", "我孫子市立久寺家中学校", "我孫子市立白山中学校",
    "印西市立西の原中学校", "印西市立滝野中学校",
    "流山市立おおたかの森中学校", "流山市立おおぐろの森中学校",
    "野田市・流山市学校組合立東部中学校",
    "光英VERITAS中学校"
]
for e in extras:
    candidate_schools.add(e)

for pref, url in urls:
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8")
        items = re.findall(r"<li>(?:<a [^>]+>)?([^<]+(?:中学校|義務教育学校|中等教育学校|学園))", html)
        for item in items:
            item = item.strip()
            if "(" in item:
                item = item.split("(")[0].strip()
            if "（" in item:
                item = item.split("（")[0].strip()
            candidate_schools.add(item)
    except Exception as ex:
        print(f"Error fetching {pref}: {ex}")

print(f"Total candidate schools compiled: {len(candidate_schools)}")

# Save to file
with open("./scripts/candidate_schools.json", "w", encoding="utf-8") as f:
    json.dump(list(candidate_schools), f, ensure_ascii=False, indent=2)
