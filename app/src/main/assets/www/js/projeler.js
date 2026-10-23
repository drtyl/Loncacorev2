/* Projeler: karakterlerin (ve senin) ortak işleri. Çalışma odasındaki "Projeler" simgesinden açılır.
 *
 * Kural (senin onayınla belirlendi):
 *   - KÜÇÜK iş birliği: senin verine dokunmaz (kendi aralarında plan, liste, fikir). Onaysız açılır, sana bildirim gelir, istersen katılırsın.
 *   - BÜYÜK proje: senin görevlerini/notlarını, takvimini, dosyalarını değiştirir ya da Atölye'de yeni özellik üretir. Senin onayınla başlar.
 *
 * Dosya: /projeler/<id>.json
 *   { id, ad, amac, tur: 'kucuk'|'buyuk', etki: ''|'ozellik'|'not', istek, durum: 'onay'|'aktif'|'bitti'|'red',
 *     olusturan: 'sen'|karakterId, neden, uyeler: [id], sen: bool, adimlar: [{metin, bitti}], mesajlar: [{z, kim, metin}], z }
 */
(function () {
  const KLASOR = '/projeler';
  const yol = id => KLASOR + '/' + id + '.json';
  const Projeler = {
    liste() {
      let l = [];
      try { l = Depo.liste(KLASOR).filter(d => !d.dir && d.name.endsWith('.json')).map(d => Depo.okuJSON(KLASOR + '/' + d.name, null)).filter(Boolean); } catch (e) {}
      return l.sort((a, b) => b.z - a.z);
    },
    bul(id) { return Depo.okuJSON(yol(id), null); },
    kaydet(p) { Depo.yazJSON(yol(p.id), p); },
    aktifler() { return Projeler.liste().filter(p => p.durum === 'aktif'); },
    onayBekleyenler() { return Projeler.liste().filter(p => p.durum === 'onay'); },
    /** Yeni proje. Karakter açtıysa: küçükse hemen aktif (bildirim), büyükse onay bekler. */
    olustur(o) {
      const ev = App.evdekiler().map(y => y.v.id);
      const uyeler = (o.uyeler || []).filter(id => ev.includes(id)).slice(0, 6);
      if (!o.ad || (!uyeler.length && o.olusturan !== 'sen')) return null;
      const buyuk = !!(o.buyuk || o.etki);
      const p = {
        id: 'p' + Date.now().toString(36), z: Date.now(), ad: String(o.ad).slice(0, 60), amac: String(o.amac || '').slice(0, 400),
        tur: buyuk ? 'buyuk' : 'kucuk', etki: o.etki || '', istek: String(o.istek || '').slice(0, 600),
        durum: o.olusturan === 'sen' ? 'aktif' : buyuk ? 'onay' : 'aktif',
        olusturan: o.olusturan || 'sen', neden: String(o.neden || '').slice(0, 300),
        uyeler, sen: o.olusturan === 'sen', adimlar: (o.adimlar || []).slice(0, 8).map(m => ({ metin: String(m).slice(0, 120), bitti: false })), mesajlar: []
      };
      Projeler.kaydet(p);
      const kim = (App.yasamlar.find(y => y.v.id === p.olusturan) || { v: { ad: 'Sen' } }).v.ad;
      for (const id of uyeler) { const y = App.yasamlar.find(k => k.v.id === id); if (y) y.olay((p.durum === 'onay' ? 'Onayına sunulan bir proje önerisine katıldım: ' : 'Yeni bir projeye katıldım: ') + p.ad, 3); }
      if (p.olusturan !== 'sen') {
        if (p.durum === 'onay') App.telefonBildirimi('Onayını bekleyen proje', kim + ' önerdi: ' + p.ad);
        else App.telefonBildirimi('Yeni küçük proje', kim + ' başlattı: ' + p.ad + ' (istersen katılabilirsin)');
      }
      App.projelerDegisti && App.projelerDegisti();
      return p;
    },
    /** Büyük projeyi onayla: etkisi uygulanır */
    async onayla(id) {
      const p = Projeler.bul(id); if (!p || p.durum !== 'onay') return;
      p.durum = 'aktif'; Projeler.kaydet(p);
      for (const uid of p.uyeler) { const y = App.yasamlar.find(k => k.v.id === uid); if (y) y.olay('Projemiz onaylandı: ' + p.ad, 8); }
      await Projeler.etkiUygula(p);
      App.projelerDegisti && App.projelerDegisti();
    },
    reddet(id) {
      const p = Projeler.bul(id); if (!p) return;
      p.durum = 'red'; Projeler.kaydet(p);
      for (const uid of p.uyeler) { const y = App.yasamlar.find(k => k.v.id === uid); if (y) y.olay('Proje önerimiz reddedildi: ' + p.ad, -3); }
      App.projelerDegisti && App.projelerDegisti();
    },
    bitir(id) { const p = Projeler.bul(id); if (!p) return; p.durum = 'bitti'; Projeler.kaydet(p); for (const uid of p.uyeler) { const y = App.yasamlar.find(k => k.v.id === uid); if (y) y.olay('Projemiz tamamlandı: ' + p.ad, 6); } App.projelerDegisti && App.projelerDegisti(); },
    katil(id, evet = true) { const p = Projeler.bul(id); if (!p) return; p.sen = evet; Projeler.kaydet(p); App.projelerDegisti && App.projelerDegisti(); },
    mesajEkle(id, m) { const p = Projeler.bul(id); if (!p) return; p.mesajlar.push(Object.assign({ z: Date.now() }, m)); if (p.mesajlar.length > 200) p.mesajlar.splice(0, p.mesajlar.length - 200); Projeler.kaydet(p); return p; },
    /** Onaylanan büyük projenin gerçek etkisi */
    async etkiUygula(p) {
      const y = App.yasamlar.find(k => k.v.id === p.uyeler[0]) || App.seciliYasam();
      if (p.etki === 'ozellik') {
        // Atölye'de üretilir; yine de eve girmeden önce önizleyip onaylarsın
        if (!App.ayar().groqAnahtar) { App.bildir("Özellik üretimi için Ayarlar'dan Groq anahtarı gerekli"); return; }
        try { const o = await Zihin.uret(p.istek || p.amac || p.ad, y); o.proje = p.id; Depo.yazJSON('/atolye/oneriler/' + o.id + '.json', o); App.telefonBildirimi('Atölye', '"' + o.baslik + '" hazır; bakıp onaylarsan eve yerleşir'); }
        catch (e) { App.bildir('Atölye üretemedi: ' + e.message); }
      } else if (p.etki === 'not') {
        const e = Ev.esyalar().find(e => e.dosya === '/ev/sayfalar/notlar.html');
        if (!e) return;
        const v = Ozellikler.veri(e.id); v.liste = v.liste || [];
        for (const a of p.adimlar) v.liste.push({ metin: a.metin, bitti: false });
        Depo.yazJSON('/ev/veri/' + e.id + '.json', v);
        App.bildir('Notlara ' + p.adimlar.length + ' madde eklendi');
      }
    },
    /** Zihin için kısa özet */
    ozet() {
      const a = Projeler.aktifler(), o = Projeler.onayBekleyenler();
      const ad = id => (App.yasamlar.find(y => y.v.id === id) || { v: { ad: id } }).v.ad;
      const s = [];
      if (a.length) s.push('Aktif projeler: ' + a.slice(0, 4).map(p => '"' + p.ad + '" (' + p.uyeler.map(ad).join(', ') + (p.sen ? ', kullanıcı da üye' : '') + '; ' + p.adimlar.filter(x => x.bitti).length + '/' + p.adimlar.length + ' adım)').join('; ') + '.');
      if (o.length) s.push('Kullanıcının onayını bekleyen: ' + o.map(p => '"' + p.ad + '"').join(', ') + '.');
      return s.join(' ') || 'Şu an aktif proje yok.';
    }
  };
  window.Projeler = Projeler;
})();
