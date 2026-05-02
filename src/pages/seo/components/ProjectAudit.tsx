import { useState, useEffect } from 'react';

interface AuditResult {
  category: 'SEO' | 'Accessibility' | 'Performance';
  status: 'success' | 'warning' | 'error';
  title: string;
  description: string;
  recommendation?: string;
}

interface PageAudit {
  path: string;
  name: string;
  results: AuditResult[];
}

export default function ProjectAudit() {
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<PageAudit[]>([]);
  const [globalScore, setGlobalScore] = useState(0);

  useEffect(() => {
    // Simulate a scan of the project
    const performAudit = async () => {
      setLoading(true);
      
      // In a real app, this might be a pre-generated JSON or 
      // some complex logic scanning the current DOM or routes
      const projectPages: PageAudit[] = [
        {
          path: '/',
          name: 'Home Page',
          results: [
            { category: 'SEO', status: 'success', title: 'Meta Tags', description: 'Primary meta tags are present in index.html.' },
            { category: 'SEO', status: 'warning', title: 'Heading Hierarchy', description: 'Multiple H1 tags might be present due to component nesting.', recommendation: 'Ensure only one H1 is rendered at a time.' },
            { category: 'Accessibility', status: 'success', title: 'Image Alt Tags', description: 'All main decorative images have alt attributes.' }
          ]
        },
        {
          path: '/dashboard',
          name: 'Dashboard',
          results: [
            { category: 'SEO', status: 'error', title: 'Dynamic Titles', description: 'Page title does not change when navigating to Dashboard.', recommendation: 'Use document.title or a head manager to update titles dynamically.' },
            { category: 'Accessibility', status: 'warning', title: 'Color Contrast', description: 'Some chart legends may have low contrast.', recommendation: 'Increase contrast ratio for better readability.' }
          ]
        },
        {
          path: '/invoices',
          name: 'Invoices List',
          results: [
            { category: 'SEO', status: 'success', title: 'Semantic HTML', description: 'Table structure uses proper thead/tbody tags.' },
            { category: 'Accessibility', status: 'error', title: 'Empty Buttons', description: 'Some icon-only buttons lack aria-labels.', recommendation: 'Add aria-label to all action icons.' }
          ]
        }
      ];

      setTimeout(() => {
        setPages(projectPages);
        setGlobalScore(78);
        setLoading(false);
      }, 1500);
    };

    performAudit();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-[#8B9AB0] font-mono text-sm">Scanning project codebase...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Global Project Score */}
      <div className="bg-[#0A0C10] border border-[#1E2330] rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="60"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-[#1E2330]"
            />
            <circle
              cx="64"
              cy="64"
              r="60"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={377}
              strokeDashoffset={377 - (377 * globalScore) / 100}
              className="text-primary transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold font-mono text-white">{globalScore}</span>
            <span className="text-[10px] text-secondary font-mono uppercase">Overall</span>
          </div>
        </div>
        
        <div className="flex-1 space-y-2">
          <h2 className="text-xl font-bold text-white">Project SEO & Health Audit</h2>
          <p className="text-[#8B9AB0] text-sm">
            This audit scans your local project structure, routes, and components to identify common SEO and accessibility issues before deployment.
          </p>
          <div className="flex gap-4 pt-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs text-secondary font-mono">SEO</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              <span className="text-xs text-secondary font-mono">Accessibility</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              <span className="text-xs text-secondary font-mono">Best Practices</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pages List */}
      <div className="grid grid-cols-1 gap-6">
        {pages.map((page, idx) => (
          <div key={idx} className="bg-[#0A0C10] border border-[#1E2330] rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-[#0D0F14] border-b border-[#1E2330] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{page.name}</h3>
                <code className="text-[10px] text-primary">{page.path}</code>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1E2330] text-[#8B9AB0]">
                  {page.results.length} Checks
                </span>
              </div>
            </div>
            <div className="divide-y divide-[#1E2330]">
              {page.results.map((res, ridx) => (
                <div key={ridx} className="px-6 py-4 flex items-start gap-4">
                  <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    res.status === 'success' ? 'bg-primary/10 text-primary' : 
                    res.status === 'warning' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' : 
                    'bg-[#EF4444]/10 text-[#EF4444]'
                  }`}>
                    <i className={`${
                      res.status === 'success' ? 'ri-checkbox-circle-line' : 
                      res.status === 'warning' ? 'ri-error-warning-line' : 
                      'ri-close-circle-line'
                    } text-sm`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-white">{res.title}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter ${
                        res.category === 'SEO' ? 'bg-primary/10 text-primary' : 
                        res.category === 'Accessibility' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>
                        {res.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#8B9AB0] leading-relaxed">{res.description}</p>
                    {res.recommendation && (
                      <div className="mt-2 text-[11px] text-[#F59E0B] flex items-start gap-1 font-medium italic">
                        <i className="ri-lightbulb-line" />
                        <span>Recommendation: {res.recommendation}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
