import { ReportWizard } from '@/components/report/ReportWizard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reportar ocorrência · Radar Urbano',
};

export default function ReportarPage() {
  return (
    <main className="min-h-screen bg-papel">
      <ReportWizard />
    </main>
  );
}
