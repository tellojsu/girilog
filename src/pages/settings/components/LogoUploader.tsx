import { useState } from 'react';

interface LogoUploaderProps {
  value: string;
  onChange: (url: string) => void;
}

export default function LogoUploader({ value, onChange }: LogoUploaderProps) {
  const [inputMode, setInputMode] = useState<'preview' | 'edit'>(value ? 'preview' : 'edit');
  const [draft, setDraft] = useState(value);
  const [imgError, setImgError] = useState(false);

  const handleApply = () => {
    onChange(draft);
    setImgError(false);
    if (draft) setInputMode('preview');
  };

  const handleClear = () => {
    onChange('');
    setDraft('');
    setInputMode('edit');
    setImgError(false);
  };

  return (
    <div className="flex items-start gap-4">
      {/* Preview box */}
      <div className="w-20 h-20 rounded-xl border border-[#1E2330] bg-[#0D0F14] flex items-center justify-center shrink-0 overflow-hidden">
        {value && !imgError ? (
          <img
            src={value}
            alt="Business logo"
            className="w-full h-full object-contain p-1"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 flex items-center justify-center">
              <i className="ri-building-line text-xl text-secondary" />
            </div>
            <span className="text-[10px] text-secondary font-mono">No logo</span>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex-1">
        {inputMode === 'preview' && value && !imgError ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6B7280] font-mono truncate max-w-[200px]">{value}</span>
            <button
              type="button"
              onClick={() => { setDraft(value); setInputMode('edit'); }}
              className="text-xs text-primary hover:text-[#059669] cursor-pointer whitespace-nowrap transition-colors"
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-[#EF4444] hover:text-red-400 cursor-pointer whitespace-nowrap transition-colors"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="url"
              value={draft}
              onChange={e => { setDraft(e.target.value); setImgError(false); }}
              placeholder="https://example.com/logo.png"
              className="w-full bg-[#0D0F14] border border-[#1E2330] rounded-lg px-3 py-2 text-sm text-white placeholder-secondary font-mono focus:outline-none focus:border-primary/50 transition-colors"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApply}
                className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-md cursor-pointer whitespace-nowrap transition-colors"
              >
                Apply URL
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => { setDraft(value); setInputMode('preview'); setImgError(false); }}
                  className="text-xs text-[#6B7280] hover:text-white cursor-pointer whitespace-nowrap transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
            {imgError && (
              <p className="text-xs text-[#EF4444] font-mono">Could not load image from that URL</p>
            )}
          </div>
        )}
        <p className="text-xs text-secondary mt-2">Paste a public image URL. Appears on generated invoices.</p>
      </div>
    </div>
  );
}
