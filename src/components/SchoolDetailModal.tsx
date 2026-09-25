import React, { useEffect } from 'react';
import { JuniorHighSchool, HighSchoolInfo, CourseStats, CourseFilter } from '../types';
import {
  X,
  MapPin,
  Compass,
  Award,
  Users,
  GraduationCap,
  School,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
} from 'lucide-react';

interface SchoolDetailModalProps {
  school: JuniorHighSchool | null;
  highSchool: HighSchoolInfo;
  onClose: () => void;
  onZoomOnMap: (schoolId: string) => void;
  courseFilter: CourseFilter;
}

export const SchoolDetailModal: React.FC<SchoolDetailModalProps> = ({
  school,
  highSchool,
  onClose,
  onZoomOnMap,
  courseFilter,
}) => {
  useEffect(() => {
    if (!school) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [school, onClose]);

  if (!school) return null;

  // Grade × course breakdown. Rows matching the active course filter are
  // highlighted, since the header counts above are already narrowed to it
  // (see App.tsx's filteredSchools).
  const courseRows = Object.entries<CourseStats>(school.courses).sort(
    (a, b) => b[1].total - a[1].total
  );

  // Trend calculation (1年 vs 3年 intake comparison)
  let trendType: 'up' | 'down' | 'flat' = 'flat';
  if (school.grade1Count > school.grade3Count) trendType = 'up';
  else if (school.grade1Count < school.grade3Count) trendType = 'down';

  return (
    <div
      id="school-detail-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-start justify-between border-b border-slate-800">
          <div className="min-w-0 pr-2">
            <div className="flex items-center space-x-1.5 sm:space-x-2 mb-1.5 flex-wrap gap-y-1">
              <span className="text-[11px] sm:text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-semibold border border-amber-400/30">
                {school.prefecture} {school.city}
              </span>
              <span className="text-[11px] sm:text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-medium">
                直線 {school.distanceKm} km ({school.bearing})
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-bold tracking-tight text-white truncate">
              {school.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0 touch-manipulation"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5 text-sm">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 block text-[11px] sm:text-xs">順位（現在の条件）</span>
              <span className="text-lg sm:text-xl font-bold text-amber-600">#{school.rank}</span>
              <span className="text-slate-400 text-xs ml-1">位</span>
            </div>
            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 block text-[11px] sm:text-xs">
                {courseFilter === 'all' ? '総在籍生徒数' : `在籍数（${courseFilter}）`}
              </span>
              <span className="text-lg sm:text-xl font-bold text-slate-900">{school.totalCount}</span>
              <span className="text-slate-500 text-xs ml-1">名</span>
            </div>
            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 block text-[11px] sm:text-xs">主要コース</span>
              <span className="text-sm sm:text-base font-bold text-slate-800 truncate block mt-0.5">
                {school.primaryCourse}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 block text-[11px] sm:text-xs">学年別推移</span>
              <div className="flex items-center space-x-1 mt-0.5">
                {trendType === 'up' && (
                  <span className="text-emerald-600 font-semibold text-xs flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> 増加傾向 (+{school.grade1Count - school.grade3Count})
                  </span>
                )}
                {trendType === 'down' && (
                  <span className="text-rose-600 font-semibold text-xs flex items-center">
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> 減少傾向 ({school.grade1Count - school.grade3Count})
                  </span>
                )}
                {trendType === 'flat' && (
                  <span className="text-slate-600 font-semibold text-xs flex items-center">
                    <Minus className="w-3.5 h-3.5 mr-0.5" /> 安定推移
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Grade Breakdown with visual bar */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-3">
              学年別在籍生徒数
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">1年生 (2026年度新入生)</span>
                  <span className="font-bold text-emerald-600">{school.grade1Count} 名</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (school.grade1Count / Math.max(1, school.totalCount)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">2年生</span>
                  <span className="font-bold text-sky-600">{school.grade2Count} 名</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (school.grade2Count / Math.max(1, school.totalCount)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">3年生</span>
                  <span className="font-bold text-indigo-600">{school.grade3Count} 名</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (school.grade3Count / Math.max(1, school.totalCount)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Courses & Classes Distribution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Course distribution */}
            <div className="border border-slate-200 rounded-xl p-3.5">
              <h4 className="font-semibold text-xs text-slate-700 mb-2">コース別所属状況</h4>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries<CourseStats>(school.courses).map(([cName, cData]) => (
                  <span
                    key={cName}
                    className="bg-slate-100 border border-slate-200 text-slate-800 text-xs px-2.5 py-1 rounded-lg font-medium flex items-center space-x-1"
                  >
                    <span>{cName}:</span>
                    <strong className="text-amber-700">{cData.total}名</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* Class distribution */}
            <div className="border border-slate-200 rounded-xl p-3.5">
              <h4 className="font-semibold text-xs text-slate-700 mb-2">クラス別（全学年合算）</h4>
              <div className="flex flex-wrap gap-1">
                {Object.entries(school.classes).map(([clsName, clsCount]) => (
                  <span
                    key={clsName}
                    className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded border border-slate-200 font-mono"
                  >
                    {clsName}組: {clsCount}人
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Grade × Course breakdown */}
          <div>
            <h4 className="font-semibold text-xs text-slate-700 mb-2">学年 × コース 内訳</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-100 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2 px-3">コース</th>
                    <th className="py-2 px-3 text-right">1年</th>
                    <th className="py-2 px-3 text-right">2年</th>
                    <th className="py-2 px-3 text-right">3年</th>
                    <th className="py-2 px-3 text-right">計</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {courseRows.map(([cName, c]) => {
                    const active = courseFilter !== 'all' && cName.includes(courseFilter);
                    return (
                      <tr key={cName} className={active ? 'bg-amber-50 font-semibold' : ''}>
                        <td className="py-1.5 px-3">{cName}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{c.grade1 || '–'}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{c.grade2 || '–'}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{c.grade3 || '–'}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{c.total}</td>
                      </tr>
                    );
                  })}
                  {courseRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400">
                        コース別データがありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-4 sm:px-5 py-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <button
            onClick={() => {
              onZoomOnMap(school.id);
              onClose();
            }}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition touch-manipulation min-h-[40px]"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>地図でこの中学校をズーム表示</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 sm:py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition touch-manipulation min-h-[40px]"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
