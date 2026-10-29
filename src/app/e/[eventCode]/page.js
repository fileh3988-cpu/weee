import ThemeScript from '@/components/ThemeScript';
import GuestView from './GuestView';

// Server Component tipis: menyediakan eventCode ke script anti-flash (sebelum render),
// lalu merender client component seperti biasa.
export default async function GuestPage({ params }) {
  const { eventCode } = await params;
  return (
    <>
      <ThemeScript eventCode={eventCode} />
      <GuestView eventCode={eventCode} />
    </>
  );
}
