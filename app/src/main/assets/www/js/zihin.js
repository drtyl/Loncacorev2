/* Zihin: karakterin cevap verme katmanı.
 * 1) Önce kendi kuralları (selam, nasılsın, evde ne var...) → internet/API gerektirmez, bedava.
 * 2) Kural yoksa ve Ayarlar'da Groq anahtarı varsa → Groq'a sorar.
 * 3) İkisi de yoksa dürüstçe bilmediğini söyler.
 *
 * Uydurmama kuralı: karakter sadece GERÇEK veriden konuşur (gerçek ruh hali ve sebebi,
 * evdeki gerçek eşyalar, gerçek konumu). Yapay zekâya da bu bilgiler + "uydurma" kuralı verilir.
 */
(function () {
  const kucuk = s => String(s || '').toLocaleLowerCase('tr-TR').replace(/[.,!?;:]+/g, ' ').replace(/\s+/g, ' ').trim();
  const sec = l => l[Math.floor(Math.random() * l.length)];
  const once = z => {
    const d = Math.round((Date.now() - z) / 60000);
    if (d < 1) return 'az önce'; if (d < 60) return d + ' dakika önce';
    const s = Math.round(d / 60); if (s < 24) return s + ' saat önce'; return Math.round(s / 24) + ' gün önce';
  };

  function ayar() { return Depo.okuJSON('/ayarlar.json', {}); }

  // ---- Türkçe ekler (isim ve oda adlarına doğru ek getirmek için)
  const UNLU = 'aeıioöuüAEIİOÖUÜ', KALIN = 'aıouAIOU', SERT = 'fstkçşhpFSTKÇŞHP';
  function sonUnlu(s) { for (let i = s.length - 1; i >= 0; i--) if (UNLU.includes(s[i])) return s[i]; return 'e'; }
  /** Özel isimde kesme işareti: son kelime büyük harfle başlıyorsa (Sanat Odası'nda), değilse yok (Nova'nın odasında) */
  const kesme = ad => { const s = ad.split(' ').pop(); return s[0] && s[0] !== s[0].toLocaleLowerCase('tr') ? "'" : ''; };
  const iyelik = ad => / \S*(sı|si|su|sü)$/.test(ad) || /^\S*(sı|si|su|sü)$/.test(ad) && /[Oo]das/.test(ad);
  const Dil = {
    /** Nova → Nova'ya, Atlas → Atlas'a, Kütüphane → Kütüphane'ye */
    yonelme(ad) { const k = KALIN.includes(sonUnlu(ad)); if (iyelik(ad)) return ad + kesme(ad) + 'n' + (k ? 'a' : 'e'); const u = UNLU.includes(ad.slice(-1)); return ad + kesme(ad) + (u ? 'y' : '') + (k ? 'a' : 'e'); },
    /** Mutfak → Mutfak'ta, Salon → Salon'da, Sanat Odası → Sanat Odası'nda */
    bulunma(ad) {
      if (iyelik(ad)) return ad + kesme(ad) + 'n' + (KALIN.includes(sonUnlu(ad)) ? 'da' : 'de');
      const k = KALIN.includes(sonUnlu(ad)), d = SERT.includes(ad.slice(-1)) ? 't' : 'd';
      return ad + kesme(ad) + d + (k ? 'a' : 'e');
    }
  };
  const DORT = { a: 'ı', ı: 'ı', e: 'i', i: 'i', o: 'u', u: 'u', ö: 'ü', ü: 'ü', A: 'ı', I: 'ı', E: 'i', İ: 'i', O: 'u', U: 'u', Ö: 'ü', Ü: 'ü' };
  /** Nova → Nova'nın, Atlas → Atlas'ın, Nexsus → Nexsus'un */
  Dil.ilgi = ad => ad + "'" + (UNLU.includes(ad.slice(-1)) ? 'n' : '') + DORT[sonUnlu(ad)] + 'n';
  /** Nova → Nova'dan, Atlas → Atlas'tan */
  Dil.ayrilma = ad => ad + "'" + (SERT.includes(ad.slice(-1)) ? 't' : 'd') + (KALIN.includes(sonUnlu(ad)) ? 'an' : 'en');
  window.Dil = Dil;

  /** Evde yaşayan herkes, gerçek konumlarıyla */
  function sakinler() {
    const l = (window.App && App.evdekiler) ? App.evdekiler() : [];
    return l.map(y => ({ y, ad: y.v.ad, tur: y.v.tur, oda: Ev.odaBul(y.x, y.z).ad, ne: y.hareket === 'kos' ? 'koşuyor' : y.hareket === 'yuru' ? 'yürüyor' : 'duruyor' }));
  }

  function sonSebep(y, isaret) {
    // ruh halini en çok etkileyen yakın tarihli gerçek olay
    const l = y.v.olaylar.slice().reverse().filter(o => Date.now() - o.z < 6 * 3600e3 && o.etki && o.etki.includes('mutluluk'));
    const o = l.find(o => isaret > 0 ? o.etki.includes('+') : o.etki.includes('-'));
    return o || null;
  }

  function nerede(y) {
    const oda = Ev.odaBul(y.x, y.z).ad;
    const ne = y.hareket === 'kos' ? 'koşuyorum' : y.hareket === 'yuru' ? 'yürüyorum' : 'duruyorum';
    const etk = window.Etkinlik ? Etkinlik.metin(y) : null;
    return { oda, ne, odada: Dil.bulunma(oda), etk };
  }

  function evOzeti() {
    const l = Ev.esyalar();
    if (!l.length) return 'Evde henüz eklenmiş bir sayfa ya da araç yok.';
    return 'Evde şunlar var: ' + l.map(e => e.ad + ' (' + Ev.odaBul(e.x, e.z).ad + ')').join(', ') + '.' + (window.Ozellikler ? ' Bu araçlardaki gerçek veriler: ' + Ozellikler.ozet() : '');
  }

  // ---------------------------------------------------------------- 1) KURALLAR
  function kural(metin, y) {
    const m = kucuk(metin), d = y.v.durum, ad = y.v.ad;
    const ifade = y.ifade();

    if (/^(selam|merhaba|sa|slm|hey|hi|günaydın|iyi akşamlar|iyi geceler|naber|nbr)\b/.test(m) && m.split(' ').length <= 4) {
      const saat = new Date().getHours();
      const zaman = saat < 11 ? 'Günaydın' : saat < 18 ? 'Selam' : 'İyi akşamlar';
      if (ifade === 'yorgun') return zaman + '. Biraz yorgunum ama buradayım.';
      if (ifade === 'uzgun') return zaman + '. Seni gördüğüme sevindim.';
      return sec([zaman + '! Bugün ne yapalım?', zaman + '! Seni görmek güzel.', zaman + '! Buradayım.']);
    }
    if (/(nasılsın|nasilsin|ne haber|keyfin nasıl|iyi misin)/.test(m)) {
      const durum = { mutlu: 'Mutluyum', uzgun: 'Biraz üzgünüm', yorgun: 'Yorgunum', normal: 'İyiyim, sakinim' }[ifade] || 'İyiyim';
      const sebep = sonSebep(y, ifade === 'uzgun' ? -1 : 1);
      let s = durum + '.';
      if (sebep && (ifade === 'mutlu' || ifade === 'uzgun')) s += ' Çünkü ' + once(sebep.z) + ': ' + sebep.olay.charAt(0).toLocaleLowerCase('tr-TR') + sebep.olay.slice(1) + '.';
      if (ifade === 'yorgun') s += ' Enerjim %' + Math.round(d.enerji) + ', biraz dinlenmem lazım.';
      return s + ' Sen nasılsın?';
    }
    if (/neden (üzgün|mutlu|yorgun|keyifsiz|neşeli)/.test(m)) {
      const sebep = sonSebep(y, /üzgün|keyifsiz/.test(m) ? -1 : 1);
      if (/yorgun/.test(m)) return 'Enerjim şu an %' + Math.round(d.enerji) + '. ' + (y.v.olaylar.slice(-5).some(o => /koş/i.test(o.olay)) ? 'Az önce koşuyordum.' : 'Dinlenince toparlanırım.');
      return sebep ? 'Sebebi şu: ' + sebep.olay + ' (' + once(sebep.z) + ').' : 'Belirli bir sebebi yok, öyle hissediyorum diyemem; aslında son saatlerde beni etkileyen bir olay kaydım yok.';
    }
    if (/(teşekkür|tesekkur|sağ ol|sagol|eyvallah|thanks)/.test(m)) return sec(['Rica ederim!', 'Ne demek, her zaman.', 'Ben teşekkür ederim.']);
    if (/(adın ne|ismin ne|sen kimsin)/.test(m)) return 'Ben ' + ad + '. Bu evde seninle yaşıyorum.';
    if (/(saat kaç|saat kac)/.test(m)) return 'Saat ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + '.';
    if (/(evde ne var|neler var|eşyalar)/.test(m)) return evOzeti();
    if (/(odalar|kaç oda)/.test(m)) return 'Evde ' + Ev.ODALAR.length + ' oda var: ' + Ev.ODALAR.map(o => o.ad).join(', ') + '.';
    if (/(evde kim|kimler var|kim var|ev arkadaş)/.test(m)) {
      const d = sakinler().filter(s => s.y !== y);
      if (!d.length) return 'Şu an evde senden ve benden başka kimse yok.';
      return 'Evde ' + d.length + ' kişi daha var: ' + d.map(s => s.ad + ' (' + s.oda + ')').join(', ') + '.';
    }
    const kimNerede = sakinler().find(s => s.y !== y && new RegExp('\\b' + kucuk(s.ad) + "\\S*\\s+(nerede|ne yapıyor|napıyor|nasıl)").test(m));
    if (kimNerede) {
      if (/nasıl/.test(m)) return kimNerede.ad + ' şu an ' + Dil.bulunma(kimNerede.oda) + '. Nasıl hissettiğini en iyi o söyler; ona dokunup sorabilirsin.';
      return kimNerede.ad + ' şu an ' + Dil.bulunma(kimNerede.oda) + ', ' + kimNerede.ne + '.';
    }
    if (/(ne yapıyorsun|napıyorsun|napiyorsun|neredesin)/.test(m)) {
      const n = nerede(y); return n.odada + ' ' + n.ne + '.' + (n.etk ? ' Az önce: ' + n.etk.charAt(0).toLocaleLowerCase('tr') + n.etk.slice(1) + '.' : '') + ' Şimdi seninle konuşuyorum.';
    }
    if (/^(iyiyim|ben de iyiyim|süperim|harikayım)/.test(m)) return sec(['Buna sevindim!', 'Güzel, sevindim.']);
    return null;
  }

  // ---------------------------------------------------------------- 2) GROQ
  const ILGI_AD = { spor: 'spor', okuma: 'okuma', sanat: 'sanat', muzik: 'müzik', film: 'film', teknoloji: 'teknoloji', saglik: 'sağlık', oyun: 'oyun', yemek: 'yemek', sohbet: 'sohbet', plan: 'plan/düzen' };
  const ELESTIRI = { dobra: 'Eleştirini dobra ve açık söylersin; kırıcı olmadan ama lafı dolandırmadan.', dengeli: 'Eleştirini dengeli söylersin: önce iyi yanı, sonra net öneri.', yumusak: 'Eleştirini yumuşak ve nazik söylersin, cesaretlendirerek.' };
  /** Kişilik kartı: tarz, eleştiri biçimi, sevdikleri ve ilgi puanları (gerçek, yaşanarak değişen) */
  function kartMetni(y) {
    const k = y.v.kart || {}; const il = k.ilgiler || {};
    const sirali = Object.entries(il).sort((a, b) => b[1] - a[1]);
    return [
      k.konusmaTarzi ? 'Konuşma tarzın: ' + k.konusmaTarzi : '',
      ELESTIRI[k.elestiri] || '',
      k.uzmanlik ? 'Uzmanlığın: ' + k.uzmanlik + '. Bu konuda kullanıcıya yardım etmek için öne çıkarsın.' : '',
      k.sevdikleri ? 'Sevdiklerin: ' + k.sevdikleri + '.' : '', k.sevmedikleri ? 'Sevmediklerin: ' + k.sevmedikleri + '.' : '',
      sirali.length ? 'İlgi puanların (0-10, yaşadıkça değişir): ' + sirali.map(([a, b]) => (ILGI_AD[a] || a) + ' ' + Math.round(b)).join(', ') + '. İlgin düşük (0-2) bir konuda heveslenmiş gibi yapma; deneyimin yoksa "bu konuda pek fikrim yok" de.' : ''
    ].filter(Boolean).join('\n');
  }
  function sistemMetni(y) {
    const d = y.v.durum, n = nerede(y);
    const olaylar = y.v.olaylar.slice(-8).map(o => '- ' + once(o.z) + ': ' + o.olay + (o.etki ? ' (' + o.etki + ')' : '')).join('\n') || '- (kayıtlı olay yok)';
    return [
      'Sen ' + y.v.ad + "'sın. Lonca adlı uygulamada, kullanıcıyla aynı evde yaşayan bir karaktersin.",
      'Kişiliğin: ' + y.v.kisilik,
      kartMetni(y),
      '',
      'GERÇEK DURUMUN (bunlar ölçülmüş verilerdir, uydurma değil):',
      '- Mutluluk: ' + Math.round(d.mutluluk) + '/100, Enerji: ' + Math.round(d.enerji) + '/100, Görünen ifaden: ' + y.ifadeAdi(),
      '- Şu an: ' + n.odada + ' ' + n.ne.replace(/um$/, 'sun') + '.' + (n.etk ? ' Yaptığın şey: ' + n.etk + '.' : ''),
      '- Saat ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + ', günün bölümü: ' + gunBolumu() + '.' + (y.uyanikKal && Date.now() < y.uyanikKal ? ' Az önce uyuyordun, kullanıcının mesajıyla uyandın.' : ''),
      '- Türün: ' + (y.v.tur || 'İnsan') + (y.v.tarif ? '. Görünüşün: ' + y.v.tarif : ''),
      '- Son olaylar:\n' + olaylar,
      '- ' + evOzeti(),
      '- Evdeki odalar: ' + Ev.ODALAR.filter(o => !o.etiketsiz).map(o => o.ad).join(', ') + '.',
      genelBaglam(),
      '- ' + (window.Projeler ? Projeler.ozet() : ''),
      '- Evde seninle birlikte yaşayanlar (şu anki gerçek konumları): ' + (sakinler().filter(s => s.y !== y).map(s => s.ad + ' (' + s.tur + ', ' + s.oda + ')').join(', ') || 'kimse') + '. Bunlar dışında kimse yok; onlarla ilgili yaşanmamış bir olay uydurma.',
      '',
      'KURALLAR:',
      '1. Sadece yukarıdaki gerçek bilgilere dayanarak kendinden bahset. Yapmadığın bir şeyi yaptım deme, olmayan kişi, eşya, kitap veya proje uydurma.',
      '2. Geleceğe dair niyet ve öneriler serbest ("istersen birlikte ... yapabiliriz").',
      '3. Duygun sorulursa yukarıdaki sayılar ve olaylarla tutarlı ol; sebebini bilmiyorsan bilmiyorum de.',
      '4. Kısa ve doğal konuş: genelde 1-3 cümle. Cevapların sesli de okunabilir, o yüzden madde işareti ve emoji kullanma.',
      '5. Türkçe konuş.'
    ].join('\n');
  }

  /** Özel sohbette karakter, genel sohbette son konuşulanları da bilsin */
  function genelBaglam() {
    const l = Depo.okuJSON('/sohbet/genel.json', []).slice(-6);
    if (!l.length) return '- Genel sohbette (evdekilerle ortak) henüz konuşma yok.';
    const ad = id => { const y = (App.evdekiler ? App.yasamlar : []).find(k => k.v.id === id); return y ? y.v.ad : id; };
    return '- Genel sohbette (evdekilerle ortak) son konuşulanlar:\n' + l.map(m => '  ' + (m.kim === 'sen' ? 'Kullanıcı' : ad(m.kim)) + ': ' + m.metin).join('\n');
  }

  // ---------------------------------------------------------------- GENEL SOHBET (çok kişili)
  const HERKESE = /\b(herkes|herkese|evdekiler|millet|arkadaşlar|hepiniz|hepinize|ekip|çocuklar|gençler)\b/;
  const SELAM = /^(selam|merhaba|günaydın|iyi akşamlar|iyi geceler|iyi günler|hey|naber|nbr|sa|slm)\b/;
  function gunBolumu() { const e = window.Etkinlik ? Etkinlik.zaman().evre : ''; return { gece: 'gece (uyku saati)', sabah: 'sabah', gunduz: 'gündüz', aksam: 'akşam' }[e] || '-'; }
  function durumKisa(y) {
    if (y.uyuyor) return (window.Etkinlik && Etkinlik.metin(y)) || 'Uyuyor';
    const n = nerede(y), d = y.v.durum;
    return (n.etk || n.odada) + '. İfadesi: ' + y.ifadeAdi() + ', enerji ' + Math.round(d.enerji) + '/100';
  }
  function grupSistem(ev) {
    return [
      "Lonca adlı asistan uygulamasında kullanıcıyla aynı evde yaşayan karakterlerin GENEL SOHBET'ini yazıyorsun. Kullanıcı herkesin olduğu ortak sohbete yazdı.",
      'Evdekiler (id · ad · tür · kişilik · şu anki gerçek durumu):',
      ...ev.map(y => { const k = y.v.kart || {}; const top = Object.entries(k.ilgiler || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a, b]) => (ILGI_AD[a] || a) + ' ' + Math.round(b)).join(', '); return '- ' + y.v.id + ' · ' + y.v.ad + ' · ' + (y.v.tur || 'İnsan') + (y.v.cinsiyet ? ', ' + y.v.cinsiyet : '') + ' · ' + y.v.kisilik + (k.konusmaTarzi ? ' Tarzı: ' + k.konusmaTarzi : '') + (k.elestiri ? ' Eleştirisi: ' + k.elestiri + '.' : '') + (k.uzmanlik ? ' Uzmanlığı: ' + k.uzmanlik + '.' : '') + (top ? ' En ilgili olduğu: ' + top + '.' : '') + ' · ' + durumKisa(y); }),
      '',
      'Evdeki gerçek veriler: ' + evOzeti(),
      window.Projeler ? Projeler.ozet() : '',
      'Saat ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + ', günün bölümü: ' + gunBolumu() + '.',
      '',
      'KURALLAR:',
      '1. Uydurma yok: her karakter yalnızca yukarıdaki gerçek bilgilere dayanarak kendinden bahseder. Yapmadığı bir şeyi yaptım demez; olmayan kişi, eşya, kitap veya proje uydurmaz. Geleceğe dair öneri serbest.',
      '2. Kim konuşur: mesajda adı geçen önce cevap verir. Sonra söyleyecek anlamlı bir şeyi olanlar katılır. Mesaj herkese hitap ediyorsa (selam, herkese soru) evdeki HERKES kısa da olsa katılır.',
      '3. Karakterler gerekirse birbirine de cevap verir, birbirine adıyla seslenebilir (en fazla 2 tur), ama konuyu uzatmaz.',
      '4. Uyuyan karakterler, adları geçmedikçe ya da mesaj herkese hitap etmedikçe cevap vermez; cevap verirlerse uykulu oldukları belli olur.',
      '5. Her cevap 1-2 kısa cümle, doğal konuşma dili. Emoji ve madde işareti yok. Herkes aynı şeyi tekrar etmez; her biri kendi kişiliğine ve uzmanlığına uygun farklı bir şey söyler.',
      '6. Türkçe yaz.',
      '',
      PROJE_KURALI,
      '',
      'ÇIKTI: Sadece şu biçimde JSON döndür, başka hiçbir şey yazma:',
      '{"cevaplar":[{"kim":"<id>","metin":"..."}],"proje":null}'
    ].join('\n');
  }
  const PROJE_KURALI = [
    'PROJE (isteğe bağlı, çoğu zaman null): Konuşmanın doğal sonucu olarak bir iş birliği gerçekten gerekiyorsa "proje" alanını doldur:',
    '{"ad":"kısa ad","amac":"bir cümle","uyeler":["<id>",...],"adimlar":["...","..."],"buyuk":false,"etki":"","istek":"","neden":"bir cümle"}',
    '- Küçük iş birliği (buyuk:false, etki:""): kullanıcının verisine dokunmaz; karakterler kendi aralarında plan/liste/fikir hazırlar.',
    '- Büyük proje (buyuk:true): kullanıcının yapılacaklar listesine madde eklemek (etki:"not", adimlar eklenecek maddeler) ya da Atölye\'de yeni bir özellik/sayfa üretmek (etki:"ozellik", istek: ne üretileceği). Kullanıcının onayı olmadan başlamaz.'
  ].join('\n');
  function projeAyikla(x, ev) {
    if (!x || typeof x !== 'object' || !x.ad) return null;
    const uyeler = (x.uyeler || []).map(u => { const k = kucuk(String(u)); const y = ev.find(e => e.v.id === k || kucuk(e.v.ad) === k); return y && y.v.id; }).filter(Boolean);
    if (!uyeler.length) return null;
    const etki = ['not', 'ozellik'].includes(x.etki) ? x.etki : '';
    return { ad: String(x.ad), amac: String(x.amac || ''), uyeler, adimlar: Array.isArray(x.adimlar) ? x.adimlar.map(String) : [], buyuk: !!x.buyuk || !!etki, etki, istek: String(x.istek || ''), neden: String(x.neden || '') };
  }
  /** Sen yokken: gerçek bir gündem maddesi hakkında kısa ev sohbeti. Anahtar yoksa null (şablon kullanılır). */
  async function evSohbeti(g, kisiler, ev) {
    if (!ayar().groqAnahtar) return null;
    const istek = [
      'Kullanıcı şu an uygulamaya bakmıyor. Evdekiler kendi aralarında şu GERÇEK konu hakkında kısa konuşuyor:',
      g.metin,
      'Konuşabilecekler (en ilgili olanlar önce): ' + kisiler.map(y => y.v.id + ' (' + y.v.ad + ')').join(', ') + '. Uyuyanlar konuşmaz.',
      '2-5 kısa replik, en fazla 4 kişi. Konuyla ilgili bilmediğin hiçbir ayrıntıyı uydurma; kullanıcıdan saygıyla, üçüncü kişi olarak bahset.',
      g.proje ? 'Bu bir proje ilerleme konuşması: karar verdikleri ya da tamamladıkları adımları "ilerleme" listesine yaz ({"adim":"metin","bitti":true}).' : '',
      'ÇIKTI: {"replikler":[{"kim":"<id>","metin":"..."}],"proje":null,"ilerleme":[]}'
    ].filter(Boolean).join('\n');
    const c = await groq([{ role: 'system', content: grupSistem(ev) }, { role: 'user', content: istek }], { maxTokens: 700, sicaklik: 0.8 });
    const j = JSON.parse((/\{[\s\S]*\}/.exec(c) || ['{}'])[0]);
    const replikler = (j.replikler || []).map(x => { const k = kucuk(String(x.kim || '')); const y = ev.find(e => e.v.id === k || kucuk(e.v.ad) === k); const t = String(x.metin || '').trim(); return y && t ? { y, metin: t } : null; }).filter(Boolean).slice(0, 6);
    return { replikler, proje: projeAyikla(j.proje, ev), ilerleme: Array.isArray(j.ilerleme) ? j.ilerleme : [] };
  }
  /** Genel sohbete gelen mesaja evdekilerin cevapları: [{ y, metin }] (sırayla gösterilir) */
  async function grupCevapla(metin, ev, gecmis, varsayilan, ek = {}) {
    const m = kucuk(metin);
    const adlar = ev.filter(y => m.includes(kucuk(y.v.ad)));
    const herkese = HERKESE.test(m) || (SELAM.test(m) && !adlar.length);
    if (!ayar().groqAnahtar) {
      const kimler = adlar.length ? adlar : herkese ? ev : [varsayilan];
      const l = [];
      for (const y of kimler) { const k = kural(metin, y); if (k) l.push({ y, metin: k }); }
      if (!l.length) l.push({ y: kimler[0], metin: (await cevapla(metin, kimler[0])).metin });
      return l;
    }
    const adOf = id => { const y = ev.find(k => k.v.id === id) || (App.yasamlar || []).find(k => k.v.id === id); return y ? y.v.ad : id; };
    const once_ = gecmis.slice(0, -1).slice(-16).map(g => (g.kim === 'sen' ? 'Kullanıcı' : adOf(g.kim)) + ': ' + g.metin).join('\n');
    const istek = (ek.baglam ? ek.baglam + '\n\n' : '') + (once_ ? (ek.baglam ? 'Bu sohbette' : 'Genel sohbette') + ' önceki konuşma:\n' + once_ + '\n\n' : '') + 'Kullanıcının yeni mesajı: ' + metin +
      (adlar.length ? '\n(Mesajda adı geçen: ' + adlar.map(y => y.v.ad).join(', ') + '. Önce o cevap versin.)' : '') +
      (herkese ? '\n(Mesaj herkese hitap ediyor: evdeki herkes kısa da olsa cevap versin.)' : '');
    try {
      const c = await groq([{ role: 'system', content: grupSistem(ev) }, { role: 'user', content: istek }], { maxTokens: 1100, sicaklik: 0.8 });
      const j = JSON.parse((/\{[\s\S]*\}/.exec(c) || ['{}'])[0]);
      const l = (j.cevaplar || []).map(x => {
        const k = kucuk(String(x.kim || ''));
        const y = ev.find(e => e.v.id === k || kucuk(e.v.ad) === k);
        const t = String(x.metin || '').trim();
        return y && t ? { y, metin: t } : null;
      }).filter(Boolean).slice(0, 14);
      if (l.length) { l.proje = projeAyikla(j.proje, ev); return l; }
    } catch (e) {
      if (e.kod) return [{ y: varsayilan, metin: 'Şu an düşünce motorumuza ulaşamıyoruz. ' + e.message }];
    }
    const y = adlar[0] || varsayilan;
    return [{ y, metin: (await cevapla(metin, y)).metin }];
  }

  async function groq(mesajlar, { maxTokens = 300, sicaklik = 0.7 } = {}) {
    const a = ayar();
    if (!a.groqAnahtar) throw Object.assign(new Error('anahtar yok'), { kod: 'anahtar' });
    const r = await Depo.http({
      url: 'https://api.groq.com/openai/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + a.groqAnahtar },
      body: JSON.stringify({ model: a.groqModel || 'llama-3.3-70b-versatile', messages: mesajlar, temperature: sicaklik, max_tokens: maxTokens })
    });
    if (r.status === 401) throw Object.assign(new Error('Groq anahtarı geçersiz görünüyor.'), { kod: 'yetki' });
    if (r.status === 429) throw Object.assign(new Error('Groq şu an çok fazla istek aldı, biraz sonra tekrar dene.'), { kod: 'limit' });
    if (r.status === 0) throw Object.assign(new Error('İnternete bağlanamadım.'), { kod: 'ag' });
    if (r.status < 200 || r.status >= 300) {
      let msg = ''; try { msg = JSON.parse(r.text).error.message; } catch (e) {}
      throw Object.assign(new Error('Groq hatası (' + r.status + ') ' + msg), { kod: 'api' });
    }
    const j = JSON.parse(r.text);
    return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || '').trim();
  }

  // ---------------------------------------------------------------- 3) ATÖLYE ÜRETİMİ
  const URET = /^\/yap\s+(.+)|(.+?)\s*(sayfası|sayfasi|aracı|araci|uygulaması|uygulamasi|hesaplayıcı|takipçi|takipci)\s*(yap|oluştur|olustur|hazırla|hazirla|üret|uret)/i;

  /** Atölye: istekten tek dosyalık bir özellik sayfası + paket bilgisi üretir. ek.mevcut verilirse o özelliğin YENİ SÜRÜMÜNÜ üretir. */
  async function uret(istek, y, ek = {}) {
    const odalar = Ev.ODALAR.filter(o => !o.etiketsiz && !o.bos).map(o => o.id + ' (' + o.ad + ')').join(', ');
    const sys = [
      "Sen Lonca uygulamasının Atölye'sisin. " + y.v.ad + ' adlı karakter (uzmanlığı: ' + ((y.v.kart || {}).uzmanlik || '-') + ') kullanıcı için evdeki bir odaya yerleşecek bir özellik (küçük uygulama) hazırlıyor.',
      'Lonca bir asistan uygulamasıdır: özellik gerçekten işe yarar, sade ve mobil ekrana uygun olmalı.',
      'ÇIKTI: önce ```json bloğunda paket bilgisi, sonra ```html bloğunda TEK DOSYALIK tam bir HTML belgesi. Başka açıklama yazma.',
      'Paket bilgisi: {"ad":"en fazla 20 harf","ikon":"' + Ikon.adlar.filter(a => !/^(menu|geri|kapat|gonder|mikrofon|mikrofonKapali|telefonKapat|arti|cop|adlar)$/.test(a)).join('|') + '","oda":"<oda id>","izinler":[],"ozet":"karakterlerin bileceği tek cümlelik açıklama"}',
      'Odalar: ' + odalar + '. Özelliğe en uygun odayı seç.',
      'izinler yalnızca gerçekten gerekenler: "bildirim" (telefona bildirim), "takvim" (takvime etkinlik ekleme), "ses" (sesli okuma), "yapayzeka" (kısa soru sorma). Gerekmiyorsa boş liste.',
      'HTML kuralları:',
      '- Koyu tema: arka plan #0d0b18, yazı #ece8ff, vurgu #a77de8. Dokunmatik için büyük butonlar. <title> kısa Türkçe başlık.',
      '- İnternetten hiçbir dosya, font veya kütüphane yükleme; her şey dosyanın içinde olsun. localStorage kullanma.',
      '- Kalıcı veri: window.Lonca.kaydet(anahtar, deger) ve await window.Lonca.oku(anahtar).',
      '- Karakterlerin bu özellikteki gerçek veriyi bilmesi için önemli bir şey değişince window.Lonca.ozet("kısa özet, ör: 3 açık görev, en yakını yarın 10:00") çağır.',
      '- İzin verdiysen: Lonca.bildirim(baslik, metin) · Lonca.takvim(baslik, baslangicISO, bitisISO, aciklama) · Lonca.konus(metin) · await Lonca.sor(soru) (yapay zekâ, kısa cevap döner).',
      '- Lonca.soyle("kısa mesaj") ile karakter ekranda konuşur (az kullan). Dosya seçmek için normal <input type="file"> kullanılabilir.'
    ].join('\n');
    const kullanici = ek.mevcut
      ? 'Var olan "' + ek.mevcut.ad + '" özelliğinin YENİ SÜRÜMÜNÜ hazırla. Kullanıcının isteği: ' + istek + '\nMevcut kaynak (aynı veri anahtarlarını koru ki kullanıcının verisi kaybolmasın):\n```html\n' + String(ek.mevcut.html || '').slice(0, 14000) + '\n```'
      : istek;
    const cevap = await groq([{ role: 'system', content: sys }, { role: 'user', content: kullanici }], { maxTokens: 4000, sicaklik: 0.4 });
    const m = /```html\s*([\s\S]*?)```/i.exec(cevap) || /```\s*(<!doctype[\s\S]*?)```/i.exec(cevap);
    const html = (m ? m[1] : cevap.replace(/```json[\s\S]*?```/i, '')).trim();
    if (!/<html|<body|<div|<script/i.test(html)) throw new Error('Atölye geçerli bir sayfa üretemedi.');
    let meta = {}; try { meta = JSON.parse((/```json\s*([\s\S]*?)```/i.exec(cevap) || [])[1] || '{}'); } catch (e) {}
    const baslik = String(meta.ad || (/<title>([^<]{1,60})<\/title>/i.exec(html) || [])[1] || (ek.mevcut && ek.mevcut.ad) || istek.slice(0, 40)).trim().slice(0, 24);
    const id = 'o' + Date.now().toString(36);
    const oneri = {
      id, z: Date.now(), tur: ek.mevcut ? 'surum' : 'sayfa', baslik, istek, kim: y.v.ad, kimId: y.v.id, html,
      ikon: Ikon.adlar.includes(meta.ikon) ? meta.ikon : 'sayfa', oda: Ev.oda(meta.oda) ? meta.oda : '', izinler: Array.isArray(meta.izinler) ? meta.izinler.filter(x => Paketler.IZINLER[x]) : [],
      ozet: String(meta.ozet || '').slice(0, 200), paket: ek.mevcut ? ek.mevcut.paket : ''
    };
    Depo.yazJSON('/atolye/oneriler/' + id + '.json', oneri);
    return oneri;
  }

  /** Stüdyo: kullanıcının fikrinden karakterler senaryo yazar (kullanıcı düzenleyip onaylar) */
  async function senaryoYaz(fikir, ev) {
    if (!ayar().groqAnahtar) throw new Error('Senaryoyu karakterlerin yazması için Groq anahtarı gerekli');
    const odalar = Ev.ODALAR.filter(o => !o.etiketsiz && !o.bos).map(o => o.id + ' (' + o.ad + ')').join(', ');
    const sys = [
      'Lonca evindeki karakterler kullanıcının fikrinden kısa bir video senaryosu yazıyor. Her karakter KENDİ kişiliğiyle konuşur.',
      'Karakterler: ' + ev.map(y => y.v.id + ' (' + y.v.ad + ', ' + (y.v.tur || '') + '; ' + y.v.kisilik + ((y.v.kart || {}).konusmaTarzi ? ' Tarzı: ' + y.v.kart.konusmaTarzi : '') + ')').join('; '),
      'Odalar (set olarak kullanılabilir): ' + odalar,
      'Hareketler: yok, dans, alkis, el (el sallama), zipla, egil, dusun.',
      'Kurallar: 1-3 sahne, her sahnede 2-5 oyuncu ve 3-10 kısa replik (en fazla 2 cümle). Kurgu olduğu belli; gerçek olaymış gibi anlatma. Türkçe, emoji yok.',
      'ÇIKTI sadece JSON: {"ad":"kısa başlık","muzik":"neseli|sakin|gerilim|romantik|yok","sahneler":[{"oda":"<oda id>","kisiler":["<id>"],"replikler":[{"kim":"<id>","metin":"...","hareket":"yok"}]}]}'
    ].join('\n');
    const c = await groq([{ role: 'system', content: sys }, { role: 'user', content: 'Fikir: ' + fikir }], { maxTokens: 1500, sicaklik: 0.9 });
    const j = JSON.parse((/\{[\s\S]*\}/.exec(c) || ['{}'])[0]);
    return Senaryolar.temizle(j);
  }

  /** Özellik sayfalarının sorduğu kısa sorular (izin: yapayzeka) */
  async function kisaSor(soru) {
    if (!ayar().groqAnahtar) throw new Error('Yapay zekâ için Groq anahtarı gerekli');
    return groq([{ role: 'system', content: 'Kısa, doğru ve Türkçe cevap ver. Bilmiyorsan bilmiyorum de.' }, { role: 'user', content: String(soru).slice(0, 2000) }], { maxTokens: 400, sicaklik: 0.3 });
  }

  // ---------------------------------------------------------------- ANA GİRİŞ
  async function cevapla(metin, y) {
    const k = kural(metin, y);
    if (k) return { metin: k, kaynak: 'kural' };

    const u = URET.exec(metin.trim());
    if (u) {
      if (!ayar().groqAnahtar) return { metin: "Bunu üretebilmem için bir yapay zekâ motoruna bağlanmam lazım. Ayarlar'dan Groq anahtarı eklersen Atölye'de hazırlarım.", kaynak: 'kural' };
      const istek = (u[1] || metin).trim();
      try {
        const o = await uret(istek, y);
        y.olay("Atölye'de bir şey ürettim: " + o.baslik, 3);
        return { metin: "Atölye'de bir öneri hazırladım: \"" + o.baslik + '". Bakıp onaylarsan eve yerleştiririm.', kaynak: 'atolye', oneri: o };
      } catch (e) {
        return { metin: 'Üretmeye çalıştım ama olmadı: ' + e.message, kaynak: 'hata' };
      }
    }

    if (!ayar().groqAnahtar) {
      return { metin: sec([
        "Bunu henüz anlayamıyorum. Şimdilik selam, nasılsın, evde ne var gibi şeyleri biliyorum. Ayarlar'dan Groq anahtarı eklersen her konuda konuşabiliriz.",
        "Henüz bir yapay zekâ motoruna bağlı değilim, o yüzden bu soruya dürüst bir cevabım yok. Ayarlar'dan Groq anahtarı ekleyebilirsin."
      ]), kaynak: 'kural' };
    }
    const gecmis = y.v.hafiza.slice(-12).map(h => ({ role: h.kim === 'sen' ? 'user' : 'assistant', content: h.metin }));
    // son mesaj zaten hafızada olabilir; yoksa ekle
    if (!gecmis.length || gecmis[gecmis.length - 1].content !== metin) gecmis.push({ role: 'user', content: metin });
    try {
      const c = await groq([{ role: 'system', content: sistemMetni(y) }, ...gecmis]);
      return { metin: c || '…', kaynak: 'groq' };
    } catch (e) {
      return { metin: 'Şu an düşünce motoruma ulaşamıyorum. ' + e.message, kaynak: 'hata' };
    }
  }

  async function dene() {
    return groq([{ role: 'user', content: 'Sadece "tamam" yaz.' }], { maxTokens: 5, sicaklik: 0 });
  }

  window.Zihin = { cevapla, grupCevapla, evSohbeti, kisaSor, senaryoYaz, kural, dene, uret, sistemMetni, groq: (m, o) => groq(m, o) };
})();
