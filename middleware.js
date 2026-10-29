import { NextResponse } from 'next/server';

// Halaman admin (UI) dilindungi di sini sebagai lapisan pertama.
// Perlindungan DATA yang sebenarnya ada di API routes (verifikasi httpOnly cookie
// via src/lib/adminAuth.js) — middleware ini hanya mencegah halaman tampil sekilas.
export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Guard dashboard & report, tapi izinkan /admin/login dan /admin/access
  const isPublicAdminPage = pathname === '/admin/login' || pathname === '/admin/access';
  if (!isPublicAdminPage) {
    const session = request.cookies.get('admin_session');
    if (!session?.value) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
