import React, { useState } from 'react';
import { JuniorHighSchool, GradeFilter } from '../types';
import { countForGrade } from '../utils/counts';
import { Award, Compass, School, Users, TrendingUp, Building2, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';

interface AnalyticsSummaryProps {
  schools: JuniorHighSchool[];
  gradeFilter: GradeFilter;
  onSelectCity: (city: string) => void;
  selectedCity: string;
}

export const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({
  schools,
  gradeFilter,
  onSelectCity,
  selectedCity,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Aggregate by Municipality
  const cityAgg: Record<string, { total: number; schoolsCount: number }> = {};
  const prefAgg: Record<string, number> = {};
  // Aggregate by Distance Brackets
  const distAgg = {
    under5: 0,
    from5to10: 0,
    from10to20: 0,
    over20: 0,
  };

  let grandTotal = 0;

  schools.forEach((s) => {
    const count = countForGrade(s, gradeFilter);

    grandTotal += count;
    prefAgg[s.prefecture] = (prefAgg[s.prefecture] || 0) + count;

    // City
    if (!cityAgg[s.city]) {
      cityAgg[s.city] = { total: 0, schoolsCount: 0 };
    }
    cityAgg[s.city].total += count;
    cityAgg[s.city].schoolsCount += 1;

    // Distance
    if (s.distanceKm < 5) distAgg.under5 += count;
    else if (s.distanceKm < 10) distAgg.from5to10 += count;
    else if (s.distanceKm < 20) distAgg.from10to20 += count;
    else distAgg.over20 += count;
  });

  // All municipalities, sorted by volume. Not truncated — with many filters
  // applied, a low-count municipality can otherwise silently drop off a
  // fixed top-N list even though the underlying totals are correct.
  const topCities = Object.entries(cityAgg).sort((a, b) => b[1].total - a[1].total);
  const sortedPrefs = Object.entries(prefAgg)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const otherPrefsTotal = sortedPrefs.slice(3).reduce((acc, [, n]) => acc + n, 0);
  const topPrefs: [string, number][] = [
    ...sortedPrefs.slice(0, 3),
    ...(otherPrefsTotal > 0 ? [['その他', otherPrefsTotal] as [string, number]] : []),
  ];
  const pct = (n: number) => (grandTotal ? Math.round((n / grandTotal) * 100) : 0);
  const within10 = distAgg.under5 + distAgg.from5to10;

  return (
    <div className="mb-2 sm:mb-3">
      {/* Mobile Expand/Collapse Header Button */}
      <div className="md:hidden mb-2">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 shadow-xs text-xs font-semibold text-slate-800 touch-manipulation"
        >
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-amber-600" />
            <span>エリア・通学距離分析サマリー</span>
            {selectedCity !== 'all' && (
              <span className="bg-amber-100 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {selectedCity}選択中
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1 text-slate-400">
            <span className="text-[11px] font-normal">{mobileOpen ? '閉じる' : '表示'}</span>
            {mobileOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>
      </div>

      {/* Cards container: hidden on mobile unless toggled open; always grid on md+ */}
      <div className={`${mobileOpen ? 'grid' : 'hidden md:grid'} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3`}>
        {/* Card 1: Top Feeder Cities */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                市区町村別 在籍ボリューム
              </h4>
              <span className="text-[10px] text-slate-400">全{topCities.length}地域 (タップで抽出)</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-0.5">
              {topCities.map(([city, data]) => {
                const isSelected = selectedCity === city;
                return (
                  <button
                    key={city}
                    onClick={() => onSelectCity(isSelected ? 'all' : city)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center space-x-1 touch-manipulation min-h-[32px] ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                    }`}
                  >
                    <span>{city}</span>
                    <span className={isSelected ? 'text-slate-900 font-bold' : 'text-amber-700 font-semibold'}>
                      {data.total}名
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 2: Distance Distribution */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-sky-600" />
                通学距離圏別の生徒比率
              </h4>
              <span className="text-[10px] text-slate-400">本校より直線距離</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 w-20">5km圏内 (近隣):</span>
                <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden mx-2">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${grandTotal ? (distAgg.under5 / grandTotal) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-bold text-slate-800 w-12 text-right">
                  {distAgg.under5}名
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 w-20">5〜10km圏:</span>
                <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden mx-2">
                  <div
                    className="bg-sky-500 h-full rounded-full"
                    style={{ width: `${grandTotal ? (distAgg.from5to10 / grandTotal) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-bold text-slate-800 w-12 text-right">
                  {distAgg.from5to10}名
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 w-20">10〜20km圏:</span>
                <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden mx-2">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{ width: `${grandTotal ? (distAgg.from10to20 / grandTotal) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-bold text-slate-800 w-12 text-right">
                  {distAgg.from10to20}名
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 w-20">20km以上:</span>
                <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden mx-2">
                  <div
                    className="bg-indigo-500 h-full rounded-full"
                    style={{ width: `${grandTotal ? (distAgg.over20 / grandTotal) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-bold text-slate-800 w-12 text-right">
                  {distAgg.over20}名
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Key Insights (computed from the current conditions) */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between md:col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                主要募集エリア傾向
              </h4>
              <span className="text-[10px] text-slate-400">現在の条件で自動集計</span>
            </div>
            {grandTotal === 0 ? (
              <p className="text-[11px] text-slate-400">該当する生徒がいません。</p>
            ) : (
              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {topPrefs.map(([pref, n]) => (
                    <span key={pref}>
                      {pref} <strong className="text-slate-900">{pct(n)}%</strong>
                      <span className="text-slate-400">（{n}名）</span>
                    </span>
                  ))}
                </div>
                <p>
                  上位の市区町村：
                  {topCities.slice(0, 3).map(([city, data], i) => (
                    <span key={city}>
                      {i > 0 && '・'}
                      <strong className="text-slate-800">{city}</strong>
                      <span className="text-slate-400">（{pct(data.total)}%）</span>
                    </span>
                  ))}
                </p>
                <p>
                  本校から10km圏内の中学出身は <strong className="text-slate-800">{pct(within10)}%</strong>、
                  20km以上は <strong className="text-slate-800">{pct(distAgg.over20)}%</strong>。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
