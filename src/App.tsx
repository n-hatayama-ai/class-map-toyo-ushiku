import React, { useState, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { MapView } from './components/MapView';
import { SchoolRankingsTable } from './components/SchoolRankingsTable';
import { SchoolDetailModal } from './components/SchoolDetailModal';
import { FileUploadModal } from './components/FileUploadModal';
import { AnalyticsSummary } from './components/AnalyticsSummary';

import highSchoolInfo from './data/highSchoolInfo.json';

import { JuniorHighSchool, Student, FilterState, HighSchoolInfo, CourseStats } from './types';
import { countForGrade } from './utils/counts';
import { Dataset } from './utils/secureData';

const DEFAULT_FILTER: FilterState = {
  searchQuery: '',
  grade: 'all',
  course: 'all',
  prefecture: 'all',
  city: 'all',
  distanceRange: 'all',
};

// Normalizes common Japanese variations like ヶ/ケ, 龍/竜
const normalizeJpSearch = (str: string) => {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[ヶケ箇ヵカ]/g, 'ケ')
    .replace(/龍/g, '竜');
};

// Uploaded data is shown for the current page session only, so every visit
// opens on the published dataset. Earlier versions persisted uploads here;
// clear any leftover copy (it also held student-level records in plaintext).
try {
  localStorage.removeItem('juniorHighMap.customData.v1');
} catch {
  // ignore
}

export default function App({ initialData }: { initialData: Dataset }) {
  const [schools, setSchools] = useState<JuniorHighSchool[]>(
    initialData.schools
  );
  const [students, setStudents] = useState<Student[]>(
    initialData.students
  );
  const [highSchool] = useState<HighSchoolInfo>(
    highSchoolInfo as HighSchoolInfo
  );

  const [isCustomData, setIsCustomData] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<JuniorHighSchool | null>(null);
  const [highlightedSchoolId, setHighlightedSchoolId] = useState<string | null>(null);
  // Bumped on every pinpoint request, even for the school already
  // highlighted, so MapView re-centers even when the id itself is unchanged
  // (React skips re-render/effects when a state update repeats the same value).
  const [pinpointRequestId, setPinpointRequestId] = useState(0);
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'table'>('split');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Filter State
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);

  const handleFilterChange = (newFilter: Partial<FilterState>) => {
    setFilter((prev) => {
      const next = { ...prev, ...newFilter };
      // Switching prefecture can leave a city selected that doesn't belong to
      // it, which would silently filter everything out.
      if (
        newFilter.prefecture !== undefined &&
        next.city !== 'all' &&
        next.prefecture !== 'all' &&
        !schools.some((s) => s.city === next.city && s.prefecture === next.prefecture)
      ) {
        next.city = 'all';
      }
      return next;
    });
  };

  // Available Cities & Prefectures
  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    schools.forEach((s) => {
      if (s.city && (filter.prefecture === 'all' || s.prefecture === filter.prefecture)) {
        citySet.add(s.city);
      }
    });
    return Array.from(citySet).sort();
  }, [schools, filter.prefecture]);

  const availablePrefectures = useMemo(() => {
    const prefSet = new Set<string>();
    schools.forEach((s) => {
      if (s.prefecture) prefSet.add(s.prefecture);
    });
    return Array.from(prefSet).sort();
  }, [schools]);

  // Filtered Schools calculation. Course filtering also narrows each
  // school's displayed counts to just that course (grouping 文系/理系
  // variants together, e.g. "進学理"/"進学文" both count under "進学"),
  // rather than showing the school's whole population.
  const filteredSchools = useMemo(() => {
    const projected =
      filter.course === 'all'
        ? schools
        : schools.map((s) => {
            let total = 0;
            let g1 = 0;
            let g2 = 0;
            let g3 = 0;
            for (const [cName, cData] of Object.entries<CourseStats>(s.courses)) {
              if (cName.includes(filter.course)) {
                total += cData.total;
                g1 += cData.grade1;
                g2 += cData.grade2;
                g3 += cData.grade3;
              }
            }
            return { ...s, totalCount: total, grade1Count: g1, grade2Count: g2, grade3Count: g3 };
          });

    const matched = projected.filter((s) => {
      // Search query
      if (filter.searchQuery.trim()) {
        const qNorm = normalizeJpSearch(filter.searchQuery);
        const matchName = normalizeJpSearch(s.name).includes(qNorm);
        const matchCity = normalizeJpSearch(s.city).includes(qNorm);
        const matchPref = normalizeJpSearch(s.prefecture).includes(qNorm);
        if (!matchName && !matchCity && !matchPref) return false;
      }

      // Course filter (schools with no students in the matched course)
      if (filter.course !== 'all' && s.totalCount <= 0) return false;

      // Grade filter
      if (filter.grade === 1 && s.grade1Count <= 0) return false;
      if (filter.grade === 2 && s.grade2Count <= 0) return false;
      if (filter.grade === 3 && s.grade3Count <= 0) return false;

      // Prefecture filter
      if (filter.prefecture !== 'all' && s.prefecture !== filter.prefecture) return false;

      // City filter
      if (filter.city !== 'all' && s.city !== filter.city) return false;

      // Distance filter
      if (filter.distanceRange === 'under5' && s.distanceKm >= 5) return false;
      if (filter.distanceRange === '5to10' && (s.distanceKm < 5 || s.distanceKm >= 10)) return false;
      if (filter.distanceRange === '10to20' && (s.distanceKm < 10 || s.distanceKm >= 20)) return false;
      if (filter.distanceRange === 'over20' && s.distanceKm < 20) return false;

      return true;
    });

    // Rank within the current conditions (grade/course/area), so the rank
    // column agrees with the counts actually shown. Ties share a rank.
    const byCount = [...matched].sort(
      (a, b) => countForGrade(b, filter.grade) - countForGrade(a, filter.grade)
    );
    const rankById = new Map<string, number>();
    byCount.forEach((s, idx) => {
      const prev = byCount[idx - 1];
      const tied = prev && countForGrade(prev, filter.grade) === countForGrade(s, filter.grade);
      rankById.set(s.id, tied ? rankById.get(prev.id)! : idx + 1);
    });
    return matched.map((s) => ({ ...s, rank: rankById.get(s.id)! }));
  }, [schools, filter]);

  // Overall student aggregates
  const totalStudents = useMemo(() => {
    return schools.reduce((acc, s) => acc + s.totalCount, 0);
  }, [schools]);

  const grade1Total = useMemo(() => {
    return schools.reduce((acc, s) => acc + s.grade1Count, 0);
  }, [schools]);

  const grade2Total = useMemo(() => {
    return schools.reduce((acc, s) => acc + s.grade2Count, 0);
  }, [schools]);

  const grade3Total = useMemo(() => {
    return schools.reduce((acc, s) => acc + s.grade3Count, 0);
  }, [schools]);

  const femaleTotal = useMemo(() => {
    return students.filter((s) => s.gender === '女').length;
  }, [students]);

  const maleTotal = useMemo(() => {
    return students.filter((s) => s.gender === '男').length;
  }, [students]);

  const totalFilteredStudents = useMemo(() => {
    return filteredSchools.reduce((acc, s) => acc + countForGrade(s, filter.grade), 0);
  }, [filteredSchools, filter.grade]);

  // Handle data load from uploaded Excel / CSV file
  const handleDataLoaded = (data: {
    schools: JuniorHighSchool[];
    students: Student[];
    fileName: string;
  }) => {
    setSchools(data.schools);
    setStudents(data.students);
    setIsCustomData(true);
    setSelectedSchool(null);
    setHighlightedSchoolId(null);
    setFilter(DEFAULT_FILTER);
  };

  // Reset data to initial 2026 dataset
  const handleResetData = () => {
    setSchools(initialData.schools);
    setStudents(initialData.students);
    setIsCustomData(false);
    setSelectedSchool(null);
    setHighlightedSchoolId(null);
    setFilter(DEFAULT_FILTER);
  };

  const geoEstimatedSchools = useMemo(() => schools.filter((s) => s.geoEstimated), [schools]);

  // Pinpoint school on map
  const handlePinpointOnMap = (schoolId: string) => {
    setHighlightedSchoolId(schoolId);
    setPinpointRequestId((n) => n + 1);
    if (viewMode === 'table') {
      setViewMode('split');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Navigation Header */}
      <Navbar
        highSchool={highSchool}
        totalStudents={totalStudents}
        totalSchools={schools.length}
        grade1Total={grade1Total}
        grade2Total={grade2Total}
        grade3Total={grade3Total}
        femaleTotal={femaleTotal}
        maleTotal={maleTotal}
        filteredSchools={filteredSchools}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onResetData={handleResetData}
        isCustomData={isCustomData}
      />

      {/* Filter and Control Bar */}
      <FilterBar
        filter={filter}
        onFilterChange={handleFilterChange}
        availablePrefectures={availablePrefectures}
        availableCities={availableCities}
        totalFilteredCount={filteredSchools.length}
        totalFilteredStudents={totalFilteredStudents}
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          // Switching views remounts MapView; without clearing, it would
          // re-fly to (and scroll to) whatever school was pinpointed last.
          setHighlightedSchoolId(null);
          setViewMode(mode);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col">
        {geoEstimatedSchools.length > 0 && (
          <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
            <strong>位置データ未登録の中学校が{geoEstimatedSchools.length}校あります。</strong>
            地図上の位置・直線距離は仮の値です（一覧に「位置未確定」と表示）：
            <span className="text-rose-700">{geoEstimatedSchools.map((s) => s.name).join('、')}</span>
          </div>
        )}

        {/* Top Summary Analytics */}
        <AnalyticsSummary
          schools={filteredSchools}
          gradeFilter={filter.grade}
          onSelectCity={(city) => handleFilterChange({ city })}
          selectedCity={filter.city}
        />

        {/* View Layouts based on viewMode */}
        {viewMode === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[560px]">
            {/* Map Column (7 cols) */}
            <div className="lg:col-span-7 h-[460px] lg:h-auto min-h-[460px]">
              <MapView
                highSchool={highSchool}
                schools={filteredSchools}
                selectedSchool={selectedSchool}
                onSelectSchool={setSelectedSchool}
                gradeFilter={filter.grade}
                highlightedSchoolId={highlightedSchoolId}
                pinpointRequestId={pinpointRequestId}
              />
            </div>

            {/* Rankings Table Column (5 cols) */}
            <div className="lg:col-span-5 h-[460px] lg:h-auto min-h-[460px]">
              <SchoolRankingsTable
                schools={filteredSchools}
                gradeFilter={filter.grade}
                onSelectSchool={setSelectedSchool}
                onPinpointOnMap={handlePinpointOnMap}
                selectedSchoolId={selectedSchool?.id}
              />
            </div>
          </div>
        )}

        {viewMode === 'map' && (
          <div className="flex-1 min-h-[640px] h-[640px]">
            <MapView
              highSchool={highSchool}
              schools={filteredSchools}
              selectedSchool={selectedSchool}
              onSelectSchool={setSelectedSchool}
              gradeFilter={filter.grade}
              highlightedSchoolId={highlightedSchoolId}
              pinpointRequestId={pinpointRequestId}
            />
          </div>
        )}

        {viewMode === 'table' && (
          <div className="flex-1 min-h-[600px]">
            <SchoolRankingsTable
              schools={filteredSchools}
              gradeFilter={filter.grade}
              onSelectSchool={setSelectedSchool}
              onPinpointOnMap={handlePinpointOnMap}
              selectedSchoolId={selectedSchool?.id}
            />
          </div>
        )}
      </main>

      {/* School Detail Modal / Drawer */}
      <SchoolDetailModal
        school={selectedSchool}
        highSchool={highSchool}
        onClose={() => setSelectedSchool(null)}
        onZoomOnMap={handlePinpointOnMap}
        courseFilter={filter.course}
      />

      {/* Excel / CSV File Upload Modal */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDataLoaded={handleDataLoaded}
      />
    </div>
  );
}
