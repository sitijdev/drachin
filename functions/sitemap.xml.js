export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const baseUrl = url.origin;

  // Ambil 100 buku yang paling baru diupdate/diakses
  const { results } = await env.DB.prepare(
    "SELECT book_id, updated_at FROM books ORDER BY updated_at DESC LIMIT 100"
  ).all();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // Halaman Home
  xml += `
    <url>
      <loc>${baseUrl}/</loc>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>`;

  // Halaman Dinamis per Buku
  if (results) {
      results.forEach(book => {
        xml += `
        <url>
          <loc>${baseUrl}/?bookId=${book.book_id}</loc>
          <lastmod>${new Date(book.updated_at).toISOString()}</lastmod>
          <changefreq>daily</changefreq>
          <priority>0.8</priority>
        </url>`;
      });
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" }
  });
}
