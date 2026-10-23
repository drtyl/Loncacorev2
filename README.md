# Lonca Core · Versiyon 0.9 (3D karakterler, sesler, projeler, Atölye paketleri, Stüdyo)

Lonca bir **asistan uygulamasıdır**: tepeden baktığın 3D bir evde 9 karakter yaşar. Sen eve yukarıdan bakan "3. göz"sün; kendi figürün ve odan yok. Uygulama bir kabuktur: yeni özellikler **Atölye**'de üretilip odalara yerleşir.

## v0.9'a kadar gelenler (tek pakette)

### 3D karakterler (VRM)
- 9 karakterin Avatar Atölyesi'nde hazırlanan modelleri uygulamayla gelir: `assets/www/modeller/<id>.vrm` (her biri ~4 MB; dokular 512 px, biçim hedefleri seyrek yazıldı).
- Açılışta önce hafif bedenler görünür, modeller birer birer yüklenir. Ayarlar → "Karakter bedenleri: Hafif beden" ile telefon zorlanırsa geri dönülür.
- Gardırop → "3D kıyafetler": Avatar Atölyesi'nden dışa aktardığın .vrm kıyafetini karakterin gardırobuna eklersin; karakter sabah kendisi seçer. Kimlik (beden, yüz, renkler) sadece sende.

### Sen yokken ve projeler (v0.6)
- Karakterler sen yokken (8 dk dokunmazsan ya da uygulama arkadayken) gerçek bir sebep varsa kısa konuşur: yeni kitap/not/resim/video/alarm, yaşadıkları olaylar, sabah/akşam, aktif projeler. Genel sohbette "Sen yokken · konu" başlığıyla durur; üst şeritte rozet, telefonda tek bildirim.
- Günlük sınır: Ayarlar → "Sen yokken konuşma" (az 6 · normal 12 · canlı 40).
- Projeler (Çalışma odası simgesi): küçük iş birlikleri onaysız açılır (bildirim gelir, katılabilirsin); büyük projeler (yapılacaklarına madde eklemek, Atölye'de özellik üretmek) senin onayınla başlar. Proje sohbeti: sohbet türü → proje.

### Sesler (v0.7)
- Telefondaki Türkçe sesler listelenir, cinsiyete göre otomatik dağıtılır; aynı sesi paylaşanlar perde/hızla ayrışır. Nexsus metalik robot efektiyle konuşur (ses dosyaya yazılıp efektle çalınır).
- Karakterler → karakter → Ses: dinleyip değiştir. Ayarlar → "Sesleri yeniden dağıt".

### Kişilik ve Atölye (v0.8)
- Kişilik kartı: huy, konuşma tarzı, eleştiri tarzı (dobra/dengeli/yumuşak), uzmanlık, sevdikleri, sevmedikleri (sen düzenlersin) ve ilgi puanları 0–10 (yaşadıkça değişir, boş vakit seçimlerini belirler).
- Atölye üretim akışı: iste → uzman karakter üretir (istek metnine göre önerilir) → önizle → onayla → odasına yerleşir. Her özellik bir paket: `/ozellikler/<id>/manifest.json` + `v<n>.html`. Ev Düzeni → ⋯ → "Atölye'de geliştir" yeni sürüm üretir; "Sürümler" ile eski sürüme dönülür.
- Sayfaların Lonca köprüsü: `Lonca.kaydet/oku`, `Lonca.ozet(metin)` (karakterler bu özeti bilir), izinle `Lonca.bildirim`, `Lonca.takvim`, `Lonca.konus`, `await Lonca.sor(soru)`.

### Stüdyo (v0.9)
- Film Odası'ndaki kamera simgesi. Fikrini yaz → karakterler senaryo yazar (ya da kendin yaz) → düzenle → "Çek".
- Çekimde oyuncular sahnenin odasında yerini alır, kamera geniş · yakın · ikili planlar arasında geçer, konuşan oynar (hareketler: dans, alkış, el sallama, zıplama, eğilme, düşünme), altyazı ve müzik (4 tarz) vardır.
- Video `/videolar/` içine webm olarak kaydedilir; "Telefona kaydet" İndirilenler/Lonca'ya kopyalar. Karakter sesleri videoya giremez ("Prova" sesli oynatır).

### Yerli (Android) taraf
- `MainActivity.kt`: ses listesi ve sesle konuşma, robot efekti, bildirim kanalı ve izin (Android 13+), takvim ekleme ekranı, dosyayı İndirilenler'e kaydetme, uygulamayla gelen dosyaları okuma. Manifest'e `POST_NOTIFICATIONS` eklendi. Sürüm 0.9 (versionCode 9).

## Ev (v0.5)

- Üst sıra: Nova, Orion, Atlas, Mira, Luna'nın odaları; önlerinde koridor.
- Sol: Carbon, Leon, Müzik Odası · Sağ: Medica, Nexsus, Boş oda (ileride kullanılacak).
- Orta: Salon, Mutfak, Çalışma, Kütüphane, Atölye, Sanat Odası, Film Odası.
- Her karakter odasında yatak, komodin, kendi gardırobu ve uzmanlığına göre eşyalar var (Nexsus yatak yerine şarj istasyonunda "uyur").
- Plan ve döşeme: `js/ev.js` (mobilyalar ve etkinlik noktaları oda içi koordinatla yazılır; sağ sütun aynalanır).

## Dokunma (v0.5)

- **Sürükle / iki parmak:** gezin, yakınlaştır. Zemine tek dokunuş bir şey yapmaz.
- **Odaya çift dokun:** kamera o odaya yaklaşır (tekrar çift dokunuş geri uzaklaştırır). Yakınlaşınca odadaki gardırop ve boş yuva "+" görünür.
- **Özellik simgesine dokun:** hemen açılır, kimse yürümez.
- **Karaktere dokun:** durur, başını kaldırıp sana bakar ve "Hıh?" der (Luna "Miyav?", Nexsus "Bip?"). Yazı kutusu ona döner; yazarsan özel sohbet başlar, yazmazsan birkaç saniye sonra işine döner.
- **"+" yuvası:** Atölye o oda için açılır; üretilen özellik onaylanınca o odaya yerleşir.

## Ekran (v0.5)

- Üstte ince şerit: saat, sohbet türü (Genel / Özel · Ad — dokununca kime yazacağını seçersin).
- Sohbet alttan yarım ekran panel; üstte konuşan karakter yakın planda görünür. Aşağı çekince kapanır.
- Alt menü: **Karakterler** (kim nerede, ne yapıyor, ayarları), **Hafıza** (sadece görüntüleme), **Ev Düzeni** (odalar ve özellikleri), **Ayarlar** (Geliştirici bölümünde Laboratuvar).
- Atölye, Atölye odasındaki simgeden açılır.

## Sohbet (v0.5)

- **Genel:** evdekilerin hepsi katılır. Herkese yazarsan herkes cevap verir; birinin adını yazarsan önce o, sonra söyleyecek sözü olanlar. Karakterler gerekirse birbirine de cevap verir. (Groq ile tek istekte; anahtarsız modda basit cevaplar.)
- **Özel:** karaktere dokun ya da Karakterler'den "Yaz". Karakter genel sohbette konuşulanları da bilir.
- Mesajların yanında karakterin yüzü, panelin üstünde herkesin yüzü görünür.

## Günlük yaşam ve ışık (v0.5)

- **Gece** (uyku saatin, Ayarlar'dan; varsayılan 23:30–07:30): herkes kendi yatağında uyur, komodin lambası söner. Yazarsan uyanır, bir süre uyanık kalır.
- **Sabah:** gardırobundan kıyafet seçer, mutfağa kahvaltıya uğrar.
- **Gündüz:** kendi uzmanlık köşesinde; gerçek veri varsa ortak odalarda (notlar, kitaplar, galeri).
- **Akşam:** salonda ya da film odasında diğerleriyle.
- Işık saate göre: gündüz sıcak ve aydınlık, akşam koyu tonlar ve neon, gece karanlık. Ayarlar'dan sabitlenebilir.

## Oda özellikleri

| Simge | Yer | Ne işe yarar |
|---|---|---|
| Askı | Her karakter odası (yakınlaşınca) | **Gardırop**: o karakterin kombinleri. |
| Saat | Salon (duvar saati) | **Saat ve alarm**: alarmlar, zamanlayıcı, kronometre. Alarm şimdilik uygulama açıkken çalar. |
| Kitap | Kütüphane | **Kütüphane**: okunacak / okunuyor / bitti listesi ve notlar. |
| TV | Film Odası | **İzle**: izleme listesi ve video oynatma. |
| Fırça | Sanat Odası | **Tuval**: parmakla resim çizme, galeri. |
| Alet | Atölye | **Atölye**: karakterlere özellik ürettirme, öneriyi onaylama. |

Sayfaların kaynağı `web-src/sayfalar/*.html`. Değiştirdikten sonra `python3 web-src/sayfa_paketle.py` çalıştır; uygulamaya giden `js/ozellik_sayfalari.js` yeniden üretilir.

## Karakterler (10 yer)

| Ad | Tür | Görünüş |
|---|---|---|
| Atlas | İnsan, erkek | Kısa koyu kahve saç, ela göz, lacivert tişört |
| Nova | İnsan, kadın | Gümüş dalgalı saç, mor tutam ve mor göz, mor üst |
| Orion | Elf, erkek | Sivri kulak, gece mavisi saç, buz mavisi göz |
| Medica | İnsan, kadın | Kumral toplu saç, yeşil göz, mint sağlık forması |
| Luna | Kedi insan, kadın | Koyu mor saç, kedi kulağı ve kuyruk, amber göz |
| Carbon | Android, kadın | Kısa siyah saç, bakır göz, şakakta mekanik detay |
| Nexsus | Robot | Yuvarlak beyaz-gri gövde, ekran yüzde turkuaz gözler |
| Mira | İnsan, kadın | Bakır kızılı örgülü saç, çiller, krem üst, zeytin yeşili pantolon |
| Leon | İnsan, erkek | Dağınık kızıl saç, çiller, kiremit tişört |
| (boş) | | Atölye → Karakterler → Yeni karakter |

Her karakterin kendi ruh hali, olay kaydı, sohbet geçmişi, sesi ve (istersen) VRM modeli vardır. Atölye'den karakterleri evden çıkarıp geri alabilirsin. Kişilikler şimdilik kısa yer tutucular; Atölye'den değiştirilebilir.

## Ekranlar (görsel kurallar)

| Ne yapıyorsun | Karakter nerede |
|---|---|
| Evdesin | Tepeden ev, karakterler küçük ve odalarda kendi başlarına dolaşıyor |
| Bir sayfa kullanıyorsun | Seçili karakter köşede küçük bir yuvarlakta, ekranı kapatmıyor |
| Mesajlaşıyorsun | Seçili karakter sol sütunda boy boyu, sana bakıyor |
| Sesli konuşuyorsun | Seçili karakter daha büyük, ağzı konuşmayla oynuyor |

Sağ üstteki menü her ekranda Laboratuvar, Atölye ve Ayarlar'ı açar.

## APK nasıl alınır (bilgisayar gerekmez)

1. Bu klasörün içindekileri GitHub reposuna yükle (ör. `drtyl/Loncacore`).
2. Repo sayfasında **Actions** sekmesine gir. "APK Derle" kendiliğinden başlar (yaklaşık 5 dakika).
3. Bitince çalışmanın sayfasının altında **Lonca-v0-apk** dosyası çıkar. İndir, zip'i aç, `app-debug.apk`'yı telefona kur.

Derleme sırasında 3D kütüphaneleri (three.js ve three-vrm) otomatik indirilip uygulamanın içine gömülür; uygulama internetsiz de açılır. İnternet sadece Groq ile konuşmak için gerekir.

## Neler var

- **3D ev:** 7 oda, mobilyalar, ışıklar, gölgeler, gece/gündüz.
- **Karakterler:** yürür, koşar, selam verir, göz kırpar, nefes alır, konuşurken ağzı oynar; Luna'nın kuyruğu sallanır, Nexsus süzülür.
- **Gerçek ruh hali:** mutluluk ve enerji uydurma değil; dokunma, sohbet, koşma, dinlenme, yalnız kalma, önerisinin onaylanması gibi gerçek olaylarla değişir. Yüz ifadesi buradan gelir. Atölye'de sayılar ve sebepleri görünür.
- **Uydurmama kuralı:** karakter kendinden ve ev arkadaşlarından bahsederken sadece gerçek veriyi kullanır (gerçek konum, gerçek eşyalar, gerçek olaylar). Yapay zekâya da bu bilgiler ve "uydurma" kuralı verilir.
- **Sohbet:** selam, nasılsın, neden üzgünsün, evde ne var, evde kim var, Atlas nerede, odalar, ne yapıyorsun, saat kaç gibi şeyleri kendi bilir (internet gerekmez). Ayarlar'a Groq anahtarı girilirse her konuda konuşur.
- **Sesli görüşme:** telefon görüşmesi gibi; Nova konuşur, sonra seni dinler, sırayla devam eder. Sessize al ve bitir düğmeleri var. Android'in kendi ses motorları kullanılır.
- **Laboratuvar:** her türden dosya ve klasör, metin düzenleme, içe aktarma, önizleme, "Eve yerleştir".
- **Atölye:** Nova'dan bir sayfa/araç iste ("su takip sayfası yap" de ya da Atölye'den yaz). Öneri olarak bekler; sen onaylamadan eve girmez. Onaylanınca evde eşya olur.
- **Sayfalar kum havuzunda:** eve konan sayfalar uygulamanın geri kalanına dokunamaz. Şu araçları kullanabilirler: `Lonca.kaydet(anahtar, deger)`, `await Lonca.oku(anahtar)`, `Lonca.soyle("metin")`.
- **Yedek görünüm:** telefon 3D'yi başlatamazsa uygulama çökmez, basit 2D görünüme geçer.

## Bir karakterin gerçek 3D modelini koymak

Her karakter tarifine göre çizilmiş hazır bir bedenle gelir. Daha detaylı bir model için:

1. **VRoid Studio** (bilgisayar) ya da **VRoid Mobile** ile karakteri tasarla.
2. Modeli **.vrm** olarak dışa aktar.
3. Uygulamada karakteri seç, **Atölye → 3D beden → VRM yükle**.

Göz kırpma, ifadeler (mutlu/üzgün/yorgun/şaşkın), ağız hareketi, sana bakma ve yürüme otomatik olarak yeni bedene uygulanır.

## Dosya yapısı

```
app/src/main/java/.../MainActivity.kt   Android kabuğu: WebView, dosya köprüsü, internet, ses
app/src/main/assets/www/                Uygulamanın kendisi
  js/depo.js      dosya sistemi (telefonda gerçek dosyalar)
  js/ev.js        odalar, duvar/kapılar, mobilyalar, eşyalar, yol bulma
  js/karakterler.js  10 kişilik kadro: görünüş, tür, kişilik, ses
  js/yasam.js     her karakterin hayatı ve gerçek ruh hali
  js/sahne3d.js   3D ev, bedenler (chibi, robot, VRM), kamera modları
  js/sahne2d.js   3D çalışmazsa yedek görünüm
  js/zihin.js     cevap verme (kurallar + Groq), Atölye üretimi
  js/ses.js       konuşma ve dinleme
  js/panel.js     Laboratuvar, Atölye, Ayarlar
  js/app.js       modlar ve her şeyi bağlayan kısım
web-src/vendor.js  3D kütüphanelerinin paketlenme noktası
.github/workflows/build.yml  bulutta APK derleme
```

Telefonda tüm veriler uygulamanın kendi klasöründe durur: `/ev`, `/karakterler`, `/atolye`, `/lab`, `/ayarlar.json`.

## Bilinen sınırlar (v0)

- 3D çizim ve Android ses motorları geliştirme ortamında gerçek cihazda test edilemedi; arayüz, sohbet, Laboratuvar, Atölye ve yedek görünüm tarayıcıda test edildi. İlk derlemede bir sorun çıkarsa Actions kaydını paylaş.
- Mobilya taşıma, oda ekleme ve her karakterin özel odası sonraki versiyonda.
- Karakterler henüz kendi aralarında konuşmuyor; sadece seninle konuşuyorlar.
- Arka planda (uygulama kapalıyken) karakter yaşamaz, bildirim yoktur.
- Konuşma tanıma için telefonda Google'ın ses servisi gerekir.

## Sonraki versiyonlar için bekleyen istekler

- Mobilya taşıma, oda ekleme, dekor
- Karakterlerin kendi aralarında konuşması ve özel odaları
- Arka planda çalışma ve bildirimler
- Karakterin kendi kendine iş üretmesi ve görev takibi
- Dopamin/ilgi sistemi, kısa ve uzun süreli hafıza
- Groq bağımlılığını azaltan yerel küçük zihin
