/* Oda özellikleri: evin içinde sabit yeri olan araçlar (Gardırop, Saat ve alarm, Kütüphane, İzle, Tuval).
 * Her biri bir eşyadır (id'si "ozel-" ile başlar). Sayfası olanların HTML'i Laboratuvar'dan düzenlenebilir;
 * kullanıcı düzenlemediyse uygulama güncellenince yeni sürümle değiştirilir.
 * Sayfaların verisi /ev/veri/<id>.json içinde durur; karakterler bu GERÇEK veriye bakarak ne yapacağına karar verir.
 */
(function () {
  const LISTE = [
    { id: 'ozel-saat', ad: 'Saat ve alarm', ikon: 'saat', sayfa: 'saat', oda: 'salon', lx: 4.6, lz: 0.75 },
    { id: 'ozel-kutuphane', ad: 'Kütüphane', ikon: 'kitap', sayfa: 'kutuphane', oda: 'kutuphane', lx: 3.0, lz: 3.8 },
    { id: 'ozel-izle', ad: 'İzle', ikon: 'tv', sayfa: 'izle', oda: 'film', lx: 1.83, lz: 4.35 },
    { id: 'ozel-tuval', ad: 'Tuval', ikon: 'firca', sayfa: 'tuval', oda: 'sanat', lx: 1.8, lz: 2.75 },
    { id: 'ozel-atolye', ad: 'Atölye', ikon: 'atolye', ozel: 'atolye', oda: 'atolye', lx: 1.83, lz: 3.7 },
    { id: 'ozel-studyo', ad: 'Stüdyo', ikon: 'kamera', ozel: 'studyo', oda: 'film', lx: 3.0, lz: 3.4 },
    { id: 'ozel-projeler', ad: 'Projeler', ikon: 'proje', ozel: 'projeler', oda: 'calisma', lx: 2.2, lz: 4.25 }
  ].map(o => Object.assign(o, Ev.yerel(o.oda, o.lx, o.lz)))
    // her karakter odasındaki gardırop (o karakterin gardırobunu açar)
    .concat(Ev.ODALAR.filter(o => o.sahip && o.nokta.dolap).map(o => ({ id: 'ozel-gardirop-' + o.sahip, ad: 'Gardırop', ikon: 'aski', ozel: 'gardirop', sahip: o.sahip, oda: o.id, x: o.nokta.dolap[0], z: o.nokta.dolap[1] })));
  const ozetle = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + ':' + s.length; };

  const Ozellikler = {
    LISTE,
    /** Eksik özellikleri eve koyar, sayfalarını yazar (kullanıcının değiştirdiği sayfaya dokunmaz) */
    kur() {
      const ayar = App.ayar(), kaldirilan = ayar.kaldirilanOzellikler || [], izler = Object.assign({}, ayar.sayfaIzleri || {});
      let l = Ev.esyalar(), degisti = false;
      if (l.some(e => e.id === 'ozel-gardirop')) { l = l.filter(e => e.id !== 'ozel-gardirop'); degisti = true; }   // v0.4'teki tek gardırop → odalara
      for (const o of LISTE) {
        if (o.sayfa) {
          const yol = '/ev/sayfalar/' + o.sayfa + '.html', yeni = (window.OZELLIK_SAYFALARI || {})[o.sayfa];
          if (yeni) {
            const mevcut = Depo.oku(yol);
            if (mevcut === null || (izler[yol] && izler[yol] === ozetle(mevcut) && mevcut !== yeni)) { Depo.yaz(yol, yeni); izler[yol] = ozetle(yeni); }
            else if (!izler[yol] && mevcut === yeni) izler[yol] = ozetle(yeni);
          }
        }
        const var_ = l.find(e => e.id === o.id);
        if (var_ && (var_.x !== o.x || var_.z !== o.z)) { var_.x = o.x; var_.z = o.z; var_.oda = o.oda; degisti = true; }   // sabit yuvasına
        if (kaldirilan.includes(o.id) || var_) continue;
        l.push({ id: o.id, ad: o.ad, ikon: o.ikon, ozel: o.ozel || '', dosya: o.sayfa ? '/ev/sayfalar/' + o.sayfa + '.html' : '', oda: o.oda, x: o.x, z: o.z, sahip: o.sahip || '' });
        degisti = true;
      }
      if (degisti) Ev.esyalariKaydet(l);
      App.ayarYaz({ sayfaIzleri: izler });
    },
    kaldirildi(id) { if (!/^ozel-/.test(id)) return; const k = new Set(App.ayar().kaldirilanOzellikler || []); k.add(id); App.ayarYaz({ kaldirilanOzellikler: [...k] }); },
    geriGetir() { App.ayarYaz({ kaldirilanOzellikler: [] }); Ozellikler.kur(); },
    bul(id) { return Ev.esyaBul(id); },
    /** Bir eşyanın sayfa verisi */
    veri(id) { return id ? Depo.okuJSON('/ev/veri/' + id + '.json', {}) : {}; },
    notlar() { const e = Ev.esyalar().find(e => e.dosya === '/ev/sayfalar/notlar.html'); return e ? (Ozellikler.veri(e.id).liste || []) : []; },
    kitaplar() { return Ozellikler.veri('ozel-kutuphane').kitaplar || []; },
    videolar() { return Ozellikler.veri('ozel-izle').videolar || []; },
    galeri() { return Ozellikler.veri('ozel-tuval').galeri || []; },
    alarmlar() { return Ozellikler.veri('ozel-saat').alarmlar || []; },
    /** Karakterin zihnine verilen gerçek ev verisi özeti */
    ozet() {
      const s = [], acik = Ozellikler.notlar().filter(n => !n.bitti), k = Ozellikler.kitaplar(), v = Ozellikler.videolar().filter(x => !x.izlendi), g = Ozellikler.galeri(), a = Ozellikler.alarmlar().filter(x => x.acik);
      s.push(acik.length ? 'Notlar listesinde ' + acik.length + ' açık iş var: ' + acik.slice(0, 4).map(n => n.metin).join(', ') + '.' : 'Notlar listesinde açık iş yok.');
      s.push(k.length ? 'Kütüphanede ' + k.length + ' kitap var (' + k.slice(0, 5).map(x => x.ad + ': ' + ({ okunacak: 'okunacak', okunuyor: 'okunuyor', bitti: 'bitti' }[x.durum] || x.durum)).join('; ') + ').' : 'Kütüphane rafı boş.');
      s.push(v.length ? 'İzleme listesinde ' + v.length + ' izlenecek var: ' + v.slice(0, 4).map(x => x.baslik).join(', ') + '.' : 'İzleme listesi boş.');
      s.push(g.length ? 'Tuval galerisinde kullanıcının çizdiği ' + g.length + ' resim var (son: ' + g[0].ad + ').' : 'Tuval galerisi boş.');
      s.push(a.length ? 'Kurulu alarmlar: ' + a.map(x => x.saat + (x.ad ? ' ' + x.ad : '')).join(', ') + '.' : 'Kurulu alarm yok.');
      // Atölye'de üretilen ve Laboratuvar'da yapılan özelliklerin kendi bildirdiği özetler (Lonca.ozet)
      for (const e of Ev.esyalar()) { if (/^ozel-/.test(e.id)) continue; const o = Ozellikler.veri(e.id).__ozet; if (o) s.push(e.ad + ' (' + Ev.odaAdi(e.oda) + '): ' + o); }
      return s.join(' ');
    }
  };

  // ---------------------------------------------------------------- alarm (uygulama açıkken)
  const iki = n => (n < 10 ? '0' : '') + n;
  let calan = null, sesZ = null, ses = null;
  function bip() { try { ses = ses || new (window.AudioContext || window.webkitAudioContext)(); for (const t of [0, 0.25, 0.5]) { const o = ses.createOscillator(), g = ses.createGain(); o.frequency.value = 880; g.gain.value = 0.25; o.connect(g); g.connect(ses.destination); o.start(ses.currentTime + t); o.stop(ses.currentTime + t + 0.16); } } catch (e) {} }
  function sustur() { clearInterval(sesZ); sesZ = null; const p = document.getElementById('alarmPerde'); if (p) p.remove(); calan = null; }
  function cal(a) {
    if (calan) return; calan = a;
    const p = document.createElement('div'); p.id = 'alarmPerde';
    p.innerHTML = '<div class="alarmKutu"><div class="alarmIkon"></div><div class="alarmSaat"></div><div class="alarmAd"></div><div class="satir"><button class="kucukBtn" data-a="ertele">5 dk ertele</button><button class="kucukBtn vurgu" data-a="kapat">Kapat</button></div></div>';
    p.querySelector('.alarmIkon').innerHTML = Ikon.svg('zil'); p.querySelector('.alarmSaat').textContent = a.saat; p.querySelector('.alarmAd').textContent = a.ad || 'Alarm';
    p.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'ertele') { const d = new Date(Date.now() + 5 * 60000), v = Ozellikler.veri('ozel-saat'); v.alarmlar = (v.alarmlar || []).concat({ id: 'e' + Date.now().toString(36), saat: iki(d.getHours()) + ':' + iki(d.getMinutes()), ad: (a.ad || 'Alarm') + ' (ertelendi)', gunler: [], acik: true, ertele: true }); Depo.yazJSON('/ev/veri/ozel-saat.json', v); App.bildir('5 dakika sonra tekrar çalacak'); }
      sustur();
    };
    document.body.appendChild(p);
    bip(); sesZ = setInterval(bip, 1400); setTimeout(() => { if (calan === a) sustur(); }, 90000);
    if (window.Etkinlik) Etkinlik.olay('alarm', { saat: a.saat, ad: a.ad || '' });
  }
  function denetle() {
    const v = Ozellikler.veri('ozel-saat'), l = v.alarmlar || []; if (!l.length) return;
    const d = new Date(), simdi = iki(d.getHours()) + ':' + iki(d.getMinutes()), gun = d.getDay(), anahtar = d.toDateString() + ' ' + simdi;
    let yaz = false;
    for (const a of l) {
      if (!a.acik || a.saat !== simdi || a.son === anahtar) continue;
      if (a.gunler && a.gunler.length && !a.gunler.includes(gun)) continue;
      a.son = anahtar; yaz = true;
      if (!a.gunler || !a.gunler.length) a.acik = false;
      cal(a);
    }
    if (yaz) { v.alarmlar = l.filter(a => !(a.ertele && !a.acik)); Depo.yazJSON('/ev/veri/ozel-saat.json', v); }
  }
  Ozellikler.alarmBaslat = () => { setInterval(denetle, 10000); setTimeout(denetle, 1500); };
  Ozellikler.alarmCal = cal;

  window.Ozellikler = Ozellikler;
})();
