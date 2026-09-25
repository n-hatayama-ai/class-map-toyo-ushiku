import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  X,
  AlertCircle,
  CheckCircle2,
  Download,
  Info,
  FileText,
} from 'lucide-react';
import { parseExcelOrCsv, mergeParsedResults } from '../utils/dataParser';
import { JuniorHighSchool, Student } from '../types';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (data: { schools: JuniorHighSchool[]; students: Student[]; fileName: string }) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFiles = async (files: File[]) => {
    setError(null);
    setLoading(true);

    try {
      const parsedResults = [];
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        parsedResults.push(await parseExcelOrCsv(buffer));
      }
      const result = mergeParsedResults(parsedResults);

      if (result.schools.length === 0) {
        throw new Error('中学校の在籍データが検出できませんでした。出身校の列が存在するかご確認ください。');
      }

      onDataLoaded({
        schools: result.schools,
        students: result.students,
        fileName: files.map((f) => f.name).join(', '),
      });
      onClose();
    } catch (err: any) {
      console.error('File parsing error:', err);
      setError(
        err?.message ||
          'ファイルの解析中にエラーが発生しました。エクセル形式 (.xlsx, .xls) または CSV 形式をご確認ください。'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const downloadSampleCsv = () => {
    const sampleHeaders = 'システムID,年度,学校区分,学年,学科,コース,クラス,出身校\n';
    const sampleRows = [
      'Z20260327001,2026,高校,1,普通,進学,A,取手市立藤代中学校',
      'Z20260327002,2026,高校,1,普通,進学,A,牛久市立牛久第一中学校',
      'Z20260327003,2026,高校,1,普通,進学,A,柏市立柏中学校',
      'Z20260327004,2026,高校,1,普通,特進,J,つくば市立手代木中学校',
      'Z20260327005,2026,高校,1,普通,併設中,S,東洋大学附属牛久中学校',
    ].join('\n');

    const blob = new Blob(['\uFEFF' + sampleHeaders + sampleRows], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '各中学在籍データ_サンプル形式.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="file-upload-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">エクセル・CSV資料の取り込み</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">新しい在籍データファイルを取り込んで地図を更新</p>
            </div>
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
        <div className="p-4 sm:p-6 space-y-4 text-xs text-slate-600 overflow-y-auto">
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${
              isDragging
                ? 'border-amber-500 bg-amber-50/50'
                : 'border-slate-300 hover:border-amber-400 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-3 shadow-xs">
              <Upload className="w-6 h-6 text-amber-600" />
            </div>
            <p className="font-bold text-slate-900 text-sm mb-1">
              ファイルをドラッグ＆ドロップ、またはクリックして選択
            </p>
            <p className="text-slate-500">
              対応形式: Excel (.xlsx, .xls) / CSV (.csv)　※複数ファイル選択可（学年別ファイルを合算します）
            </p>
          </div>

          {loading && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg flex items-center space-x-2 text-xs">
              <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
              <span>ファイルデータを読み込み・ジオコーディング解析中...</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-start space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Format Explanation */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-1.5 font-semibold text-slate-800 text-xs">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span>推奨列構成</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              エクセル内の1行目に「<strong>出身校</strong>」または「<strong>中学校</strong>」が含まれる列があれば自動で認識されます。学年、コース、クラス列も自動で対応します。
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
              <span className="text-slate-500">入力フォーマットの確認:</span>
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="flex items-center space-x-1 text-amber-700 hover:text-amber-800 font-semibold cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>サンプルCSVをダウンロード</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};
