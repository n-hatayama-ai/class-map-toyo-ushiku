import React, { useState } from 'react';
import {
  GraduationCap,
  MapPin,
  School,
  FileSpreadsheet,
  Download,
  Upload,
  Layers,
  RotateCcw,
  Sparkles,
  Menu,
  X,
  ChevronDown,
  BarChart3,
  Users,
} from 'lucide-react';
import { HighSchoolInfo } from '../types';
import { exportSchoolsToExcel } from '../utils/dataParser';
import { JuniorHighSchool } from '../types';

interface NavbarProps {
  highSchool: HighSchoolInfo;
  totalStudents: number;
  totalSchools: number;
  grade1Total: number;
  grade2Total: number;
  grade3Total: number;
  femaleTotal?: number;
  maleTotal?: number;
  filteredSchools: JuniorHighSchool[];
  onOpenUpload: () => void;
  onResetData: () => void;
  isCustomData: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  highSchool,
  totalStudents,
  totalSchools,
  grade1Total,
  grade2Total,
  grade3Total,
  femaleTotal,
  maleTotal,
  filteredSchools,
  onOpenUpload,
  onResetData,
  isCustomData,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & School Title */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-sm shrink-0">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap">
                <span className="font-bold text-sm sm:text-lg tracking-tight text-white truncate">
                  {highSchool.shortName}
                </span>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded border border-amber-400/30 whitespace-nowrap">
                  中学在籍マップ
                </span>
                {isCustomData && (
                  <span className="bg-blue-500/20 text-blue-300 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded border border-blue-400/30 flex items-center gap-0.5 whitespace-nowrap">
                    <Sparkles className="w-2.5 h-2.5" /> 取込データ
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block truncate">
                出身中学校別 在籍生徒数・学年構成・地理空間アナリティクス (2026年度)
              </p>
            </div>
          </div>

          {/* Desktop KPI Mini Badges */}
          <div className="hidden lg:flex items-center space-x-3 xl:space-x-4 text-xs whitespace-nowrap shrink-0">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700/60">
              <span className="text-slate-400 block text-[10px] leading-tight">総在籍生徒数</span>
              <span className="text-amber-400 font-bold text-sm">{totalStudents.toLocaleString()}</span>
              <span className="text-slate-400 ml-0.5">名</span>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700/60">
              <span className="text-slate-400 block text-[10px] leading-tight">出身中学校数</span>
              <span className="text-white font-bold text-sm">{totalSchools}</span>
              <span className="text-slate-400 ml-0.5">校</span>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700/60 flex items-center space-x-2">
              <div>
                <span className="text-slate-400 block text-[10px] leading-tight">1年</span>
                <span className="text-emerald-400 font-semibold">{grade1Total}</span>
              </div>
              <span className="text-slate-600">/</span>
              <div>
                <span className="text-slate-400 block text-[10px] leading-tight">2年</span>
                <span className="text-sky-400 font-semibold">{grade2Total}</span>
              </div>
              <span className="text-slate-600">/</span>
              <div>
                <span className="text-slate-400 block text-[10px] leading-tight">3年</span>
                <span className="text-indigo-400 font-semibold">{grade3Total}</span>
              </div>
              {femaleTotal !== undefined && maleTotal !== undefined && femaleTotal + maleTotal > 0 && (
                <>
                  <span className="text-slate-600">|</span>
                  <div className="text-[11px]" title={
                    femaleTotal + maleTotal !== totalStudents
                      ? `性別データのある${femaleTotal + maleTotal}名中の内訳（全${totalStudents}名中）`
                      : undefined
                  }>
                    <span className="text-rose-300 font-medium">女{femaleTotal}</span>
                    <span className="text-slate-500 mx-0.5">:</span>
                    <span className="text-sky-300 font-medium">男{maleTotal}</span>
                    {femaleTotal + maleTotal !== totalStudents && (
                      <span className="text-slate-500 ml-1 hidden 2xl:inline">({femaleTotal + maleTotal}名中)</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons & Mobile Hamburger */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 whitespace-nowrap shrink-0">
            {isCustomData && (
              <button
                id="reset-data-btn"
                onClick={onResetData}
                className="hidden sm:flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                title="初期の2026年度在籍データにリセット"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden 2xl:inline">初期データに戻す</span>
                <span className="2xl:hidden">リセット</span>
              </button>
            )}

            <button
              id="upload-excel-btn"
              onClick={onOpenUpload}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-md text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 transition shadow-sm touch-manipulation min-h-[34px]"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>取込</span>
            </button>

            <button
              id="export-excel-btn"
              onClick={() => exportSchoolsToExcel(filteredSchools)}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition touch-manipulation min-h-[34px]"
              title="現在の抽出リストをExcel形式で出力"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Excel出力</span>
              <span className="sm:hidden">出力</span>
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              id="mobile-nav-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation"
              aria-label="メニュー開閉"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Stat Bar (Always visible on mobile below main bar for quick glance) */}
        <div className="lg:hidden py-1.5 border-t border-slate-800 flex items-center justify-between text-[11px] overflow-x-auto no-scrollbar">
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-slate-400">在籍:</span>
            <strong className="text-amber-400 font-bold">{totalStudents.toLocaleString()}名</strong>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">中学数:</span>
            <strong className="text-white font-bold">{totalSchools}校</strong>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0 text-[10px]">
            <span className="text-emerald-400 font-semibold">1年:{grade1Total}</span>
            <span className="text-slate-600">/</span>
            <span className="text-sky-400 font-semibold">2年:{grade2Total}</span>
            <span className="text-slate-600">/</span>
            <span className="text-indigo-400 font-semibold">3年:{grade3Total}</span>
          </div>
        </div>

        {/* Mobile Dropdown Menu (when hamburger is clicked) */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 block text-[10px]">総在籍生徒数</span>
                <span className="text-amber-400 font-bold text-base">{totalStudents.toLocaleString()}</span>
                <span className="text-slate-400 text-xs ml-0.5">名</span>
              </div>
              <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 block text-[10px]">登録中学校数</span>
                <span className="text-white font-bold text-base">{totalSchools}</span>
                <span className="text-slate-400 text-xs ml-0.5">校</span>
              </div>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 text-xs">
              <span className="text-slate-400 block text-[10px] mb-1.5">学年・男女比構成</span>
              <div className="flex items-center justify-between font-semibold">
                <span className="text-emerald-400">1年生: {grade1Total}名</span>
                <span className="text-sky-400">2年生: {grade2Total}名</span>
                <span className="text-indigo-400">3年生: {grade3Total}名</span>
              </div>
              {femaleTotal !== undefined && maleTotal !== undefined && femaleTotal + maleTotal > 0 && (
                <div className="mt-2 pt-1.5 border-t border-slate-700 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-rose-300">女子生徒: {femaleTotal}名</span>
                    <span className="text-sky-300">男子生徒: {maleTotal}名</span>
                  </div>
                  {femaleTotal + maleTotal !== totalStudents && (
                    <span className="text-slate-500 block mt-1 text-[10px]">
                      ※性別データのある{femaleTotal + maleTotal}名分の内訳（全{totalStudents}名中）
                    </span>
                  )}
                </div>
              )}
            </div>

            {isCustomData && (
              <button
                onClick={() => {
                  onResetData();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold text-amber-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>初期データ（2026年度版）に戻す</span>
              </button>
            )}

            <p className="text-[10px] text-slate-400 text-center pt-1">
              東洋大学附属牛久高等学校 募集広報・地理空間分析ダッシュボード
            </p>
          </div>
        )}
      </div>
    </header>
  );
};
