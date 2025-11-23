export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);

  // Join tabel chapters dan books untuk info lengkap
  const { results } = await env.DB.prepare(`
    SELECT c.title as ep_title, c.chapter_id, c.created_at, c.video_url, b.book_id 
    FROM chapters c
    JOIN books b ON c.book_id = b.book_id
    ORDER BY c.created_at DESC LIMIT 20
  `).all();

  let rss = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0">
  <channel>
    <title>DramaBox Unofficial Feed</title>
    <link>${url.origin}</link>
    <description>Update episode terbaru yang baru saja diakses user.</description>
    <language>id</language>`;

  if (results) {
      results.forEach(item => {
        rss += `
        <item>
          <title>${item.ep_title}</title>
          <link>${url.origin}/?bookId=${item.book_id}</link>
          <guid isPermaLink="false">${item.chapter_id}</guid>
          <pubDate>${new Date(item.created_at).toUTCString()}</pubDate>
          <description>Tonton episode ini di ${url.origin}</description>
        </item>`;
      });
  }

  rss += `</channel></rss>`;

  return new Response(rss, {
    headers: { "Content-Type": "application/xml" }
  });
}
