// ============================================================================
// 1. KONFIGURASI KREDENSIAL & KUNCI
// ============================================================================

// Private Key RSA (Wajib untuk Signature agar request tidak ditolak server)
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

// Data Manual hasil Sniffing (JANGAN DIUBAH KECUALI TOKEN EXPIRED)
const MANUAL_TOKEN = "ZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnlaV2RwYzNSbGNsUjVjR1VpT2lKVVJVMVFJaXdpZFhObGNrbGtJam96TXpZd09EUXdOVFo5LkFLMWw0d01Ud00xVndOTHBOeUlOcmtHN3dmb0czaGROMEgxNWVPZV9KaHc=";
const MANUAL_DEVICE_ID = "ee9d23ac-0596-4f3e-8279-b652c9c2b7f0";
const MANUAL_ANDROID_ID = "ffffffff9b5bfe16000000000";
const MANUAL_USER_ID = "336084056";
const APP_VERSION = "470";

// ============================================================================
// 2. MAIN HANDLER (REQUEST ROUTER)
// ============================================================================

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const bookId = url.searchParams.get("bookId");

    // --- DEBUGGING ENDPOINTS (Untuk melihat struktur JSON Asli) ---

    // 1. Debug List: Lihat data mentah daftar drama
    // Akses: /api/data?type=debug_list
    if (type === "debug_list") {
       const payload = {
        isNeedRank: 1,
        index: 0,
        type: 0,
        channelId: 175
      };
      const data = await fetchFromDramaBox("/drama-box/he001/theater", payload, env);
      return jsonResponse(data, "DEBUG-LIST-RAW");
    }

    // 2. Debug Detail: Lihat data mentah detail satu drama
    // Akses: /api/data?type=detail&bookId=12345
    if (type === "detail" && bookId) {
       const payload = {
        bookId: bookId,
        needRecommend: false, 
        from: "book_album"
      };
      const data = await fetchFromDramaBox("/drama-box/chapterv2/detail", payload, env);
      return jsonResponse(data, "DEBUG-DETAIL-RAW");
    }

    // --- APPLICATION ENDPOINTS (Untuk Frontend HTML) ---

    // A. LIST DRAMA (Home Page)
    if (type === "list") {
      const payload = { 
          isNeedRank: 1, 
          index: 0, 
          type: 0, 
          channelId: 175 
      };
      const data = await fetchFromDramaBox("/drama-box/he001/theater", payload, env);
      return jsonResponse(data, "LIVE-API");
    }

    // B. CHAPTER & VIDEO LINKS (Player & Episode Grid)
    if (type === "chapter" && bookId) {
      const cacheKey = `chapter_list_${bookId}`;

      // 1. Cek Cache (KV) - Tercepat
      if (env.DRAMABOX_CACHE) {
        const cachedKV = await env.DRAMABOX_CACHE.get(cacheKey);
        if (cachedKV) return jsonResponse(JSON.parse(cachedKV), "KV-CACHE");
      }

      // 2. Cek Database (D1) - Cadangan Permanen
      if (env.DB) {
        const dbResult = await env.DB.prepare(
            "SELECT * FROM chapters WHERE book_id = ? ORDER BY episode_number ASC"
        ).bind(bookId).all();

        if (dbResult.results && dbResult.results.length > 0) {
          // Format ulang agar mirip struktur API asli biar frontend gak error
          const formattedData = { 
            data: { chapterList: dbResult.results.map(row => ({
                chapterId: row.chapter_id, 
                chapterName: row.title,
                cdnList: [{ videoPathList: [{ videoPath: row.video_url, isDefault: 1 }] }]
            }))} 
          };
          
          // Simpan balik ke KV biar request selanjutnya ngebut
          if (env.DRAMABOX_CACHE) {
            context.waitUntil(env.DRAMABOX_CACHE.put(cacheKey, JSON.stringify(formattedData), { expirationTtl: 14400 }));
          }
          return jsonResponse(formattedData, "D1-DATABASE");
        }
      }

      // 3. Fetch API Asli (Jika data tidak ada di Cache/DB)
      const payload = {
          boundaryIndex: 0, comingPlaySectionId: -1, index: 1,
          currencyPlaySource: "discover_new_rec_new", needEndRecommend: 0,
          currencyPlaySourceName: "", preLoad: false, rid: "",
          pullCid: "", loadDirection: 0, startUpKey: "", bookId
      };

      const apiData = await fetchFromDramaBox("/drama-box/chapterv2/batch/load", payload, env);

      // Jika berhasil, simpan ke D1 dan KV (Background Process)
      if (apiData?.data?.chapterList) {
        if (env.DB) context.waitUntil(saveToD1(env.DB, bookId, apiData));
        if (env.DRAMABOX_CACHE) context.waitUntil(env.DRAMABOX_CACHE.put(cacheKey, JSON.stringify(apiData), { expirationTtl: 14400 }));
      }

      return jsonResponse(apiData, "UPSTREAM-API");
    }

    return new Response("Invalid Request. Gunakan ?type=list atau ?type=chapter&bookId=...", { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ 
        error: "Internal Server Error", 
        message: err.message, 
        stack: err.stack 
    }, null, 2), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}


// ============================================================================
// 3. HELPER FUNCTIONS (CORE LOGIC)
// ============================================================================

// -- Fungsi Utama: Request ke API DramaBox dengan Signature --
async function fetchFromDramaBox(endpoint, payload, env) {
  // Data manual
  const token = MANUAL_TOKEN;
  const deviceId = MANUAL_DEVICE_ID;
  const androidId = MANUAL_ANDROID_ID; 
  
  // Buat Signature RSA
  const signature = await createSignature(payload, token, deviceId, androidId);
  
  // Headers persis seperti hasil sniffing Packet Capture
  const headers = {
    "Host": "sapi.dramaboxdb.com",
    "Tn": `Bearer ${token}`,
    "Version": APP_VERSION,
    "Package-Name": "com.storymatrix.drama",
    "Device-Id": deviceId,
    "Userid": MANUAL_USER_ID,
    "Android-Id": androidId, 
    "Content-Type": "application/json; charset=UTF-8",
    "User-Agent": "okhttp/4.10.0",
    "sn": signature, 
    "Language": "in",
    "Current-Language": "in",
    "Time-Zone": "+0700",
    "Brand": "Xiaomi",
    "Md": "Redmi Note 8", 
    "Mf": "XIAOMI",
    "Apn": "1",
    "P": "48",
    "Ov": "9",
    "Cid": "DAUAF1064291"
  };

  const url = `https://sapi.dramaboxdb.com${endpoint}`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Dramabox API Error: ${res.status} - ${txt}`);
  }
  return await res.json();
}

// -- Fungsi: Membuat RSA Signature --
async function createSignature(payload, token, deviceId, androidId) {
    const bodyJson = JSON.stringify(payload); 
    // Rumus: JSON Payload + DeviceID + AndroidID + "Bearer " + Token
    const toSignString = bodyJson + deviceId + androidId + "Bearer " + token;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(toSignString);
    
    const key = await importPrivateKey(PRIVATE_KEY_PEM);
    const signatureBuffer = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, data);
    
    return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
}

// -- Fungsi: Import Private Key PEM ke Format WebCrypto --
function importPrivateKey(pem) {
  const binaryDerString = atob(pem.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\n/g, "").replace(/\s/g, ""));
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

// -- Fungsi: Simpan Data ke D1 Database --
async function saveToD1(db, bookId, data) {
    try {
        const chapters = data.data.chapterList;
        const now = Date.now();

        // 1. Simpan/Update Data Buku (Terakhir diakses kapan)
        await db.prepare(`INSERT OR REPLACE INTO books (book_id, updated_at) VALUES (?, ?)`).bind(bookId, now).run();

        // 2. Simpan Daftar Chapter
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO chapters (chapter_id, book_id, title, video_url, episode_number, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const batch = [];
        chapters.forEach((ch, index) => {
            // Cari link video terbaik
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
    } catch (e) {
        console.error("Error saving to D1:", e);
    }
}

// -- Fungsi: Format Response JSON --
function jsonResponse(data, source = "Unknown") {
  return new Response(JSON.stringify({ ...data, _source: source }), {
    headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
    }
  });
}
