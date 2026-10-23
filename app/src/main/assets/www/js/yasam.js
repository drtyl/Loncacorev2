/* Yaşam: karakterin evdeki hayatı. Bedeni çizmez, sadece "ne yapıyor, nasıl hissediyor" bilgisini tutar.
 * 3D sahne de, yedek 2D görünüm de bu bilgiyi okuyup çizer.
 *
 * Lonca kuralı: iç durum UYDURMA değildir. Mutluluk ve enerji gerçek olaylarla değişir
 * (dokunma, sohbet, koşma, dinlenme, yalnız kalma, önerisinin onaylanması...) ve her
 * değişim sebebiyle birlikte "olaylar" listesine yazılır. Karakter "neden?" sorusuna buradan cevap verir.
 */
(function () {
  const sinir = (v, a, b) => Math.max(a, Math.min(b, v));
  const aciFark = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

  const VARSAYILAN = (id) => {
    const t = (window.KARAKTERLER || []).find(k => k.id === id) || {};
    return {
      id,
      ad: t.ad || id,
      tur: t.tur || 'İnsan', cinsiyet: t.cinsiyet || '', tarif: t.tarif || '',
      gorunum: Object.assign({}, t.gorunum || { sac: '#3b2a20', sacStil: 'kisa', goz: '#5b3a8f', ust: '#7d5ba6', alt: '#2a2633' }),
      kisilik: t.kisilik || 'Sakin ve dürüst. Kısa ve doğal konuşur.',
      kart: JSON.parse(JSON.stringify(t.kart || { huy: t.kisilik || '', konusmaTarzi: '', elestiri: 'dengeli', sevdikleri: '', sevmedikleri: '', uzmanlik: '', ilgiler: {} })),
      portre: t.portre || '',      // sohbet/sesli ekranda gösterilen 2D görsel ('' = yok, 3D beden kullanılır)
      yuz: Object.assign({ x: 0.5, y: 0.09 }, t.yuz),
      sohbetGorunum: 'portre',     // 'portre' | '3d'
      ses: Object.assign({ perde: 1, hiz: 1 }, t.ses),
      evde: true,
      model: '',             // '' = hazır beden, yoksa /karakterler/<id>/<dosya>.vrm
      gardirop: [],          // kombinler (Gardırop)
      kiyafet: null,         // giyili kombinin görünüş alanları (şablon görünüşün üstüne)
      durum: { mutluluk: 62, enerji: 80 },
      olaylar: [],
      hafiza: [],            // { z, kim: 'sen'|'ben', metin }
      sonEtkilesim: Date.now()
    };
  };

  class Yasam {
    constructor(v) {
      this.v = v;
      const b = Ev.rastgeleBos();
      this.x = b.x; this.z = b.z; this.yaw = 0; this.hedefYaw = 0;
      this.yol = []; this.kosuyor = false; this.varisFn = null;
      this.faz = 0; this.t = 0; this.hareket = 'bekle';
      this.goz = 1; this._gozT = 0; this._gozSonraki = 2 + Math.random() * 3;
      this.agiz = 0; this.konusuyor = false;
      this.selamSure = 0; this.gecici = null; this.geciciSure = 0;
      this.sabit = false;     // sohbet/sesli/köşe modlarında yerinde durur, kameraya döner
      this.bosSure = 3;
      this._kayitSay = 0; this.kirli = false;
    }

    static yol(id) { return '/karakterler/' + id + '/karakter.json'; }
    static yukle(id) {
      const k = Depo.okuJSON(Yasam.yol(id), null);
      const v = VARSAYILAN(id);
      if (k) {
        // Kadrodaki karakterlerin görünüşü ve tarifi her zaman güncel şablondan gelir
        const sablon = (window.KARAKTERLER || []).find(t => t.id === id);
        const gor = sablon ? Object.assign({}, k.gorunum, sablon.gorunum) : Object.assign({}, v.gorunum, k.gorunum);
        const tarif = sablon ? v.tarif : (k.tarif || v.tarif);
        Object.assign(v, k);
        v.gorunum = gor; v.tarif = tarif;
        v.yuz = Object.assign({ x: 0.5, y: 0.09 }, v.yuz);
        v.durum = Object.assign({ mutluluk: 62, enerji: 80 }, k.durum);
        v.ses = Object.assign({ perde: 1, hiz: 1 }, k.ses);
        // kişilik kartı: senin düzenlediğin alanlar korunur, eksik ilgi konuları şablondan gelir
        const tk = VARSAYILAN(id).kart;
        v.kart = Object.assign({}, tk, k.kart || {}); v.kart.ilgiler = Object.assign({}, tk.ilgiler, (k.kart || {}).ilgiler || {});
        if (v.evde === undefined) v.evde = true;
      }
      const y = new Yasam(v);
      if (!k) y.kaydet();
      return y;
    }
    /** Kadrodaki tüm karakterler + kullanıcının sonradan eklediği (en fazla 10) */
    static hepsi() {
      const idler = (window.KARAKTERLER || []).map(k => k.id);
      try { for (const d of Depo.liste('/karakterler')) if (d.dir && !idler.includes(d.name) && Depo.var('/karakterler/' + d.name + '/karakter.json')) idler.push(d.name); } catch (e) {}
      return idler.slice(0, window.KARAKTER_SINIRI || 10).map(id => Yasam.yukle(id));
    }
    /** 10. (veya boş) yer için yeni karakter */
    static olustur(veri) {
      const id = (veri.ad || 'karakter').toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü]+/g, '').replace(/[çğıöşü]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }[c])) || ('k' + Date.now().toString(36));
      if (Depo.var(Yasam.yol(id))) throw new Error('Bu isimde bir karakter zaten var');
      const v = Object.assign(VARSAYILAN(id), veri, { id });
      Depo.yazJSON(Yasam.yol(id), v);
      return Yasam.yukle(id);
    }
    kaydet() { try { Depo.yazJSON(Yasam.yol(this.v.id), this.v); this.kirli = false; } catch (e) { console.warn(e); } }

    // ---------------- gerçek olaylar
    olay(metin, mut = 0, enj = 0) {
      const d = this.v.durum;
      d.mutluluk = Math.round(sinir(d.mutluluk + mut, 0, 100));
      d.enerji = Math.round(sinir(d.enerji + enj, 0, 100));
      const etki = [];
      if (mut) etki.push('mutluluk ' + (mut > 0 ? '+' : '') + mut);
      if (enj) etki.push('enerji ' + (enj > 0 ? '+' : '') + enj);
      this.v.olaylar.push({ z: Date.now(), olay: metin, etki: etki.join(', ') });
      if (this.v.olaylar.length > 30) this.v.olaylar.splice(0, this.v.olaylar.length - 30);
      this.kirli = true;
    }
    /** İlgi puanı (0–10) yaşanan gerçek bir şeyle yavaşça değişir */
    ilgiDegis(konu, miktar) {
      if (!konu) return;
      const l = this.v.kart.ilgiler; const eski = l[konu] || 0;
      l[konu] = Math.round(Math.max(0, Math.min(10, eski + miktar)) * 100) / 100;
      this.kirli = true;
    }
    ilgi(konu) { return (this.v.kart && this.v.kart.ilgiler[konu]) || 0; }
    etkilesim() { this.v.sonEtkilesim = Date.now(); this._yalniz = false; }
    hatirla(kim, metin) {
      this.v.hafiza.push({ z: Date.now(), kim, metin: String(metin).slice(0, 600) });
      if (this.v.hafiza.length > 60) this.v.hafiza.splice(0, this.v.hafiza.length - 60);
      this.kirli = true;
    }

    ifade() {
      if (this.gecici) return this.gecici;
      const d = this.v.durum;
      if (d.enerji <= 20) return 'yorgun';
      if (d.mutluluk >= 66) return 'mutlu';
      if (d.mutluluk <= 34) return 'uzgun';
      return 'normal';
    }
    ifadeAdi() { return { mutlu: 'Mutlu', uzgun: 'Üzgün', yorgun: 'Yorgun', normal: 'Sakin', saskin: 'Şaşkın' }[this.ifade()] || 'Sakin'; }
    geciciIfade(ad, sure) { this.gecici = ad; this.geciciSure = sure; }

    // ---------------- komutlar
    git(x, z, kos = false, varinca = null) {
      if (this.sabit) return;
      this.yol = Ev.yolBul(this.x, this.z, x, z);
      this.kosuyor = kos && this.v.durum.enerji > 12;
      this.varisFn = varinca;
      if (!this.yol.length && varinca) { this.varisFn = null; varinca(); }
    }
    dur() { this.yol = []; this.kosuyor = false; this.varisFn = null; }
    selam() { this.selamSure = 1.8; }
    /** Yatağına yatar (Etkinlik varınca çağırır) */
    uyu() { this.dur(); this.yatakPoz = Ev.yatakPoz(this.v.id); this.uyuyor = true; this.olay('Gece oldu, yatağıma yattım', 0); }
    /** Uyanır. Kullanıcı yazdıysa bir süre uyanık kalır, sonra yatağına döner. */
    uyan(sebep) {
      if (!this.uyuyor) return;
      this.uyuyor = false; this.yatakPoz = null; this.etkinlik = null; this._etkBekle = 0;
      if (sebep) { this.uyanikKal = Date.now() + 10 * 60000; this.olay(sebep, 0); }
    }
    /** Dokunulunca: durur, başını kaldırıp kameraya (sana) bakar; sn saniye sonra işine döner */
    dikkat(sn = 8) {
      if (this.uyuyor) return;
      if (this.sabit) { this.hedefYaw = 0; return; }
      this.dur(); this.hedefYaw = 0;
      this.bakiyor = Date.now() + sn * 1000;
      this.etkinlik = null; this._etkBekle = this.bakiyor;
    }
    sabitle(evet) {
      if (evet && this.uyuyor) this.uyan('Bana yazdın, uyandım');
      this.sabit = evet;
      if (evet) { this.dur(); this.hedefYaw = 0; }
      else this.bosSure = 2 + Math.random() * 3;
    }
    konus(evet) { this.konusuyor = evet; }
    /** Hareket şablonu kancası (dans, alkış, el sallama…). Bedenler y.animasyon'u okuyarak oynatır (sonraki sürüm). */
    hareketYap(ad, saniye = 3) { this.animasyon = { ad, bitis: Date.now() + saniye * 1000 }; }

    // ---------------- her kare
    guncelle(dt) {
      dt = Math.min(dt, 0.1);
      this.t += dt;
      const d = this.v.durum;

      // göz kırpma
      this._gozSonraki -= dt;
      if (this._gozSonraki <= 0) { this._gozT = 0.15; this._gozSonraki = 2 + Math.random() * 4; }
      if (this._gozT > 0) this._gozT -= dt;
      const acik = this.ifade() === 'yorgun' ? 0.45 : 1;
      this.goz = this.uyuyor ? 0 : this._gozT > 0 ? 0 : acik;

      if (this.geciciSure > 0 && (this.geciciSure -= dt) <= 0) this.gecici = null;
      if (this.selamSure > 0) this.selamSure -= dt;
      if (this.bakiyor && (Date.now() > this.bakiyor || this.yol.length)) this.bakiyor = 0;

      // ağız: konuşurken doğal görünen düzensiz açılıp kapanma
      if (this.konusuyor) {
        const n = Math.sin(this.t * 17) * 0.5 + Math.sin(this.t * 7.3) * 0.3 + Math.sin(this.t * 29) * 0.2;
        this.agiz = sinir(0.25 + n * 0.75, 0, 1);
      } else this.agiz += (0 - this.agiz) * Math.min(1, dt * 12);

      // yürüme
      if (this.yol.length) {
        const h = this.yol[0];
        const dx = h.x - this.x, dz = h.z - this.z, mes = Math.hypot(dx, dz);
        const yorgunluk = d.enerji < 20 ? 0.65 : 1;
        const hiz = (this.kosuyor ? 2.4 : 1.0) * yorgunluk;
        this.hedefYaw = Math.atan2(dx, dz);
        if (mes <= hiz * dt) {
          this.x = h.x; this.z = h.z; this.yol.shift();
          if (!this.yol.length) {
            this.kosuyor = false; this.bosSure = 4 + Math.random() * 7;
            const f = this.varisFn; this.varisFn = null; if (f) f();
          }
        } else { this.x += dx / mes * hiz * dt; this.z += dz / mes * hiz * dt; }
        this.faz += dt * (this.kosuyor ? 12 : 7) * yorgunluk;
        this.hareket = this.yol.length ? (this.kosuyor ? 'kos' : 'yuru') : 'bekle';
        if (this.kosuyor) {
          d.enerji = sinir(d.enerji - 3 * dt, 0, 100);
          if (d.enerji <= 10) { this.kosuyor = false; this.olay('Koşarken çok yoruldum'); }
        } else d.enerji = sinir(d.enerji - 0.15 * dt, 0, 100);
      } else {
        this.hareket = 'bekle'; this.faz = 0;
        d.enerji = sinir(d.enerji + 0.6 * dt, 0, 100); // dinlenince enerji gerçekten geri gelir
      }

      // yön: yumuşak dönüş
      this.yaw += aciFark(this.yaw, this.hedefYaw) * Math.min(1, dt * 8);

      // yalnızlık (10 dk etkileşim yoksa) gerçek bir olaydır
      if (!this._yalniz && Date.now() - this.v.sonEtkilesim > 10 * 60 * 1000) {
        this._yalniz = true; this.olay('Uzun süredir kimse benimle konuşmadı', -8);
      }

      // kendi başına yaşama: boş gezinme yok; gerçek veriye dayalı etkinlik seçer (etkinlik.js)
      if (!this.sabit && !this.yol.length && !this.konusuyor && window.Etkinlik) Etkinlik.tick(this);
      if (this.animasyon && Date.now() > this.animasyon.bitis) this.animasyon = null;

      this._kayitSay += dt;
      if (this._kayitSay > 15) { this._kayitSay = 0; this.kaydet(); }
    }
  }

  Yasam.VARSAYILAN = VARSAYILAN;
  /** Bedenin çizdiği görünüş: şablon görünüşü + giyili kombin */
  window.gorunumAl = v => Object.assign({}, v.gorunum || {}, v.kiyafet || {});
  window.Yasam = Yasam;
})();
