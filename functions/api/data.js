export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const bookId = url.searchParams.get("bookId");

  // --- A. Handle Request List Drama ---
  if (type === "list") {
    // Mengambil daftar drama (adaptasi dari api/drama.js)
    const data = await fetchFromDramaBox("/drama-box/he001/theater", {
      isNeedRank: 1, index: 0, type: 0, channelId: 175
    }, env);
    return jsonResponse(data);
  }

  // --- B. Handle Request Chapter (Tiered Storage) ---
  if (type === "chapter" && bookId) {
    const cacheKey = `chapter_list_${bookId}`;

    // 1. Cek KV (Layer Tercepat)
    const cachedKV = await env.DRAMABOX_CACHE.get(cacheKey);
    if (cachedKV) {
      return jsonResponse(JSON.parse(cachedKV), "KV-Cache");
    }

    // 2. Cek D1 (Layer Database Permanen)
    const dbResult = await env.DB.prepare(
      "SELECT * FROM chapters WHERE book_id = ? ORDER BY episode_number ASC"
    ).bind(bookId).all();

    if (dbResult.results && dbResult.results.length > 0) {
      // Format ulang agar mirip struktur API asli
      const formattedData = { 
        data: { chapterList: dbResult.results.map(row => ({
            chapterId: row.chapter_id,
            chapterName: row.title,
            // Kita rekonstruksi struktur video path agar frontend tetap jalan
            cdnList: [{ videoPathList: [{ videoPath: row.video_url, isDefault: 1 }] }]
        }))} 
      };
      
      // Refresh KV agar request berikutnya super cepat
      context.waitUntil(env.DRAMABOX_CACHE.put(cacheKey, JSON.stringify(formattedData), { expirationTtl: 14400 })); // 4 jam
      
      return jsonResponse(formattedData, "D1-Database");
    }

    // 3. Fetch Upstream (Sumber Asli DramaBox)
    // Menggunakan payload yang sama seperti di api/chapter.js
    const payload = {
        boundaryIndex: 0, comingPlaySectionId: -1, index: 1,
        currencyPlaySource: "discover_new_rec_new", needEndRecommend: 0,
        currencyPlaySourceName: "", preLoad: false, rid: "",
        pullCid: "", loadDirection: 0, startUpKey: "", bookId
    };

    const apiData = await fetchFromDramaBox("/drama-box/chapterv2/batch/load", payload, env);

    if (apiData?.data?.chapterList) {
      // Simpan ke D1 (Background Process)
      context.waitUntil(saveToD1(env.DB, bookId, apiData));
      
      // Simpan ke KV (Background Process)
      context.waitUntil(env.DRAMABOX_CACHE.put(cacheKey, JSON.stringify(apiData), { expirationTtl: 14400 }));
    }

    return jsonResponse(apiData, "Upstream-API");
  }

  return new Response("Invalid Parameters", { status: 400 });
}

// --- HELPER FUNCTIONS ---

// Simpan data ke D1 Database
async function saveToD1(db, bookId, data) {
    const chapters = data.data.chapterList;
    const now = Date.now();

    // Insert/Update Buku (Metadata sederhana)
    await db.prepare(`
        INSERT OR REPLACE INTO books (book_id, updated_at) VALUES (?, ?)
    `).bind(bookId, now).run();

    // Batch Insert Chapters
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO chapters (chapter_id, book_id, title, video_url, episode_number, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const batch = [];
    chapters.forEach((ch, index) => {
        // Ambil video path (logika dari api/chapter.js)
        const cdn = ch.cdnList?.find(c => c.isDefault === 1) || ch.cdnList?.[0];
        const vidUrl = cdn?.videoPathList?.find(v => v.isDefault === 1)?.videoPath;
        
        if(vidUrl) {
            batch.push(stmt.bind(
                ch.chapterId, 
                bookId, 
                ch.chapterName, 
                vidUrl, 
                index + 1, 
                now
            ));
        }
    });

    if(batch.length > 0) await db.batch(batch);
}

// Helper Request ke API DramaBox
async function fetchFromDramaBox(endpoint, payload, env) {
  const headers = await getHeaders(env);
  // URL dari api/client.js
  const url = `https://sapi.dramaboxdb.com${endpoint}`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload)
  });

  return await res.json();
}

// Helper Generate Headers & Token (Logic dari api/dramaboxHelper.js)
async function getHeaders(env) {
  // 1. Coba ambil token dari KV
  let tokenData = await env.DRAMABOX_CACHE.get("app_token", { type: "json" });

  if (!tokenData) {
    // 2. Jika tidak ada, request baru ke helper API
    const tokenRes = await fetch("https://dramabox-api.vercel.app/api/token");
    const json = await tokenRes.json();
    
    if (!json.data || !json.data.token) throw new Error("Gagal ambil token");

    tokenData = {
      token: json.data.token,
      deviceId: json.data.deviceId
    };

    // Simpan di KV selama 50 menit
    await env.DRAMABOX_CACHE.put("app_token", JSON.stringify(tokenData), { expirationTtl: 3000 });
  }

  // Headers sesuai api/dramaboxHelper.js
  return {
    "Host": "sapi.dramaboxdb.com",
    "Tn": `Bearer ${tokenData.token}`,
    "Version": "430",
    "Vn": "4.3.0",
    "Userid": "289167621",
    "Cid": "DALPF1057826",
    "Package-Name": "com.storymatrix.drama",
    "Device-Id": `${tokenData.deviceId}`,
    "Language": "in",
    "Content-Type": "application/json; charset=UTF-8",
    "User-Agent": "okhttp/4.10.0",
  };
}

function jsonResponse(data, source = "Unknown") {
  return new Response(JSON.stringify({ ...data, _source: source }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
