import type * as XLSXTypes from 'xlsx';
import { JuniorHighSchool, Student } from '../types';
import highSchoolData from '../data/highSchoolInfo.json';
import knownSchoolsGeo from '../data/knownSchoolsGeo.json';

// Known coordinates mapping, keyed by school name. knownSchoolsGeo.json is the
// geocoding database the bundled dataset is also built from.
const knownSchoolsMap = new Map<string, { lat: number; lng: number; city: string; prefecture: string }>();
for (const [name, geo] of Object.entries(
  knownSchoolsGeo as Record<string, { lat: number; lng: number; city: string; pref: string }>
)) {
  knownSchoolsMap.set(name, {
    lat: geo.lat,
    lng: geo.lng,
    city: geo.city,
    prefecture: geo.pref,
  });
}

// Some school-system CSV exports abbreviate course names (e.g. "コース(略称)"
// column) inconsistently with the full names used elsewhere in the app.
// Only known abbreviations are normalized; anything else is passed through
// as-is so exports that already use full names are unaffected.
const COURSE_ABBREVIATION_MAP: Record<string, string> = {
  'スポ': 'スポーツサイエンス',
  'グロ': 'グローバル',
  '理数フ': '理数フロンティア',
};
function normalizeCourse(raw: string): string {
  return COURSE_ABBREVIATION_MAP[raw] || raw;
}

// Normalizes common Japanese variations like ヶ/ケ, 龍/竜 and whitespace.
const normalizeSchoolName = (s: string) =>
  (s || '')
    .replace(/[ヶケ箇ヵカ]/g, 'ケ')
    .replace(/龍/g, '竜')
    .replace(/[\s　]/g, '');

const knownNamesByNormalized = new Map<string, string>();
for (const name of knownSchoolsMap.keys()) {
  knownNamesByNormalized.set(normalizeSchoolName(name), name);
}

// Resolves a raw school name from an uploaded file to a known school.
// Exact and normalized matches are tried first; a substring match (e.g.
// "下根中" → "牛久市立下根中学校") is accepted only when exactly one known
// school matches, so an ambiguous short name like "第一中学校" isn't
// silently assigned to whichever city's 第一中 happens to come first.
function resolveSchoolName(raw: string): string {
  if (knownSchoolsMap.has(raw)) return raw;
  const rawNorm = normalizeSchoolName(raw);
  const exact = knownNamesByNormalized.get(rawNorm);
  if (exact) return exact;
  const candidates: string[] = [];
  for (const [kNorm, name] of knownNamesByNormalized) {
    if (kNorm.includes(rawNorm) || rawNorm.includes(kNorm)) candidates.push(name);
  }
  return candidates.length === 1 ? candidates[0] : raw;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1R = (lat1 * Math.PI) / 180;
  const lat2R = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2R);
  const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLon);
  const brng = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const directions = [
    '北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東',
    '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西',
  ];
  const idx = Math.round(brng / 22.5) % 16;
  return directions[idx];
}

// Excel (.xlsx/.xls) files carry their own internal text encoding and can be
// read directly. Plain CSV files have no encoding metadata: school
// management systems in Japan commonly export CSV as Shift_JIS (CP932),
// which is not valid UTF-8, so a naive UTF-8 read produces mojibake that
// breaks name-based school/prefecture matching. Detect this by attempting a
// strict UTF-8 decode first and falling back to Shift_JIS on failure.
function readWorkbook(XLSX: typeof XLSXTypes, dataBuffer: ArrayBuffer): XLSXTypes.WorkBook {
  const bytes = new Uint8Array(dataBuffer);
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // .xlsx (PK zip)
  const isOle = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0; // .xls

  if (isZip || isOle) {
    return XLSX.read(dataBuffer, { type: 'array' });
  }

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder('shift-jis').decode(bytes);
  }
  return XLSX.read(text, { type: 'string' });
}

// xlsx is large and only needed when importing/exporting, so it's loaded on
// demand instead of being part of the initial bundle.
const loadXlsx = () => import('xlsx');

export async function parseExcelOrCsv(
  dataBuffer: ArrayBuffer
): Promise<{ students: Student[]; schools: JuniorHighSchool[] }> {
  const XLSX = await loadXlsx();
  const workbook = readWorkbook(XLSX, dataBuffer);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (rows.length === 0) {
    throw new Error('データが見つかりませんでした');
  }

  // Find header row
  let headerIndex = -1;
  let schoolCol = -1;
  let gradeCol = -1;
  let courseCol = -1;
  let classCol = -1;
  let genderCol = -1;

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (Array.isArray(row)) {
      for (let j = 0; j < row.length; j++) {
        const val = String(row[j] || '').trim();
        // First match wins: later columns like "入学学年"/"入学年月日" also
        // contain "学年" as a substring and must not overwrite the real
        // "学年" column found earlier in the row.
        if (schoolCol === -1 && (val.includes('出身校') || val.includes('中学校') || val.includes('学校名'))) schoolCol = j;
        if (gradeCol === -1 && (val.includes('学年') || val.toLowerCase() === 'grade')) gradeCol = j;
        if (courseCol === -1 && (val.includes('コース') || val.includes('課程'))) courseCol = j;
        if (classCol === -1 && (val.includes('クラス') || val.includes('組'))) classCol = j;
        if (genderCol === -1 && val.includes('性別')) genderCol = j;
      }
      if (schoolCol !== -1) {
        headerIndex = i;
        break;
      }
    }
  }

  // If no header found, default to first row or positional columns
  const startRow = headerIndex !== -1 ? headerIndex + 1 : 1;
  if (schoolCol === -1) schoolCol = 7;
  if (gradeCol === -1) gradeCol = 3;
  if (courseCol === -1) courseCol = 5;
  if (classCol === -1) classCol = 6;

  const parsedStudents: Student[] = [];
  const schoolStatsMap = new Map<
    string,
    {
      g1: number;
      g2: number;
      g3: number;
      courses: Record<string, { total: number; grade1: number; grade2: number; grade3: number }>;
      classes: Record<string, number>;
    }
  >();

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row) || row.length <= schoolCol) continue;

    const rawSchool = String(row[schoolCol] || '').trim();
    if (!rawSchool) continue;

    const schoolName = resolveSchoolName(rawSchool);

    // Accept "1", "1年", "１年" etc. Rows whose grade can't be read as 1-3
    // are skipped rather than silently counted as 1st-years.
    const gradeText = row[gradeCol] != null ? String(row[gradeCol]).normalize('NFKC') : '';
    const grade = gradeText.trim() === '' ? 1 : parseInt(gradeText, 10);
    if (grade !== 1 && grade !== 2 && grade !== 3) continue;
    const course = normalizeCourse(courseCol !== -1 && row[courseCol] ? String(row[courseCol]).trim() : '普通');
    const cls = classCol !== -1 && row[classCol] ? String(row[classCol]).trim() : 'A';
    const gender = genderCol !== -1 && row[genderCol] ? String(row[genderCol]).trim() : undefined;

    parsedStudents.push({
      year: 2026,
      schoolType: '高校',
      grade,
      department: '普通',
      course,
      class: cls,
      schoolName,
      gender,
    });

    if (!schoolStatsMap.has(schoolName)) {
      schoolStatsMap.set(schoolName, {
        g1: 0,
        g2: 0,
        g3: 0,
        courses: {},
        classes: {},
      });
    }
    const stat = schoolStatsMap.get(schoolName)!;
    if (grade === 1) stat.g1++;
    else if (grade === 2) stat.g2++;
    else if (grade === 3) stat.g3++;

    if (!stat.courses[course]) {
      stat.courses[course] = { total: 0, grade1: 0, grade2: 0, grade3: 0 };
    }
    stat.courses[course].total++;
    if (grade === 1) stat.courses[course].grade1++;
    else if (grade === 2) stat.courses[course].grade2++;
    else if (grade === 3) stat.courses[course].grade3++;
    stat.classes[cls] = (stat.classes[cls] || 0) + 1;
  }

  const generatedSchools: JuniorHighSchool[] = [];
  const baseLat = highSchoolData.lat;
  const baseLng = highSchoolData.lng;

  for (const [name, stats] of schoolStatsMap.entries()) {
    const knownGeo = knownSchoolsMap.get(name);
    let lat = knownGeo ? knownGeo.lat : baseLat + (Math.random() - 0.5) * 0.15;
    let lng = knownGeo ? knownGeo.lng : baseLng + (Math.random() - 0.5) * 0.15;
    let city = knownGeo ? knownGeo.city : '牛久市周辺';
    let prefecture = knownGeo ? knownGeo.prefecture : '茨城県';

    if (!knownGeo) {
      if (
        name.includes('千葉') ||
        name.includes('柏') ||
        name.includes('松戸') ||
        name.includes('我孫子') ||
        name.includes('流山') ||
        name.includes('野田') ||
        name.includes('印西') ||
        name.includes('白井') ||
        name.includes('鎌ケ谷') ||
        name.includes('鎌ヶ谷') ||
        name.includes('船橋') ||
        name.includes('市川') ||
        name.includes('佐倉')
      ) {
        prefecture = '千葉県';
      } else if (
        name.includes('埼玉') ||
        name.includes('吉川') ||
        name.includes('三郷') ||
        name.includes('草加') ||
        name.includes('八潮')
      ) {
        prefecture = '埼玉県';
      } else if (name.includes('東京') || name.includes('区立')) {
        prefecture = '東京都';
      }

      for (const token of ['市立', '町立', '区立']) {
        if (name.includes(token)) {
          const m = name.split(token)[0];
          city = m + (token === '市立' ? '市' : token === '町立' ? '町' : '区');
          break;
        }
      }
    }

    const dist = calculateDistance(baseLat, baseLng, lat, lng);
    const bearing = calculateBearing(baseLat, baseLng, lat, lng);
    const total = stats.g1 + stats.g2 + stats.g3;

    let primaryCourse = '普通';
    let maxCourseCount = -1;
    for (const [cName, cData] of Object.entries(stats.courses)) {
      if (cData.total > maxCourseCount) {
        maxCourseCount = cData.total;
        primaryCourse = cName;
      }
    }

    generatedSchools.push({
      id: `SCH_${Math.abs(hashString(name)) % 1000000}`,
      name,
      city,
      prefecture,
      lat,
      lng,
      distanceKm: dist,
      bearing,
      totalCount: total,
      grade1Count: stats.g1,
      grade2Count: stats.g2,
      grade3Count: stats.g3,
      courses: stats.courses,
      classes: stats.classes,
      primaryCourse,
      rank: 0,
      geoEstimated: !knownGeo,
    });
  }

  // Sort and set rank
  generatedSchools.sort((a, b) => b.totalCount - a.totalCount);
  generatedSchools.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  return { students: parsedStudents, schools: generatedSchools };
}

// Combines multiple parse results (e.g. separate 高1/高2/高3 CSV exports) into
// one dataset by summing per-school counts, since each file represents a
// disjoint cohort of students rather than overlapping records.
export function mergeParsedResults(
  results: { students: Student[]; schools: JuniorHighSchool[] }[]
): { students: Student[]; schools: JuniorHighSchool[] } {
  const students: Student[] = [];
  const schoolMap = new Map<string, JuniorHighSchool>();

  for (const result of results) {
    students.push(...result.students);
    for (const s of result.schools) {
      const existing = schoolMap.get(s.name);
      if (!existing) {
        schoolMap.set(s.name, {
          ...s,
          courses: { ...s.courses },
          classes: { ...s.classes },
        });
        continue;
      }
      existing.totalCount += s.totalCount;
      existing.grade1Count += s.grade1Count;
      existing.grade2Count += s.grade2Count;
      existing.grade3Count += s.grade3Count;
      for (const [c, cData] of Object.entries(s.courses)) {
        if (!existing.courses[c]) {
          existing.courses[c] = { total: 0, grade1: 0, grade2: 0, grade3: 0 };
        }
        existing.courses[c].total += cData.total;
        existing.courses[c].grade1 += cData.grade1;
        existing.courses[c].grade2 += cData.grade2;
        existing.courses[c].grade3 += cData.grade3;
      }
      for (const [c, n] of Object.entries(s.classes)) {
        existing.classes[c] = (existing.classes[c] || 0) + n;
      }
    }
  }

  const mergedSchools = Array.from(schoolMap.values());
  for (const s of mergedSchools) {
    let primaryCourse = '普通';
    let maxCourseCount = -1;
    for (const [cName, cData] of Object.entries(s.courses)) {
      if (cData.total > maxCourseCount) {
        maxCourseCount = cData.total;
        primaryCourse = cName;
      }
    }
    s.primaryCourse = primaryCourse;
  }

  mergedSchools.sort((a, b) => b.totalCount - a.totalCount);
  mergedSchools.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  return { students, schools: mergedSchools };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export async function exportSchoolsToExcel(schools: JuniorHighSchool[]): Promise<void> {
  const XLSX = await loadXlsx();
  const exportData = schools.map((s) => ({
    '順位': s.rank,
    '中学校名': s.name,
    '市区町村': s.city,
    '都道府県': s.prefecture,
    '合計在籍数': s.totalCount,
    '1年生': s.grade1Count,
    '2年生': s.grade2Count,
    '3年生': s.grade3Count,
    '主要コース': s.primaryCourse,
    '本校からの直線距離(km)': s.distanceKm,
    '方位': s.bearing,
    '位置': s.geoEstimated ? '未確定（仮の位置）' : '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '出身中学校在籍数');
  XLSX.writeFile(workbook, '東洋大学附属牛久_各中学在籍数一覧.xlsx');
}
