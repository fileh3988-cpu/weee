import ThemeScript from '@/components/ThemeScript';
import DisplayView from './DisplayView';

// Server Component tipis: pasang tema dari cache sebelum render (anti-flash),
// lalu render client component layar display.
export default async function DisplayPage({ params }) {
  const { eventCode } = await params;
  return (
    <>
      <ThemeScript eventCode={eventCode} />
      <DisplayView eventCode={eventCode} />
    </>
  );
}
