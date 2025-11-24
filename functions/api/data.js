// ============================================================================
// 1. KONFIGURASI PROXY & ENDPOINT
//    URL Proxy eksternal yang berfungsi
// ============================================================================

const EXTERNAL_PHP_PROXY_URL = "https://dramabox-api.d5studio.site/proxy.php"; 

const WEB_FIC_URL = "https://www.webfic.com";
const SERIES_JSON_PATH = "/series.json";
const TOKEN_KEY = "DBOX_AUTH_TOKEN_V2"; // Tetap digunakan untuk KV cache

// ============================================================================
// 2. FUNGSI UTAMA FETCH MELALUI PROXY EKSTERNAL
//    Fungsi ini meneruskan endpoint target dan payload ke proxy PHP.
// ============================================================================

/**
 * Mengirim request API Dramabox melalui proxy eksternal.
 * Asumsi: Proxy eksternal yang bertanggung jawab untuk otentikasi penuh.
 * @param {string} endpoint - Contoh: /drama-box/chapterv2/batchDownload
 * @param {object} payload - Body request ke API asli
 */
async function fetchFromDramaBox(endpoint, payload) {
    
    // Worker menjadi relay dengan meneruskan endpoint target melalui query param 'target'
    const proxyTargetUrl = `${EXTERNAL_PHP_PROXY_URL}?target=${encodeURIComponent(endpoint)}`;

    try {
        const res = await fetch(proxyTargetUrl, {
            method: "POST", 
            headers: { 
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`[PROXY ERROR] ${res.status}: ${errorText}`);
            throw new Error(`Proxy Error ${res.status}.`);
        }
        
        const json = await res.json();
        
        if (json.error || json.status === 'ERROR') {
             throw new Error(json.message || "Proxy mengembalikan error. Akses mungkin diblokir.");
        }
        
        return json;

    } catch (e) {
        // Mengembalikan struktur yang sama seperti error API sebelumnya
        return { error: true, message: e.message };
    }
}


// ============================================================================
// 3. HELPER & UTILITIES
// ============================================================================

function jsonResponse(data, source) {
  return new Response(JSON.stringify({ ...data, _source: source }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}

async function fetchSeriesDB(url) {
    try {
        const res = await fetch(url);
        if (res.ok) return await res.json();
        return [];
    } catch { return []; }
}

function mapLocalBook(b) {
    return {
        id: b.source_id || b.id,
        title: b.title,
        cover: b.cover_path,
        episodes: b.episodes || "Full",
        desc: b.description,
        tags: b.tags || ["Series"]
    };
}


// ============================================================================
// 4. MAIN WORKER HANDLER
// ============================================================================

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const bookId = url.searchParams.get("bookId");
  const keyword = url.searchParams.get("keyword");
  const SERIES_JSON_URL = `${url.origin}${SERIES_JSON_PATH}`;
  
  try {
    // --- B. LIST (HOME) ---
    if (type === "list") {
      const localData = await fetchSeriesDB(SERIES_JSON_URL);
      
      const combinedSections = [];
      if (localData.length > 0) {
          combinedSections.push({ title: "🔥 Pilihan Editor", books: localData.slice(0, 15).map(mapLocalBook) });
          if(localData.length > 15) combinedSections.push({ title: "📺 Rekomendasi Spesial", books: localData.slice(15, 35).map(mapLocalBook) });
      }
      return jsonResponse({ sections: combinedSections }, "LIST");
    }

    // --- A. SEARCH (Lokal) ---
    if (type === "search" && keyword) {
        const localData = await fetchSeriesDB(SERIES_JSON_URL);
        const localResults = localData.filter(b => 
            b.title.toLowerCase().includes(keyword.toLowerCase())
        ).map(mapLocalBook);
        
        return jsonResponse({ sections: [{ title: `Hasil: "${keyword}"`, books: localResults }] }, "SEARCH_LOCAL");
    }

    // --- C. DETAIL & CHAPTER (UNLOCKER via PROXY) ---
    if (type === "chapter" && bookId) {
      const cacheKey = `unlock_proxy_${bookId}`; 
      if (env.DRAMABOX_CACHE) {
        const cached = await env.DRAMABOX_CACHE.get(cacheKey, "json");
        if (cached) return jsonResponse(cached, "CACHE");
      }

      // 1. Ambil Metadata dari Webfic (Webfic tidak memerlukan proxy)
      const webficRes = await fetch(`${WEB_FIC_URL}/webfic/book/detail/v2?id=${bookId}&tlanguage=in`);
      if (!webficRes.ok) return jsonResponse({ error: "Gagal mengambil data drama (Webfic)" }, "ERR");
      
      const webficJson = await webficRes.json();
      const liveData = webficJson.data;
      const liveChapterList = liveData?.chapterList || [];

      if (liveChapterList.length === 0) return jsonResponse({ error: "Chapter tidak ditemukan" }, "ERR");

      // 2. UNLOCK VIDEO via Proxy
      const allChapterIds = liveChapterList.map(ch => ch.id);
      
      const unlockData = await fetchFromDramaBox("/drama-box/chapterv2/batchDownload", {
          bookId: bookId,
          chapterIdList: allChapterIds
      }); 

      if (unlockData.error) throw new Error(unlockData.message || "Gagal membuka video melalui proxy.");

      // 3. Mapping Video
      const videoMap = {};
      if (unlockData?.data?.chapterVoList) {
          unlockData.data.chapterVoList.forEach(ch => {
              const cdn = ch.cdnList?.find(c => c.isDefault === 1) || ch.cdnList?.[0];
              if (cdn && cdn.videoPathList) {
                  videoMap[ch.chapterId] = cdn.videoPathList.map(v => ({
                      q: v.quality,
                      url: v.videoPath
                  })).sort((a, b) => b.q - a.q); 
              }
          });
      }

      const finalChapters = [];
      liveChapterList.forEach(ch => {
          const sources = videoMap[ch.id];
          if (sources) {
              finalChapters.push({
                  index: ch.index,
                  title: ch.name || `Episode ${ch.index}`,
                  sources: sources
              });
          }
      });

      if (finalChapters.length === 0) return jsonResponse({ error: "Video tidak tersedia atau gagal di-unlock." }, "ERR");

      const result = {
          info: {
              id: liveData.book.bookId,
              title: liveData.book.bookName,
              cover: liveData.book.cover,
              desc: liveData.book.introduction,
              tags: liveData.book.tags || [],
              related: (liveData.recommends || []).map(b => ({
                  id: b.bookId, title: b.bookName, cover: b.cover, episodes: b.chapterCount
              })),
              totalEps: finalChapters.length
          },
          chapters: finalChapters
      };

      // Simpan hasil unlock ke KV
      if (env.DRAMABOX_CACHE) context.waitUntil(env.DRAMABOX_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 1800 }));

      return jsonResponse(result, "SUCCESS");
    }

    return new Response("Invalid Request", { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
