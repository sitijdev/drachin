// ============================================================================
// 1. KONFIGURASI KREDENSIAL & KUNCI
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

// DATA MANUAL DARI HASIL SNIFFING (Pastikan ini valid/tidak expired)
const MANUAL_TOKEN = "ZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnlaV2RwYzNSbGNsUjVjR1VpT2lKVVJVMVFJaXdpZFhObGNrbGtJam96TXpZd09EUXdOVFo5LkFLMWw0d01Ud00xVndOTHBOeUlOcmtHN3dmb0czaGROMEgxNWVPZV9KaHc=";
const MANUAL_DEVICE_ID = "ee9d23ac-0596-4f3e-8279-b652c9c2b7f0";
const MANUAL_ANDROID_ID = "ffffffff9b5bfe16000000000";
const MANUAL_USER_ID = "336084056";
const APP_VERSION = "470";

// URL DATABASE SERIES ANDA (Raw GitHub)
// Tips: Gunakan jsdelivr agar lebih cepat dan tidak kena rate limit GitHub
const SERIES_DB_URL = "https://raw.githubusercontent.com/sitijdev/drachin/refs/heads/main/public/series.json";

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

    // --- A. SEARCH DRAMA ---
    if (type === "search" && keyword) {
      // 1. Cari di Database GitHub dulu (Lebih Akurat & Cepat)
      const localData = await fetchSeriesDB();
      const localResults = localData.filter(b => 
        b.title.toLowerCase().includes(keyword.toLowerCase())
      ).map(mapLocalBook);

      // 2. Cari di API Dramabox (Opsional / Pelengkap)
      const payload = {
        searchSource: "搜索按钮",
        pageNo: 1, pageSize: 20, from: "search_sug", keyword: keyword
      };
      const rawData = await fetchFromDramaBox("/drama-box/search/search", payload);
      const apiResults = (rawData.data?.searchList || []).map(item => ({
          id: item.bookId || item.id,
          title: item.bookName || item.title,
          cover: item.cover || item.bookCover,
          episodes: item.chapterCount || "?",
          desc: item.introduction || "Hasil pencarian",
          tags: item.tags || []
      }));

      // Gabungkan (Prioritas Local)
      const finalResults = [...localResults, ...apiResults];
      
      // Hapus duplikat ID
      const uniqueResults = finalResults.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);

      return jsonResponse({ sections: [{ title: `Hasil: "${keyword}"`, books: uniqueResults }] }, "SEARCH-HYBRID");
    }

    // --- B. LIST DRAMA (HOME) ---
    if (type === "list") {
      const combinedSections = [];

      // 1. Ambil Data "Series.json" dari GitHub (SUMBER UTAMA)
      const localData = await fetchSeriesDB();
      
      if (localData && localData.length > 0) {
          // Bagi menjadi beberapa kategori agar tidak bosan
          combinedSections.push({
              title: "🔥 Rekomendasi Spesial",
              books: localData.slice(0, 20).map(mapLocalBook)
          });
          
          if (localData.length > 20) {
             combinedSections.push({
                title: "📺 Koleksi Terpopuler",
                books: localData.slice(20, 60).map(mapLocalBook)
             });
          }
      }

      // 2. Ambil Data Live dari Dramabox (Sebagai Pelengkap)
      // Kita gunakan endpoint 'classify' agar dapat data acak baru
      const browsePayload = { 
          pageSize: 20, 
          typeList: [{"type":1,"value":""},{"type":5,"value":"2"}], 
          pageNo: 1, showLabels: false 
      };
      const browseData = await fetchFromDramaBox("/drama-box/home/classify", browsePayload);

      if (browseData.data?.classifyBookList?.records) {
          combinedSections.push({ 
              title: "🆕 Update Terbaru Server", 
              books: mapBooks(browseData.data.classifyBookList.records) 
          });
      }

      return jsonResponse({ sections: combinedSections }, "LIST-HYBRID");
    }

    // --- C. DETAIL & CHAPTERS (RAHASIA UNLOCKER) ---
    if (type === "chapter" && bookId) {
      const cacheKey = `unlock_v4_${bookId}`;

      // Cek Cache KV
      if (env.DRAMABOX_CACHE) {
        const cached = await env.DRAMABOX_CACHE.get(cacheKey);
        if (cached) return jsonResponse(JSON.parse(cached), "CACHE");
      }

      // 1. Ambil Daftar ID Chapter dulu (Pake batch/load biasa)
      const loadPayload = {
          boundaryIndex: 0, comingPlaySectionId: -1, index: 1,
          currencyPlaySource: "discover_new_rec_new", needEndRecommend: 0,
          currencyPlaySourceName: "", preLoad: false, rid: "",
          pullCid: "", loadDirection: 0, startUpKey: "", bookId: bookId
      };
      const loadData = await fetchFromDramaBox("/drama-box/chapterv2/batch/load", loadPayload);

      if (!loadData?.data?.chapterList) {
          return jsonResponse({ error: "Gagal memuat daftar episode." }, "ERROR-LOAD");
      }

      // 2. Kumpulkan semua ID Chapter
      const allChapterIds = loadData.data.chapterList.map(ch => ch.chapterId);

      // 3. LAKUKAN "BATCH DOWNLOAD" UNTUK MEMBUKA KUNCI (INI RAHASIANYA!)
      // Kita meminta server memberikan link download untuk SEMUA chapter sekaligus
      const unlockPayload = {
          bookId: bookId,
          chapterIdList: allChapterIds
      };
      
      const unlockData = await fetchFromDramaBox("/drama-box/chapterv2/batchDownload", unlockPayload);

      // 4. Mapping Hasil Unlock ke Format Kita
      // Kita gabungkan info dari 'loadData' (nama chapter) dengan 'unlockData' (link video sakti)
      
      const finalChapters = [];
      
      // Mapping bantuan: ID -> Nama
      const nameMap = {};
      loadData.data.chapterList.forEach(ch => {
          nameMap[ch.chapterId] = ch.chapterName;
      });

      // Ambil video dari hasil unlock (batchDownload)
      if (unlockData?.data?.chapterVoList) {
          unlockData.data.chapterVoList.forEach((ch, idx) => {
              // Cari kualitas terbaik (720p/HD) atau default
              const cdn = ch.cdnList?.find(c => c.isDefault === 1) || ch.cdnList?.[0];
              const vidUrl = cdn?.videoPathList?.find(v => v.quality === 720)?.videoPath ||
                             cdn?.videoPathList?.[0]?.videoPath;

              if (vidUrl) {
                  finalChapters.push({
                      index: idx + 1, // Urutan
                      title: nameMap[ch.chapterId] || `Episode ${idx+1}`,
                      url: vidUrl
                  });
              }
          });
      }

      // Sortir berdasarkan episode
      finalChapters.sort((a, b) => a.index - b.index);

      const resultData = { chapters: finalChapters };

      // Simpan Cache (Agar tidak nembak API terus)
      if (env.DRAMABOX_CACHE) {
          context.waitUntil(env.DRAMABOX_CACHE.put(cacheKey, JSON.stringify(resultData), { expirationTtl: 14400 })); // Cache 4 jam
      }

      return jsonResponse(resultData, "UNLOCK-SUCCESS");
    }

    return new Response("Invalid Request", { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

// ============================================================================
// 3. HELPER FUNCTIONS
// ============================================================================

// Fetch database JSON dari GitHub Anda
async function fetchSeriesDB() {
    try {
        const res = await fetch(SERIES_DB_URL);
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error("Gagal fetch GitHub:", e);
        return [];
    }
}

// Mapper untuk Data Local (GitHub) -> Format Frontend
function mapLocalBook(b) {
    return {
        id: b.source_id || b.id,
        title: b.title,
        cover: b.cover_path,
        episodes: "Full",
        desc: b.description,
        tags: ["Series Pilihan"]
    };
}

// Mapper untuk Data API Dramabox -> Format Frontend
function mapBooks(list) {
    return list.map(b => ({
        id: b.bookId,
        title: b.bookName,
        cover: b.coverWap || b.cover,
        episodes: b.chapterCount || "?",
        desc: b.introduction || "",
        tags: b.tags || []
    }));
}

async function fetchFromDramaBox(endpoint, payload) {
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
    "Language": "in", "Current-Language": "in", "Time-Zone": "+0700"
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

function jsonResponse(data, source = "Unknown") {
  return new Response(JSON.stringify({ ...data, _source: source }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
