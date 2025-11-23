export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const baseUrl = url.origin;

  try {
    // 1. Ambil data langsung dari series.json agar sinkron dengan Homepage
    // Ganti URL ini jika series.json ada di tempat lain, tapi defaultnya di root public
    const seriesRes = await fetch(`${baseUrl}/series.json`);
    
    if (!seriesRes.ok) {
      // Fallback jika fetch gagal (misal saat build lokal tanpa server berjalan)
      return new Response("Gagal memuat data series.json", { status: 500 });
    }
    
    const books = await seriesRes.json();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // A. Halaman Utama
    xml += `
      <url>
        <loc>${baseUrl}/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
      </url>`;

    // B. Halaman Player (Looping dari series.json)
    // Format Baru: /player/ID-EPISODE
    if (Array.isArray(books)) {
        books.forEach(book => {
          // Gunakan ID dari JSON. Default episode ke 1.
          const bookId = book.id || book.source_id;
          const playerUrl = `${baseUrl}/player/${bookId}-1`;
          
          // Simulasi lastmod (karena json statis tidak punya tanggal update real)
          const today = new Date().toISOString();

          xml += `
          <url>
            <loc>${playerUrl}</loc>
            <lastmod>${today}</lastmod>
            <changefreq>weekly</changefreq>
            <priority>0.8</priority>
          </url>`;
        });
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: { "Content-Type": "application/xml" }
    });

  } catch (e) {
    return new Response(`Error generating sitemap: ${e.message}`, { status: 500 });
  }
}
