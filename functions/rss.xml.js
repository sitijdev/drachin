export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);

  // Join tabel untuk dapat judul buku + judul episode
  const { results } = await env.DB.prepare(`
    SELECT c.title as ep_title, c.chapter_id, c.created_at, b.book_id 
    FROM chapters c
    JOIN books b ON c.book_id = b.book_id
    ORDER BY c.created_at DESC LIMIT 20
  `).all();

  let rss = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0">
  <channel>
    <title>Dramabox Updates</title>
    <link>${url.origin}</link>
    <description>Episode terbaru drama pendek</description>
    <language>id</language>`;

  if (results) {
      results.forEach(item => {
        rss += `
        <item>
          <title>${item.ep_title}</title>
          <link>${url.origin}/?drama=${item.book_id}</link>
          <guid isPermaLink="false">${item.chapter_id}</guid>
          <pubDate>${new Date(item.created_at).toUTCString()}</pubDate>
        </item>`;
      });
  }

  rss += `</channel></rss>`;

  return new Response(rss, { headers: { "Content-Type": "application/xml" } });
}
