interface SettingsFieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
  mono?: boolean;
}

export default function SettingsField({ label, hint, children }: SettingsFieldProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 py-4 border-b border-[#1E2330] last:border-0 last:pb-0 first:pt-0">
      <div className="sm:w-48 shrink-0">
        <label className="text-sm font-medium text-[#C9D1D9]">{label}</label>
        {hint && <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
