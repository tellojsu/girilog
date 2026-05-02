import { ReactNode } from 'react';

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: string;
  children: ReactNode;
  accent?: boolean;
}

export default function SettingsSection({ title, description, icon, children, accent }: SettingsSectionProps) {
  return (
    <div className={`bg-[#0A0C10] border rounded-xl ${accent ? 'border-[#EF4444]/30' : 'border-[#1E2330]'}`}>
      <div className={`px-6 py-4 border-b flex items-start gap-3 ${accent ? 'border-[#EF4444]/20 bg-[#EF4444]/5' : 'border-[#1E2330]'}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${accent ? 'bg-[#EF4444]/10' : 'bg-[#10B981]/10'}`}>
          <i className={`${icon} text-sm`} style={{ color: accent ? '#EF4444' : '#10B981' }} />
        </div>
        <div>
          <h2 className={`text-sm font-semibold ${accent ? 'text-[#EF4444]' : 'text-white'}`}>{title}</h2>
          <p className="text-xs text-[#6B7280] mt-0.5">{description}</p>
        </div>
      </div>
      <div className="px-6 py-5">
        {children}
      </div>
    </div>
  );
}
