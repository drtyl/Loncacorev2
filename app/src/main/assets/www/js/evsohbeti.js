/* Ev sohbeti: sen yokken karakterler kendi aralarında konuşur.
 *
 * Kurallar (senin kararın):
 *   - Seyrek ve anlamlı: SADECE gerçek bir sebep (gündem) varsa konuşurlar. Boş laf yok, uydurma olay yok.
 *   - Günlük sınır ayarlanabilir (Ayarlar → "Sen yokken konuşma"): az 6 · normal 12 · canlı 40. Groq'tan sonra canlı moda geçilebilir.
 *   - Konuşmalar genel sohbette "sen yokken" başlığıyla durur; tek bir bildirim gelir (sayı güncellenir).
 *   - Uyuyanlar konuşmaz.
 *
 * Gündem (gerçek sebepler): evdeki verilere yeni eklenenler (kitap, not, video, resim, alarm), karakterlerin yaşadığı
 * olaylar (uyandı, kıyafet seçti, önerisi onaylandı…), günün geçişleri (sabah, akşam), aktif projeler.
 */
(function () {
  const DURUM_YOL = '/sohbet/gundem.json';
  const SINIR = { az: 6, normal: 12, canli: 40 };
  let son = { z: 0 };
  const durum = () => Object.assign({ gun: '', sayi: 0, son: 0, gorulen: {}, veri: {} }, Depo.okuJSON(DURUM_YOL, {}));
  const kaydet = d => { const k = Object.keys(d.gorulen); if (k.length > 400) for (const x of k.slice(0, k.length - 300)) delete d.gorulen[x]; Depo.yazJSON(DURUM_YOL, d); };
  const sinir = () => SINIR[App.ayar().yokkenSiklik || 'normal'] || 12;

  /** Kullanıcı şu an yok mu? (uygulama arka planda ya da 8 dakikadır dokunmadı) */
  const yokMu = () => document.hidden || Date.now() - (App.sonEtkilesim || 0) > 8 * 60000;

  /** Gerçek gündem maddeleri: [{ anahtar, metin, ilgili: [id] }] */
  function gundem(d) {
    const l = [], ev = App.evdekiler(), bugun = new Date().toDateString();
    // 1) evdeki verilere yeni eklenenler
    const yeni = (tur, liste, ad, metin, ilgili) => { for (const x of liste) { const k = ad(x); if (k) l.push({ anahtar: tur + ':' + k, metin: metin(x), ilgili }); } };
    yeni('kitap', Ozellikler.kitaplar(), x => x.ad, x => 'Kütüphaneye "' + x.ad + '" kitabı eklendi' + (x.yazar ? ' (' + x.yazar + ')' : '') + '.', ['orion', 'luna']);
    yeni('video', Ozellikler.videolar(), x => x.baslik, x => 'İzleme listesine "' + x.baslik + '" eklendi.', ['luna', 'mira']);
    yeni('resim', Ozellikler.galeri(), x => x.id || x.ad, x => 'Kullanıcı tuvalde yeni bir resim çizdi: "' + x.ad + '".', ['mira']);
    yeni('not', Ozellikler.notlar().filter(n => !n.bitti), x => x.metin, x => 'Kullanıcının yapılacaklar listesine yeni iş eklendi: "' + x.metin + '".', ['nova']);
    yeni('alarm', Ozellikler.alarmlar().filter(a => a.acik), x => x.saat + ' ' + (x.ad || ''), x => 'Kullanıcı ' + x.saat + ' için alarm kurdu' + (x.ad ? ' ("' + x.ad + '")' : '') + '.', ['nexsus']);
    // 2) karakterlerin son 3 saatte yaşadığı dikkat çekici olaylar
    const ONEMLI = /(uyandım|kombin|onaylandı|reddedildi|ürettim|yeni bir bedenim|projeye katıldım|tamamlandı|eklendi)/i;
    for (const y of ev) for (const o of y.v.olaylar.slice(-6)) {
      if (Date.now() - o.z > 3 * 3600e3 || !ONEMLI.test(o.olay)) continue;
      l.push({ anahtar: 'olay:' + y.v.id + ':' + o.z, metin: y.v.ad + ' şunu yaşadı: ' + o.olay + '.', ilgili: [y.v.id] });
    }
    // 3) günün geçişleri (günde bir kez)
    const evre = Etkinlik.zaman().evre;
    if (evre === 'sabah') { const acik = Ozellikler.notlar().filter(n => !n.bitti); l.push({ anahtar: 'sabah:' + bugun, metin: 'Sabah oldu. Kullanıcının listesinde ' + acik.length + ' açık iş var' + (acik.length ? ': ' + acik.slice(0, 3).map(n => n.metin).join(', ') : '') + '.', ilgili: ['nova', 'medica'] }); }
    if (evre === 'aksam') l.push({ anahtar: 'aksam:' + bugun, metin: 'Akşam oldu; evdekiler salonda ve film odasında toplanıyor.', ilgili: ['luna', 'leon'] });
    // 4) aktif projeler (her proje için günde en fazla iki kez)
    for (const p of Projeler.aktifler()) l.push({ anahtar: 'proje:' + p.id + ':' + bugun + ':' + (new Date().getHours() < 15 ? 1 : 2), metin: 'Aktif proje "' + p.ad + '": ' + (p.amac || '') + ' Adımlar: ' + (p.adimlar.map(a => (a.bitti ? '[tamam] ' : '[ ] ') + a.metin).join('; ') || 'henüz yok') + '.', ilgili: p.uyeler, proje: p.id });
    return l.filter(g => !d.gorulen[g.anahtar]);
  }

  /** Anahtarsız (Groq'suz) mod: gündeme göre basit ama gerçek replikler */
  function sablon(g, kisiler) {
    const [a, b] = kisiler; if (!a) return [];
    const r = [{ y: a, metin: g.metin.replace(/^Kullanıcı/, 'Bizimki') }];
    if (b) r.push({ y: b, metin: /kitab/.test(g.metin) ? 'Güzel, ben de bakarım.' : /resim/.test(g.metin) ? 'Galeriye gidip bakacağım.' : /alarm/.test(g.metin) ? 'Not ettim, zamanı gelince hatırlatırız.' : /iş/.test(g.metin) ? 'Gün içinde birlikte bakarız.' : 'Tamam, haberim oldu.' });
    return r;
  }

  async function konus(g) {
    const ev = App.evdekiler().filter(y => !y.uyuyor);
    if (ev.length < 2) return false;
    const ilgili = ev.filter(y => (g.ilgili || []).includes(y.v.id));
    const kisiler = [...ilgili, ...ev.filter(y => !ilgili.includes(y)).sort(() => Math.random() - 0.5)].slice(0, 4);
    let cevap;
    try { cevap = await Zihin.evSohbeti(g, kisiler, ev); } catch (e) { console.warn(e); return false; }
    if (!cevap || !cevap.replikler.length) cevap = { replikler: sablon(g, kisiler) };
    if (!cevap.replikler.length) return false;
    for (const r of cevap.replikler) App.genelYokkenEkle(r.y, r.metin, g.metin);
    for (const y of new Set(cevap.replikler.map(r => r.y))) y.olay('Sen yokken evdekilerle konuştuk (' + g.metin.slice(0, 60) + ')', 1);
    if (cevap.proje) Projeler.olustur(Object.assign({ olusturan: cevap.replikler[0].y.v.id }, cevap.proje));
    if (cevap.ilerleme && g.proje) {
      const p = Projeler.bul(g.proje);
      if (p) { for (const i of cevap.ilerleme) { const a = p.adimlar.find(x => x.metin === i.adim); if (a) a.bitti = !!i.bitti; else if (i.adim && p.adimlar.length < 10) p.adimlar.push({ metin: String(i.adim).slice(0, 120), bitti: !!i.bitti }); } Projeler.kaydet(p); }
    }
    return true;
  }

  let calisiyor = false;
  async function tick(zorla) {
    if (calisiyor) return; calisiyor = true;
    try {
      const d = durum(), bugun = new Date().toDateString();
      if (d.gun !== bugun) { d.gun = bugun; d.sayi = 0; }
      const ilk = !d.veri.hazir;
      const l = gundem(d);
      if (ilk) { d.veri.hazir = true; for (const g of l) d.gorulen[g.anahtar] = 1; kaydet(d); return; }   // ilk açılışta eski veriyi "yeni" sayma
      const aralik = (24 * 60 / sinir()) * 0.6 * 60000;
      if (!zorla && (!yokMu() || d.sayi >= sinir() || Date.now() - d.son < aralik || !l.length)) { kaydet(d); return; }
      if (!l.length) { kaydet(d); return; }
      // en yeni ve en ilgili konu
      const g = l.find(x => !/^(sabah|aksam|proje):/.test(x.anahtar)) || l[0];
      d.gorulen[g.anahtar] = 1;
      const oldu = await konus(g);
      if (oldu) { d.sayi++; d.son = Date.now(); }
      kaydet(d);
    } finally { calisiyor = false; }
  }

  window.EvSohbeti = { tick, gundem: () => gundem(durum()), SINIR };
  setTimeout(() => tick(), 5000);
  setInterval(() => tick(), 60000);
})();
