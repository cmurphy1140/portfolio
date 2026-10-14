import Fieldbook from '@/components/career/fieldbook';
import { getCareerContent } from '@/data/career-server';
export const dynamic = 'force-dynamic';
export default async function Home() {
  return <Fieldbook content={await getCareerContent()}/>;
}
