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

const MANUAL_TOKEN = "ZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnlaV2RwYzNSbGNsUjVjR1VpT2lKVVJVMVFJaXdpZFhObGNrbGtJam96TXpZd09EUXdOVFo5LkFLMWw0d01Ud00xVndOTHBOeUlOcmtHN3dmb0czaGROMEgxNWVPZV9KaHc=";
const MANUAL_DEVICE_ID = "ee9d23ac-0596-4f3e-8279-b652c9c2b7f0";
const MANUAL_ANDROID_ID = "ffffffff9b5bfe16000000000";
const MANUAL_USER_ID = "336084056";
const FAKE_APP_VERSION = "451"; 
const FAKE_VN_VERSION = "4.5.1";

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const bookId = url.searchParams.get("bookId");
    const keyword = url.searchParams.get("keyword");
    const SERIES_JSON_URL = `${url.origin}/series.json`;

    // --- A. SEARCH ---
    if (type === "search" && keyword) {
      const localData = await fetchSeriesDB(SERIES_JSON_URL);
      const localResults = localData.filter(b => 
        b.title.toLowerCase().includes(keyword.toLowerCase())
      ).map(mapLocalBook);
      return jsonResponse({ sections: [{ title: `Hasil: "${keyword}"`, books: localResults }] }, "SEARCH");
    }

    // --- B. LIST (HOME) ---
    if (type === "list") {
      const localData = await fetchSeriesDB(SERIES_JSON_URL);
      const combinedSections = [];
      
      if (localData.length > 0) {
          combinedSections.push({ title: "🔥 Pilihan Editor", books: localData.slice(0, 15).map(mapLocalBook) });
          if(localData.length > 15) combinedSections.push({ title: "📺 Rekomendasi Spesial", books: localData.slice(15, 35).map(mapLocalBook) });
          if(localData.length > 35) combinedSections.push({ title: "✨ Koleksi Populer", books: localData.slice(35, 100).map(mapLocalBook) });
      }
      return jsonResponse({ sections: combinedSections }, "LIST");
    }

    // --- C. DETAIL & CHAPTER (UNLOCKER SYSTEM) ---
    if (type === "chapter" && bookId) {
      const cacheKey = `unlock_wfc_${bookId}`;
      if (env.DRAMABOX_CACHE) {
        const cached = await env.DRAMABOX_CACHE.get(cacheKey);
        if (cached) return jsonResponse(JSON.parse(cached), "CACHE");
      }

      // 1. Ambil Data dari Webfic (Mirror yang lebih stabil)
      const webficRes = await fetch(`https://www.webfic.com/webfic/book/detail/v2?id=${bookId}&tlanguage=in`);
      if (!webficRes.ok) return jsonResponse({ error: "Gagal mengambil data Webfic" }, "ERR");
      const webficData = await webficRes.json();
      const chapterList = webficData.data?.chapterList || [];

      if (chapterList.length === 0) return jsonResponse({ error: "Chapter tidak ditemukan" }, "ERR");

      // 2. Ambil Link Video dari Dramabox (Batch Download)
      const allChapterIds = chapterList.map(ch => ch.id);
      const unlockData = await fetchFromDramaBox("/drama-box/chapterv2/batchDownload", {
          bookId: bookId,
          chapterIdList: allChapterIds
      });

      // 3. Mapping Video
      const videoMap = {};
      if (unlockData?.data?.chapterVoList) {
          unlockData.data.chapterVoList.forEach(ch => {
              const cdn = ch.cdnList?.find(c => c.isDefault === 1) || ch.cdnList?.[0];
              // Prioritas 720p > 540p > Default
              const vidObj = cdn?.videoPathList?.find(v => v.quality === 720) || 
                             cdn?.videoPathList?.find(v => v.quality === 540) || 
                             cdn?.videoPathList?.[0];
              if (vidObj?.videoPath) videoMap[ch.chapterId] = vidObj.videoPath;
          });
      }

      // 4. Susun Result
      const finalChapters = [];
      chapterList.forEach(ch => {
          const vidUrl = videoMap[ch.id] || ch.mp4; // Coba Dramabox dulu, kalau gagal pakai Webfic
          if (vidUrl) {
              finalChapters.push({
                  index: ch.index,
                  title: ch.name || `Episode ${ch.index}`,
                  url: vidUrl
              });
          }
      });

      if (finalChapters.length === 0) return jsonResponse({ error: "Video terkunci oleh server." }, "ERR");

      const result = { 
          title: webficData.data?.book?.bookName, 
          cover: webficData.data?.book?.cover,
          chapters: finalChapters 
      };

      // Cache 30 menit
      if (env.DRAMABOX_CACHE) context.waitUntil(env.DRAMABOX_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 1800 }));

      return jsonResponse(result, "SUCCESS");
    }

    return new Response("Invalid Request", { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// --- HELPER ---
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
        episodes: "Full",
        tags: ["Series"]
    };
}

async function fetchFromDramaBox(endpoint, payload) {
  const signature = await createSignature(payload);
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
    "Language": "in", "Current-Language": "in", "Time-Zone": "+0700"
  };
  
  const res = await fetch(`https://sapi.dramaboxdb.com${endpoint}`, {
    method: "POST", headers, body: JSON.stringify(payload)
  });
  if (!res.ok) return {};
  return await res.json();
}

async function createSignature(payload) {
    const bodyJson = JSON.stringify(payload); 
    const toSignString = bodyJson + MANUAL_DEVICE_ID + MANUAL_ANDROID_ID + "Bearer " + MANUAL_TOKEN;
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

function jsonResponse(data, source) {
  return new Response(JSON.stringify({ ...data, _source: source }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
