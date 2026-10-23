/* Etkinlik: karakterin evde ne yapacağına kendisi karar verir.
 * Kural: boş boş gezinmez; her etkinlik GERÇEK bir veriye ya da gerçek bir duruma dayanır.
 *   - Notlarda açık iş varsa çalışma masasına gider ("yapılacaklar listesine bakıyor")
 *   - Kütüphanede kitap varsa kütüphaneye gider (kitabın adı listeden gelir)
 *   - İzleme listesinde izlenecek varsa akşamları film odasına gider
 *   - Galeride resim varsa sanat odasına gidip ona bakar
 *   - Öğün saatinde mutfağa, enerjisi düşükse salona dinlenmeye gider
 *   - Gardırobunda birden fazla kombin varsa sabah giyinir
 *   - Hiçbiri yoksa kendi köşesinde dinlenir (gezinmez)
 * Olaylar (yeni kitap, yeni resim, alarm…) sıradaki etkinliği hemen değiştirir.
 * Karakter "ne yapıyorsun?" sorusuna buradaki metinle cevap verir; uydurmaz.
 *
 * Hareket şablonları (dans, alkış, el sallama…) için kanca: y.hareketYap(ad, saniye).
 * Bedenler y.animasyon'u okuyarak ileride bu hareketleri oynatacak.
 */
(function () {
  const P = Math.PI;
  // Etkinlik yerleri ev planından gelir (Ev.noktalar). Kendi odasıyla ilgili olanlar karakterin odasından.
  const KENDI = { kose: 'oda', gardirop: 'dolap', uyku: 'uyku', is: 'is', ozel: 'ozel' };
  // yemek noktası: kahvaltı için tezgâh önü + masa
  function yerler(tur, y) {
    if (KENDI[tur] && y) { const o = Ev.odasi(y.v.id); const n = o && o.nokta[KENDI[tur]]; if (n) return Array.isArray(n[0]) ? n : [n]; }
    const l = Ev.noktalar(tur);
    return l.length ? l : Ev.noktalar('dinlen');
  }
  const YER = new Proxy({}, { get: (_, tur) => yerler(tur) });
  const IKON = { muzik: 'muzik', uyku: 'ay', is: 'gorev', dinlen: 'kahve', yemek: 'yemek', calis: 'gorev', oku: 'kitap', izle: 'tv', galeri: 'resim', saat: 'zil', gardirop: 'aski', kose: 'ev', gece: 'ay' };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const bugun = () => new Date().toDateString();
  const ogunAnahtari = z => { const h = new Date().getHours(); const s = z && z.evre === 'sabah' ? 'kahvalti' : h >= 12 && h < 14 ? 'ogle' : h >= 19 && h < 21 ? 'aksam' : ''; return s ? bugun() + ' ' + s : ''; };

  function sira(y) { const l = App.evdekiler(); return Math.max(0, l.indexOf(y)); }
  /** Başka karakterin dolu tutmadığı bir yer seçer */
  function yerSec(tur, y) {
    const l = yerler(tur, y), digerleri = App.evdekiler().filter(k => k !== y);
    const bas = Math.floor(Math.random() * l.length);
    for (let i = 0; i < l.length; i++) {
      const [x, z, yaw] = l[(bas + i) % l.length];
      if (!digerleri.some(k => Math.hypot(k.x - x, k.z - z) < 0.55 || (k.etkinlik && k.etkinlik.x === x && k.etkinlik.z === z))) return { x, z, yaw };
    }
    const [x, z, yaw] = l[bas % l.length]; return { x: x + rnd(-0.3, 0.3), z: z + rnd(-0.3, 0.3), yaw };
  }

  // ---------------------------------------------------------------- günün saatleri (uyku saati Ayarlar'dan)
  const dk = s => { const [h, m] = String(s || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  /** { evre: 'gece' | 'sabah' | 'gunduz' | 'aksam', yat, kalk } — uyku saatine göre */
  function zaman(d = new Date()) {
    const a = (window.App && App.ayar) ? App.ayar() : {};
    const yat = dk(a.uykuYat || '23:30'), kalk = dk(a.uykuKalk || '07:30'), n = d.getHours() * 60 + d.getMinutes();
    const arada = (x, b, c) => b <= c ? x >= b && x < c : x >= b || x < c;
    if (window.LONCA_EVRE) return { evre: window.LONCA_EVRE, yat, kalk, n };   // yalnızca test için
    const evre = arada(n, yat, kalk) ? 'gece' : arada(n, kalk, (kalk + 120) % 1440) ? 'sabah' : arada(n, dk('18:00'), yat) ? 'aksam' : 'gunduz';
    return { evre, yat, kalk, n };
  }
  // her karakterin uzmanlığı (gündüz kendi odasındaki işi)
  const UZMANLIK = {
    nova: 'günlük ve hedefler köşesinde, yazı masasında', orion: 'kitaplığının başında, öğrenme köşesinde', atlas: 'odasındaki spor köşesinde',
    mira: 'odasında şövalesinin başında', luna: 'odasında oyun köşesinde', carbon: 'odasında bilgisayarının başında',
    leon: 'odasında tırmanma duvarının yanında', medica: 'odasındaki sağlık köşesinde', nexsus: 'odasında sunucu dolaplarının başında'
  };

  // etkinlik → ilgi konusu (bitince o konudaki ilgi biraz artar; ağırlık ilgiyle ölçeklenir)
  const UZMANLIK_KONU = { nova: 'plan', orion: 'okuma', atlas: 'spor', mira: 'sanat', luna: 'oyun', carbon: 'teknoloji', leon: 'spor', medica: 'saglik', nexsus: 'teknoloji' };
  const KONU = { oku: 'okuma', izle: 'film', galeri: 'sanat', dinlen: 'sohbet', yemek: 'yemek', calis: 'plan', muzik: 'muzik' };
  const konuOf = (a, y) => a.tur === 'is' ? UZMANLIK_KONU[y.v.id] : KONU[a.tur];

  /** O anki gerçek duruma ve günün saatine göre yapılabilecek etkinlikler (ağırlıklı) */
  function adaylar(y) {
    const d = y.v.durum, z = zaman(), l = [], bugun_ = bugun();
    // GECE: kendi yatağında uyur (kullanıcı yazıp uyandırdıysa bir süre odasında uyanık kalır)
    if (z.evre === 'gece' && !(y.uyanikKal && Date.now() < y.uyanikKal)) {
      const yatak = (Ev.yatakPoz(y.v.id) || {}).yatay !== false;
      return [{ tur: 'uyku', ikon: 'ay', w: 1, metin: yatak ? 'Kendi yatağında uyuyor' : 'Şarj istasyonunda uyku modunda', sure: 99999, varinca: () => y.uyu(), bitir: () => zaman().evre !== 'gece' }];
    }
    if (z.evre === 'gece') return [{ tur: 'kose', ikon: 'ay', w: 1, metin: 'Gece; uyandı, kendi odasında', sure: rnd(120, 300) }];

    if (d.enerji < 30) l.push({ tur: 'dinlen', w: 6, metin: 'Salonda dinleniyor (enerjisi düşük)', sure: 9999, bitir: () => y.v.durum.enerji >= 85 });
    // SABAH: önce gardıroptan kıyafet seçer, sonra mutfağa uğrar
    if (z.evre === 'sabah' && y.v.giyinGunu !== bugun_ && window.Gardirop) l.push({ tur: 'gardirop', w: 12, metin: 'Gardırobundan bugün ne giyeceğini seçiyor', sure: rnd(8, 14), varinca: () => Gardirop.karakterSecsin(y) });
    const og = ogunAnahtari(z);
    if (og && y.v.sonOgun !== og && (z.evre !== 'sabah' || y.v.giyinGunu === bugun_ || !window.Gardirop)) l.push({ tur: 'yemek', w: z.evre === 'sabah' ? 10 : 5, metin: og.endsWith('kahvalti') ? 'Mutfakta kahvaltı ediyor' : 'Mutfakta yemek molası veriyor', sure: rnd(60, 110), varinca: () => { y.v.sonOgun = og; y.olay(og.endsWith('kahvalti') ? 'Mutfakta kahvaltı ettim' : 'Mutfakta yemek molası verdim', 2, 12); } });
    // GÜNDÜZ: kendi uzmanlığı; gerçek veri varsa ortak odalardaki işler
    if (z.evre === 'gunduz' || z.evre === 'sabah') {
      if (UZMANLIK[y.v.id]) l.push({ tur: 'is', w: 3, metin: 'Kendi uzmanlığıyla uğraşıyor: ' + UZMANLIK[y.v.id], sure: rnd(180, 420) });
      const acik = Ozellikler.notlar().filter(n => !n.bitti);
      if (acik.length) l.push({ tur: 'calis', w: 2 + Math.min(3, acik.length), metin: 'Çalışma odasında, yapılacaklar listesine bakıyor (' + acik.length + ' açık iş: ' + acik.slice(0, 2).map(n => n.metin).join(', ') + ')', sure: rnd(90, 180) });
    }
    const k = Ozellikler.kitaplar(), kitap = k.find(x => x.durum === 'okunuyor') || k.find(x => x.durum === 'okunacak') || k[Math.floor(Math.random() * k.length)];
    if (kitap) l.push({ tur: 'oku', w: kitap.durum === 'okunuyor' ? 2.5 : 1.5, metin: 'Kütüphanede "' + kitap.ad + '" kitabına bakıyor', sure: rnd(100, 220) });
    const g = Ozellikler.galeri();
    if (g.length) { const r = g[Math.floor(Math.random() * Math.min(5, g.length))]; l.push({ tur: 'galeri', w: 1.2, metin: 'Sanat odasında, senin çizdiğin "' + r.ad + '" resmine bakıyor', sure: rnd(60, 140) }); }
    // AKŞAM: salonda ya da film odasında diğerleriyle
    if (z.evre === 'aksam') {
      l.push({ tur: 'dinlen', w: 4, metin: 'Akşam; salonda diğerleriyle oturuyor', sure: rnd(240, 600) });
      const v = Ozellikler.videolar().filter(x => !x.izlendi);
      l.push({ tur: 'izle', w: v.length ? 4 : 2, metin: v.length ? 'Film odasında; izleme listesinde "' + v[0].baslik + '" bekliyor' : 'Akşam; film odasında diğerleriyle oturuyor', sure: rnd(240, 600) });
    }
    // Müzik odası: müziğe ilgisi olanlar boş vakitlerinde
    if ((z.evre === 'gunduz' || z.evre === 'aksam') && y.ilgi('muzik') >= 5) l.push({ tur: 'muzik', w: 1.2, metin: 'Müzik odasında vakit geçiriyor', sure: rnd(120, 300) });
    l.push({ tur: 'kose', w: z.evre === 'aksam' ? 0.5 : 1, metin: 'Kendi odasında', sure: rnd(120, 300) });
    // ilgi puanları seçimleri belirler (0 ilgi: nadiren, 10 ilgi: çok sık)
    for (const a of l) { const k = konuOf(a, y); if (k && a.tur !== 'gardirop' && a.tur !== 'yemek') a.w *= 0.35 + y.ilgi(k) / 10 * 1.3; }
    const son = y.etkinlik && y.etkinlik.tur, digerleri = App.evdekiler().filter(k => k !== y && k.etkinlik);
    for (const a of l) {
      if (a.tur === son && a.tur !== 'is') a.w *= 0.3;
      if (a.tur === 'kose' || a.tur === 'is' || a.tur === 'gardirop') continue;
      const dolu = digerleri.filter(k => k.etkinlik.tur === a.tur).length;   // herkes aynı yere üşüşmesin
      const tavan = { calis: 3, oku: 3, izle: 5, galeri: 2, dinlen: 5, yemek: 5, muzik: 3 }[a.tur] || yerler(a.tur).length;
      a.w = dolu >= tavan ? 0 : a.w * (z.evre === 'aksam' ? 1 : Math.pow(0.5, dolu));
    }
    return l.filter(a => a.w > 0);
  }
  function agirlikli(l) { const t = l.reduce((s, a) => s + a.w, 0); let r = Math.random() * t; for (const a of l) { r -= a.w; if (r <= 0) return a; } return l[l.length - 1]; }

  /** Etkinliği başlatır: yere yürür, varınca o yöne döner ve süre başlar */
  function baslat(y, a) {
    if (y.uyuyor && a.tur !== 'uyku') y.uyan();
    const yer = a.yer || yerSec(a.tur, y), oda = Ev.odaBul(yer.x, yer.z);
    const e = y.etkinlik = { tur: a.tur, ikon: a.ikon || IKON[a.tur] || 'ev', metin: a.metin, oda: oda.ad, x: yer.x, z: yer.z, yolda: true, bitis: Infinity, bitir: a.bitir || null };
    y.git(yer.x, yer.z, !!a.kos, () => {
      if (y.etkinlik !== e) return;
      e.yolda = false; e.bitis = Date.now() + (a.sure || 120) * 1000; y.hedefYaw = yer.yaw || 0;
      const k = konuOf(a, y); if (k) y.ilgiDegis(k, 0.04);   // yaptıkça ilgisi biraz artar
      // hareket şablonları: müzik odasında ya da akşam salonda müziği sevenler dans eder
      if ((a.tur === 'muzik' || (a.tur === 'dinlen' && zaman().evre === 'aksam')) && y.ilgi('muzik') >= 6 && Math.random() < 0.5) setTimeout(() => y.hareketYap('dans', 6), 1500);
      if (a.varinca) try { a.varinca(); } catch (err) { console.warn(err); }
    });
  }

  const Etkinlik = {
    YER, IKON, zaman, UZMANLIK,
    /** Her kare: karakter boşta ve etkinliği bittiyse yenisini seçer */
    tick(y) {
      if (y.uyuyor && zaman().evre !== 'gece') y.uyan();
      const e = y.etkinlik, simdi = Date.now();
      if (y.istek) { const a = y.istek; y.istek = null; return baslat(y, a); }
      if (e && e.bitir && !e.yolda && e.bitir()) e.bitis = 0;
      if (e && (e.yolda || simdi < e.bitis)) { if (e.yolda && !y.yol.length) e.yolda = false, e.bitis = simdi + 60000; return; }
      if (y._etkBekle && simdi < y._etkBekle) return;
      y._etkBekle = simdi + rnd(1500, 4000); // kısa bir duraklama: karar vermeden önce
      if (e && simdi - e.bitis < 1200) return;
      baslat(y, agirlikli(adaylar(y)));
    },
    /** Sayfalardan ve uygulamadan gelen gerçek olaylar */
    olay(tur, veri = {}) {
      const ev = App.evdekiler(), sec = App.seciliYasam ? App.seciliYasam() : ev[0];
      const ilet = (y, a) => { if (y) y.istek = a; }; // karakter sohbette/köşedeyse, serbest kalınca yapar
      switch (tur) {
        case 'kitap': for (const y of ev) y.olay('Kütüphaneye yeni kitap geldi: ' + veri.ad, 2);
          ilet(sec, { tur: 'oku', metin: 'Kütüphanede yeni gelen "' + veri.ad + '" kitabına bakıyor', sure: rnd(80, 160), kos: true }); break;
        case 'kitapBitti': if (sec) { sec.olay('Birlikte takip ettiğimiz "' + veri.ad + '" kitabı bitti olarak işaretlendi', 3); sec.hareketYap('alkis', 3); } break;
        case 'resim': for (const y of ev) y.olay('Galeriye yeni bir resim kondu: ' + veri.ad, 3);
          ilet(sec, { tur: 'galeri', metin: 'Sanat odasında yeni çizdiğin "' + veri.ad + '" resmine bakıyor', sure: rnd(60, 120), kos: true }); break;
        case 'video': case 'izleniyor': if (sec) sec.olay('İzleme listesinde: ' + (veri.baslik || ''), 1);
          ilet(sec, { tur: 'izle', metin: 'Film odasında; "' + (veri.baslik || 'listedeki video') + '" ' + (tur === 'izleniyor' ? 'açıldı' : 'listeye eklendi'), sure: rnd(80, 160) }); break;
        case 'alarm': for (const y of ev) { y.olay('Alarm çaldı: ' + veri.saat + (veri.ad ? ' ' + veri.ad : ''), 0); ilet(y, { tur: 'saat', metin: 'Alarm çaldığı için saatin yanında (' + veri.saat + (veri.ad ? ', ' + veri.ad : '') + ')', sure: 40, kos: true }); }
          if (sec) { const m = 'Alarm! ' + (veri.ad || veri.saat); App.balon(m, 4000); App.konus(m); } break;
        case 'alarmKuruldu': if (sec) sec.olay('Alarm kuruldu: ' + veri.saat, 1); break;
        case 'sureDoldu': if (sec) sec.olay('Zamanlayıcı doldu', 0); break;
        case 'giydirildi': if (veri.y) veri.y.olay('Gardıroptan yeni kombin giydim: ' + veri.ad, 3); break;
      }
    },
    /** Zihin için: şu an ne yapıyor (gerçek) */
    metin(y) {
      if (y.sabit && App.mod && App.mod() !== 'ev') return 'Seninle konuşuyor (' + Ev.odaBul(y.x, y.z).ad + ')';
      const e = y.etkinlik; if (!e) return null;
      return e.yolda ? 'Yolda, ' + Dil.yonelme(e.oda) + ' gidiyor. Amacı: ' + e.metin.charAt(0).toLocaleLowerCase('tr') + e.metin.slice(1) : e.metin;
    }
  };
  window.Etkinlik = Etkinlik;
})();
