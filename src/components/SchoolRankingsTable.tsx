import React, { useEffect, useState } from 'react';
import { JuniorHighSchool, GradeFilter } from '../types';
import { countForGrade, INTERNAL_JHS_NAME } from '../utils/counts';
import {
  MapPin,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Award,
  TrendingUp,
  ArrowRight,
  School,
  Compass,
  ChevronRight,
} from 'lucide-react';

interface SchoolRankingsTableProps {
  schools: JuniorHighSchool[];
  gradeFilter: GradeFilter;
  onSelectSchool: (school: JuniorHighSchool) => void;
  onPinpointOnMap: (schoolId: string) => void;
  selectedSchoolId?: string | null;
}

export const SchoolRankingsTable: React.FC<SchoolRankingsTableProps> = ({
  schools,
  gradeFilter,
  onSelectSchool,
  onPinpointOnMap,
  selectedSchoolId,
}) => {
  const [requestedPage, setRequestedPage] = useState(1);
  const pageSize = 15;

  const [sortField, setSortField] = useState<'count' | 'distance' | 'name' | 'rank'>('count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // A narrower filter can leave fewer pages than the one being viewed,
  // which would otherwise show an empty page with a nonsensical range.
  useEffect(() => {
    setRequestedPage(1);
  }, [schools, gradeFilter]);

  // Handle sorting
  const sortedSchools = [...schools].sort((a, b) => {
    let aVal: number | string = countForGrade(a, gradeFilter);
    let bVal: number | string = countForGrade(b, gradeFilter);

    if (sortField === 'distance') {
      aVal = a.distanceKm;
      bVal = b.distanceKm;
    } else if (sortField === 'name') {
      aVal = a.name;
      bVal = b.name;
    } else if (sortField === 'rank') {
      aVal = a.rank;
      bVal = b.rank;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal, 'ja') : bVal.localeCompare(aVal, 'ja');
    }
    return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const totalPages = Math.max(1, Math.ceil(sortedSchools.length / pageSize));
  // Clamped during render too, so no frame ever shows a page past the end.
  const currentPage = Math.min(requestedPage, totalPages);
  const setCurrentPage = (update: number | ((p: number) => number)) =>
    setRequestedPage(typeof update === 'function' ? update(currentPage) : update);
  // Up to 5 page buttons in a window around the current page.
  const windowStart = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pageNumbers = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => windowStart + i
  );
  const paginatedSchools = sortedSchools.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (field: 'count' | 'distance' | 'name' | 'rank') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'name' || field === 'distance' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Table Header / Action bar */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <School className="w-4 h-4 text-slate-700" />
          <h3 className="font-bold text-sm text-slate-800">
            出身中学校 在籍数ランキング
          </h3>
          <span className="bg-slate-200/80 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
            {schools.length}校
          </span>
        </div>
        {sortedSchools.length > 0 && (
          <div className="text-xs text-slate-500">
            全 {sortedSchools.length} 校中 {(currentPage - 1) * pageSize + 1}〜
            {Math.min(currentPage * pageSize, sortedSchools.length)} 校を表示
          </div>
        )}
      </div>

      {/* Desktop Table View (Hidden on mobile) */}
      <div className="hidden md:block overflow-x-auto flex-1">
        <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-200">
          <thead className="bg-slate-100/80 text-slate-600 font-semibold text-[11px] uppercase tracking-wider select-none sticky top-0 z-10">
            <tr>
              <th
                onClick={() => toggleSort('rank')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 transition w-16"
              >
                <div className="flex items-center space-x-1">
                  <span>順位</span>
                  {sortField === 'rank' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th
                onClick={() => toggleSort('name')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 transition"
              >
                <div className="flex items-center space-x-1">
                  <span>中学校名</span>
                  {sortField === 'name' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th className="py-2.5 px-3">所在地</th>
              <th
                onClick={() => toggleSort('count')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 transition text-right"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>在籍数</span>
                  {sortField === 'count' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th className="py-2.5 px-3 text-center">学年構成 (1/2/3年)</th>
              <th
                onClick={() => toggleSort('distance')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 transition text-right"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>直線距離</span>
                  {sortField === 'distance' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th className="py-2.5 px-3 text-center w-24">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedSchools.map((school) => {
              const isSelected = selectedSchoolId === school.id;
              const currentCount = countForGrade(school, gradeFilter);

              return (
                <tr
                  key={school.id}
                  id={`school-row-${school.id}`}
                  className={`hover:bg-slate-50/90 transition cursor-pointer ${
                    isSelected ? 'bg-amber-50/80 font-medium' : ''
                  }`}
                  onClick={() => onSelectSchool(school)}
                >
                  {/* Rank */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {school.rank <= 3 ? (
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                          school.rank === 1
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : school.rank === 2
                            ? 'bg-slate-200 text-slate-800 border border-slate-300'
                            : 'bg-amber-700/15 text-amber-900 border border-amber-700/30'
                        }`}
                      >
                        {school.rank}
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium pl-1.5">#{school.rank}</span>
                    )}
                  </td>

                  {/* Name */}
                  <td className="py-2.5 px-3 font-semibold text-slate-900 min-w-[9rem]">
                    <div className="flex flex-wrap items-center gap-1">
                      <span>{school.name}</span>
                      {school.name === INTERNAL_JHS_NAME && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold border border-amber-300 whitespace-nowrap">
                          内部進学
                        </span>
                      )}
                      {school.geoEstimated && (
                        <span
                          className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-semibold border border-rose-200 whitespace-nowrap"
                          title="位置データが見つからないため、地図上の位置と距離は仮のものです"
                        >
                          位置未確定
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Location */}
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                      {school.city}
                    </span>
                  </td>

                  {/* Count */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <span className="text-sm font-bold text-slate-900">{currentCount}</span>
                    <span className="text-slate-400 text-[10px] ml-0.5">名</span>
                  </td>

                  {/* Grade Breakdown mini pill */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-1 text-[11px]">
                      <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-medium" title="1年生">
                        1年:{school.grade1Count}
                      </span>
                      <span className="bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded border border-sky-200 font-medium" title="2年生">
                        2年:{school.grade2Count}
                      </span>
                      <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-medium" title="3年生">
                        3年:{school.grade3Count}
                      </span>
                    </div>
                  </td>

                  {/* Distance */}
                  <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-slate-800">{school.distanceKm} km</span>
                      <span className="text-[10px] text-slate-400">{school.bearing}</span>
                    </div>
                  </td>

                  {/* Action buttons */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      id={`pinpoint-btn-${school.id}`}
                      onClick={() => onPinpointOnMap(school.id)}
                      className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-md transition"
                      title="地図で位置を確認"
                    >
                      <MapPin className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onSelectSchool(school)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition ml-1"
                      title="生徒詳細を表示"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {paginatedSchools.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  条件に該当する中学校がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card-Based List View (Visible only on mobile screens) */}
      <div className="md:hidden flex-1 divide-y divide-slate-100 overflow-y-auto">
        {paginatedSchools.map((school) => {
          const isSelected = selectedSchoolId === school.id;
          const currentCount = countForGrade(school, gradeFilter);

          return (
            <div
              key={school.id}
              id={`school-card-mobile-${school.id}`}
              className={`p-3 transition ${
                isSelected ? 'bg-amber-50/90 border-l-4 border-amber-500' : 'hover:bg-slate-50'
              }`}
              onClick={() => onSelectSchool(school)}
            >
              {/* Card Header: Rank, Name, Count */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center space-x-2 min-w-0">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs shrink-0 ${
                      school.rank === 1
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : school.rank === 2
                        ? 'bg-slate-200 text-slate-800 border border-slate-300'
                        : school.rank === 3
                        ? 'bg-amber-700/15 text-amber-900 border border-amber-700/30'
                        : 'bg-slate-100 text-slate-600 font-medium'
                    }`}
                  >
                    {school.rank}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 truncate leading-snug">
                      {school.name}
                    </h4>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-base font-bold text-amber-700">{currentCount}</span>
                  <span className="text-[11px] text-slate-500 ml-0.5">名</span>
                </div>
              </div>

              {/* Card Metadata: City, Distance, Internal */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2 pl-8">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                    {school.city}
                  </span>
                  <span>直線 {school.distanceKm}km ({school.bearing})</span>
                  {school.name === INTERNAL_JHS_NAME && (
                    <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                      内部
                    </span>
                  )}
                  {school.geoEstimated && (
                    <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-semibold text-[10px] border border-rose-200">
                      位置未確定
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer: Grade breakdown & Action buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] pl-8">
                <div className="flex items-center space-x-1">
                  <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                    1年:{school.grade1Count}
                  </span>
                  <span className="bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded border border-sky-200">
                    2年:{school.grade2Count}
                  </span>
                  <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                    3年:{school.grade3Count}
                  </span>
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onPinpointOnMap(school.id)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 font-medium text-xs transition touch-manipulation min-h-[32px]"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>地図</span>
                  </button>
                  <button
                    onClick={() => onSelectSchool(school)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition touch-manipulation min-h-[32px]"
                  >
                    <span>詳細</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {paginatedSchools.length === 0 && (
          <div className="py-10 text-center text-xs text-slate-400">条件に該当する中学校がありません</div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
        <div className="text-[11px] sm:text-xs">
          {currentPage} / {totalPages} 頁
          <span className="hidden sm:inline"> (全{sortedSchools.length}校)</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-2.5 py-1.5 sm:py-1 rounded bg-white border border-slate-200 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition touch-manipulation min-h-[32px]"
          >
            前へ
          </button>
          <div className="hidden sm:flex items-center space-x-1">
            {pageNumbers.map((pageNum) => {
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded font-medium transition ${
                    currentPage === pageNum
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {pageNumbers[pageNumbers.length - 1] < totalPages && (
              <span className="text-slate-400 px-1">...</span>
            )}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-2.5 py-1.5 sm:py-1 rounded bg-white border border-slate-200 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition touch-manipulation min-h-[32px]"
          >
            次へ
          </button>
        </div>
      </div>
    </div>
  );
};
