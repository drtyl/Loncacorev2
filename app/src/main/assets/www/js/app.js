/* App: her şeyi birbirine bağlayan katman.
 * Modlar: ev (tepeden ev) · sohbet (mesajlaşma, karakter solda) · sesli (sesli görüşme) · sayfa (karakter köşede)
 */
(function () {
  const $ = s => document.querySelector(s);
  const sec = l => l[Math.floor(Math.random() * l.length)];
  const App = window.App = {};

  // ---------------------------------------------------------------- ayarlar
  let ayarlar = Depo.okuJSON('/ayarlar.json', {});
  App.ayar = () => ayarlar;
  App.ayarYaz = p => { Object.assign(ayarlar, p); Depo.yazJSON('/ayarlar.json', ayarlar); };

  // ---------------------------------------------------------------- ilk kurulum
  function ilkKurulum() {
    if (Depo.var('/ev/esyalar.json')) return;
    Depo.klasor('/lab'); Depo.klasor('/atolye/oneriler'); Depo.klasor('/ev/veri');
    Depo.yaz('/ev/sayfalar/notlar.html', VARSAYILAN.notlar);
    Depo.yaz('/lab/ornek/merhaba.html', VARSAYILAN.merhaba);
    Depo.yaz('/lab/BENIOKU.md', VARSAYILAN.benioku);
    Ev.esyalariKaydet([]);
    Ev.esyaEkle({ ad: 'Notlar', dosya: '/ev/sayfalar/notlar.html', ikon: 'not' });
    App.ayarYaz({ evSurum: Ev.SURUM });
  }

  // ---------------------------------------------------------------- küçük arayüz yardımcıları
  let bildirimZ = null;
  App.bildir = metin => {
    const b = $('#bildirim'); b.textContent = metin; b.classList.remove('gizli');
    clearTimeout(bildirimZ); bildirimZ = setTimeout(() => b.classList.add('gizli'), 2600);
  };

  let sorKapat = null;
  /** Onay ya da metin sorar. varsayilan verilirse metin kutusu çıkar ve metin döner. */
  App.sor = (mesaj, evet = 'Tamam', varsayilan) => new Promise(ok => {
    const p = document.createElement('div'); p.className = 'sorPerde';
    const metinli = varsayilan !== undefined;
    p.innerHTML = `<div class="sorKutu"><p></p>${metinli ? '<input>' : ''}<div class="satir"><button class="kucukBtn" data-h="0">Vazgeç</button><button class="kucukBtn vurgu" data-h="1"></button></div></div>`;
    p.querySelector('p').textContent = mesaj; p.querySelector('[data-h="1"]').textContent = evet;
    const inp = p.querySelector('input'); if (inp) inp.value = varsayilan;
    const bitir = v => { p.remove(); sorKapat = null; ok(v); };
    sorKapat = () => bitir(metinli ? null : false);
    p.querySelector('[data-h="0"]').onclick = () => bitir(metinli ? null : false);
    p.querySelector('[data-h="1"]').onclick = () => bitir(metinli ? (inp.value.trim() || null) : true);
    if (inp) inp.onkeydown = e => { if (e.key === 'Enter') bitir(inp.value.trim() || null); };
    document.body.appendChild(p); if (inp) setTimeout(() => inp.focus(), 50);
  });

  /** Seçenek listesi: [{ ad, fn, tehlike }] — dokunulanı çalıştırır */
  App.secenek = (baslik, liste) => new Promise(ok => {
    const p = document.createElement('div'); p.className = 'sorPerde';
    p.innerHTML = '<div class="sorKutu secenekKutu"><p></p><div class="secenekler"></div><div class="satir"><button class="kucukBtn" data-h="0">Kapat</button></div></div>';
    p.querySelector('p').textContent = baslik;
    const bitir = v => { p.remove(); sorKapat = null; ok(v); };
    for (const s of liste) { const b = document.createElement('button'); b.className = 'secenek' + (s.tehlike ? ' tehlike' : ''); b.textContent = s.ad; b.onclick = () => { bitir(s); s.fn && s.fn(); }; p.querySelector('.secenekler').appendChild(b); }
    sorKapat = () => bitir(null);
    p.querySelector('[data-h="0"]').onclick = () => bitir(null);
    document.body.appendChild(p);
  });

  /** Eve yerleştirirken ad ve ikon sorar */
  App.esyaSor = baslik => new Promise(ok => {
    const p = document.createElement('div'); p.className = 'sorPerde';
    const ikonlar = ['sayfa', 'not', 'gorev', 'kitap', 'muzik', 'proje', 'resim', 'ayar'];
    let secili = 'sayfa';
    p.innerHTML = `<div class="sorKutu"><p>Eve yerleştir</p>
      <label class="alan">Evde görünecek adı</label><input maxlength="24">
      <label class="alan">İkon</label><div class="ikonSec">${ikonlar.map(i => `<button data-i="${i}" class="${i === secili ? 'secili' : ''}">${Ikon.svg(i)}</button>`).join('')}</div>
      <div class="satir"><button class="kucukBtn" data-h="0">Vazgeç</button><button class="kucukBtn vurgu" data-h="1">Yerleştir</button></div></div>`;
    const inp = p.querySelector('input'); inp.value = baslik;
    p.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { secili = b.dataset.i; p.querySelectorAll('[data-i]').forEach(x => x.classList.toggle('secili', x === b)); });
    const bitir = v => { p.remove(); sorKapat = null; ok(v); };
    sorKapat = () => bitir(null);
    p.querySelector('[data-h="0"]').onclick = () => bitir(null);
    p.querySelector('[data-h="1"]').onclick = () => bitir(inp.value.trim() ? { ad: inp.value.trim(), ikon: secili } : null);
    document.body.appendChild(p);
  });

  // ---------------------------------------------------------------- karakterler ve sahne
  ilkKurulum();
  if (ayarlar.evSurum !== Ev.SURUM) { Ev.tasi(); App.ayarYaz({ evSurum: Ev.SURUM }); }   // eski 2 odalı evden geçiş
  try { Ozellikler.kur(); } catch (e) { console.warn('Oda özellikleri kurulamadı', e); }
  document.body.classList.toggle('etiketAdli', !!ayarlar.etiketAd);
  const hepsi = App.yasamlar = Yasam.hepsi();
  App.evdekiler = () => hepsi.filter(y => y.v.evde);
  let yasam = hepsi.find(y => y.v.id === ayarlar.secili && y.v.evde) || hepsi.find(y => y.v.id === 'nova' && y.v.evde) || App.evdekiler()[0] || hepsi[0];
  if (!yasam.v.evde) { yasam.v.evde = true; yasam.kaydet(); }
  Object.defineProperty(App, 'yasam', { get: () => yasam });
  App.seciliYasam = () => yasam;

  const cb = {
    // zemin: tek dokunuş bir şey yapmaz (sadece kaydır/yakınlaştır); çift dokunuş o odaya yakınlaşır
    zemineDokun: (x, z, cift) => { ipucuGizle(); if (cift) odaCiftDokun(x, z); },
    yuvayaDokun: odaId => App.yuvaIste(odaId),
    karaktereDokun: id => karaktereDokun(id),
    esyayaDokun: id => esyayaDokun(id)
  };
  let sahne = null;
  try {
    if (!window.Sahne3D) throw new Error('3D kütüphaneleri yok');
    sahne = new Sahne3D($('#sahneKap'), $('#etiketler'), App.evdekiler(), cb);
    sahne.sec(yasam.v.id);
    sahne.kur(ayarlar);
  } catch (e) {
    console.warn('3D başlatılamadı, 2D yedek kullanılıyor:', e);
    $('#sahneKap').querySelectorAll('canvas').forEach(c => c.remove());
    $('#etiketler').innerHTML = '';
    sahne = new Sahne2D($('#sahneKap'), $('#etiketler'), App.evdekiler(), cb);
    sahne.sec(yasam.v.id);
    sahne.kur(ayarlar);
  }
  App.sahne = sahne;
  if (window.ResizeObserver) new ResizeObserver(() => sahne.boyutla()).observe($('#sahneKap'));
  window.addEventListener('resize', () => sahne.boyutla());

  // ---------------------------------------------------------------- 3D bedenler (VRM)
  // Kaynak: "asset:modeller/nova.vrm" (uygulamayla gelen) ya da "/karakterler/nova/..." (telefondaki dosya)
  const b64Buf = b64 => { const bin = atob(b64), buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i); return buf.buffer; };
  App.modelVerisi = kaynak => new Promise((ok, hata) => {
    if (!kaynak.startsWith('asset:')) { const b64 = Depo.okuB64(kaynak); return b64 ? ok(b64Buf(b64)) : hata(new Error('Dosya bulunamadı')); }
    const yol = kaynak.slice(6);
    const yedek = () => {
      try { if (window.LoncaNative && LoncaNative.assetBase64) { const r = JSON.parse(LoncaNative.assetBase64('www/' + yol)); if (r.ok) return ok(b64Buf(r.data)); return hata(new Error(r.error)); } } catch (e) { return hata(e); }
      hata(new Error('Model okunamadı: ' + yol));
    };
    try {
      const x = new XMLHttpRequest(); x.open('GET', yol); x.responseType = 'arraybuffer';
      x.onload = () => (x.status === 200 || x.status === 0) && x.response && x.response.byteLength ? ok(x.response) : yedek();
      x.onerror = yedek; x.send();
    } catch (e) { yedek(); }
  });
  /** Uygulamayla gelen hazır modeli olan karakterler */
  App.hazirModel = id => (window.KARAKTERLER || []).some(k => k.id === id && k.model) ? 'asset:modeller/' + id + '.vrm' : null;
  /** Karakterin şu an giymesi gereken 3D beden: giyili 3D kıyafet > yüklediğin model > hazır model; hafif modda yok */
  App.bedenKaynagi = y => {
    if ((ayarlar.beden || 'vrm') === 'chibi' || !sahne.modelYukle || sahne.yedek) return null;
    const k = (y.v.gardirop3d || []).find(k => k.id === y.v.giyili3d);
    return (k && k.model) || y.v.model || App.hazirModel(y.v.id);
  };
  App.modelYukle = (id, kaynak) => App.modelVerisi(kaynak).then(buf => sahne.modelYukle(id, buf));
  /** Bedeni güncel kaynağına göre (yeniden) kurar */
  App.bedenKur = y => {
    const k = App.bedenKaynagi(y);
    if (!k) { if (y._bedenKaynak) { y._bedenKaynak = null; sahne.modeliKaldir(y.v.id); } return Promise.resolve(); }
    if (y._bedenKaynak === k) return Promise.resolve();
    return App.modelYukle(y.v.id, k).then(() => { y._bedenKaynak = k; App.yuzUnut && App.yuzUnut(y.v.id); })
      .catch(e => { console.warn(e); App.bildir(y.v.ad + ' için 3D beden yüklenemedi (' + e.message + ')'); });
  };
  /** Hepsini sırayla (telefon belleği için birer birer) */
  App.bedenleriKur = async () => { for (const y of App.evdekiler()) { await App.bedenKur(y); await new Promise(r => setTimeout(r, 60)); } };
  setTimeout(() => App.bedenleriKur(), 600);

  /** Konuşulan (seçili) karakteri değiştir */
  App.karakterSec = id => {
    const y = hepsi.find(k => k.v.id === id);
    if (!y || !y.v.evde || y === yasam) return;
    yasam.konus(false); yasam.sabitle(false);
    yasam = y;
    sahne.sec(id); App.ayarYaz({ secili: id });
    App.portreGuncelle();
    if (mod !== 'ev') yasam.sabitle(true); else sahne.odakla(y.x, y.z);
    App.basligiGuncelle();
    if (mod === 'sohbet') App.mesajlariCiz();
  };
  /** Bir karakteri evden çıkar / eve al */
  App.evdeAyarla = (id, evet) => {
    const y = hepsi.find(k => k.v.id === id); if (!y) return false;
    if (!evet && App.evdekiler().length <= 1) { App.bildir('Evde en az bir karakter kalmalı'); return false; }
    y.v.evde = evet; y.kaydet();
    if (evet) { sahne.karakterEkle(y); y._bedenKaynak = null; App.bedenKur(y); }
    else { sahne.karakterCikar(id); if (y === yasam) App.karakterSec(App.evdekiler()[0].v.id); }
    return true;
  };
  App.karakterEkle = y => { hepsi.push(y); sahne.karakterEkle(y); };

  /** Karakter seçici (başlığa dokununca) */
  App.karakterSor = () => new Promise(ok => {
    const p = document.createElement('div'); p.className = 'sorPerde';
    p.innerHTML = '<div class="sorKutu"><p>Kime yazacaksın?</p><div class="karakterListe"></div><div class="satir"><button class="kucukBtn" data-h="0">Kapat</button></div></div>';
    const liste = p.querySelector('.karakterListe');
    const g = document.createElement('button'); g.className = 'karakterSatir' + (App.sohbet.tur === 'genel' ? ' secili' : '');
    g.innerHTML = '<i style="background:var(--neon)"></i><b>Evdekiler</b><span>Genel sohbet</span>';
    g.onclick = () => { bitir(); App.sohbetTurAyarla('genel'); };
    liste.appendChild(g);
    for (const pr of Projeler.aktifler()) {
      const b = document.createElement('button'); b.className = 'karakterSatir' + (App.sohbet.tur === 'proje' && App.sohbet.proje === pr.id ? ' secili' : '');
      b.innerHTML = '<i style="background:#e8a33d"></i><b></b><span>Proje</span>'; b.querySelector('b').textContent = pr.ad;
      b.onclick = () => { bitir(); App.projeSohbeti(pr.id); };
      liste.appendChild(b);
    }
    for (const y of App.evdekiler()) {
      const b = document.createElement('button'); b.className = 'karakterSatir' + (App.sohbet.tur === 'ozel' && y === yasam ? ' secili' : '');
      b.innerHTML = '<i></i><b></b><span></span>';
      b.querySelector('i').style.background = y.v.gorunum.serit || y.v.gorunum.ust || '#a77de8';
      b.querySelector('b').textContent = y.v.ad;
      b.querySelector('span').textContent = Ev.odaBul(y.x, y.z).ad + ' · ' + y.ifadeAdi();
      b.onclick = () => { bitir(); App.ozelSohbet(y.v.id); };
      liste.appendChild(b);
    }
    const bitir = () => { p.remove(); sorKapat = null; ok(); };
    sorKapat = bitir;
    p.querySelector('[data-h="0"]').onclick = bitir;
    document.body.appendChild(p);
  });
  $('#sohbetTur').onclick = () => App.karakterSor();

  // ---------------------------------------------------------------- 2D portre
  const portreOnbellek = {};
  App.portreKaynak = y => {
    const p = y.v.portre; if (!p) return null;
    if (!p.startsWith('/')) return p;                       // uygulamayla gelen görsel (portre/nova.webp)
    if (!(p in portreOnbellek)) portreOnbellek[p] = Depo.dataURL(p);
    return portreOnbellek[p];
  };
  App.portreUnut = yol => { delete portreOnbellek[yol]; };
  let portreSrc = null, portreIfade = '';
  App.portreGuncelle = () => {
    const el = $('#portre'), img = el.querySelector('img');
    const src = (yasam.v.sohbetGorunum === '3d' || mod === 'sohbet') ? null : App.portreKaynak(yasam);
    $('#govde').classList.toggle('portreVar', !!src);
    sahne.portreModu && sahne.portreModu(!!src);
    if (!src) { portreSrc = null; return; }
    if (src !== portreSrc) {
      portreSrc = src;
      img.onload = () => koseYuzu();
      img.src = src;
      el.style.setProperty('--portre', 'url("' + src + '")');
    } else koseYuzu();
  };
  /** Köşedeki yuvarlakta portrenin yüz kısmını göster */
  function koseYuzu() {
    const el = $('#portre'), img = el.querySelector('img');
    if (!img.naturalWidth) return;
    const D = 78, nw = img.naturalWidth, nh = img.naturalHeight, yz = yasam.v.yuz || { x: 0.5, y: 0.09 };
    const k = (D * 1.1) / (nh * 0.15);
    el.style.backgroundSize = (nw * k) + 'px ' + (nh * k) + 'px';
    el.style.backgroundPosition = (D / 2 - yz.x * nw * k) + 'px ' + (D / 2 - yz.y * nh * k + 4) + 'px';
  }
  $('#portre').onclick = () => karaktereDokun(yasam.v.id);

  // ---------------------------------------------------------------- modlar
  let mod = 'ev', aktifEsya = null;
  App.mod = () => mod;

  function modAyarla(m) {
    const onceki = mod;
    mod = m;
    $('#govde').className = 'mod-' + m;
    document.body.dataset.mod = m;
    App.portreGuncelle();
    document.body.classList.toggle('gizliGiris', m === 'sesli' || m === 'sayfa');
    yasam.sabitle(m === 'sesli' || m === 'sayfa' || (m === 'sohbet' && App.sohbet.tur === 'ozel'));
    if (m === 'sohbet' && App.sohbet.tur !== 'ozel' && sonKonusan) sahne.sec(sonKonusan.v.id); else sahne.sec(yasam.v.id);
    sahne.mod(m === 'sayfa' ? 'kose' : m);
    App.basligiGuncelle();
    if (m === 'sohbet') { App.mesajlariCiz(); $('#mesajlar').style.transform = ''; }
    if (m === 'ev' && onceki === 'sohbet') { $('#mesaj').blur(); for (const y of sohbetSabit) if (y !== yasam || App.sohbet.tur !== 'ozel') y.sabitle(false); sohbetSabit.clear(); yasam.sabitle(false); }
    if (m === 'sohbet' && App.sohbet.tur !== 'ozel') { const k = sonKonusan || yasam; k.sabitle(true); sohbetSabit.add(k); }
    if (m === 'sesli') balonGizle();
  }
  let sonKonusan = null;
  const sohbetSabit = new Set();
  App.modAyarla = modAyarla;

  // ---------------------------------------------------------------- sohbet türü: genel (evdekiler) · özel (tek karakter)
  App.sohbet = { tur: 'genel' };
  let ozelDonus = null;
  App.projeSohbeti = id => { App.sohbet.proje = id; App.sohbetTurAyarla('proje'); modAyarla('sohbet'); };
  App.sohbetTurAyarla = (tur) => {
    clearTimeout(ozelDonus);
    App.sohbet.tur = tur;
    if (mod === 'sohbet') { yasam.sabitle(tur === 'ozel'); sahne.sec(tur !== 'ozel' && sonKonusan ? sonKonusan.v.id : yasam.v.id); App.mesajlariCiz(); }
    App.basligiGuncelle();
  };
  /** Bir karakterle özel sohbet. ac=true ise panel hemen açılır; değilse yazı kutusu ona döner, yazmazsan birkaç saniye sonra genele geri döner */
  App.ozelSohbet = (id, ac) => {
    App.karakterSec(id);
    App.sohbetTurAyarla('ozel');
    if (ac) { modAyarla('sohbet'); return; }
    if (mod === 'ev') ozelDonus = setTimeout(() => { if (mod === 'ev' && document.activeElement !== $('#mesaj')) App.sohbetTurAyarla('genel'); }, 8000);
  };
  const karakterRengi = y => y.v.gorunum.serit || y.v.gorunum.ust || '#a77de8';
  /** Koyu karakter renklerini koyu zeminde okunur yapar (beyazla karıştırır) */
  const acikRenk = hex => { const n = parseInt(String(hex).replace('#', '').padEnd(6, '0').slice(0, 6), 16); const k = c => Math.round(c + (255 - c) * 0.55); return 'rgb(' + k(n >> 16 & 255) + ',' + k(n >> 8 & 255) + ',' + k(n & 255) + ')'; };

  App.basligiGuncelle = () => {
    const ad = yasam.v.ad, ozel = App.sohbet.tur === 'ozel';
    const geri = $('#geriBtn'), eylem = $('#eylemBtn'), tam = mod === 'sesli' || mod === 'sayfa';
    geri.classList.toggle('gizli', !tam);
    eylem.classList.toggle('gizli', !tam);
    $('#sohbetTur').classList.toggle('gizli', tam);
    $('#baslikYazi').classList.toggle('gizli', !tam);
    const chip = $('#sohbetTur');
    chip.classList.toggle('ozel', ozel);
    chip.style.setProperty('--renk', ozel ? karakterRengi(yasam) : 'var(--neon)');
    const proje = App.sohbet.tur === 'proje' ? Projeler.bul(App.sohbet.proje) : null;
    chip.querySelector('span').textContent = ozel ? 'Özel · ' + ad : proje ? 'Proje · ' + proje.ad : 'Genel';
    if (proje) chip.style.setProperty('--renk', '#e8a33d');
    $('#mesaj').placeholder = ozel ? Dil.yonelme(ad) + ' yaz…' : proje ? 'Proje ekibine yaz…' : 'Evdekilere yaz…';
    $('#sohbetBaslik').textContent = ozel ? ad + ' ile özel sohbet' : proje ? 'Proje · ' + proje.ad : 'Genel sohbet · evdekiler';
    if (mod === 'sesli') { $('#baslikYazi').textContent = 'Sesli · ' + ad; eylem.innerHTML = Ikon.svg('mesaj'); eylem.setAttribute('aria-label', 'Mesajlaşmaya geç'); }
    else if (mod === 'sayfa') { $('#baslikYazi').textContent = aktifEsya ? aktifEsya.ad : 'Sayfa'; eylem.innerHTML = Ikon.svg('cop'); eylem.setAttribute('aria-label', 'Evden kaldır'); }
  };
  const saatYaz = () => { $('#saat').textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); };
  saatYaz(); setInterval(saatYaz, 15000);

  function geri() {
    if (mod === 'sesli') return sesliBitir();
    if (mod === 'sayfa') { aktifEsya = null; $('#sayfaIframe').srcdoc = ''; }
    modAyarla('ev');
  }

  $('#geriBtn').innerHTML = Ikon.svg('geri');
  $('#geriBtn').onclick = geri;
  $('#eylemBtn').onclick = async () => {
    if (mod === 'sohbet') sesliBaslat();
    else if (mod === 'sesli') sesliBitir('sohbet');
    else if (mod === 'sayfa' && aktifEsya) {
      if (!(await App.sor('"' + aktifEsya.ad + '" evden kaldırılsın mı? Dosyası Laboratuvar\'da kalır.', 'Kaldır'))) return;
      Ozellikler.kaldirildi(aktifEsya.id); Ev.esyaSil(aktifEsya.id); sahne.esyalariYenile(); aktifEsya = null; modAyarla('ev'); App.bildir('Evden kaldırıldı');
    }
  };

  // ---------------------------------------------------------------- konuşma balonu
  let balonZ = null;
  App.balon = (metin, sure) => {
    if (mod === 'sohbet' || mod === 'sesli') return;
    $('#balonYazi').textContent = metin; $('#balon').classList.remove('gizli');
    clearTimeout(balonZ); balonZ = setTimeout(balonGizle, sure || Math.min(9000, 2200 + metin.length * 60));
  };
  function balonGizle() { $('#balon').classList.add('gizli'); }
  function balonKonumla() {
    const b = $('#balon'); if (b.classList.contains('gizli')) return;
    const g = $('#govde');
    if (mod === 'sayfa') {
      b.classList.add('sagda');
      b.style.transform = `translate(${g.clientWidth - 14}px, ${g.clientHeight - 104}px) translate(-100%, -100%)`;
    } else {
      b.classList.remove('sagda');
      const p = sahne.basEkranda(); if (!p) return;
      const yarim = b.offsetWidth / 2 + 8;
      const x = Math.max(yarim, Math.min(g.clientWidth - yarim, p.x));
      b.style.transform = `translate(${x}px, ${p.y - 10}px) translate(-50%, -100%)`;
    }
  }

  // karakter konuşurken ağız hareketi: sesli okuma varsa ses motoru, yoksa metin uzunluğu belirler
  Ses.onKonusma = f => (Ses.aktifKisi || yasam).konus(f);
  // sesleri karakterlere dağıt (ilk açılışta ve telefon sesleri hazır olunca; elle seçtiklerine dokunmaz)
  Ses.hazir = () => { if (Ses.otomatikDagit(hepsi)) hepsi.forEach(y => y.kaydet()); };
  setTimeout(Ses.hazir, 1500);
  if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => Ses.hazir();
  let agizZ = null;
  App.konus = (metin, sesli) => {
    if (sesli) return Ses.konus(metin, yasam.v.ses, yasam);
    yasam.konus(true); clearTimeout(agizZ);
    agizZ = setTimeout(() => yasam.konus(false), Math.min(6000, 500 + metin.length * 45));
    return Promise.resolve();
  };

  // ---------------------------------------------------------------- dokunma
  let ipucuGitti = false;
  function ipucuGizle() { if (!ipucuGitti) { ipucuGitti = true; $('#ipucu').style.opacity = 0; } }
  setTimeout(ipucuGizle, 9000);

  let sonDokunmaOlayi = 0;
  function karaktereDokun(id) {
    if (id && id !== yasam.v.id) App.karakterSec(id);
    yasam.etkilesim(); ipucuGizle();
    if (mod === 'sayfa') { App.sohbetTurAyarla('ozel'); return modAyarla('sohbet'); }
    if (mod === 'sohbet') { if (App.sohbet.tur !== 'ozel') App.sohbetTurAyarla('ozel'); return; }
    if (mod !== 'ev') return;
    // durur, başını kaldırıp sana bakar: "Hıh?" — başka hiçbir şey açılmaz; yazarsan özel sohbet başlar
    yasam.dikkat(8);
    const s = yasam.uyuyor ? 'Zzz…' : ((window.KARAKTERLER || []).find(k => k.id === yasam.v.id) || {}).hih || 'Hıh?';
    App.balon(s, 1800); App.konus(s);
    App.ozelSohbet(yasam.v.id);
    if (Date.now() - sonDokunmaOlayi > 60000) { sonDokunmaOlayi = Date.now(); yasam.olay('Bana dokundun, dönüp sana baktım', 2); }
  }
  function odaCiftDokun(x, z) {
    const o = Ev.odaBul(x, z), k = sahne.evKam;
    const hedef = Math.max(8, Math.max(o.x1 - o.x0, o.z1 - o.z0) * 2);
    const icinde = k && k.hd <= hedef + 0.5 && Math.hypot(k.hx - (o.x0 + o.x1) / 2, k.hz - (o.z0 + o.z1) / 2) < 1;
    if (icinde && sahne.zoom) sahne.zoom(sahne.evMaks * 0.42); else App.odayaGit(o);
  }

  function esyayaDokun(id) {
    const e = Ev.esyaBul(id); if (!e) return;
    ipucuGizle();
    // özellik hemen açılır; kimse yürümez
    if (e.ozel === 'atolye') return Panel.ac('atolye');
    if (e.ozel === 'projeler') return Panel.ac('projeler');
    if (e.ozel === 'studyo') return Panel.ac('studyo');
    if (e.ozel === 'gardirop') return Gardirop.ac(e.sahip || yasam.v.id);
    sayfaAc(e);
  }
  /** Odadaki boş yuvaya ("+") dokununca: Atölye'de o oda için özellik iste */
  App.yuvaIste = odaId => { Panel.Atolye.hedefOda = odaId; Panel.ac('atolye'); };

  App.esyaAc = id => { if (mod !== 'ev') modAyarla('ev'); esyayaDokun(id); };
  App.odayaGit = o => { if (mod !== 'ev') modAyarla('ev'); if (sahne.zoom) sahne.zoom(Math.max(8, Math.max(o.x1 - o.x0, o.z1 - o.z0) * 2)); if (sahne.odakla) sahne.odakla((o.x0 + o.x1) / 2, (o.z0 + o.z1) / 2); };

  // ---------------------------------------------------------------- sayfalar (kum havuzu + Lonca API)
  // Sayfaların (özelliklerin) gördüğü köprü. Her çağrı postMessage ile uygulamaya gelir; izinler paketin manifest'inden denetlenir.
  const LONCA_API = `<script>(function(){var n=0,w={};function g(t,o){return new Promise(function(r,j){var id=++n;w[id]=[r,j];o=o||{};o.lonca=1;o.tur=t;o.id=id;parent.postMessage(o,'*')})}
window.Lonca={kaydet:function(k,v){parent.postMessage({lonca:1,tur:'kaydet',anahtar:String(k),deger:v},'*')},oku:function(k){return g('oku',{anahtar:String(k)})},
soyle:function(m){parent.postMessage({lonca:1,tur:'soyle',metin:String(m).slice(0,200)},'*')},olay:function(t,v){parent.postMessage({lonca:1,tur:'olay',olay:String(t).slice(0,40),veri:v||{}},'*')},
ac:function(u){parent.postMessage({lonca:1,tur:'ac',url:String(u).slice(0,2000)},'*')},ozet:function(m){parent.postMessage({lonca:1,tur:'ozet',metin:String(m).slice(0,300)},'*')},
bildirim:function(b,m){return g('bildirim',{baslik:String(b).slice(0,80),metin:String(m||'').slice(0,300)})},takvim:function(b,s,e,a){return g('takvim',{baslik:String(b).slice(0,120),bas:String(s),bit:String(e||''),aciklama:String(a||'').slice(0,500)})},
konus:function(m){return g('konus',{metin:String(m).slice(0,400)})},sor:function(q){return g('sor',{soru:String(q).slice(0,2000)})}};
addEventListener('message',function(e){var d=e.data;if(d&&d.lonca&&d.tur==='cevap'&&w[d.id]){if(d.hata)w[d.id][1](new Error(d.hata));else w[d.id][0](d.deger);delete w[d.id]}})})();<\/script>`;

  function hazirla(html, yol) {
    const klasor = (yol || '/').replace(/[^/]*$/, '');
    html = String(html || '').replace(/(src|href)\s*=\s*"([^"]+)"/gi, (m, at, url) => {
      if (/^(https?:|data:|#|javascript:|mailto:|blob:)/i.test(url)) return m;
      const p = Depo.norm(url.startsWith('/') ? url : klasor + url);
      if (!Depo.var(p)) return m;
      const d = Depo.dataURL(p);
      return d ? at + '="' + d + '"' : m;
    });
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, h => h + LONCA_API);
    return LONCA_API + html;
  }

  function sayfaAc(e) {
    const html = Depo.oku(e.dosya);
    if (html === null) { App.bildir('Dosya bulunamadı: ' + e.dosya); return; }
    aktifEsya = e;
    $('#sayfaIframe').srcdoc = hazirla(html, e.dosya);
    modAyarla('sayfa');
  }
  App.sayfaAc = sayfaAc;

  App.onizle = (yol, baslik) => App.onizleHtml(Depo.oku(yol) || '', baslik, yol);
  App.onizleHtml = (html, baslik, yol) => {
    $('#onizlemeBaslik').textContent = 'Önizleme · ' + (baslik || '');
    $('#onizlemeIframe').srcdoc = hazirla(html, yol || '/atolye/');
    $('#onizleme').classList.remove('gizli');
  };
  $('#onizlemeKapat').innerHTML = Ikon.svg('kapat');
  $('#onizlemeKapat').onclick = () => { $('#onizleme').classList.add('gizli'); $('#onizlemeIframe').srcdoc = ''; };

  window.addEventListener('message', ev => {
    const d = ev.data; if (!d || !d.lonca) return;
    const sayfa = $('#sayfaIframe').contentWindow, oniz = $('#onizlemeIframe').contentWindow;
    if (ev.source !== sayfa && ev.source !== oniz) return;
    const veriYolu = '/ev/veri/' + (ev.source === sayfa && aktifEsya ? aktifEsya.id : 'onizleme') + '.json';
    if (d.tur === 'kaydet') { const v = Depo.okuJSON(veriYolu, {}); v[d.anahtar] = d.deger; Depo.yazJSON(veriYolu, v); }
    else if (d.tur === 'oku') { const v = Depo.okuJSON(veriYolu, {}); ev.source.postMessage({ lonca: 1, tur: 'cevap', id: d.id, deger: v[d.anahtar] === undefined ? null : v[d.anahtar] }, '*'); }
    else if (d.tur === 'ozet' && ev.source === sayfa && aktifEsya) { const v = Depo.okuJSON(veriYolu, {}); v.__ozet = d.metin; Depo.yazJSON(veriYolu, v); }
    else if (['bildirim', 'takvim', 'konus', 'sor'].includes(d.tur)) {
      const cevap = (deger, hata) => ev.source.postMessage({ lonca: 1, tur: 'cevap', id: d.id, deger: deger === undefined ? null : deger, hata: hata || '' }, '*');
      const esya = ev.source === sayfa ? aktifEsya : null;
      const izin = { bildirim: 'bildirim', takvim: 'takvim', konus: 'ses', sor: 'yapayzeka' }[d.tur];
      if (esya && !Paketler.izinler(esya).includes(izin)) return cevap(null, 'Bu özelliğin "' + izin + '" izni yok');
      const ad = esya ? esya.ad : 'Önizleme';
      if (d.tur === 'bildirim') { if (window.LoncaNative && LoncaNative.bildirim) LoncaNative.bildirim(ad + ': ' + d.baslik, d.metin, 'ozellik-' + ad); else App.bildir(d.baslik + (d.metin ? ': ' + d.metin : '')); cevap(true); }
      else if (d.tur === 'takvim') {
        const bas = Date.parse(d.bas), bit = Date.parse(d.bit) || bas + 3600000;
        if (!bas) return cevap(null, 'Geçersiz tarih');
        if (window.LoncaNative && LoncaNative.takvimEkle) { const r = JSON.parse(LoncaNative.takvimEkle(d.baslik, bas, bit, d.aciklama)); r.ok ? cevap(true) : cevap(null, r.error); }
        else { App.bildir('Takvim (telefonda açılır): ' + d.baslik + ' · ' + new Date(bas).toLocaleString('tr-TR')); cevap(true); }
      }
      else if (d.tur === 'konus') { Ses.konus(d.metin, yasam.v.ses, yasam).then(() => cevap(true)); App.balon(d.metin); }
      else if (d.tur === 'sor') Zihin.kisaSor(d.soru).then(t => cevap(t), e => cevap(null, e.message));
    }
    else if (d.tur === 'soyle' && ev.source === sayfa) { App.balon(d.metin); App.konus(d.metin); }
    else if (d.tur === 'olay' && ev.source === sayfa && window.Etkinlik) { try { Etkinlik.olay(d.olay, JSON.parse(JSON.stringify(d.veri || {}))); } catch (e) { console.warn(e); } }
    else if (d.tur === 'ac' && /^https?:\/\//i.test(d.url)) { if (window.LoncaNative) location.href = d.url; else window.open(d.url, '_blank'); }
  });

  App.esyaEklendi = e => {
    sahne.esyalariYenile(); Panel.kapat();
    if (mod !== 'ev') modAyarla('ev');
    yasam.olay('Eve yeni bir şey eklendi: ' + e.ad, 4);
    yasam.etkilesim();
    yasam.git(e.x, e.z, yasam.v.durum.enerji > 30, () => { yasam.selam(); App.balon('Yeni bir şey! ' + e.ad); });
    App.bildir('"' + e.ad + '" eve yerleştirildi');
  };
  App.esyalarDegisti = () => sahne.esyalariYenile();

  // ---------------------------------------------------------------- sohbet
  const sohbetSaati = z => new Date(z).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  // ---- karakter yüzleri (sohbetteki yuvarlaklar): 3D sahneden çekilir, birkaç dakika saklanır
  const yuzler = {};
  App.yuz = y => {
    const k = yuzler[y.v.id];
    if (k && Date.now() - k.z < 180000) return k.src;
    let src = null; try { src = sahne.yuzResmi ? sahne.yuzResmi(y.v.id) : null; } catch (e) { console.warn(e); }
    yuzler[y.v.id] = { src, z: Date.now() }; return src;
  };
  App.yuzUnut = id => { delete yuzler[id]; };
  function yuzEl(y, sinif) {
    const el = document.createElement('span'); el.className = sinif; el.style.setProperty('--renk', karakterRengi(y));
    const src = App.yuz(y);
    if (src) el.style.backgroundImage = 'url("' + src + '")'; else el.textContent = y.v.ad[0];
    return el;
  }
  function katilimcilariCiz() {
    const k = $('#katilimcilar'); k.innerHTML = '';
    if (App.sohbet.tur === 'ozel') { k.classList.add('gizli'); return; }
    k.classList.remove('gizli');
    const p = App.sohbet.tur === 'proje' ? Projeler.bul(App.sohbet.proje) : null;
    for (const y of App.evdekiler().filter(y => !p || p.uyeler.includes(y.v.id))) { const el = yuzEl(y, 'katYuz'); el.dataset.k = y.v.id; el.title = y.v.ad; el.onclick = () => { sahne.sec(y.v.id); sonKonusan = y; y.sabitle(true); sohbetSabit.add(y); katilimciVurgula(); }; k.appendChild(el); }
    katilimciVurgula();
  }
  function katilimciVurgula(yaziyor) {
    document.querySelectorAll('#katilimcilar .katYuz').forEach(el => { el.classList.toggle('sahnede', !!sonKonusan && el.dataset.k === sonKonusan.v.id); el.classList.toggle('yaziyor', el.dataset.k === yaziyor); });
  }
  function mesajDom(kim, metin, z, kisi) {
    const d = document.createElement('div'); d.className = 'msj ' + kim + (kisi ? ' kisili' : '');
    if (kisi) {
      d.style.setProperty('--renk', karakterRengi(kisi));
      d.appendChild(yuzEl(kisi, 'msjYuz'));
      const n = document.createElement('b'); n.className = 'msjAd'; n.textContent = kisi.v.ad; n.style.color = acikRenk(karakterRengi(kisi)); d.appendChild(n);
    }
    d.appendChild(document.createTextNode(metin));
    if (kim !== 'sistem') { const s = document.createElement('small'); s.textContent = sohbetSaati(z || Date.now()); d.appendChild(s); }
    $('#mesajListe').appendChild(d);
    $('#mesajListe').scrollTop = 1e9;
  }
  // Genel sohbet kaydı (evdekilerle ortak). v0.6'da çok kişili cevaplar buraya gelecek.
  const GENEL_YOL = '/sohbet/genel.json';
  const genelOku = () => Depo.okuJSON(GENEL_YOL, []);
  function genelEkle(m) { const l = genelOku(); l.push(Object.assign({ z: Date.now() }, m)); Depo.yazJSON(GENEL_YOL, l.slice(-300)); return l; }
  App.mesajlariCiz = () => {
    $('#mesajListe').innerHTML = '';
    katilimcilariCiz();
    if (App.sohbet.tur === 'genel') {
      const l = genelOku().slice(-60);
      if (!l.length) mesajDom('sistem', 'Burası evdekilerin ortak sohbeti. Herkese yazarsan herkes katılır, birinin adını yazarsan önce o cevap verir.');
      let oncekiKonu = null;
      l.forEach(m => {
        if (m.yokken && m.konu !== oncekiKonu) mesajDom('sistem', 'Sen yokken · ' + (m.konu || 'evde'));
        oncekiKonu = m.yokken ? m.konu : null;
        mesajDom(m.kim === 'sen' ? 'sen' : 'ben', m.metin, m.z, m.kim === 'sen' ? null : hepsi.find(y => y.v.id === m.kim));
      });
      if (ayarlar.yokkenOkunmamis && mod === 'sohbet') { App.ayarYaz({ yokkenOkunmamis: 0 }); yokkenRozeti(); }
      return;
    }
    if (App.sohbet.tur === 'proje') {
      const p = Projeler.bul(App.sohbet.proje);
      if (!p) { mesajDom('sistem', 'Proje bulunamadı.'); return; }
      mesajDom('sistem', 'Proje: ' + p.ad + (p.amac ? ' · ' + p.amac : ''));
      p.mesajlar.slice(-50).forEach(m => mesajDom(m.kim === 'sen' ? 'sen' : 'ben', m.metin, m.z, m.kim === 'sen' ? null : hepsi.find(y => y.v.id === m.kim)));
      return;
    }
    const h = yasam.v.hafiza.slice(-40);
    if (!h.length) mesajDom('sistem', yasam.v.ad + ' ile özel sohbetin burada görünür. Başkaları göremez.');
    h.forEach(m => mesajDom(m.kim, m.metin, m.z));
  };
  function mesajEkle(kim, metin) { yasam.hatirla(kim, metin); if (mod === 'sohbet' || mod === 'sesli') mesajDom(kim, metin); }

  /** Çok kişili sohbet (genel ya da proje): adı geçen önce, sonra söyleyecek sözü olanlar; herkese yazılırsa herkes. */
  const bekle = ms => new Promise(r => setTimeout(r, ms));
  let genelMesgul = false;
  const gorunurTur = () => mod === 'sohbet' ? (App.sohbet.tur === 'proje' ? 'proje:' + App.sohbet.proje : App.sohbet.tur) : '';
  async function grupKonusmasi({ metin, uyeler, gecmis, ekle, anahtar, baglam }) {
    const yz = $('#yaziyor');
    for (const y of uyeler) y.etkilesim();
    yz.querySelector('span').textContent = (anahtar === 'genel' ? 'Evdekiler' : 'Proje ekibi') + ' düşünüyor…'; yz.classList.remove('gizli');
    genelMesgul = true;
    let cevaplar;
    try { cevaplar = await Zihin.grupCevapla(metin, uyeler, gecmis, uyeler.includes(yasam) ? yasam : uyeler[0], { baglam }); }
    catch (e) { console.warn(e); cevaplar = [{ y: uyeler[0], metin: 'Bir sorun oldu: ' + e.message }]; }
    const konusanlar = new Set();
    for (const c of cevaplar) {
      const y = c.y;
      if (y.uyuyor) y.uyan('Gece bize yazdın, uyandım');
      yz.querySelector('span').textContent = y.v.ad + ' yazıyor…'; yz.classList.remove('gizli'); katilimciVurgula(y.v.id);
      await bekle(Math.min(1600, 450 + c.metin.length * 12));
      yz.classList.add('gizli');
      ekle({ kim: y.v.id, metin: c.metin });
      if (!konusanlar.has(y)) { konusanlar.add(y); y.olay(anahtar === 'genel' ? 'Genel sohbette konuştuk' : 'Proje sohbetinde konuştuk', 1); }
      sonKonusan = y;
      if (gorunurTur() === anahtar) {
        y.sabitle(true); sahne.sec(y.v.id); katilimciVurgula();
        mesajDom('ben', c.metin, Date.now(), y);
        if (ayarlar.mesajSesli) await Ses.konus(c.metin, y.v.ses, y);
        else { y.konus(true); await bekle(Math.min(3500, 400 + c.metin.length * 40)); y.konus(false); }
      }
    }
    yz.classList.add('gizli'); katilimciVurgula(); genelMesgul = false;
    for (const y of konusanlar) y.kaydet();
    if (cevaplar.proje) {
      const p = Projeler.olustur(Object.assign({ olusturan: cevaplar[0].y.v.id }, cevaplar.proje));
      if (p && gorunurTur() === anahtar) mesajDom('sistem', p.durum === 'onay' ? cevaplar[0].y.v.ad + ' bir proje önerdi: "' + p.ad + '". Senin onayını bekliyor (Çalışma odası → Projeler).' : '"' + p.ad + '" adında küçük bir proje başladı. İstersen katılabilirsin (Çalışma odası → Projeler).');
    }
    // sohbet ekranı açık kaldıkça konuşan karakter yerinde durur (sana görünsün); ekrandan çıkınca işine döner
    for (const y of konusanlar) sohbetSabit.add(y);
    setTimeout(() => { if (mod === 'sohbet') return; for (const y of konusanlar) if (!genelMesgul) { y.sabitle(false); sohbetSabit.delete(y); } }, 5000);
    return cevaplar;
  }
  async function genelCevapla(metin) {
    genelEkle({ kim: 'sen', metin }); mesajDom('sen', metin);
    return grupKonusmasi({ metin, uyeler: App.evdekiler(), gecmis: genelOku().slice(-17), ekle: m => genelEkle(m), anahtar: 'genel' });
  }
  async function projeCevapla(metin) {
    const p = Projeler.bul(App.sohbet.proje); if (!p) return;
    Projeler.mesajEkle(p.id, { kim: 'sen', metin }); mesajDom('sen', metin);
    if (!p.sen) Projeler.katil(p.id, true);
    const ad = id => (hepsi.find(y => y.v.id === id) || { v: { ad: id } }).v.ad;
    const uyeler = App.evdekiler().filter(y => p.uyeler.includes(y.v.id));
    if (!uyeler.length) return;
    const baglam = 'Bu bir PROJE sohbeti. Proje: "' + p.ad + '". Amaç: ' + (p.amac || '-') + '. Üyeler: ' + uyeler.map(y => y.v.ad).join(', ') + ' ve kullanıcı. Adımlar: ' + (p.adimlar.map(a => (a.bitti ? '[tamam] ' : '[ ] ') + a.metin).join('; ') || 'henüz yok') + '. Sadece üyeler cevap verir; konu bu proje.';
    return grupKonusmasi({ metin, uyeler, gecmis: Projeler.bul(p.id).mesajlar.slice(-17), ekle: m => Projeler.mesajEkle(p.id, m), anahtar: 'proje:' + p.id, baglam });
  }
  /** Sen yokken konuşulanlar genel sohbete düşer; tek bildirim, sayı güncellenir */
  App.genelYokkenEkle = (y, metin, konu) => {
    genelEkle({ kim: y.v.id, metin, yokken: true, konu: konu || '' });
    App.ayarYaz({ yokkenOkunmamis: (ayarlar.yokkenOkunmamis || 0) + 1 });
    if (gorunurTur() === 'genel' && !document.hidden) { App.mesajlariCiz(); App.ayarYaz({ yokkenOkunmamis: 0 }); }
    yokkenRozeti();
    const n = ayarlar.yokkenOkunmamis;
    if (n) App.telefonBildirimi('Evdekiler sen yokken konuştu', (n > 1 ? n + ' yeni mesaj · ' : '') + y.v.ad + ': ' + metin.slice(0, 90), 'yokken');
  };
  function yokkenRozeti() {
    const n = ayarlar.yokkenOkunmamis || 0, b = $('#yokken');
    b.classList.toggle('gizli', !n); b.querySelector('b').textContent = n;
  }
  $('#yokken').onclick = () => { App.sohbetTurAyarla('genel'); modAyarla('sohbet'); };
  /** Telefon bildirimi: uygulama arkadaysa telefona, öndeyse ekranda kısa not */
  App.telefonBildirimi = (baslik, metin, anahtar) => {
    if (document.hidden && window.LoncaNative && LoncaNative.bildirim) { try { LoncaNative.bildirim(baslik, metin, anahtar || 'genel'); return; } catch (e) {} }
    App.bildir(baslik + ': ' + metin);
  };
  App.projelerDegisti = () => { if (window.Panel && Panel.acikMi() && Panel.sekme === 'projeler') Panel.goster('projeler'); };

  let sonSohbetOlayi = 0;
  async function dusunVeCevapla(metin) {
    if (yasam.uyuyor) yasam.uyan('Gece uyurken bana yazdın, uyandım');
    mesajEkle('sen', metin);
    yasam.etkilesim();
    if (Date.now() - sonSohbetOlayi > 180000) { sonSohbetOlayi = Date.now(); yasam.olay('Benimle konuştun', 2); }
    const yz = $('#yaziyor'); yz.querySelector('span').textContent = yasam.v.ad + ' yazıyor…'; yz.classList.remove('gizli');
    const [c] = await Promise.all([Zihin.cevapla(metin, yasam), new Promise(r => setTimeout(r, 450))]);
    yz.classList.add('gizli');
    mesajEkle('ben', c.metin);
    if (c.oneri) { if (mod === 'sohbet') mesajDom('sistem', "Öneri Atölye'de seni bekliyor."); }
    yasam.kaydet();
    App.basligiGuncelle();
    return c;
  }

  $('#gonderBtn').innerHTML = Ikon.svg('gonder');
  $('#mikBtn').innerHTML = Ikon.svg('mikrofon');
  $('#mikBtn').onclick = () => sesliBaslat();
  $('#mesaj').addEventListener('focus', () => { clearTimeout(ozelDonus); if (mod === 'ev') modAyarla('sohbet'); });
  $('#sohbetKapat').innerHTML = Ikon.svg('kapat');
  $('#sohbetKapat').onclick = () => modAyarla('ev');
  (() => {   // sohbet paneli aşağı çekilince kapanır
    const t = $('#tutamac'), p = $('#mesajlar'); let bas = null;
    t.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; bas = { y: e.clientY }; t.setPointerCapture(e.pointerId); p.style.transition = 'none'; });
    t.addEventListener('pointermove', e => { if (!bas) return; p.style.transform = 'translateY(' + Math.max(0, e.clientY - bas.y) + 'px)'; });
    const bitir = e => { if (!bas) return; const dy = e.clientY - bas.y; bas = null; p.style.transition = ''; if (dy > 70) modAyarla('ev'); else p.style.transform = ''; };
    t.addEventListener('pointerup', bitir); t.addEventListener('pointercancel', bitir);
  })();
  $('#giris').addEventListener('submit', async e => {
    e.preventDefault();
    const inp = $('#mesaj'), metin = inp.value.trim(); if (!metin) return;
    inp.value = '';
    clearTimeout(ozelDonus);
    if (mod === 'ev') modAyarla('sohbet');
    if (App.sohbet.tur === 'genel') { await genelCevapla(metin); return; }
    if (App.sohbet.tur === 'proje') { await projeCevapla(metin); return; }
    const c = await dusunVeCevapla(metin);
    if (mod === 'sohbet') App.konus(c.metin, !!ayarlar.mesajSesli);
  });

  // ---------------------------------------------------------------- sesli görüşme
  const sv = { aktif: false, sessiz: false, dinliyor: false, hata: 0, seviye: 0, donulecek: 'ev' };
  const dalga = $('#dalga'); for (let i = 0; i < 11; i++) dalga.appendChild(document.createElement('i'));
  $('#sesliMik').innerHTML = Ikon.svg('mikrofon');
  $('#sesliSessiz span').innerHTML = Ikon.svg('mikrofonKapali');
  $('#sesliBitir span').innerHTML = Ikon.svg('telefonKapat');
  const sesliDurum = t => { $('#sesliDurum').textContent = t; };
  function mikGorunum() {
    $('#sesliMik').classList.toggle('aktif', sv.dinliyor);
    $('#sesliMik').classList.toggle('kapali', sv.sessiz);
    $('#sesliMik').innerHTML = Ikon.svg(sv.sessiz ? 'mikrofonKapali' : 'mikrofon');
    $('#sesliSessiz').classList.toggle('secili', sv.sessiz);
  }

  async function sesliBaslat() {
    sv.donulecek = mod === 'sohbet' ? 'sohbet' : 'ev';
    sv.aktif = true; sv.sessiz = false; sv.hata = 0; sv.dinliyor = false;
    $('#mesaj').blur();
    modAyarla('sesli'); mikGorunum();
    $('#sesliKismi').textContent = '';
    yasam.etkilesim();
    if (!Ses.destek().dinleme) { sesliDurum('Bu cihazda konuşma tanıma bulunamadı.'); return; }
    sesliDurum(yasam.v.ad + ' konuşuyor…');
    await App.konus(sec(['Seni dinliyorum.', 'Buradayım, anlat.', 'Dinliyorum.']), true);
    sesliDinle();
  }

  function sesliDinle() {
    if (!sv.aktif || sv.sessiz) return;
    sv.dinliyor = true; mikGorunum(); sesliDurum('Dinliyorum…');
    Ses.dinle({
      durum: d => { if (d === 'duydum') { sv.dinliyor = false; mikGorunum(); sesliDurum('Düşünüyorum…'); } },
      seviye: r => { sv.seviye = Math.max(0, Math.min(1, (r + 2) / 12)); },
      kismi: t => { $('#sesliKismi').textContent = t; },
      sonuc: async t => {
        sv.dinliyor = false; mikGorunum();
        if (!sv.aktif) return;
        if (!t.trim()) return sesliDinle();
        sv.hata = 0;
        $('#sesliKismi').textContent = '“' + t + '”';
        sesliDurum('Düşünüyorum…');
        const c = await dusunVeCevapla(t);
        if (!sv.aktif) return;
        sesliDurum(yasam.v.ad + ' konuşuyor…');
        await App.konus(c.metin, true);
        if (sv.aktif && !sv.sessiz) setTimeout(sesliDinle, 250);
      },
      hata: (kod, msg) => {
        sv.dinliyor = false; mikGorunum();
        if (!sv.aktif) return;
        if (kod === 6 || kod === 7) {                      // sessizlik / anlaşılamadı
          if (++sv.hata > 4) { sv.sessiz = true; mikGorunum(); sesliDurum('Seni duyamadım. Mikrofona dokununca tekrar dinlerim.'); }
          else setTimeout(sesliDinle, 200);
        } else if (kod === 5 || kod === 8) setTimeout(sesliDinle, 600); // meşgul
        else { sv.sessiz = true; mikGorunum(); sesliDurum(msg || (kod === 9 ? 'Mikrofon izni gerekli.' : 'Dinleme hatası (' + kod + ').')); }
      }
    });
  }

  function sesliBitir(hedef) {
    sv.aktif = false; sv.dinliyor = false;
    Ses.dinlemeyiBirak(); Ses.sus();
    modAyarla(hedef || sv.donulecek || 'ev');
  }
  const sessizDegistir = () => {
    sv.sessiz = !sv.sessiz; sv.hata = 0;
    if (sv.sessiz) { Ses.dinlemeyiBirak(); sv.dinliyor = false; sesliDurum('Mikrofon kapalı'); mikGorunum(); }
    else { mikGorunum(); if (!Ses.konusuyorMu()) sesliDinle(); }
  };
  $('#sesliMik').onclick = sessizDegistir;
  $('#sesliSessiz').onclick = sessizDegistir;
  $('#sesliBitir').onclick = () => sesliBitir();

  // ---------------------------------------------------------------- kare döngüsü (arayüz)
  let rozetSay = 0;
  function arayuzDongusu() {
    requestAnimationFrame(arayuzDongusu);
    balonKonumla();
    if (mod === 'sesli') {
      const bars = dalga.children, t = performance.now() / 1000;
      const seviye = sv.dinliyor ? sv.seviye : yasam.konusuyor ? yasam.agiz : 0.04;
      for (let i = 0; i < bars.length; i++) {
        const m = 1 - Math.abs(i - 5) / 6;
        bars[i].style.height = (6 + seviye * 60 * m * (0.6 + 0.4 * Math.sin(t * 9 + i * 1.7))) + 'px';
      }
      sv.seviye *= 0.92;
    }
    if (++rozetSay % 60 === 0 && mod === 'sayfa') App.basligiGuncelle();
    if (portreSrc && mod !== 'ev') {
      const el = $('#portre');
      el.classList.toggle('konusuyor', yasam.konusuyor);
      el.classList.toggle('selam', yasam.selamSure > 0);
      const ifd = 'ifade-' + yasam.ifade();
      if (ifd !== portreIfade) { if (portreIfade) el.classList.remove(portreIfade); el.classList.add(ifd); portreIfade = ifd; }
    }
  }
  requestAnimationFrame(arayuzDongusu);

  // ---------------------------------------------------------------- Android yaşam döngüsü & geri tuşu
  window.loncaPause = () => { try { sahne.dur(); yasam.kaydet(); } catch (e) {} };
  window.loncaResume = () => { try { sahne.devam(); } catch (e) {} };
  document.addEventListener('visibilitychange', () => document.hidden ? window.loncaPause() : window.loncaResume());
  window.loncaBack = () => {
    if (sorKapat) { sorKapat(); return true; }
    if (document.getElementById('alarmPerde')) { document.querySelector('#alarmPerde [data-a=kapat]').click(); return true; }
    if (window.Gardirop && Gardirop.acikMi()) { Gardirop.kapat(); return true; }
    if (!$('#onizleme').classList.contains('gizli')) { $('#onizlemeKapat').click(); return true; }
    if (Panel.Editor.acikMi()) { Panel.Editor.kapat(); return true; }
    if (Panel.acikMi()) { if (!Panel.geri()) Panel.kapat(); return true; }
    if (mod !== 'ev') { geri(); return true; }
    return false;
  };

  window.addEventListener('error', e => { console.error(e.error || e.message); App.bildir('Bir hata oldu: ' + (e.message || '')); });
  window.addEventListener('unhandledrejection', e => { console.error(e.reason); });

  // ---------------------------------------------------------------- günün saatine göre ışık
  App.isikGuncelle = () => {
    const m = ayarlar.isik || 'oto';
    const evre = m === 'oto' ? Etkinlik.zaman().evre : m;
    const uyuyan = App.evdekiler().filter(y => y.uyuyor).map(y => (Ev.odasi(y.v.id) || {}).id);
    if (sahne.gunIsigi) sahne.gunIsigi(evre, uyuyan); else if (sahne.gece) sahne.gece(evre === 'gece');
    document.body.dataset.evre = evre;
  };
  App.isikGuncelle(); setInterval(App.isikGuncelle, 20000);
  App.sonEtkilesim = Date.now();
  for (const t of ['pointerdown', 'keydown']) document.addEventListener(t, () => { App.sonEtkilesim = Date.now(); }, true);
  yokkenRozeti();

  Panel.kur(App);
  modAyarla('ev');
  // bildirim izni (Android 13+): ilk açılışta bir kez sorulur
  if (window.LoncaNative && LoncaNative.bildirimIzniIste && !ayarlar.bildirimSoruldu) setTimeout(() => { App.ayarYaz({ bildirimSoruldu: true }); try { LoncaNative.bildirimIzniIste(); } catch (e) {} }, 4000);
  Ozellikler.alarmBaslat();
  setTimeout(() => {
    const ilk = !yasam.v.hafiza.length;
    const s = ilk ? 'Merhaba! Ben ' + yasam.v.ad + '. Bu ev bizim.' : sec(['Tekrar hoş geldin!', 'Selam, geldin!']);
    App.balon(s); App.konus(s);
  }, 900);

})();
