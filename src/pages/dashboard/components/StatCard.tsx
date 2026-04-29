interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  change?: string;
  changePositive?: boolean;
}

export default function StatCard({ label, value, icon, iconColor, iconBg, change, changePositive }: StatCardProps) {
  return (
    <div className="bg-[#0A0C10] border border-[#1E2330] rounded-xl p-5 hover:border-[#2A3040] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <i className={`${icon} text-lg`} style={{ color: iconColor }} />
        </div>
        {change && (
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${changePositive ? 'text-[#10B981] bg-[#10B981]/10' : 'text-[#EF4444] bg-[#EF4444]/10'}`}>
            {change}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold font-mono text-white mb-1">{value}</div>
      <div className="text-sm text-[#6B7280]">{label}</div>
    </div>
  );
}
