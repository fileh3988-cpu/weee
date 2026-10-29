import './globals.css';

export const metadata = {
  title: 'Live Photowall',
  description: 'Interactive event photowall',
};

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning: atribut data-theme pada <html> dipasang oleh
    // script anti-flash (ThemeScript) di browser SEBELUM hidrasi, jadi wajar
    // berbeda dengan HTML dari server. Ini praktik standar Next.js untuk theme
    // switching — hanya mengabaikan diff pada tag <html>, bukan menyembunyikan bug.
    <html lang="id" suppressHydrationWarning>
      
      <body>
        {children}
      </body>
    </html>
  );
}