export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const baseUrl = url.origin;

  try {
    // 1. Ambil data dari series.json
    const seriesRes = await fetch(`${baseUrl}/series.json`);
    if (!seriesRes.ok) throw new Error("Gagal memuat series.json");
    
    const books = await seriesRes.json();

    let rss = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0">
    <channel>
      <title>Dramabox Unofficial Updates</title>
      <link>${baseUrl}</link>
      <description>Nonton drama pendek sub Indo gratis</description>
      <language>id</language>`;

    // Ambil 20 drama teratas dari JSON
    const latestBooks = books.slice(0, 20);

    if (Array.isArray(latestBooks)) {
        latestBooks.forEach(item => {
          const bookId = item.id || item.source_id;
          // Format URL Baru: /player/ID-1
          const link = `${baseUrl}/player/${bookId}-1`;
          const thumb = item.cover_path || item.cover || '';
          
          rss += `
          <item>
            <title><![CDATA[${item.title}]]></title>
            <link>${link}</link>
            <guid isPermaLink="true">${link}</guid>
            <description><![CDATA[
              <img src="${thumb}" style="width:100px; object-fit:cover;" /><br/>
              ${item.description ? item.description.substring(0, 150) + '...' : 'Nonton sekarang...'}
            ]]></description>
            <pubDate>${new Date().toUTCString()}</pubDate>
          </item>`;
        });
    }

    rss += `</channel></rss>`;

    return new Response(rss, { headers: { "Content-Type": "application/xml" } });

  } catch (e) {
    return new Response(`Error generating RSS: ${e.message}`, { status: 500 });
  }
}
