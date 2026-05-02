import { useMemo, useState } from 'react';
import { Invoice, InvoiceStatusEnum } from '@/types/girilog';

interface RevenueLineChartProps {
  invoices: Invoice[];
  goal: number;
  currency: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatShort(amount: number) {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}k`;
  return `$${Math.round(amount)}`;
}

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function RevenueLineChart({ invoices, goal, currency }: RevenueLineChartProps) {
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; month: string; sent: number; pending: number;
  } | null>(null);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyData = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => ({ month: i, sent: 0, pending: 0 }));
    invoices.forEach(inv => {
      const date = new Date(inv.issue_date.includes('T') ? inv.issue_date : `${inv.issue_date}T00:00:00`);
      if (date.getFullYear() !== currentYear) return;
      const m = date.getMonth();
      if (m >= 0 && m < 12) {
        if (inv.status === InvoiceStatusEnum.Paid || inv.status === InvoiceStatusEnum.Overdue) {
          data[m].sent += Number(inv.total);
        } else {
          data[m].pending += Number(inv.total);
        }
      }
    });
    return data;
  }, [invoices, currentYear]);

  // Cumulative running totals
  const cumulativeData = useMemo(() => {
    let runningSent = 0;
    let runningPending = 0;
    return monthlyData.map(d => {
      runningSent += d.sent;
      runningPending += d.pending;
      return { month: d.month, sent: runningSent, pending: runningPending };
    });
  }, [monthlyData]);

  const W = 600;
  const H = 200;
  const PAD = { top: 16, right: 24, bottom: 32, left: 52 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxVal = useMemo(() => {
    // Max is sent + pending combined (stacked view) or whichever is higher
    const dataMax = Math.max(
      ...cumulativeData.map(d => d.sent + d.pending),
      goal > 0 ? goal : 0,
    );
    return dataMax > 0 ? dataMax * 1.1 : 1000;
  }, [cumulativeData, goal]);

  const xStep = chartW / 11;
  const toX = (idx: number) => PAD.left + idx * xStep;
  const toY = (val: number) => PAD.top + chartH - (val / maxVal) * chartH;

  const buildPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cpX = (prev.x + p.x) / 2;
      return `${acc} C ${cpX} ${prev.y} ${cpX} ${p.y} ${p.x} ${p.y}`;
    }, '');
  };

  const visibleMonths = currentMonth + 1;

  // Sent line points
  const sentPoints = cumulativeData.slice(0, visibleMonths).map(d => ({
    x: toX(d.month), y: toY(d.sent),
  }));

  // Combined (sent + pending) line points — sits above sent
  const combinedPoints = cumulativeData.slice(0, visibleMonths).map(d => ({
    x: toX(d.month), y: toY(d.sent + d.pending),
  }));

  const goalPoints = goal > 0
    ? Array.from({ length: 12 }, (_, i) => ({ x: toX(i), y: toY((goal / 11) * i) }))
    : [];

  const sentPath = buildPath(sentPoints);
  const combinedPath = buildPath(combinedPoints);
  const goalPath = goalPoints.length > 0 ? buildPath(goalPoints) : '';

  // Area between baseline and sent line (green fill)
  const sentAreaPath = sentPoints.length > 0
    ? `${sentPath} L ${sentPoints[sentPoints.length - 1].x} ${PAD.top + chartH} L ${PAD.left} ${PAD.top + chartH} Z`
    : '';

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    val: maxVal * f,
    y: toY(maxVal * f),
  }));

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const relX = svgX - PAD.left;
    const monthIdx = Math.round(relX / xStep);
    if (monthIdx < 0 || monthIdx > currentMonth) { setTooltip(null); return; }
    const d = cumulativeData[monthIdx];
    setTooltip({
      x: toX(monthIdx),
      y: toY(d.sent + d.pending) - 8,
      month: MONTHS[monthIdx],
      sent: d.sent,
      pending: d.pending,
    });
  };

  const currentSent = cumulativeData[currentMonth]?.sent ?? 0;
  const currentPending = cumulativeData[currentMonth]?.pending ?? 0;

  return (
    <div className="bg-[#0A0C10] border border-[#1E2330] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Revenue This Year</h3>
          <p className="text-xs text-secondary font-mono mt-0.5">Cumulative · {new Date().getFullYear()}</p>
        </div>
        {/* Live totals */}
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-xs text-primary font-mono font-semibold">{formatCurrency(currentSent, currency)}</div>
            <div className="text-[10px] text-secondary font-mono">Paid</div>
          </div>
          <div className="w-px h-6 bg-[#1E2330]" />
          <div>
            <div className="text-xs text-[#F59E0B] font-mono font-semibold">{formatCurrency(currentPending, currency)}</div>
            <div className="text-[10px] text-secondary font-mono">Outstanding</div>
          </div>
          {currentPending > 0 && (
            <>
              <div className="w-px h-6 bg-[#1E2330]" />
              <div>
                <div className="text-xs text-white font-mono font-semibold">{formatCurrency(currentSent + currentPending, currency)}</div>
                <div className="text-[10px] text-secondary font-mono">Total</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 200 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary, #10B981)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-primary, #10B981)" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="pendingBandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.06" />
            </linearGradient>
          </defs>

          {/* Y-axis grid lines + labels */}
          {yTicks.map(tick => (
            <g key={tick.val}>
              <line x1={PAD.left} y1={tick.y} x2={W - PAD.right} y2={tick.y} stroke="#1E2330" strokeWidth="1" />
              <text x={PAD.left - 6} y={tick.y + 4} textAnchor="end" fontSize="9" fill="#94A3B8" fontFamily="monospace">
                {formatShort(tick.val)}
              </text>
            </g>
          ))}

          {/* X-axis month labels */}
          {MONTHS.map((m, i) => (
            <text
              key={m}
              x={toX(i)}
              y={H - 6}
              textAnchor="middle"
              fontSize="9"
              fill={i === currentMonth ? '#9CA3AF' : '#94A3B8'}
              fontFamily="monospace"
              fontWeight={i === currentMonth ? '600' : '400'}
            >
              {m}
            </text>
          ))}

          {/* Goal pace dashed line */}
          {goalPath && (
            <path d={goalPath} fill="none" stroke="#6B7280" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
          )}

          {/* Sent area fill (green base) */}
          {sentAreaPath && (
            <path d={sentAreaPath} fill="url(#sentGrad)" />
          )}

          {/* Sent line */}
          {sentPath && (
            <path d={sentPath} fill="none" stroke="var(--color-primary, #10B981)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Dots on sent line */}
          {sentPoints.map((p, i) => (
            <circle
              key={`s${i}`}
              cx={p.x} cy={p.y}
              r={i === currentMonth ? 4 : 2}
              fill="var(--color-primary, #10B981)"
              stroke="#0A0C10"
              strokeWidth="1.5"
            />
          ))}

          {/* Outstanding dot (only for current month if pending > 0) */}
          {(() => {
            const d = cumulativeData[currentMonth];
            if (!d || d.pending === 0) return null;
            return (
              <circle
                cx={toX(currentMonth)}
                cy={toY(d.sent + d.pending)}
                r={4}
                fill="#F59E0B"
                stroke="#0A0C10"
                strokeWidth="1.5"
              />
            );
          })()}

          {/* Tooltip vertical line */}
          {tooltip && (
            <line
              x1={tooltip.x} y1={PAD.top}
              x2={tooltip.x} y2={PAD.top + chartH}
              stroke="#2A3040" strokeWidth="1" strokeDasharray="3 3"
            />
          )}
        </svg>

        {/* Tooltip box */}
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-[#1E2330] border border-[#2A3040] rounded-lg px-3 py-2 text-xs font-mono"
            style={{
              left: `${(tooltip.x / W) * 100}%`,
              top: `${(tooltip.y / H) * 100}%`,
              transform: tooltip.x > W * 0.7 ? 'translate(-110%, -50%)' : 'translate(8px, -50%)',
              minWidth: 150,
            }}
          >
            <div className="text-[#9CA3AF] mb-1.5">{tooltip.month} {new Date().getFullYear()}</div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[#6B7280]">Sent</span>
              <span className="text-white ml-auto">{formatCurrency(tooltip.sent, currency)}</span>
            </div>
            {tooltip.pending > 0 && (
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                <span className="text-[#6B7280]">Pending</span>
                <span className="text-white ml-auto">{formatCurrency(tooltip.pending, currency)}</span>
              </div>
            )}
            {tooltip.pending > 0 && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-[#2A3040]">
                <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                <span className="text-[#6B7280]">Total</span>
                <span className="text-white ml-auto">{formatCurrency(tooltip.sent + tooltip.pending, currency)}</span>
              </div>
            )}
            {goal > 0 && (
              <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-[#2A3040]">
                <span className="w-1.5 h-0 border-t border-dashed border-[#6B7280] inline-block" style={{ width: 6 }} />
                <span className="text-[#6B7280]">Goal pace</span>
                <span className="text-[#9CA3AF] ml-auto">
                  {formatCurrency((goal / 11) * MONTHS.indexOf(tooltip.month), currency)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 pt-3 border-t border-[#1E2330]">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-primary rounded" />
          <span className="text-xs text-[#6B7280] font-mono">Sent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          <span className="text-xs text-[#6B7280] font-mono">Outstanding</span>
        </div>
        {goal > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0 border-t border-dashed border-[#6B7280]" />
            <span className="text-xs text-[#6B7280] font-mono">Goal pace</span>
          </div>
        )}
      </div>
    </div>
  );
}
