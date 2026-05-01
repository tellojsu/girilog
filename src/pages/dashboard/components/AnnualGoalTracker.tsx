import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AnnualGoalTrackerProps {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalDraft: number;
  goal: number;
  currency: string;
  onGoalSaved: (newGoal: number) => void;
}

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AnnualGoalTracker({
  totalPaid,
  totalPending,
  totalOverdue,
  totalDraft,
  goal,
  currency,
  onGoalSaved,
}: AnnualGoalTrackerProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const currentYear = new Date().getFullYear();
  const totalCollected = totalPaid;
  const totalInPipeline = totalPaid + totalPending + totalOverdue;

  const paidPct = goal > 0 ? Math.min((totalPaid / goal) * 100, 100) : 0;
  const pendingPct = goal > 0 ? Math.min((totalPending / goal) * 100, 100 - paidPct) : 0;
  const overduePct = goal > 0 ? Math.min((totalOverdue / goal) * 100, 100 - paidPct - pendingPct) : 0;

  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(currentYear, 0, 0).getTime()) / 86400000);
  const daysInYear = (currentYear % 4 === 0 && (currentYear % 100 !== 0 || currentYear % 400 === 0)) ? 366 : 365;
  const yearProgress = (dayOfYear / daysInYear) * 100;

  const projectedTotal = yearProgress > 0 ? (totalPaid / (yearProgress / 100)) : 0;
  const onTrack = projectedTotal >= goal;

  const handleSave = async () => {
    const parsed = parseFloat(inputVal.replace(/[^0-9.]/g, ''));
    if (isNaN(parsed) || parsed < 0) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('girilog_settings')
        .update({ annual_revenue_goal: parsed })
        .eq('user_id', user.id);
    }
    onGoalSaved(parsed);
    setSaving(false);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setEditing(false);
  };

  const footnoteStats = [
    { label: 'Collected', value: formatCurrency(totalCollected, currency), color: '#10B981', dot: true },
    { label: 'Pending', value: formatCurrency(totalPending, currency), color: '#F59E0B', dot: true },
    { label: 'Overdue', value: formatCurrency(totalOverdue, currency), color: '#EF4444', dot: true },
    { label: 'Draft', value: formatCurrency(totalDraft, currency), color: '#6B7280', dot: true },
    { label: 'In pipeline', value: formatCurrency(totalInPipeline, currency), color: '#9CA3AF', dot: false },
  ];

  return (
    <div className="bg-[#0A0C10] border border-[#1E2330] rounded-xl mb-6 overflow-hidden">
      {/* Always-visible collapsed row */}
      <div
        className="flex items-center justify-between px-6 py-3 cursor-pointer select-none group"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 items-center">
          {footnoteStats.map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              {item.dot && (
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              )}
              <span className="text-xs text-[#4B5563] font-mono">{item.label}</span>
              <span className="text-xs font-mono font-medium" style={{ color: item.color }}>{item.value}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <span className="text-xs text-[#4B5563] font-mono group-hover:text-[#6B7280] transition-colors whitespace-nowrap">
            {currentYear} Goal
          </span>
          <div className="w-4 h-4 flex items-center justify-center text-[#4B5563] group-hover:text-[#6B7280] transition-colors">
            {expanded ? <i className="ri-arrow-up-s-line text-sm" /> : <i className="ri-arrow-down-s-line text-sm" />}
          </div>
        </div>
      </div>

      {/* Expandable section */}
      {expanded && (
        <div className="px-6 pb-6 pt-2 border-t border-[#1E2330]">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 mt-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-[#6B7280] uppercase tracking-wider">{currentYear} Revenue Goal</span>
                {goal > 0 && (
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                      onTrack
                        ? 'bg-[#10B981]/10 text-[#10B981]'
                        : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                    }`}
                  >
                    {onTrack ? 'On track' : 'Behind pace'}
                  </span>
                )}
              </div>
              {editing ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[#6B7280] text-lg font-mono">$</span>
                  <input
                    autoFocus
                    type="text"
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. 100000"
                    className="bg-[#1E2330] border border-[#2A3040] rounded-lg px-3 py-1.5 text-white font-mono text-lg w-40 focus:outline-none focus:border-[#10B981] text-sm"
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="text-xs bg-[#10B981] hover:bg-[#059669] text-white px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="text-xs text-[#6B7280] hover:text-white px-2 py-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-3xl font-bold font-mono text-white">
                    {goal > 0 ? formatCurrency(goal, currency) : '—'}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setInputVal(goal > 0 ? String(goal) : ''); setEditing(true); }}
                    className="text-xs text-[#6B7280] hover:text-[#10B981] font-mono transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
                  >
                    <i className="ri-pencil-line text-xs" />
                    {goal > 0 ? 'Edit goal' : 'Set a goal'}
                  </button>
                </div>
              )}
            </div>

            {goal > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold font-mono text-[#10B981]">
                  {Math.round(paidPct)}%
                </div>
                <div className="text-xs text-[#6B7280] font-mono">collected</div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {goal > 0 ? (
            <>
              <div className="relative mb-3">
                <div className="h-3 bg-[#1E2330] rounded-full overflow-hidden relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#10B981] transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${paidPct}%` }}
                  />
                  <div
                    className="absolute inset-y-0 bg-[#F59E0B]/60 transition-all duration-700 ease-out"
                    style={{ left: `${paidPct}%`, width: `${pendingPct}%` }}
                  />
                  <div
                    className="absolute inset-y-0 bg-[#EF4444]/50 transition-all duration-700 ease-out"
                    style={{ left: `${paidPct + pendingPct}%`, width: `${overduePct}%` }}
                  />
                </div>
                <div
                  className="absolute top-0 bottom-0 flex flex-col items-center"
                  style={{ left: `${yearProgress}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="w-0.5 h-3 bg-white/30 rounded-full" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <span className="text-xs text-[#4B5563] font-mono">
                    {Math.round(yearProgress)}% of {currentYear} elapsed
                  </span>
                </div>
                <span className="text-xs text-[#6B7280] font-mono">
                  {formatCurrency(totalPaid, currency)} / {formatCurrency(goal, currency)}
                </span>
              </div>
            </>
          ) : (
            <div className="h-3 bg-[#1E2330] rounded-full" />
          )}
        </div>
      )}
    </div>
  );
}
