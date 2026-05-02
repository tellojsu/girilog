import AppLayout from '@/components/feature/AppLayout';
import ProjectAudit from './components/ProjectAudit';

export default function SEOPage() {
  return (
    <AppLayout
      title="SEO & Health Audit"
      subtitle="Analyze your project's search engine optimization and accessibility"
    >
      <div className="max-w-4xl mx-auto">
        <ProjectAudit />
      </div>
    </AppLayout>
  );
}
