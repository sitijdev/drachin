// ============================================================================
// 1. KONFIGURASI KREDEAL (PASTIKAN VALID)
// ============================================================================
const PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC9Q4Y5QX5j08Hr
nbY3irfKdkEllAU2OORnAjlXDyCzcm2Z6ZRrGvtTZUAMelfU5PWS6XGEm3d4kJEK
bXi4Crl8o2E/E3YJPk1lQD1d0JTdrvZleETN1ViHZFSQwS3L94Woh0E3TPebaEYq
88eExvKu1tDdjSoFjBbgMezySnas5Nc2xF28XhPuC8m15u+dectsrJl+ALGcTDX3
Lv3FURuwV/dN7WMEkgcseIKVMdJxzUB0PeSqCNftfxmdBV/U4yXFRxPhnSFSXCrk
j6uJjickiYq1pQ1aZfrQe1eLD3MB2hKq7crhMcA3kpggQlnmy1wRR4BAttmSU4fP
b/yF8D3hAgMBAAECggEBAJdru6p5RLZ3h/GLF2rud8bqv4piF51e/RWQyPFnMAGB
rkByiYT7bFI3cnvJMhYpLHRigqjWfUofV3thRDDym54lVLtTRZ91khRMxgwVwdRu
k8Fw7JNFenOwCJxbgdlq6iuAMuQclwll7qWUrm8DgMvzH93xf8o6X171cp4Sh0og
1Ra7E9GZ37dzBlX2aJBK8VBfctZntuDPx52e71nafqfbjXxZuEtpu92oJd6A9mWb
d0BZTk72ZHUmDcKcqjfcEH19SWOphMJFYkxU5FRoIEr3/zisyTO4Mt33ZmwELOrY
9PdlyAAyed7ZoH+hlTr7c025QROvb2LmqgRiUT56tMECgYEA+jH5m6iMRK6XjiBh
SUnlr3DzRybwlQrtIj5sZprWe2my5uYHG3jbViYIO7GtQvMTnDrBCxNhuM6dPrL0
cRnbsp/iBMXe3pyjT/aWveBkn4R+UpBsnbtDn28r1MZpCDtr5UNc0TPj4KFJvjnV
/e8oGoyYEroECqcw1LqNOGDiLhkCgYEAwaemNePYrXW+MVX/hatfLQ96tpxwf7yu
HdENZ2q5AFw73GJWYvC8VY+TcoKPAmeoCUMltI3TrS6K5Q/GoLd5K2BsoJrSxQNQ
Fd3ehWAtdOuPDvQ5rn/2fsvgvc3rOvJh7uNnwEZCI/45WQg+UFWref4PPc+ArNtp
9Xj2y7LndwkCgYARojIQeXmhYZjG6JtSugWZLuHGkwUDzChYcIPdW25gdluokG/R
zNvQn4+W/XfTryQjr7RpXm1VxCIrCBvYWNU2KrSYV4XUtL+B5ERNj6In6AOrOAif
uVITy5cQQQeoD+AT4YKKMBkQfO2gnZzqb8+ox130e+3K/mufoqJPZeyrCQKBgC2f
objwhQvYwYY+DIUharri+rYrBRYTDbJYnh/PNOaw1CmHwXJt5PEDcml3+NlIMn58
I1X2U/hpDrAIl3MlxpZBkVYFI8LmlOeR7ereTddN59ZOE4jY/OnCfqA480Jf+FKf
oMHby5lPO5OOLaAfjtae1FhrmpUe3EfIx9wVuhKBAoGBAPFzHKQZbGhkqmyPW2ct
TEIWLdUHyO37fm8dj1WjN4wjRAI4ohNiKQJRh3QE11E1PzBTl9lZVWT8QtEsSjnr
A/tpGr378fcUT7WGBgTmBRaAnv1P1n/Tp0TSvh5XpIhhMuxcitIgrhYMIG3GbP9J
NAarxO/qPW6Gi0xWaF7il7Or
-----END PRIVATE KEY-----`;

// DATA MANUAL (GANTI DENGAN HASIL SNIFFING TERBARU JIKA EXPIRED)
const MANUAL_TOKEN = "ZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnlaV2RwYzNSbGNsUjVjR1VpT2lKVVJVMVFJaXdpZFhObGNrbGtJam96TXpZd09EUXdOVFo5LkFLMWw0d01Ud00xVndOTHBOeUlOcmtHN3dmb0czaGROMEgxNWVPZV9KaHc=";
const MANUAL_DEVICE_ID = "ee9d23ac-0596-4f3e-8279-b652c9c2b7f0";
const MANUAL_ANDROID_ID = "ffffffff9b5bfe16000000000";
const MANUAL_USER_ID = "336084056";
const APP_VERSION = "470";

// ============================================================================
// 2. ROUTER HANDLER
// ============================================================================

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const bookId = url.searchParams.get("bookId");
    const keyword = url.searchParams.get("keyword");

    // --- A. SEARCH DRAMA (BARU!) ---
    if (type === "search" && keyword) {
      const payload = {
        searchSource: "搜索按钮",
        pageNo: 1,
        pageSize: 50,
        from: "search_sug",
        keyword: keyword
      };
      const rawData = await fetchFromDramaBox("/drama-box/search/search", payload);
      
      // Bersihkan data agar sesuai format frontend
      const results = (rawData.data?.searchList || []).map(item => ({
          id: item.bookId || item.id,
          title: item.bookName || item.title,
          cover: item.cover || item.bookCover,
          episodes: item.chapterCount || item.totalChapter || "?",
          desc: item.introduction || "Hasil pencarian",
          tags: item.tags || []
      }));

      return jsonResponse({ sections: [{ title: `Hasil: "${keyword}"`, books: results }] }, "SEARCH-API");
    }

    // --- B. LIST DRAMA (HOME) ---
    if (type === "list") {
      // 1. Data Featured
      const homePayload = { isNeedRank: 1, index: 0, type: 0, channelId: 175 };
      const homeData = await fetchFromDramaBox("/drama-box/he001/theater", homePayload);
      
      // 2. Data Browse (Lebih Banyak)
      const browsePayload = { 
          pageSize: 30, 
          typeList: [{"type":1,"value":""},{"type":2,"value":""},{"type":4,"value":""},{"type":4,"value":""},{"type":5,"value":"2"}], 
          pageNo: 1, 
          showLabels: false 
      };
      const browseData = await fetchFromDramaBox("/drama-box/home/classify", browsePayload);

      const combinedSections = [];

      // Proses Featured
      if (homeData.data?.columnVoList) {
          homeData.data.columnVoList.forEach(col => {
              if (col.bookList?.length > 0) {
                  combinedSections.push({ title: col.title, books: mapBooks(col.bookList) });
              }
          });
      }
      // Proses Browse
      if (browseData.data?.classifyBookList?.records) {
          combinedSections.push({ title: "Jelajahi Semua", books: mapBooks(browseData.data.classifyBookList.records) });
      }

      return jsonResponse({ sections: combinedSections }, "LIST-API");
    }

    // --- C. DETAIL & CHAPTERS (VIDEO) ---
    if (type === "chapter" && bookId) {
      const cacheKey = `ch_v3_${bookId}`;

      // Cek Cache
      if (env.DRAMABOX_CACHE) {
        const cached = await env.DRAMABOX_CACHE.get(cacheKey);
        if (cached) return jsonResponse(JSON.parse(cached), "CACHE");
      }

      // Cek DB D1
      if (env.DB) {
         const dbResult = await env.DB.prepare("SELECT * FROM chapters WHERE book_id = ? ORDER BY episode_number ASC").bind(bookId).all();
         if (dbResult.results?.length > 0) {
             const formatted = { chapters: dbResult.results.map(r => ({ index: r.episode_number, title: r.title, url: r.video_url })) };
             if (env.DRAMABOX_CACHE) context.waitUntil(env.DRAMABOX_CACHE.put(cacheKey, JSON.stringify(formatted), { expirationTtl: 14400 }));
             return jsonResponse(formatted, "DB-D1");
         }
      }

      // Fetch API (Gunakan batchDownload atau batch/load - coba batchDownload sesuai ref baru)
      const payload = {
          boundaryIndex: 0, comingPlaySectionId: -1, index: 1,
          currencyPlaySource: "discover_new_rec_new", needEndRecommend: 0,
          currencyPlaySourceName: "", preLoad: false, rid: "",
          pullCid: "", loadDirection: 0, startUpKey: "", bookId: bookId
      };
      const rawData = await fetchFromDramaBox("/drama-box/chapterv2/batch/load", payload);

      if (!rawData?.data?.chapterList) {
          return jsonResponse({ error: "Video terkunci atau tidak ditemukan." }, "ERROR");
      }

      const cleanChapters = {
          chapters: rawData.data.chapterList.map((ch, idx) => ({
              index: idx + 1,
              title: ch.chapterName,
              url: ch.cdnList?.find(c=>c.isDefault===1)?.videoPathList?.[0]?.videoPath || ch.cdnList?.[0]?.videoPathList?.[0]?.videoPath
          })).filter(c => c.url)
      };

      // Simpan Cache
      if (env.DB) context.waitUntil(saveToD1(env.DB, bookId, rawData));
      if (env.DRAMABOX_CACHE) context.waitUntil(env.DRAMABOX_CACHE.put(cacheKey, JSON.stringify(cleanChapters), { expirationTtl: 14400 }));

      return jsonResponse(cleanChapters, "UPSTREAM");
    }

    return new Response("Invalid Request", { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

// ============================================================================
// 3. HELPER FUNCTIONS
// ============================================================================

function mapBooks(list) {
    return list.map(b => ({
        id: b.bookId,
        title: b.bookName,
        cover: b.coverWap || b.cover || b.imagePath || "https://via.placeholder.com/200x300?text=No+Image",
        episodes: b.chapterCount || "?",
        desc: b.introduction || "Tidak ada deskripsi.",
        tags: b.tags || b.tagV3s?.map(t => t.tagName) || []
    }));
}

async function fetchFromDramaBox(endpoint, payload) {
  // SELF-SIGNING LOCAL (Lebih aman & mandiri daripada pakai API orang lain)
  const signature = await createSignature(payload, MANUAL_TOKEN, MANUAL_DEVICE_ID, MANUAL_ANDROID_ID);
  
  const headers = {
    "Host": "sapi.dramaboxdb.com",
    "Tn": `Bearer ${MANUAL_TOKEN}`,
    "Version": APP_VERSION,
    "Package-Name": "com.storymatrix.drama",
    "Device-Id": MANUAL_DEVICE_ID,
    "Userid": MANUAL_USER_ID,
    "Android-Id": MANUAL_ANDROID_ID, 
    "Content-Type": "application/json; charset=UTF-8",
    "User-Agent": "okhttp/4.10.0",
    "sn": signature, 
    "Language": "in", "Current-Language": "in", "Time-Zone": "+0700",
    "Brand": "Xiaomi", "Md": "Redmi Note 8", "Mf": "XIAOMI", "Apn": "1", "P": "48", "Ov": "9", "Cid": "DAUAF1064291"
  };

  const res = await fetch(`https://sapi.dramaboxdb.com${endpoint}`, {
    method: "POST", headers, body: JSON.stringify(payload)
  });

  if (!res.ok) {
      const txt = await res.text();
      return { error: true, status: res.status, message: txt };
  }
  return await res.json();
}

async function createSignature(payload, token, deviceId, androidId) {
    const bodyJson = JSON.stringify(payload); 
    const toSignString = bodyJson + deviceId + androidId + "Bearer " + token;
    const encoder = new TextEncoder();
    const data = encoder.encode(toSignString);
    const key = await importPrivateKey(PRIVATE_KEY_PEM);
    const signatureBuffer = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, data);
    return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
}

function importPrivateKey(pem) {
  const binaryDerString = atob(pem.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\n/g, "").replace(/\s/g, ""));
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) { binaryDer[i] = binaryDerString.charCodeAt(i); }
  return crypto.subtle.importKey("pkcs8", binaryDer.buffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

async function saveToD1(db, bookId, data) {
    try {
        const chapters = data.data.chapterList;
        const now = Date.now();
        await db.prepare(`INSERT OR REPLACE INTO books (book_id, updated_at) VALUES (?, ?)`).bind(bookId, now).run();
        const stmt = db.prepare(`INSERT OR IGNORE INTO chapters (chapter_id, book_id, title, video_url, episode_number, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
        const batch = [];
        chapters.forEach((ch, index) => {
            const vidUrl = ch.cdnList?.find(c => c.isDefault === 1)?.videoPathList?.[0]?.videoPath || ch.cdnList?.[0]?.videoPathList?.[0]?.videoPath;
            if(vidUrl) batch.push(stmt.bind(ch.chapterId, bookId, ch.chapterName, vidUrl, index + 1, now));
        });
        if(batch.length > 0) await db.batch(batch);
    } catch (e) { console.error("DB Error", e); }
}

function jsonResponse(data, source = "Unknown") {
  return new Response(JSON.stringify({ ...data, _source: source }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
}
