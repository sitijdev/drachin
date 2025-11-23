export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const baseUrl = url.origin;

  // Ambil 200 drama terakhir yang tersimpan di D1
  const { results } = await env.DB.prepare(
    "SELECT book_id, updated_at FROM books ORDER BY updated_at DESC LIMIT 200"
  ).all();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // Halaman Utama
  xml += `
    <url>
      <loc>${baseUrl}/</loc>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>`;

  // Halaman Drama Dinamis
  if (results) {
      results.forEach(book => {
        xml += `
        <url>
          <loc>${baseUrl}/?drama=${book.book_id}</loc>
          <lastmod>${new Date(book.updated_at).toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>`;
      });
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" }
  });
}
