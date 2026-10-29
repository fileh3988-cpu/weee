// ============================================================
// PUSAT KONFIGURASI TEMA (Single Source of Truth)
// ------------------------------------------------------------
// Menambahkan tema baru = cukup 3 langkah:
//   1. Tambah entri di THEME_REGISTRY di bawah (id, label, emoji,
//      warna default, dan gaya bawaan 'standard' | 'jemuran')
//   2. Kalau butuh CSS variable khusus, tambah blok [data-theme="..."]
//      di src/app/globals.css
//   3. Selesai — halaman guest (/e/...), display (/display/...),
//      dropdown admin, validasi API, dan script anti-flash otomatis
//      mengikuti daftar ini. Tidak perlu edit file lain!
// ============================================================

export const DEFAULT_THEME_ID = 'elegant';

export const THEME_REGISTRY = {
  elegant: {
    id: 'elegant',
    label: 'Elegant',
    emoji: '✨',
    style: 'standard', // pakai layout kartu standar (GuestView/DisplayView)
    colors: { bgMain: '#FAF7F2', accent: '#B76E79', accent2: '#7C8C6F' },
  },
  modern: {
    id: 'modern',
    label: 'Modern',
    emoji: '🖤',
    style: 'standard',
    colors: { bgMain: '#0F172A', accent: '#3B82F6', accent2: '#10B981' },
  },
  jemuran: {
    id: 'jemuran',
    label: 'Jemuran',
    emoji: '👕',
    style: 'jemuran', // layout khusus: tali + jepitan polaroid (JemuranLayout)
    colors: { bgMain: '#FEF3C7', accent: '#D97706', accent2: '#B45309' },
  },
};

// Daftar tema siap pakai untuk <select> / validasi API
export const THEME_LIST = Object.values(THEME_REGISTRY);
export const VALID_THEMES = Object.keys(THEME_REGISTRY);

export function isValidTheme(id) {
  return Object.prototype.hasOwnProperty.call(THEME_REGISTRY, id);
}

// Aman untuk nilai NULL/lama dari database → selalu kembalikan id valid
export function resolveTheme(id) {
  return isValidTheme(id) ? id : DEFAULT_THEME_ID;
}

export function getTheme(id) {
  return THEME_REGISTRY[resolveTheme(id)];
}
