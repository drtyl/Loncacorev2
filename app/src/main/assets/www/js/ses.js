/* Ses: karakterin konuşması (TTS) ve seni dinlemesi (konuşma tanıma).
 * Telefonda Android'in kendi motorları (native köprü), tarayıcıda Web Speech API yedeği.
 */
(function () {
  const N = window.LoncaNative && typeof window.LoncaNative.konus === 'function' ? window.LoncaNative : null;
  let dinleyici = {};      // { sonuc, kismi, durum, hata, seviye }
  let konusmaBitince = null;
  let konusuyor = false;

  function konusmaBitti() {
    if (!konusuyor) return;
    konusuyor = false;
    Ses.onKonusma && Ses.onKonusma(false);
    const f = konusmaBitince; konusmaBitince = null; if (f) f();
  }

  // Native'den gelen olaylar
  window.__loncaSes = function (olay, veri) {
    switch (olay) {
      case 'konusmaBasladi': Ses.onKonusma && Ses.onKonusma(true); break;
      case 'konusmaBitti': konusmaBitti(); break;
      case 'seslerHazir': sesListesi = null; Ses.hazir && Ses.hazir(); break;
      case 'dinliyor': dinleyici.durum && dinleyici.durum('dinliyor'); break;
      case 'dusunuyor': dinleyici.durum && dinleyici.durum('duydum'); break;
      case 'seviye': dinleyici.seviye && dinleyici.seviye(parseFloat(veri) || 0); break;
      case 'kismi': dinleyici.kismi && dinleyici.kismi(veri); break;
      case 'sonuc': dinleyici.sonuc && dinleyici.sonuc(veri || ''); break;
      case 'dinlemeHatasi': dinleyici.hata && dinleyici.hata(parseInt(veri, 10) || 0, ''); break;
      case 'hata': dinleyici.hata && dinleyici.hata(-1, veri); break;
    }
  };

  // ---- telefondaki sesler ve cinsiyet tahmini (isimden; emin değilse "?")
  let sesListesi = null;
  function cinsiyetTahmin(ad) {
    const a = String(ad).toLowerCase();
    if (/female|kadın|kadin|emel|filiz|seda|yelda|zeynep|smtf|[-_#]f\d|#female/.test(a)) return 'Kadın';
    if (/\bmale|erkek|tolga|ahmet|cem\b|smtm|[-_#]m\d|#male|-mfs|-tmc|-trm/.test(a)) return 'Erkek';
    if (/-(cfs|efs|ama|tfs|sfs)/.test(a)) return 'Kadın';
    return '?';
  }
  function okunurAd(ad, i) {
    const c = cinsiyetTahmin(ad);
    return (c === 'Kadın' ? 'Kadın sesi' : c === 'Erkek' ? 'Erkek sesi' : 'Ses') + ' ' + (i + 1) + ' · ' + ad;
  }

  // Tarayıcı yedeği
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let tanima = null;

  const Ses = {
    onKonusma: null,
    destek() { return { konusma: !!N || 'speechSynthesis' in window, dinleme: !!N || !!SR }; },

    /** Telefondaki sesler: [{ ad, etiket, cinsiyet, internet }] */
    sesler() {
      if (sesListesi) return sesListesi;
      let l = [];
      try {
        if (N && N.sesler) l = JSON.parse(N.sesler()).data || [];
        else if ('speechSynthesis' in window) { const v = speechSynthesis.getVoices(); const tr = v.filter(x => /^tr/i.test(x.lang)); l = (tr.length ? tr : v).map(x => ({ ad: x.name, internet: !x.localService })); }
      } catch (e) { l = []; }
      l = l.map((x, i) => ({ ad: x.ad, internet: !!x.internet, cinsiyet: cinsiyetTahmin(x.ad), etiket: okunurAd(x.ad, i) }));
      if (l.length) sesListesi = l;
      return l;
    },
    cinsiyetTahmin,
    /** Karakterlere sesleri otomatik dağıtır: cinsiyete göre grup, aynı sesi paylaşanlar perde/hızla ayrışır, robot metalik.
     *  Kullanıcının elle seçtiği seslere dokunmaz (ses.elle = true). */
    otomatikDagit(yasamlar, zorla) {
      const l = Ses.sesler(); const sayac = {};
      for (const y of yasamlar) {
        const s = y.v.ses = Object.assign({ perde: 1, hiz: 1 }, y.v.ses);
        if (s.elle && !zorla) continue;
        const robot = /robot/i.test(y.v.tur || '');
        const cins = robot ? null : y.v.cinsiyet;
        let aday = l.filter(v => !v.internet && v.cinsiyet === cins);
        if (!aday.length) aday = l.filter(v => v.cinsiyet === cins);
        if (!aday.length) aday = l.filter(v => !v.internet);
        if (!aday.length) aday = l;
        const k = cins || 'robot'; sayac[k] = (sayac[k] || 0);
        s.sesAdi = aday.length ? aday[sayac[k] % aday.length].ad : '';
        sayac[k]++;
        s.efekt = robot ? 'robot' : '';
        if (zorla) s.elle = false;
        y.kirli = true;
      }
      return l.length;
    },

    /** Metni sesli okur; bitince söz (promise) çözülür. sesAyar: { perde, hiz, sesAdi, efekt }, kisi: konuşan (ağız hareketi için) */
    konus(metin, sesAyar = {}, kisi) {
      const { perde = 1.1, hiz = 1, sesAdi = '', efekt = '' } = sesAyar || {};
      Ses.aktifKisi = kisi || null;
      metin = String(metin || '').replace(/[*_#`>]/g, '').trim();
      return new Promise(ok => {
        if (!metin) return ok();
        Ses.sus();
        konusuyor = true; konusmaBitince = ok;
        // emniyet: motor hiç "bitti" demezse metin uzunluğuna göre kendimiz bitiririz
        const tahmini = 1500 + metin.length * 90 / hiz;
        setTimeout(() => { if (konusmaBitince === ok) konusmaBitti(); }, tahmini + 4000);
        if (N) { Ses.onKonusma && Ses.onKonusma(true); if (N.konusSes) N.konusSes(metin, perde, hiz, sesAdi, efekt); else N.konus(metin, perde, hiz); return; }
        if ('speechSynthesis' in window) {
          const u = new SpeechSynthesisUtterance(metin);
          u.lang = 'tr-TR'; u.pitch = efekt === 'robot' ? Math.max(0.1, perde * 0.6) : perde; u.rate = hiz;
          const v = sesAdi && speechSynthesis.getVoices().find(x => x.name === sesAdi); if (v) u.voice = v;
          u.onstart = () => Ses.onKonusma && Ses.onKonusma(true);
          u.onend = u.onerror = () => konusmaBitti();
          Ses.onKonusma && Ses.onKonusma(true);
          speechSynthesis.speak(u);
        } else {
          Ses.onKonusma && Ses.onKonusma(true);
          setTimeout(konusmaBitti, tahmini);
        }
      });
    },
    sus() {
      if (N) N.sus(); else if ('speechSynthesis' in window) speechSynthesis.cancel();
      konusmaBitti();
    },

    /** Bir kez dinler. Olaylar: durum, kismi, sonuc, hata, seviye */
    dinle(olaylar) {
      dinleyici = olaylar || {};
      if (N) { N.dinle(); return true; }
      if (!SR) { setTimeout(() => dinleyici.hata && dinleyici.hata(-1, 'Bu cihazda konuşma tanıma yok.'), 0); return false; }
      try {
        tanima = new SR(); tanima.lang = 'tr-TR'; tanima.interimResults = true; tanima.maxAlternatives = 1;
        let son = '';
        tanima.onstart = () => dinleyici.durum && dinleyici.durum('dinliyor');
        tanima.onresult = e => {
          const r = e.results[e.results.length - 1]; son = r[0].transcript;
          if (r.isFinal) dinleyici.sonuc && dinleyici.sonuc(son); else dinleyici.kismi && dinleyici.kismi(son);
        };
        tanima.onerror = e => dinleyici.hata && dinleyici.hata(e.error === 'no-speech' ? 6 : -1, e.error);
        tanima.start();
        return true;
      } catch (e) { dinleyici.hata && dinleyici.hata(-1, String(e)); return false; }
    },
    dinlemeyiBirak() {
      dinleyici = {};
      if (N) N.dinlemeyiBirak(); else if (tanima) { try { tanima.abort(); } catch (e) {} }
    },
    konusuyorMu() { return konusuyor; }
  };
  window.Ses = Ses;
})();
