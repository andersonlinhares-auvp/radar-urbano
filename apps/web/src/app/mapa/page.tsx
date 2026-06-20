import { recentIncidents } from '@/lib/incidents';
import { MapShell } from '@/components/MapShell';

export const dynamic = 'force-dynamic';

export default async function MapaPage() {
  const incidents = await recentIncidents(25);
  return <MapShell incidents={incidents} />;
}
