// ============================================================================
// 1. KONFIGURASI
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

// KREDENSIAL SNIFFING (VALID)
const MANUAL_TOKEN = "ZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnlaV2RwYzNSbGNsUjVjR1VpT2lKVVJVMVFJaXdpZFhObGNrbGtJam96TXpZd09EUXdOVFo5LkFLMWw0d01Ud00xVndOTHBOeUlOcmtHN3dmb0czaGROMEgxNWVPZV9KaHc=";
const MANUAL_DEVICE_ID = "ee9d23ac-0596-4f3e-8279-b652c9c2b7f0";
const MANUAL_ANDROID_ID = "ffffffff9b5bfe16000000000";
const MANUAL_USER_ID = "336084056";

// VERSI PALSU (Agar cocok dengan Private Key lama)
const FAKE_APP_VERSION = "451"; 
const FAKE_VN_VERSION = "4.5.1";

// DATABASE SERIES (URL RAW GITHUB ANDA)
const SERIES_JSON_URL = "https://raw.githubusercontent.com/sitijdev/drachin/refs/heads/main/public/series.json?token=GHSAT0AAAAAADP3E57S7AIMUY5DBDUCHPYI2JDEMCA";

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

    // --- A. LIST DRAMA (HOME) ---
    if (type === "list") {
      const combinedSections = [];
      const localData = await fetchSeriesDB();
      
      if (localData && localData.length > 0) {
          combinedSections.push({
              title: "🔥 Pilihan Editor (Full Unlocked)",
              books: localData.slice(0, 15).map(mapLocalBook)
          });
          
          if(localData.length > 15) {
              combinedSections.push({
                  title: "📺 Rekomendasi Spesial",
                  books: localData.slice(15, 35).map(mapLocalBook)
              });
          }
          if(localData.length > 35) {
              combinedSections.push({
                  title: "✨ Koleksi Populer",
                  books: localData.slice(35, 100).map(mapLocalBook)
              });
          }
      } else {
          // Fallback ke API live jika GitHub down
          const homePayload = { isNeedRank: 1, index: 0, type: 0, channelId: 175 };
          const homeData = await fetchFromDramaBox("/drama-box/he001/theater", homePayload);
          if (homeData.data?.columnVoList) {
            homeData.data.columnVoList.forEach(col => {
                if (col.bookList?.length > 0) {
                    combinedSections.push({ title: col.title, books: mapBooks(col.bookList) });
                }
            });
          }
      }
      return jsonResponse({ sections: combinedSections }, "LIST");
    }

    // --- B. SEARCH ---
    if (type === "search" && keyword) {
        const localData = await fetchSeriesDB();
        const localResults = localData.filter(b => 
            b.title.toLowerCase().includes(keyword.toLowerCase())
        ).map(mapLocalBook);
        return jsonResponse({ sections: [{ title: `Hasil: "${keyword}"`, books: localResults }] }, "SEARCH");
    }

    // --- C. DETAIL & CHAPTER (UNLOCKER + DOWNLOAD TRICK) ---
    if (type === "chapter" && bookId) {
      const cacheKey = `unlock_v8_${bookId}`;

      // 1. Cek Cache KV
      if (env.DRAMABOX_CACHE) {
        const cached = await env.DRAMABOX_CACHE.get(cacheKey);
        if (cached) return jsonResponse(JSON.parse(cached), "KV-CACHE");
      }

      // 2. Ambil Info Dasar Chapter (Load)
      const loadPayload = {
          boundaryIndex: 0, comingPlaySectionId: -1, index: 1,
          currencyPlaySource: "discover_new_rec_new", needEndRecommend: 0,
          currencyPlaySourceName: "", preLoad: false, rid: "",
          pullCid: "", loadDirection: 0, startUpKey: "", bookId: bookId
      };
      const loadData = await fetchFromDramaBox("/drama-box/chapterv2/batch/load", loadPayload);
      
      if (!loadData?.data?.chapterList) {
          // Coba Fallback ke Webfic jika Dramabox gagal
          return jsonResponse({ error: "Gagal memuat chapter dari server." }, "ERROR-LOAD");
      }

      // 3. TRIK: BATCH DOWNLOAD (Untuk Buka Kunci)
      const allChapterIds = loadData.data.chapterList.map(ch => ch.chapterId);
      const unlockPayload = { bookId: bookId, chapterIdList: allChapterIds };
      const unlockData = await fetchFromDramaBox("/drama-box/chapterv2/batchDownload", unlockPayload);

      // 4. Gabungkan Data
      const finalChapters = [];
      const nameMap = {};
      
      // Buat peta nama
      loadData.data.chapterList.forEach(ch => nameMap[ch.chapterId] = ch.chapterName);

      // Ambil video dari hasil UNLOCK (Prioritas) atau LOAD (Cadangan)
      const sourceList = unlockData?.data?.chapterVoList || loadData.data.chapterList;

      sourceList.forEach((ch, idx) => {
          // Cari kualitas terbaik
          const cdn = ch.cdnList?.find(c => c.isDefault === 1) || ch.cdnList?.[0];
          const vidObj = cdn?.videoPathList?.find(v => v.quality === 720) || 
                         cdn?.videoPathList?.find(v => v.quality === 540) || 
                         cdn?.videoPathList?.[0];
          
          if (vidObj?.videoPath) {
              finalChapters.push({
                  index: idx + 1,
                  title: nameMap[ch.chapterId] || ch.chapterName || `Episode ${idx+1}`,
                  url: vidObj.videoPath
              });
          }
      });

      // Sortir urutan
      finalChapters.sort((a, b) => a.index - b.index);
      
      const result = { chapters: finalChapters };

      // Simpan Cache (30 Menit saja agar link tidak expired)
      if (env.DRAMABOX_CACHE && finalChapters.length > 0) {
          context.waitUntil(env.DRAMABOX_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 1800 }));
      }

      return jsonResponse(result, "UNLOCK-SUCCESS");
    }

    return new Response("Invalid Request", { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

// --- HELPER FUNCTIONS ---

async function fetchSeriesDB() {
    try {
        const res = await fetch(SERIES_JSON_URL);
        if (res.ok) return await res.json();
        return [];
    } catch { return []; }
}

function mapLocalBook(b) {
    return {
        id: b.source_id || b.id,
        title: b.title,
        cover: b.cover_path,
        episodes: "Full",
        desc: b.description,
        tags: ["Series"]
    };
}

function mapBooks(list) {
    return list.map(b => ({
        id: b.bookId,
        title: b.bookName,
        cover: b.coverWap || b.cover,
        episodes: b.chapterCount,
        desc: b.introduction,
        tags: []
    }));
}

async function fetchFromDramaBox(endpoint, payload) {
  const signature = await createSignature(payload, MANUAL_TOKEN, MANUAL_DEVICE_ID, MANUAL_ANDROID_ID);
  const headers = {
    "Host": "sapi.dramaboxdb.com",
    "Tn": `Bearer ${MANUAL_TOKEN}`,
    "Version": FAKE_APP_VERSION,
    "Vn": FAKE_VN_VERSION,
    "Package-Name": "com.storymatrix.drama",
    "Device-Id": MANUAL_DEVICE_ID,
    "Userid": MANUAL_USER_ID,
    "Android-Id": MANUAL_ANDROID_ID, 
    "Content-Type": "application/json; charset=UTF-8",
    "User-Agent": "okhttp/4.10.0",
    "sn": signature, 
    "Language": "in", 
    "Current-Language": "in", 
    "Time-Zone": "+0700"
  };

  const res = await fetch(`https://sapi.dramaboxdb.com${endpoint}`, {
    method: "POST", headers, body: JSON.stringify(payload)
  });
  
  if(!res.ok) return {};
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

function jsonResponse(data, source = "Unknown") {
  return new Response(JSON.stringify({ ...data, _source: source }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
