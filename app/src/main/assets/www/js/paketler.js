/* Özellik paketleri: Atölye'de üretilen her özellik bir pakettir.
 *
 *   /ozellikler/<id>/manifest.json  { id, ad, ikon, oda, izinler: [...], surum, surumler: [{ n, z, not, uretici }], istek, ozet }
 *   /ozellikler/<id>/v<n>.html       her sürümün sayfası (eski sürümler silinmez → geri alınabilir)
 *
 * İzinler (sayfanın Lonca köprüsünden isteyebilecekleri):
 *   bildirim  → telefona bildirim gönderir
 *   takvim    → telefonun takvimine etkinlik ekleme ekranını açar (kaydı sen onaylarsın)
 *   ses       → karakterin sesiyle bir şey okur
 *   yapayzeka → yapay zekâya kısa soru sorar (Groq anahtarı gerekir)
 * Dosya seçmek ve kendi verisini saklamak her sayfaya açıktır.
 */
(function () {
  const IZINLER = { bildirim: 'Bildirim gönderebilir', takvim: 'Takvime etkinlik önerebilir', ses: 'Sesli okuyabilir', yapayzeka: 'Yapay zekâya soru sorabilir' };
  const kok = id => '/ozellikler/' + id;
  const Paketler = {
    IZINLER,
    manifest(id) { return id ? Depo.okuJSON(kok(id) + '/manifest.json', null) : null; },
    kaydet(m) { Depo.yazJSON(kok(m.id) + '/manifest.json', m); },
    /** Onaylanan Atölye önerisinden yeni özellik: odaya yerleşir */
    olustur(o) {
      const id = 'f' + Date.now().toString(36);
      const m = {
        id, ad: String(o.ad || 'Özellik').slice(0, 24), ikon: o.ikon || 'sayfa', oda: o.oda || '', izinler: (o.izinler || []).filter(x => IZINLER[x]),
        istek: o.istek || '', ozet: o.ozet || '', surum: 1, surumler: [{ n: 1, z: Date.now(), not: 'İlk sürüm', uretici: o.uretici || '' }]
      };
      Depo.yaz(kok(id) + '/v1.html', o.html);
      Paketler.kaydet(m);
      const e = Ev.esyaEkle({ ad: m.ad, dosya: kok(id) + '/v1.html', ikon: m.ikon, oda: m.oda || undefined });
      const l = Ev.esyalar(); const x = l.find(k => k.id === e.id); if (x) { x.paket = id; Ev.esyalariKaydet(l); }
      e.paket = id;
      return e;
    },
    /** Var olan özelliğe yeni sürüm (eski sürüm saklanır) */
    yeniSurum(id, html, not, uretici) {
      const m = Paketler.manifest(id); if (!m) throw new Error('Özellik bulunamadı');
      const n = Math.max(...m.surumler.map(s => s.n)) + 1;
      Depo.yaz(kok(id) + '/v' + n + '.html', html);
      m.surumler.push({ n, z: Date.now(), not: String(not || '').slice(0, 120), uretici: uretici || '' });
      Paketler.etkinlestir(m, n);
      return n;
    },
    /** Bir sürüme dön (geri alma) */
    geriAl(id, n) { const m = Paketler.manifest(id); if (!m || !m.surumler.some(s => s.n === n)) return; Paketler.etkinlestir(m, n); },
    etkinlestir(m, n) {
      m.surum = n; Paketler.kaydet(m);
      const l = Ev.esyalar(); for (const e of l) if (e.paket === m.id) e.dosya = kok(m.id) + '/v' + n + '.html';
      Ev.esyalariKaydet(l);
    },
    /** Bir eşyanın (sayfanın) izinleri: Atölye paketi → manifest; hazır özellikler ve senin Laboratuvar'da yaptıkların → hepsi */
    izinler(e) {
      if (!e) return [];
      if (e.paket) { const m = Paketler.manifest(e.paket); return m ? m.izinler : []; }
      return Object.keys(IZINLER);
    },
    html(id) { const m = Paketler.manifest(id); return m ? Depo.oku(kok(id) + '/v' + m.surum + '.html') : null; }
  };
  window.Paketler = Paketler;
})();
