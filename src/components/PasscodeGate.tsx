import React, { useEffect, useState } from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import { Dataset, unlockWithPasscode, unlockWithStoredKey } from '../utils/secureData';

// Pre-encryption versions only stored a boolean flag here.
localStorage.removeItem('juniorHighMap.authorized.v1');

export const PasscodeGate: React.FC<{ children: (dataset: Dataset) => React.ReactNode }> = ({ children }) => {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    unlockWithStoredKey()
      .then((d) => d && setDataset(d))
      .catch(() => {})
      .finally(() => setRestoring(false));
  }, []);

  if (dataset) return <>{children(dataset)}</>;
  if (restoring) return <div className="min-h-screen bg-slate-100" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    try {
      setDataset(await unlockWithPasscode(input));
    } catch (err) {
      setError(err instanceof DOMException ? '合言葉が違います。' : 'データを読み込めませんでした。');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-sm space-y-4"
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-400/20 text-amber-600 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900">中学在籍数マップ</h1>
            <p className="text-xs text-slate-500">合言葉を入力してください</p>
          </div>
        </div>
        <input
          type="password"
          autoFocus
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(null);
          }}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="合言葉"
        />
        {error && (
          <div className="flex items-center space-x-1.5 text-rose-600 text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}
        <button
          type="submit"
          disabled={checking || !input}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-sm py-2 rounded-lg transition"
        >
          {checking ? '確認中…' : '入る'}
        </button>
      </form>
    </div>
  );
};
