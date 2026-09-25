import React, { useState } from 'react';
import {
  Search,
  X,
  Filter,
  Compass,
  MapPin,
  School,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Map,
  Table as TableIcon,
  Columns,
} from 'lucide-react';
import { FilterState, GradeFilter, CourseFilter, DistanceRange } from '../types';

interface FilterBarProps {
  filter: FilterState;
  onFilterChange: (newFilter: Partial<FilterState>) => void;
  availablePrefectures: string[];
  availableCities: string[];
  totalFilteredCount: number;
  totalFilteredStudents: number;
  viewMode: 'split' | 'map' | 'table';
  onViewModeChange: (mode: 'split' | 'map' | 'table') => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  onFilterChange,
  availablePrefectures,
  availableCities,
  totalFilteredCount,
  totalFilteredStudents,
  viewMode,
  onViewModeChange,
}) => {
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(false);

  const grades: { label: string; value: GradeFilter }[] = [
    { label: '全学年', value: 'all' },
    { label: '1年生', value: 1 },
    { label: '2年生', value: 2 },
    { label: '3年生', value: 3 },
  ];

  const courses: { label: string; value: CourseFilter }[] = [
    { label: '全コース', value: 'all' },
    { label: '進学', value: '進学' },
    { label: '特進', value: '特進' },
    { label: 'グローバル', value: 'グローバル' },
    { label: '理数フロンティア', value: '理数フロンティア' },
    { label: 'スポーツ', value: 'スポーツ' },
    { label: '中高一貫', value: '一貫' },
  ];

  const distanceRanges: { label: string; value: DistanceRange }[] = [
    { label: '全距離', value: 'all' },
    { label: '5km圏内', value: 'under5' },
    { label: '5〜10km', value: '5to10' },
    { label: '10〜20km', value: '10to20' },
    { label: '20km以上', value: 'over20' },
  ];

  const activeSecondaryFiltersCount =
    (filter.prefecture !== 'all' ? 1 : 0) +
    (filter.city !== 'all' ? 1 : 0) +
    (filter.course !== 'all' ? 1 : 0) +
    (filter.distanceRange !== 'all' ? 1 : 0);

  const hasAnyFilter =
    filter.searchQuery.trim() !== '' ||
    filter.grade !== 'all' ||
    filter.course !== 'all' ||
    filter.prefecture !== 'all' ||
    filter.city !== 'all' ||
    filter.distanceRange !== 'all';

  return (
    <div
      id="filter-bar-sticky"
      className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3 shadow-xs sticky top-14 sm:top-16 z-25"
    >
      <div className="max-w-7xl mx-auto space-y-2 sm:space-y-3">
        {/* Row 1: Search, Grade Pills, View Mode */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-3">
          {/* Search box with touch target sizing */}
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="school-search-input"
              type="text"
              placeholder="中学校名・市区町村で検索 (例: 柏, 取手, 古ケ崎)..."
              value={filter.searchQuery}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
              className="w-full pl-9 pr-9 py-2 sm:py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 transition min-h-[40px]"
            />
            {filter.searchQuery && (
              <button
                onClick={() => onFilterChange({ searchQuery: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 touch-manipulation"
                aria-label="検索クリア"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Grade selection pills - Responsive grid on mobile, row on desktop */}
          <div className="grid grid-cols-4 sm:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 w-full sm:w-auto">
            {grades.map((g) => {
              const active = filter.grade === g.value;
              return (
                <button
                  key={String(g.value)}
                  onClick={() => onFilterChange({ grade: g.value })}
                  className={`py-1.5 sm:py-1 px-2 sm:px-3 text-xs font-semibold rounded-md transition text-center touch-manipulation ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>

          {/* View Mode Switcher - Large touch targets */}
          <div className="flex items-center justify-between sm:justify-start gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => onViewModeChange('split')}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1 py-1.5 sm:py-1 px-2.5 sm:px-3 text-xs font-semibold rounded-md transition touch-manipulation min-h-[32px] ${
                viewMode === 'split'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5 shrink-0" />
              <span>分割</span>
            </button>
            <button
              onClick={() => onViewModeChange('map')}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1 py-1.5 sm:py-1 px-2.5 sm:px-3 text-xs font-semibold rounded-md transition touch-manipulation min-h-[32px] ${
                viewMode === 'map'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Map className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>地図</span>
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1 py-1.5 sm:py-1 px-2.5 sm:px-3 text-xs font-semibold rounded-md transition touch-manipulation min-h-[32px] ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 shrink-0 text-sky-600" />
              <span>一覧表</span>
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Dropdown Filters */}
        <div className="pt-1.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          {/* Mobile toggle button for secondary filters */}
          <div className="flex sm:hidden items-center justify-between">
            <button
              onClick={() => setMobileFiltersExpanded(!mobileFiltersExpanded)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium touch-manipulation"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
              <span>詳細絞り込み（地域・コース・距離）</span>
              {activeSecondaryFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                  {activeSecondaryFiltersCount}
                </span>
              )}
              {mobileFiltersExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
            </button>

            {/* Mobile Result Count Preview */}
            <div className="text-[11px] text-slate-600">
              <strong className="text-slate-900 font-bold">{totalFilteredCount}</strong> 校 (
              <strong className="text-amber-700 font-bold">{totalFilteredStudents}</strong> 名)
            </div>
          </div>

          {/* Filter dropdowns - Always shown on sm+, expandable on mobile */}
          <div className={`${mobileFiltersExpanded ? 'grid grid-cols-1 sm:flex' : 'hidden sm:flex'} flex-wrap items-center gap-2 pt-1 sm:pt-0`}>
            {/* Prefecture Selector */}
            <div className="flex items-center space-x-1 w-full sm:w-auto">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                id="prefecture-filter-select"
                value={filter.prefecture}
                onChange={(e) => onFilterChange({ prefecture: e.target.value })}
                className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 sm:py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium cursor-pointer min-h-[34px] sm:min-h-0 text-xs"
              >
                <option value="all">全都道府県 ({availablePrefectures.length})</option>
                {availablePrefectures.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Municipality Selector */}
            <div className="flex items-center space-x-1 w-full sm:w-auto">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                id="city-filter-select"
                value={filter.city}
                onChange={(e) => onFilterChange({ city: e.target.value })}
                className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 sm:py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium cursor-pointer min-h-[34px] sm:min-h-0 text-xs"
              >
                <option value="all">全市区町村 ({availableCities.length}地域)</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Course Selector */}
            <div className="flex items-center space-x-1 w-full sm:w-auto">
              <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                id="course-filter-select"
                value={filter.course}
                onChange={(e) => onFilterChange({ course: e.target.value as CourseFilter })}
                className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 sm:py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium cursor-pointer min-h-[34px] sm:min-h-0 text-xs"
              >
                {courses.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Distance Selector */}
            <div className="flex items-center space-x-1 w-full sm:w-auto">
              <Compass className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                id="distance-filter-select"
                value={filter.distanceRange}
                onChange={(e) => onFilterChange({ distanceRange: e.target.value as DistanceRange })}
                className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 sm:py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium cursor-pointer min-h-[34px] sm:min-h-0 text-xs"
              >
                {distanceRanges.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filter Result Count & Reset Button */}
          <div className="hidden sm:flex items-center space-x-2 text-slate-500 ml-auto shrink-0">
            <span>
              該当: <strong className="text-slate-900 font-bold">{totalFilteredCount}</strong> 中学 (
              <strong className="text-amber-700 font-bold">{totalFilteredStudents}</strong> 名)
            </span>
            {hasAnyFilter && (
              <button
                onClick={() =>
                  onFilterChange({
                    searchQuery: '',
                    grade: 'all',
                    course: 'all',
                    prefecture: 'all',
                    city: 'all',
                    distanceRange: 'all',
                  })
                }
                className="text-amber-700 hover:text-amber-800 underline font-medium cursor-pointer ml-1 touch-manipulation"
              >
                条件解除
              </button>
            )}
          </div>

          {/* Mobile reset button if filters active */}
          {hasAnyFilter && (
            <div className="sm:hidden flex justify-end">
              <button
                onClick={() => {
                  onFilterChange({
                    searchQuery: '',
                    grade: 'all',
                    course: 'all',
                    prefecture: 'all',
                    city: 'all',
                    distanceRange: 'all',
                  });
                  setMobileFiltersExpanded(false);
                }}
                className="text-xs text-amber-700 hover:text-amber-800 font-semibold underline py-1 touch-manipulation"
              >
                すべての検索・絞り込み条件をリセット
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
