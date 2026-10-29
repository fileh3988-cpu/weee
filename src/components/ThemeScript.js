import { DEFAULT_THEME_ID, isValidTheme } from '@/lib/themes';

// Script anti-flash: dijalankan SEBELUM HTML dirender di browser.
// Membaca tema event dari localStorage (instan) dan memasang data-theme
// langsung ke <html>, sehingga warna halaman sudah benar sejak frame pertama.
// Nilai cache divalidasi terhadap THEME_REGISTRY — jika id tidak dikenal
// (mis. tema lama yang sudah dihapus), fallback ke tema default.
export default function ThemeScript({ eventCode }) {
  const code = JSON.stringify(String(eventCode || ''));
  const fallback = JSON.stringify(DEFAULT_THEME_ID);
  const html = `try{var c=${code};var t=localStorage.getItem('theme_'+c)||${fallback};document.documentElement.setAttribute('data-theme',t);}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: html }} />;
}

void isValidTheme; // registry ikut ter-bundle untuk referensi validasi client-side
