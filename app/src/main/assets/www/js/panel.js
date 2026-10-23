/* Panel: sağdan açılan Laboratuvar, Atölye ve Ayarlar.
 *  Laboratuvar → senin çalışma tezgâhın: her türden dosya ve klasör, metin düzenleme, içe aktarma, eve yerleştirme
 *  Atölye      → karakterin tezgâhı: ürettiği öneriler (senin onayın olmadan eve girmez), karakterin kendisi
 *  Ayarlar     → yapay zekâ, ses, görünüm, veriler
 */
(function () {
  let A = null; // App
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const boyut = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
  const once = z => new Date(z).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  function dosyaOku(f, cb) {
    const r = new FileReader();
    r.onload = () => cb(String(r.result).split(',')[1] || '');
    r.onerror = () => A.bildir(f.name + ' okunamadı');
    r.readAsDataURL(f);
  }

  // ================================================================ LABORATUVAR
  const Lab = {
    yol: '/',
    ciz() {
      const kok = $('#sekme-lab');
      let liste;
      try { liste = Depo.liste(Lab.yol); } catch (e) { Lab.yol = '/'; liste = Depo.liste('/'); }
      const parcalar = Lab.yol.split('/').filter(Boolean);
      let yolHtml = '<a href="#" data-yol="/">ev-kökü</a>';
      parcalar.forEach((p, i) => { yolHtml += ' / <a href="#" data-yol="/' + parcalar.slice(0, i + 1).join('/') + '">' + esc(p) + '</a>'; });
      kok.innerHTML = `
        <p class="aciklama">Senin tezgâhın. Her türden dosya ve klasör burada; bir HTML sayfasını "Eve yerleştir" ile evine eşya olarak koyabilirsin.</p>
        <div class="yol">${yolHtml}</div>
        <div class="satir" style="margin-bottom:10px">
          <button class="kucukBtn" id="labKlasor">${Ikon.svg('klasor')} Klasör</button>
          <button class="kucukBtn" id="labDosya">${Ikon.svg('arti')} Dosya</button>
          <button class="kucukBtn vurgu" id="labAktar">${Ikon.svg('yukle')} İçe aktar</button>
          <input type="file" id="labInput" multiple class="gizli">
        </div>
        <ul class="dosyalar">${liste.map(d => `
          <li class="${d.dir ? 'klasor' : ''}" data-ad="${esc(d.name)}" data-dir="${d.dir ? 1 : 0}">
            ${Ikon.svg(d.dir ? 'klasor' : Depo.resimMi(d.name) ? 'resim' : 'dosya')}
            <span class="ad">${esc(d.name)}</span>
            <span class="ek">${d.dir ? '' : boyut(d.size)}</span>
            ${d.dir ? `<button class="sil" data-sil="${esc(d.name)}" aria-label="Sil">${Ikon.svg('cop')}</button>` : ''}
          </li>`).join('') || '<li class="bos">Bu klasör boş.</li>'}
        </ul>`;
      kok.querySelectorAll('[data-yol]').forEach(a => a.onclick = e => { e.preventDefault(); Lab.yol = a.dataset.yol; Lab.ciz(); });
      kok.querySelectorAll('li[data-ad]').forEach(li => li.onclick = e => {
        if (e.target.closest('[data-sil]')) return;
        const p = Depo.norm(Lab.yol + '/' + li.dataset.ad);
        if (li.dataset.dir === '1') { Lab.yol = p; Lab.ciz(); } else Editor.ac(p);
      });
      kok.querySelectorAll('[data-sil]').forEach(b => b.onclick = async () => {
        const p = Depo.norm(Lab.yol + '/' + b.dataset.sil);
        if (await A.sor('"' + b.dataset.sil + '" klasörü ve içindeki her şey silinsin mi?', 'Sil')) {
          try { Depo.sil(p); A.esyalarDegisti(); } catch (e) { A.bildir(e.message); }
          Lab.ciz();
        }
      });
      $('#labKlasor').onclick = async () => {
        const ad = await A.sor('Yeni klasörün adı:', 'Oluştur', '');
        if (ad) { Depo.klasor(Depo.norm(Lab.yol + '/' + ad.replace(/\//g, '-'))); Lab.ciz(); }
      };
      $('#labDosya').onclick = async () => {
        const ad = await A.sor('Yeni dosyanın adı (örn. sayfam.html):', 'Oluştur', 'sayfam.html');
        if (!ad) return;
        const p = Depo.norm(Lab.yol + '/' + ad.replace(/\//g, '-'));
        if (Depo.var(p)) return A.bildir('Bu isimde bir dosya zaten var');
        Depo.yaz(p, /\.html?$/i.test(ad) ? SABLON : '');
        Lab.ciz(); Editor.ac(p);
      };
      $('#labAktar').onclick = () => $('#labInput').click();
      $('#labInput').onchange = e => {
        const dosyalar = [...e.target.files]; let kalan = dosyalar.length;
        dosyalar.forEach(f => dosyaOku(f, b64 => {
          try { Depo.yazB64(Depo.norm(Lab.yol + '/' + f.name), b64); } catch (err) { A.bildir(err.message); }
          if (--kalan === 0) { A.bildir(dosyalar.length + ' dosya içe aktarıldı'); Lab.ciz(); }
        }));
      };
    }
  };

  const SABLON = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Yeni sayfa</title>
<style>
  body { margin:0; padding:20px; background:#0d0b18; color:#ece8ff; font-family:system-ui, sans-serif; }
  button { background:#1e1a38; color:#ece8ff; border:1px solid #a77de8; border-radius:12px; padding:12px 16px; font-size:16px; }
</style>
</head>
<body>
  <h1>Merhaba!</h1>
  <p>Bu sayfayı Laboratuvar'da düzenleyip eve yerleştirebilirsin.</p>
  <button onclick="Lonca.soyle('Butona bastın!')">Nova'ya söylet</button>
</body>
</html>
`;

  // ================================================================ EDİTÖR
  const Editor = {
    yol: null,
    ac(p) {
      Editor.yol = p;
      const ad = p.split('/').pop();
      $('#editorBaslik').textContent = ad;
      const govde = $('#editorGovde'); govde.innerHTML = '';
      const metin = Depo.metinMi(p);
      $('#editorKaydet').classList.toggle('gizli', !metin);
      if (metin) {
        const ta = document.createElement('textarea'); ta.spellcheck = false; ta.value = Depo.oku(p) || '';
        govde.appendChild(ta);
      } else if (Depo.resimMi(p)) {
        const img = document.createElement('img'); img.src = Depo.dataURL(p) || ''; govde.appendChild(img);
      } else {
        govde.innerHTML = '<div class="bilgi">Bu dosya türü burada düzenlenemez.<br>' + esc(ad) + '</div>';
      }
      const html = /\.html?$/i.test(p), vrm = /\.vrm$/i.test(p);
      $('#editorAlt').innerHTML = `
        ${html ? `<button class="kucukBtn" data-e="onizle">${Ikon.svg('goz')} Önizle</button>` : ''}
        ${html ? `<button class="kucukBtn vurgu" data-e="yerlestir">${Ikon.svg('ev')} Eve yerleştir</button>` : ''}
        ${vrm ? `<button class="kucukBtn vurgu" data-e="model">Karakterin bedeni yap</button>` : ''}
        <button class="kucukBtn" data-e="adlandir">${Ikon.svg('kalem')} Yeniden adlandır</button>
        <button class="kucukBtn tehlike" data-e="sil">${Ikon.svg('cop')} Sil</button>`;
      $('#editorAlt').querySelectorAll('[data-e]').forEach(b => b.onclick = () => Editor[b.dataset.e]());
      $('#editor').classList.remove('gizli');
    },
    kapat() { $('#editor').classList.add('gizli'); Editor.yol = null; Lab.ciz(); },
    acikMi() { return !$('#editor').classList.contains('gizli'); },
    kaydet(sessiz) {
      const ta = $('#editorGovde textarea');
      if (!ta || !Editor.yol) return;
      Depo.yaz(Editor.yol, ta.value);
      if (!sessiz) A.bildir('Kaydedildi');
    },
    onizle() { Editor.kaydet(true); A.onizle(Editor.yol, Editor.yol.split('/').pop()); },
    async yerlestir() {
      Editor.kaydet(true);
      const metin = Depo.oku(Editor.yol) || '';
      const baslik = ((/<title>([^<]{1,40})<\/title>/i.exec(metin) || [])[1] || Editor.yol.split('/').pop().replace(/\.html?$/i, '')).trim();
      const s = await A.esyaSor(baslik);
      if (!s) return;
      const e = Ev.esyaEkle({ ad: s.ad, dosya: Editor.yol, ikon: s.ikon });
      Editor.kapat(); A.esyaEklendi(e);
    },
    async adlandir() {
      const eski = Editor.yol, ad = await A.sor('Yeni ad:', 'Değiştir', eski.split('/').pop());
      if (!ad) return;
      const yeni = Depo.norm(eski.replace(/[^/]+$/, '') + ad.replace(/\//g, '-'));
      try {
        Depo.tasi(eski, yeni);
        const l = Ev.esyalar(); let degisti = false;
        l.forEach(e => { if (e.dosya === eski) { e.dosya = yeni; degisti = true; } });
        if (degisti) Ev.esyalariKaydet(l);
        Editor.ac(yeni);
      } catch (e) { A.bildir(e.message); }
    },
    async sil() {
      const p = Editor.yol;
      if (!(await A.sor('"' + p.split('/').pop() + '" silinsin mi?', 'Sil'))) return;
      Depo.sil(p);
      const l = Ev.esyalar(), kalan = l.filter(e => e.dosya !== p);
      if (kalan.length !== l.length) { Ev.esyalariKaydet(kalan); A.esyalarDegisti(); }
      Editor.kapat();
    },
    async model() { const p = Editor.yol; Editor.kapat(); await Atolye.modelAyarla(p); }
  };

  // ================================================================ ATÖLYE
  const Atolye = {
    oneriler() {
      let l = [];
      try { l = Depo.liste('/atolye/oneriler').filter(d => !d.dir && d.name.endsWith('.json')).map(d => Depo.okuJSON('/atolye/oneriler/' + d.name, null)).filter(Boolean); } catch (e) {}
      return l.sort((a, b) => b.z - a.z);
    },
    ciz() {
      const bolum = Panel.sekme === 'karakter' ? 'karakter' : 'uretim';
      const kok = $('#sekme-' + (bolum === 'karakter' ? 'karakter' : 'atolye')), y = A.yasam, v = y.v, d = v.durum;
      const l = Atolye.oneriler();
      const groq = !!(A.ayar().groqAnahtar);
      const hepsi = A.yasamlar, sinir = window.KARAKTER_SINIRI || 10;
      // İsteğe göre en uygun uzman (ilk kelime eşleşmesi)
      const UZMAN = [[/sağlık|saglik|ilaç|ilac|su iç|uyku|kalori|diyet|nabız|tansiyon/i, 'medica'], [/spor|antrenman|egzersiz|koşu|kosu|adım|fitness/i, 'atlas'], [/etkinlik|aktivite|gezi|yürüyüş|hareket|tırman/i, 'leon'],
        [/öğren|ogren|ders|kelime|sınav|sinav|kitap|okuma/i, 'orion'], [/kod|teknoloji|hesap|bilgisayar|veri|tablo/i, 'carbon'], [/sistem|alarm|saat|zamanlayıcı|hatırlat|yedek/i, 'nexsus'],
        [/günlük|hedef|plan|görev|gorev|yapılacak|alışkanlık|rutin/i, 'nova'], [/resim|çizim|renk|tasarım|müzik|sanat|şarkı/i, 'mira'], [/oyun|eğlen|film|dizi|bulmaca|şaka/i, 'luna']];
      Atolye.uzmanOner = metin => { const m = UZMAN.find(([r]) => r.test(metin || '')); return m ? m[1] : null; };
      const guncellenen = Atolye.guncellenen ? Paketler.manifest(Atolye.guncellenen) : null;
      const uretimHtml = `
        <div class="kutu">
          <h3>Nasıl çalışır?</h3>
          <p class="aciklama" style="margin:0">İstersin → uzman karakter üretir → önizlersin → onaylarsan odasına yerleşir. Her güncelleme yeni bir sürümdür; Ev Düzeni'nden eski sürüme dönebilirsin.</p>
        </div>
        <div class="kutu">
          <h3>Bekleyen öneriler</h3>
          ${l.map(o => `
            <div class="oneri" data-id="${o.id}">
              <div class="ust"><span>${esc(o.kim || v.ad)} · ${once(o.z)}</span><span>${o.tur === 'surum' ? 'yeni sürüm' : o.oda ? esc(Ev.odaAdi(o.oda)) : 'özellik'}</span></div>
              <b>${o.ikon ? Ikon.svg(o.ikon) : ''} ${esc(o.baslik)}</b>
              <p class="aciklama" style="margin:4px 0">İstek: ${esc(o.istek || '')}</p>
              ${o.ozet ? `<p class="aciklama" style="margin:4px 0">${esc(o.ozet)}</p>` : ''}
              <p class="aciklama" style="margin:4px 0 8px">İzinler: ${(o.izinler || []).length ? o.izinler.map(x => esc(Paketler.IZINLER[x] || x)).join(', ') : 'yok (sadece kendi verisi)'}</p>
              <div class="satir">
                <button class="kucukBtn" data-o="bak">${Ikon.svg('goz')} Önizle</button>
                <button class="kucukBtn vurgu" data-o="onay">${Ikon.svg('tik')} Onayla</button>
                <button class="kucukBtn tehlike" data-o="red">Reddet</button>
              </div>
            </div>`).join('') || '<div class="bos">Bekleyen öneri yok.</div>'}
        </div>
        <div class="kutu">
          <h3>${guncellenen ? '"' + esc(guncellenen.ad) + '" özelliğini geliştir' : 'Yeni özellik iste'}</h3>
          ${guncellenen ? `<p class="aciklama hedefOda">Şu an sürüm ${guncellenen.surum}. Yeni sürüm eskisinin yerine geçer, eskisi saklanır. <button class="kucukBtn" id="atGuncelVazgec">${Ikon.svg('kapat')}</button></p>` : ''}
          ${!guncellenen && Atolye.hedefOda ? `<p class="aciklama hedefOda">Yerleşeceği oda: <b>${esc(Ev.odaAdi(Atolye.hedefOda))}</b> <button class="kucukBtn" id="atOdaKaldir">${Ikon.svg('kapat')}</button></p>` : ''}
          <textarea id="atIstek" rows="3" placeholder="${guncellenen ? 'Ne değişsin? Örn: tarihe göre sıralasın' : Atolye.hedefOda ? esc(Ev.odaAdi(Atolye.hedefOda)) + ' için ne olsun? Örn: su içme takipçisi' : 'Örn: su içme takipçisi, ilaç hatırlatıcı, kelime kartları…'}">${esc(Atolye.taslak || '')}</textarea>
          <label class="alan">Kim üretsin? <span id="atOnerilen"></span></label>
          <div class="kisiSec">${A.evdekiler().map(k => `<button data-k="${k.v.id}" class="${k === y ? 'secili' : ''}" style="--renk:${esc(k.v.gorunum.serit || k.v.gorunum.ust || '#a77de8')}"><i></i>${esc(k.v.ad)}</button>`).join('')}</div>
          <div class="satir" style="margin-top:10px"><button class="kucukBtn vurgu" id="atUret" ${groq ? '' : 'disabled'}>${esc(v.ad)} üretsin</button>
          ${groq ? '' : '<span class="aciklama" style="margin:0">Üretim için Ayarlar\'dan Groq anahtarı gerekli.</span>'}</div>
        </div>
`;
      const karakterHtml = `
        <div class="kutu">
          <h3>${esc(v.ad)}: bilgiler</h3>
          <p class="aciklama">${esc((v.tur || '') + (v.cinsiyet ? ' · ' + v.cinsiyet : ''))}${v.tarif ? '<br>' + esc(v.tarif) : ''}</p>
          <label class="alan">Adı</label><input id="atAd" value="${esc(v.ad)}">
          <div class="satir" style="margin-top:10px"><button class="kucukBtn" id="atGardirop">${Ikon.svg('aski')} Gardırop</button></div>
          ${y.etkinlik ? `<p class="aciklama" style="margin:10px 0 0">Şu an: ${esc(Etkinlik.metin(y))}</p>` : ''}
        </div>

        <div class="kutu">
          <h3>${esc(v.ad)}: kişilik kartı</h3>
          <p class="aciklama">Karakterin özelliklerini sen belirlersin. İlgi puanları ise yaşadıkça kendiliğinden değişir ve boş vaktinde ne yapacağını belirler.</p>
          <label class="alan">Huyu</label><textarea id="atKisilik" rows="2">${esc(v.kisilik)}</textarea>
          <label class="alan">Konuşma tarzı</label><input id="atTarz" value="${esc(v.kart.konusmaTarzi || '')}">
          <label class="alan">Eleştiri tarzı</label><select id="atElestiri"><option value="dobra">Dobra (açık, lafı dolandırmaz)</option><option value="dengeli">Dengeli (önce iyi yan, sonra öneri)</option><option value="yumusak">Yumuşak (nazik, cesaretlendirerek)</option></select>
          <label class="alan">Uzmanlığı</label><input id="atUzman" value="${esc(v.kart.uzmanlik || '')}">
          <label class="alan">Sevdikleri</label><input id="atSever" value="${esc(v.kart.sevdikleri || '')}">
          <label class="alan">Sevmedikleri</label><input id="atSevmez" value="${esc(v.kart.sevmedikleri || '')}">
          <div class="satir" style="margin-top:10px"><button class="kucukBtn vurgu" id="atKaydet">Kaydet</button></div>
          <label class="alan" style="margin-top:14px">İlgi puanları (0–10)</label>
          ${Object.entries(v.kart.ilgiler || {}).sort((a, b) => b[1] - a[1]).map(([k, p]) => `<div class="durumSatir"><span>${esc({ spor: 'Spor', okuma: 'Okuma', sanat: 'Sanat', muzik: 'Müzik', film: 'Film', teknoloji: 'Teknoloji', saglik: 'Sağlık', oyun: 'Oyun', yemek: 'Yemek', sohbet: 'Sohbet', plan: 'Plan' }[k] || k)}</span><div class="durumCubuk"><i style="width:${p * 10}%"></i></div><b>${p.toFixed(1)}</b></div>`).join('')}
        </div>

        <div class="kutu">
          <h3>${esc(v.ad)}: sohbet görünümü</h3>
          ${v.portre ? `<img class="portreKucuk" src="${esc(A.portreKaynak(y) || '')}" alt="">` : ''}
          <p class="aciklama">${v.portre ? 'Mesajlaşma ve sesli konuşmada bu görsel canlı portre olarak görünür; evde 3D beden dolaşır.' : 'Portre yok: mesajlaşmada 3D beden görünür. ChatGPT vb. ile hazırladığın boy boyu, şeffaf arka planlı bir görsel yükleyebilirsin.'}</p>
          ${v.portre ? `<label class="anahtar"><span>Sohbette portreyi göster (kapalıysa 3D beden)</span><input type="checkbox" id="atPortreAcik" ${v.sohbetGorunum !== '3d' ? 'checked' : ''}></label>` : ''}
          <div class="satir">
            <button class="kucukBtn vurgu" id="atPortre">${Ikon.svg('resim')} ${v.portre ? 'Portreyi değiştir' : 'Portre yükle'}</button>
            ${v.portre ? '<button class="kucukBtn" id="atPortreSil">Kaldır</button>' : ''}
            <input type="file" id="atPortreInput" accept="image/*" class="gizli">
          </div>
        </div>

        <div class="kutu">
          <h3>${esc(v.ad)}: 3D beden</h3>
          <p class="aciklama">Şu an: <b>${esc(y._bedenKaynak ? (y._bedenKaynak.startsWith('asset:') ? 'uygulamayla gelen 3D model' : y._bedenKaynak.split('/').pop()) : 'hafif beden (chibi)')}</b>. Kimlik (beden, yüz, ten, göz ve saç rengi) sadece sende; kıyafetler gardıroptan değişir. İstersen VRoid ile yapılmış başka bir .vrm modeli yükleyebilirsin.${A.sahne.yedek ? ' (Bu cihazda 3D başlatılamadı, yedek görünüm kullanılıyor.)' : ''}</p>
          <div class="satir">
            <button class="kucukBtn vurgu" id="atVrm">${Ikon.svg('yukle')} VRM yükle</button>
            ${v.model ? '<button class="kucukBtn" id="atChibi">Uygulamayla gelen bedene dön</button>' : ''}
            <input type="file" id="atVrmInput" accept=".vrm,model/gltf-binary,application/octet-stream" class="gizli">
          </div>
        </div>

        <div class="kutu">
          <h3>${esc(v.ad)}: ses</h3>
          <p class="aciklama">Sesler telefondaki ses motorundan gelir ve cinsiyete göre otomatik dağıtılır; aynı sesi paylaşanlar perde ve hızla ayrışır. Buradan dinleyip değiştirebilirsin.</p>
          <label class="alan">Ses</label>
          <select id="atSesAdi"><option value="">Varsayılan Türkçe ses</option>${Ses.sesler().map(s => `<option value="${esc(s.ad)}" ${v.ses.sesAdi === s.ad ? 'selected' : ''}>${esc(s.etiket)}${s.internet ? ' (internet)' : ''}</option>`).join('')}</select>
          ${Ses.sesler().length ? '' : '<p class="aciklama" style="margin-top:6px">Telefondaki ses listesi henüz gelmedi (ses motoru hazırlanıyor ya da bu cihazda ses yok).</p>'}
          <label class="anahtar"><span>Robot efekti (metalik ses)</span><input type="checkbox" id="atRobot" ${v.ses.efekt === 'robot' ? 'checked' : ''}></label>
          <label class="alan">Ses perdesi: <span id="atPerdeD">${v.ses.perde.toFixed(2)}</span></label>
          <input type="range" id="atPerde" min="0.5" max="2" step="0.05" value="${v.ses.perde}">
          <label class="alan">Konuşma hızı: <span id="atHizD">${v.ses.hiz.toFixed(2)}</span></label>
          <input type="range" id="atHiz" min="0.5" max="1.8" step="0.05" value="${v.ses.hiz}">
          <div class="satir" style="margin-top:10px"><button class="kucukBtn" id="atSesDene">${Ikon.svg('hoparlor')} Dene</button></div>
        </div>

        <div class="kutu">
          <h3>${esc(v.ad)}: gerçek iç durum</h3>
          <p class="aciklama">Bu sayılar uydurma değil; aşağıdaki olaylarla değişir. Yüz ifadesi buradan gelir.</p>
          <div class="durumSatir"><span>Mutluluk</span><div class="durumCubuk"><i style="width:${d.mutluluk}%"></i></div><b>${Math.round(d.mutluluk)}</b></div>
          <div class="durumSatir"><span>Enerji</span><div class="durumCubuk"><i style="width:${d.enerji}%"></i></div><b>${Math.round(d.enerji)}</b></div>
          <ul class="olaylar">${v.olaylar.slice(-6).reverse().map(o => `<li>${esc(o.olay)}${o.etki ? ' · ' + esc(o.etki) : ''} <span style="float:right">${once(o.z)}</span></li>`).join('') || '<li>Henüz olay yok.</li>'}</ul>
        </div>`;
      kok.innerHTML = bolum === 'karakter' ? karakterHtml : uretimHtml;
      if (bolum === 'uretim') {
        kok.querySelectorAll('.kisiSec button').forEach(b => b.onclick = () => { Atolye.taslak = $('#atIstek').value; A.karakterSec(b.dataset.k); Atolye.ciz(); });
        const onerGoster = () => { const u = Atolye.uzmanOner($('#atIstek').value), k = u && A.evdekiler().find(x => x.v.id === u); $('#atOnerilen').textContent = k ? '· önerilen: ' + k.v.ad + ' (' + ((k.v.kart || {}).uzmanlik || '') + ')' : ''; };
        $('#atIstek').oninput = onerGoster; onerGoster();
        if ($('#atGuncelVazgec')) $('#atGuncelVazgec').onclick = () => { Atolye.guncellenen = null; Atolye.ciz(); };

      kok.querySelectorAll('.oneri').forEach(div => {
        const o = l.find(x => x.id === div.dataset.id);
        div.querySelector('[data-o=bak]').onclick = () => A.onizleHtml(o.html, o.baslik);
        div.querySelector('[data-o=onay]').onclick = () => Atolye.onayla(o);
        div.querySelector('[data-o=red]').onclick = async () => {
          if (!(await A.sor('"' + o.baslik + '" reddedilsin mi?', 'Reddet'))) return;
          Depo.sil('/atolye/oneriler/' + o.id + '.json');
          y.olay('Önerim reddedildi: ' + o.baslik, -3);
          Atolye.ciz();
        };
      });
      if ($('#atOdaKaldir')) $('#atOdaKaldir').onclick = () => { Atolye.hedefOda = null; Atolye.ciz(); };
      const uretBtn = $('#atUret');
      uretBtn.onclick = async () => {
        const istek = $('#atIstek').value.trim(); if (!istek) return;
        uretBtn.disabled = true; uretBtn.textContent = 'Üretiliyor…';
        try {
          const g = Atolye.guncellenen ? Paketler.manifest(Atolye.guncellenen) : null;
          const o = await Zihin.uret(istek, y, g ? { mevcut: { ad: g.ad, paket: g.id, html: Paketler.html(g.id) } } : {});
          if (!g && Atolye.hedefOda) { o.oda = Atolye.hedefOda; Depo.yazJSON('/atolye/oneriler/' + o.id + '.json', o); }
          Atolye.hedefOda = null; Atolye.guncellenen = null; Atolye.taslak = '';
          y.olay("Atölye'de bir şey ürettim: " + o.baslik, 3);
          A.bildir('Öneri hazır: ' + o.baslik);
        } catch (e) { A.bildir(e.message); }
        Atolye.ciz();
      };
      return;
      }
      $('#atGardirop').onclick = () => { Panel.kapat(); Gardirop.ac(v.id); };
      $('#atElestiri').value = v.kart.elestiri || 'dengeli';
      $('#atKaydet').onclick = () => {
        v.ad = $('#atAd').value.trim() || v.ad; v.kisilik = $('#atKisilik').value.trim() || v.kisilik;
        Object.assign(v.kart, { huy: v.kisilik, konusmaTarzi: $('#atTarz').value.trim(), elestiri: $('#atElestiri').value, uzmanlik: $('#atUzman').value.trim(), sevdikleri: $('#atSever').value.trim(), sevmedikleri: $('#atSevmez').value.trim() });
        y.kaydet(); A.basligiGuncelle(); A.sahne.isimleriYenile(); A.bildir('Kaydedildi');
      };
      $('#atPortre').onclick = () => $('#atPortreInput').click();
      $('#atPortreInput').onchange = e => {
        const f = e.target.files[0]; if (!f) return;
        const uz = (f.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
        dosyaOku(f, b64 => {
          const yol = '/karakterler/' + v.id + '/portre.' + uz;
          try { Depo.yazB64(yol, b64); } catch (err) { return A.bildir(err.message); }
          A.portreUnut(yol);
          v.portre = yol; v.sohbetGorunum = 'portre'; v.yuz = { x: 0.5, y: 0.09 }; y.kaydet();
          A.portreGuncelle(); A.bildir('Portre hazır'); Atolye.ciz();
        });
      };
      if ($('#atPortreSil')) $('#atPortreSil').onclick = async () => {
        if (!(await A.sor(Dil.ilgi(v.ad) + ' portresi kaldırılsın mı? Sohbette 3D beden görünür.', 'Kaldır'))) return;
        v.portre = ''; y.kaydet(); A.portreGuncelle(); Atolye.ciz();
      };
      if ($('#atPortreAcik')) $('#atPortreAcik').onchange = e => { v.sohbetGorunum = e.target.checked ? 'portre' : '3d'; y.kaydet(); A.portreGuncelle(); };
      $('#atVrm').onclick = () => $('#atVrmInput').click();
      $('#atVrmInput').onchange = e => {
        const f = e.target.files[0]; if (!f) return;
        A.bildir('Model yükleniyor…');
        dosyaOku(f, async b64 => {
          const yol = '/karakterler/' + v.id + '/' + f.name.replace(/[^\w.\-]/g, '_');
          try { Depo.yazB64(yol, b64); } catch (err) { return A.bildir(err.message); }
          await Atolye.modelAyarla(yol);
        });
      };
      if ($('#atChibi')) $('#atChibi').onclick = () => { v.model = ''; y.kaydet(); A.bedenKur(y).then(() => { A.bildir('Uygulamayla gelen bedene dönüldü'); Atolye.ciz(); }); };
      const perde = $('#atPerde'), hiz = $('#atHiz');
      perde.oninput = () => { v.ses.elle = true; v.ses.perde = parseFloat(perde.value); $('#atPerdeD').textContent = v.ses.perde.toFixed(2); y.kirli = true; };
      hiz.oninput = () => { v.ses.hiz = parseFloat(hiz.value); $('#atHizD').textContent = v.ses.hiz.toFixed(2); y.kirli = true; };
      $('#atSesDene').onclick = () => { y.kaydet(); Ses.konus('Merhaba, ben ' + v.ad + '. Sesim böyle.', v.ses, y); };
      $('#atSesAdi').onchange = e => { v.ses.sesAdi = e.target.value; v.ses.elle = true; y.kaydet(); Ses.konus('Merhaba, ben ' + v.ad + '.', v.ses, y); };
      $('#atRobot').onchange = e => { v.ses.efekt = e.target.checked ? 'robot' : ''; v.ses.elle = true; y.kaydet(); };
    },
    async modelAyarla(yol) {
      const v = A.yasam.v;
      try {
        await A.modelYukle(v.id, yol);
        v.model = yol; A.yasam._bedenKaynak = yol; A.yasam.kaydet();
        A.yasam.olay('Yeni bir bedenim oldu', 5);
        A.bildir('Yeni beden hazır');
      } catch (e) { A.bildir('Model yüklenemedi: ' + e.message); }
      if (Panel.sekme === 'atolye' || Panel.sekme === 'karakter') Atolye.ciz();
    },
    onayla(o) {
      Depo.sil('/atolye/oneriler/' + o.id + '.json');
      const uretici = A.yasamlar.find(k => k.v.id === o.kimId) || A.yasam;
      if (o.tur === 'surum' && o.paket) {
        try { const n = Paketler.yeniSurum(o.paket, o.html, o.istek, uretici.v.ad); A.esyalarDegisti(); A.bildir('"' + o.baslik + '" sürüm ' + n + ' oldu'); }
        catch (e) { A.bildir(e.message); }
      } else {
        const e = Paketler.olustur({ ad: o.baslik, ikon: o.ikon, oda: o.oda, izinler: o.izinler, html: o.html, uretici: uretici.v.ad, istek: o.istek, ozet: o.ozet });
        A.esyaEklendi(e);
      }
      uretici.olay('Önerim onaylandı: ' + o.baslik, 8);
      if (Panel.acikMi() && Panel.sekme === 'atolye') Atolye.ciz();
    }
  };

  // ================================================================ AYARLAR
  const Ayarlar = {
    ciz() {
      const kok = $('#sekme-ayarlar'), a = A.ayar();
      kok.innerHTML = `
        <div class="kutu">
          <h3>Yapay zekâ</h3>
          <p class="aciklama">Anahtar olmadan da ${esc(A.yasam.v.ad)} basit şeylere cevap verir. Groq anahtarı eklersen gerçek sohbet ve Atölye üretimi açılır. Anahtar sadece bu telefonda saklanır.</p>
          <label class="alan">Groq API anahtarı</label><input id="ayAnahtar" type="password" value="${esc(a.groqAnahtar || '')}" placeholder="gsk_…">
          <label class="alan">Model</label><input id="ayModel" value="${esc(a.groqModel || 'llama-3.3-70b-versatile')}">
          <div class="satir" style="margin-top:10px">
            <button class="kucukBtn vurgu" id="ayKaydet">Kaydet</button>
            <button class="kucukBtn" id="ayDene">Bağlantıyı dene</button>
          </div>
        </div>
        <div class="kutu">
          <h3>Ses ve görünüm</h3>
          <label class="anahtar"><span>Mesajlaşmada cevapları sesli oku</span><input type="checkbox" id="aySesli" ${a.mesajSesli ? 'checked' : ''}></label>
          <div class="satir" style="margin:4px 0 8px"><button class="kucukBtn" id="aySesDagit">${Ikon.svg('hoparlor')} Sesleri yeniden dağıt</button><span class="aciklama" style="margin:0">Telefonda ${Ses.sesler().length} ses bulundu</span></div>
          <label class="alan">Sen yokken konuşma (günlük en fazla)</label>
          <select id="aySiklik"><option value="az">Az · 6</option><option value="normal">Normal · 12</option><option value="canli">Canlı · 40</option></select>
          <label class="alan">Karakter bedenleri</label>
          <select id="ayBeden"><option value="vrm">3D model (gerçek görünüm)</option><option value="chibi">Hafif beden (telefon zorlanırsa)</option></select>
          <label class="alan">Işık</label>
          <select id="ayIsik"><option value="oto">Saate göre (otomatik)</option><option value="gunduz">Hep gündüz</option><option value="aksam">Hep akşam</option><option value="gece">Hep gece</option></select>
          <label class="alan">Uyku saatin (karakterler de bu saatlerde uyur)</label>
          <div class="satir"><label style="flex:1">Yatış<input type="time" id="ayYat" value="${esc(a.uykuYat || '23:30')}"></label><label style="flex:1">Kalkış<input type="time" id="ayKalk" value="${esc(a.uykuKalk || '07:30')}"></label></div>
          <label class="anahtar"><span>Gölgeler (kapatmak pili korur)</span><input type="checkbox" id="ayGolge" ${a.golge !== false ? 'checked' : ''}></label>
          <label class="anahtar"><span>Evdeki simgelerin yanında adlarını da göster</span><input type="checkbox" id="ayEtiketAd" ${a.etiketAd ? 'checked' : ''}></label>
        </div>
        <div class="kutu">
          <h3>Oda özellikleri</h3>
          <p class="aciklama">Evdeki hazır araçlar: ${[...new Set(Ozellikler.LISTE.map(o => o.ad))].map(esc).join(', ')} (her karakter odasında kendi gardırobu var). Sayfaları Laboratuvar'daki /ev/sayfalar klasöründen düzenlenebilir. Alarm şimdilik uygulama açıkken çalar.</p>
          <div class="satir">
            <button class="kucukBtn" id="ayGardirop">${Ikon.svg('aski')} Gardırobu aç</button>
            ${(a.kaldirilanOzellikler || []).length ? '<button class="kucukBtn" id="ayOzellikGeri">Kaldırılanları geri getir</button>' : ''}
          </div>
        </div>
        <div class="kutu">
          <h3>Veriler</h3>
          <p class="aciklama">Tüm veriler sadece bu telefonda, uygulamanın kendi klasöründe durur.</p>
          <div class="satir">
            <button class="kucukBtn" id="aySohbetSil">Sohbet geçmişini sil</button>
            <button class="kucukBtn tehlike" id="ayHepsiniSil">Her şeyi sıfırla</button>
          </div>
        </div>
        <div class="kutu">
          <h3>Geliştirici</h3>
          <p class="aciklama">Laboratuvar senin kod tezgâhın: dosyalar, sayfalar, içe aktarma.</p>
          <div class="satir"><button class="kucukBtn vurgu" id="ayLab">${Ikon.svg('klasor')} Laboratuvar'ı aç</button></div>
        </div>
        <div class="kutu">
          <h3>Hakkında</h3>
          <p class="aciklama" style="margin:0">Lonca v0.9 · Görüntü: ${A.sahne.yedek ? '2D yedek (3D başlatılamadı)' : '3D'} · Ses: ${Ses.destek().konusma ? 'var' : 'yok'} · Dinleme: ${Ses.destek().dinleme ? 'var' : 'yok'}</p>
        </div>`;
      $('#ayKaydet').onclick = () => {
        A.ayarYaz({ groqAnahtar: $('#ayAnahtar').value.trim(), groqModel: $('#ayModel').value.trim() || 'llama-3.3-70b-versatile' });
        A.bildir('Kaydedildi');
      };
      $('#ayDene').onclick = async () => {
        A.ayarYaz({ groqAnahtar: $('#ayAnahtar').value.trim(), groqModel: $('#ayModel').value.trim() || 'llama-3.3-70b-versatile' });
        A.bildir('Deneniyor…');
        try { await Zihin.dene(); A.bildir('Bağlantı çalışıyor'); } catch (e) { A.bildir(e.message); }
      };
      $('#aySesli').onchange = e => A.ayarYaz({ mesajSesli: e.target.checked });
      $('#aySesDagit').onclick = async () => { if (!(await A.sor('Elle seçtiklerin dahil bütün karakterlerin sesleri otomatik olarak yeniden dağıtılsın mı?', 'Dağıt'))) return; const n = Ses.otomatikDagit(A.yasamlar, true); A.yasamlar.forEach(y => y.kaydet()); A.bildir(n ? 'Sesler dağıtıldı' : 'Telefonda ses bulunamadı'); };
      $('#aySiklik').value = a.yokkenSiklik || 'normal';
      $('#aySiklik').onchange = e => A.ayarYaz({ yokkenSiklik: e.target.value });
      $('#ayBeden').value = a.beden || 'vrm';
      $('#ayBeden').onchange = e => { A.ayarYaz({ beden: e.target.value }); A.bildir(e.target.value === 'chibi' ? 'Hafif bedenlere geçiliyor' : '3D modeller yükleniyor…'); A.bedenleriKur(); };
      $('#ayIsik').value = a.isik || 'oto';
      $('#ayIsik').onchange = e => { A.ayarYaz({ isik: e.target.value }); A.isikGuncelle(); };
      const uyku = () => { A.ayarYaz({ uykuYat: $('#ayYat').value || '23:30', uykuKalk: $('#ayKalk').value || '07:30' }); A.isikGuncelle(); A.bildir('Uyku saati: ' + A.ayar().uykuYat + ' – ' + A.ayar().uykuKalk); };
      $('#ayYat').onchange = uyku; $('#ayKalk').onchange = uyku;
      $('#ayGolge').onchange = e => { A.ayarYaz({ golge: e.target.checked }); A.sahne.golge(e.target.checked); };
      $('#ayEtiketAd').onchange = e => { A.ayarYaz({ etiketAd: e.target.checked }); document.body.classList.toggle('etiketAdli', e.target.checked); };
      $('#ayGardirop').onclick = () => { Panel.kapat(); Gardirop.ac(); };
      $('#ayLab').onclick = () => Panel.goster('lab');
      if ($('#ayOzellikGeri')) $('#ayOzellikGeri').onclick = () => { Ozellikler.geriGetir(); A.esyalarDegisti(); A.bildir('Oda özellikleri geri geldi'); Ayarlar.ciz(); };
      $('#aySohbetSil').onclick = async () => {
        if (!(await A.sor('Sohbet geçmişi silinsin mi?', 'Sil'))) return;
        A.yasam.v.hafiza = []; A.yasam.kaydet(); A.mesajlariCiz(); A.bildir('Silindi');
      };
      $('#ayHepsiniSil').onclick = async () => {
        if (!(await A.sor('Ev, Laboratuvar dosyaları, karakter ve ayarlar dahil HER ŞEY silinecek. Emin misin?', 'Her şeyi sil'))) return;
        for (const d of Depo.liste('/')) Depo.sil('/' + d.name);
        location.reload();
      };
    }
  };

  // ================================================================ KARAKTERLER (alt menü)
  const renk = k => k.v.gorunum.serit || k.v.gorunum.ust || '#a77de8';
  const Karakterler = {
    ciz() {
      const kok = $('#sekme-karakterler'), ev = A.evdekiler();
      kok.innerHTML = `
        <p class="aciklama" style="padding:0 2px">Evde ${ev.length} kişi yaşıyor. Birine dokun: ne yaptığını, kişiliğini ve ayarlarını gör.</p>
        ${ev.map(k => `
          <div class="kisiKart" data-k="${k.v.id}" style="--renk:${esc(renk(k))}">
            <i class="nokta"></i>
            <div class="kisiBilgi"><b>${esc(k.v.ad)}</b><span>${esc(Ev.odaBul(k.x, k.z).ad)} · ${esc(k.ifadeAdi())}</span>
              <small>${esc((window.Etkinlik && Etkinlik.metin(k)) || 'Kendi odasında')}</small></div>
            <button class="kucukBtn vurgu" data-konus="${k.v.id}">${Ikon.svg('mesaj')} Yaz</button>
          </div>`).join('')}`;
      kok.querySelectorAll('.kisiKart').forEach(r => r.onclick = e => {
        const konus = e.target.closest('[data-konus]');
        if (konus) { Panel.kapat(); A.ozelSohbet(konus.dataset.konus, true); return; }
        A.karakterSec(r.dataset.k); Panel.goster('karakter');
      });
    }
  };

  // ================================================================ HAFIZA (alt menü, sadece görüntüleme)
  const Hafiza = {
    secili: null,
    ciz() {
      const kok = $('#sekme-hafiza'), ev = A.evdekiler();
      const y = ev.find(k => k.v.id === Hafiza.secili) || A.yasam; Hafiza.secili = y.v.id;
      const h = y.v.hafiza.slice(-30).reverse(), o = y.v.olaylar.slice(-10).reverse();
      kok.innerHTML = `
        <div class="kisiSec">${ev.map(k => `<button data-k="${k.v.id}" class="${k === y ? 'secili' : ''}" style="--renk:${esc(renk(k))}"><i></i>${esc(k.v.ad)}</button>`).join('')}</div>
        <p class="aciklama" style="padding:6px 2px 0">Burası sadece görüntüleme içindir. ${esc(y.v.ad)} yanlış bir şey hatırlıyorsa sohbette söylemen yeter, kendisi düzeltir.</p>
        <div class="kutu">
          <h3>Seninle konuştukları</h3>
          ${h.length ? `<ul class="olaylar">${h.map(m => `<li><b style="color:${m.kim === 'sen' ? '#d6c4ff' : 'inherit'}">${m.kim === 'sen' ? 'Sen' : esc(y.v.ad)}:</b> ${esc(m.metin.length > 140 ? m.metin.slice(0, 140) + '…' : m.metin)} <span style="float:right">${once(m.z)}</span></li>`).join('')}</ul>` : '<div class="bos">Henüz bir şey yok.</div>'}
        </div>
        <div class="kutu">
          <h3>Evde yaşadıkları</h3>
          ${o.length ? `<ul class="olaylar">${o.map(x => `<li>${esc(x.olay)} <span style="float:right">${once(x.z)}</span></li>`).join('')}</ul>` : '<div class="bos">Henüz bir şey yok.</div>'}
        </div>`;
      kok.querySelectorAll('.kisiSec button').forEach(b => b.onclick = () => { Hafiza.secili = b.dataset.k; Hafiza.ciz(); });
    }
  };

  // ================================================================ EV DÜZENİ (alt menü)
  const EvDuzeni = {
    ciz() {
      const kok = $('#sekme-evduzeni'), esyalar = Ev.esyalar();
      const odalar = Ev.ODALAR.filter(o => !o.etiketsiz);
      kok.innerHTML = `
        <p class="aciklama" style="padding:0 2px">Odaya dokun: kamera oraya gider. Özelliğe dokun: hemen açılır. Yeni özellikler Atölye'de üretilip odalara yerleşir.</p>
        ${odalar.map(o => { const l = esyalar.filter(e => e.oda === o.id); return `
          <div class="odaKart" data-oda="${o.id}">
            <div class="odaUst"><b>${esc(o.ad)}</b><span>${o.sahip ? 'karakter odası' : o.bos ? 'ileride kullanılacak' : 'ortak oda'}</span></div>
            <div class="yuvalar">${l.map(e => `<span class="yuvaSatir"><button class="yuva" data-e="${e.id}">${Ikon.svg(e.ikon || 'sayfa')}<span>${esc(e.ad)}</span>${e.paket ? `<small>v${(Paketler.manifest(e.paket) || {}).surum || 1}</small>` : ''}</button><button class="yuvaMenu" data-m="${e.id}" aria-label="Seçenekler">⋯</button></span>`).join('')}${o.bos ? '' : `<button class="yuva bosYuva" data-arti="${o.id}">${Ikon.svg('arti')}<span>özellik ekle</span></button>`}</div>
          </div>`; }).join('')}`;
      kok.querySelectorAll('.odaKart').forEach(k => k.onclick = e => {
        const menu = e.target.closest('[data-m]'), arti = e.target.closest('[data-arti]');
        if (menu) { e.stopPropagation(); return EvDuzeni.menu(menu.dataset.m); }
        if (arti) { Atolye.hedefOda = arti.dataset.arti; Atolye.guncellenen = null; return Panel.goster('atolye'); }
        const y = e.target.closest('[data-e]');
        Panel.kapat();
        if (y) { A.esyaAc(y.dataset.e); return; }
        const o = Ev.oda(k.dataset.oda); A.odayaGit(o);
      });
    }
  };

  // ================================================================ PROJELER (Çalışma odası)
  const ProjePanel = {
    ciz() {
      const kok = $('#sekme-projeler'), l = Projeler.liste(), ev = A.evdekiler();
      const ad = id => (A.yasamlar.find(y => y.v.id === id) || { v: { ad: id } }).v.ad;
      const kart = p => `<div class="oneri proje" data-p="${p.id}">
          <div class="ust"><span>${p.olusturan === 'sen' ? 'Sen başlattın' : esc(ad(p.olusturan)) + (p.durum === 'onay' ? ' önerdi' : ' başlattı')} · ${once(p.z)}</span><span>${p.tur === 'buyuk' ? 'büyük' : 'küçük'}</span></div>
          <b>${esc(p.ad)}</b>
          ${p.amac ? `<p class="aciklama" style="margin:4px 0">${esc(p.amac)}</p>` : ''}
          ${p.durum === 'onay' ? `<p class="aciklama" style="margin:4px 0;color:#f2c94c">${p.etki === 'ozellik' ? 'Onaylarsan Atölye\'de yeni bir özellik üretilir (eve girmeden önce yine sana sorulur): ' + esc(p.istek || p.amac) : p.etki === 'not' ? 'Onaylarsan yapılacaklar listene şu maddeler eklenir.' : 'Senin verine dokunacak.'}${p.neden ? ' Neden: ' + esc(p.neden) : ''}</p>` : ''}
          <p class="aciklama" style="margin:4px 0">Ekip: ${p.uyeler.map(ad).map(esc).join(', ')}${p.sen ? ' ve sen' : ''}</p>
          ${p.adimlar.length ? `<ul class="adimlar">${p.adimlar.map((a, i) => `<li><label><input type="checkbox" data-adim="${i}" ${a.bitti ? 'checked' : ''} ${p.durum !== 'aktif' ? 'disabled' : ''}> ${esc(a.metin)}</label></li>`).join('')}</ul>` : ''}
          <div class="satir">${p.durum === 'onay' ? `<button class="kucukBtn vurgu" data-o="onay">${Ikon.svg('tik')} Onayla</button><button class="kucukBtn tehlike" data-o="red">Reddet</button>`
            : p.durum === 'aktif' ? `<button class="kucukBtn vurgu" data-o="sohbet">${Ikon.svg('mesaj')} Sohbet</button>${p.sen ? '' : '<button class="kucukBtn" data-o="katil">Katıl</button>'}<button class="kucukBtn" data-o="bitir">Bitti</button>` : `<span class="aciklama" style="margin:0">${p.durum === 'bitti' ? 'Tamamlandı' : 'Reddedildi'}</span>`}</div>
        </div>`;
      const onay = l.filter(p => p.durum === 'onay'), aktif = l.filter(p => p.durum === 'aktif'), eski = l.filter(p => p.durum === 'bitti' || p.durum === 'red').slice(0, 10);
      kok.innerHTML = `
        <p class="aciklama" style="padding:0 2px">Küçük iş birlikleri senin verine dokunmaz, karakterler kendileri açar. Büyük projeler (notlarını değiştirmek, yeni özellik üretmek) senin onayınla başlar.</p>
        ${onay.length ? '<h3 class="bolumBaslik">Onayını bekleyenler</h3>' + onay.map(kart).join('') : ''}
        <h3 class="bolumBaslik">Aktif projeler</h3>${aktif.map(kart).join('') || '<div class="bos">Aktif proje yok.</div>'}
        <div class="kutu">
          <h3>Yeni proje başlat</h3>
          <label class="alan">Adı</label><input id="prAd" maxlength="60">
          <label class="alan">Amacı</label><textarea id="prAmac" rows="2"></textarea>
          <label class="alan">Ekip</label>
          <div class="kisiSec" id="prUyeler">${ev.map(k => `<button data-k="${k.v.id}" style="--renk:${esc(k.v.gorunum.serit || k.v.gorunum.ust || '#a77de8')}"><i></i>${esc(k.v.ad)}</button>`).join('')}</div>
          <div class="satir" style="margin-top:10px"><button class="kucukBtn vurgu" id="prBaslat">Başlat</button></div>
        </div>
        ${eski.length ? '<h3 class="bolumBaslik">Geçmiş</h3>' + eski.map(kart).join('') : ''}`;
      kok.querySelectorAll('#prUyeler button').forEach(b => b.onclick = () => b.classList.toggle('secili'));
      $('#prBaslat').onclick = () => {
        const adx = $('#prAd').value.trim(), uyeler = [...kok.querySelectorAll('#prUyeler button.secili')].map(b => b.dataset.k);
        if (!adx || !uyeler.length) return A.bildir('Bir ad yaz ve en az bir kişi seç');
        const p = Projeler.olustur({ ad: adx, amac: $('#prAmac').value.trim(), uyeler, olusturan: 'sen' });
        if (p) { Panel.kapat(); A.projeSohbeti(p.id); }
      };
      kok.querySelectorAll('.proje').forEach(div => {
        const id = div.dataset.p, b = s => div.querySelector('[data-o=' + s + ']');
        if (b('onay')) b('onay').onclick = async () => { await Projeler.onayla(id); A.bildir('Proje başladı'); ProjePanel.ciz(); };
        if (b('red')) b('red').onclick = async () => { if (await A.sor('Bu proje reddedilsin mi?', 'Reddet')) { Projeler.reddet(id); ProjePanel.ciz(); } };
        if (b('sohbet')) b('sohbet').onclick = () => { Panel.kapat(); A.projeSohbeti(id); };
        if (b('katil')) b('katil').onclick = () => { Projeler.katil(id); ProjePanel.ciz(); };
        if (b('bitir')) b('bitir').onclick = async () => { if (await A.sor('Proje tamamlandı olarak işaretlensin mi?', 'Tamamlandı')) { Projeler.bitir(id); ProjePanel.ciz(); } };
        div.querySelectorAll('[data-adim]').forEach(c => c.onchange = () => { const p = Projeler.bul(id); p.adimlar[+c.dataset.adim].bitti = c.checked; Projeler.kaydet(p); });
      });
    }
  };

  EvDuzeni.menu = async id => {
    const e = Ev.esyaBul(id); if (!e) return;
    const m = e.paket ? Paketler.manifest(e.paket) : null;
    const l = [{ ad: 'Aç', fn: () => { Panel.kapat(); A.esyaAc(id); } }];
    if (m) {
      l.push({ ad: "Atölye'de geliştir (yeni sürüm)", fn: () => { Atolye.guncellenen = m.id; Atolye.hedefOda = null; Panel.goster('atolye'); } });
      if (m.surumler.length > 1) l.push({ ad: 'Sürümler (şu an ' + m.surum + ')', fn: () => EvDuzeni.surumler(m.id) });
      l.push({ ad: 'İzinler: ' + (m.izinler.length ? m.izinler.map(x => Paketler.IZINLER[x] || x).join(', ') : 'yok') });
    }
    l.push({ ad: 'Evden kaldır', tehlike: true, fn: async () => { if (!(await A.sor('"' + e.ad + '" evden kaldırılsın mı? Dosyası Laboratuvar\'da kalır.', 'Kaldır'))) return; Ozellikler.kaldirildi(id); Ev.esyaSil(id); A.esyalarDegisti(); EvDuzeni.ciz(); } });
    A.secenek(e.ad, l);
  };
  EvDuzeni.surumler = id => {
    const m = Paketler.manifest(id); if (!m) return;
    A.secenek(m.ad + ' · sürümler', m.surumler.slice().reverse().map(s => ({ ad: 'v' + s.n + (s.n === m.surum ? ' (şu an)' : '') + ' · ' + once(s.z) + (s.not ? ' · ' + s.not.slice(0, 40) : ''), fn: s.n === m.surum ? null : async () => { if (!(await A.sor('Sürüm ' + s.n + "'e dönülsün mü? Veriler korunur.", 'Geri dön'))) return; Paketler.geriAl(id, s.n); A.esyalarDegisti(); A.bildir('Sürüm ' + s.n + "'e dönüldü"); EvDuzeni.ciz(); } })));
  };

  // ================================================================ PANEL KABUĞU
  const BASLIK = { studyo: 'Stüdyo', projeler: 'Projeler', karakterler: 'Karakterler', karakter: 'Karakter', hafiza: 'Hafıza', evduzeni: 'Ev Düzeni', ayarlar: 'Ayarlar', atolye: 'Atölye', lab: 'Laboratuvar' };
  const UST = { karakter: 'karakterler', lab: 'ayarlar' };   // geri tuşu nereye döner
  const CIZ = { studyo: () => Studyo.ciz(), projeler: () => ProjePanel.ciz(), karakterler: () => Karakterler.ciz(), karakter: () => Atolye.ciz(), hafiza: () => Hafiza.ciz(), evduzeni: () => EvDuzeni.ciz(), ayarlar: () => Ayarlar.ciz(), atolye: () => Atolye.ciz(), lab: () => Lab.ciz() };
  const Panel = {
    sekme: 'karakterler',
    kur(app) {
      A = app;
      $('#perde').onclick = () => Panel.kapat();
      $('#panelKapat').innerHTML = Ikon.svg('kapat'); $('#panelKapat').onclick = () => Panel.kapat();
      $('#panelGeri').innerHTML = Ikon.svg('geri'); $('#panelGeri').onclick = () => Panel.geri();
      document.querySelectorAll('#altMenu button').forEach(b => {
        b.querySelector('i').innerHTML = Ikon.svg(b.querySelector('i').dataset.ikon);
        b.onclick = () => (Panel.acikMi() && Panel.sekme === b.dataset.sekme) ? Panel.kapat() : Panel.ac(b.dataset.sekme);
      });
      $('#editorKapat').innerHTML = Ikon.svg('kapat');
      $('#editorKapat').onclick = () => Editor.kapat();
      $('#editorKaydet').onclick = () => Editor.kaydet();
    },
    ac(sekme) {
      $('#panel').classList.add('acik'); $('#panel').setAttribute('aria-hidden', 'false');
      $('#perde').classList.remove('gizli');
      Panel.goster(sekme || Panel.sekme);
    },
    kapat() {
      $('#panel').classList.remove('acik'); $('#panel').setAttribute('aria-hidden', 'true');
      $('#perde').classList.add('gizli');
      document.querySelectorAll('#altMenu button').forEach(b => b.classList.remove('aktif'));
    },
    acikMi() { return $('#panel').classList.contains('acik'); },
    /** Panel içinde bir üst sayfaya dön; dönülecek yer yoksa false */
    geri() { const u = UST[Panel.sekme]; if (!u) return false; Panel.goster(u); return true; },
    goster(s) {
      Panel.sekme = s;
      if (!$('#sekme-' + s)) { const sec = document.createElement('section'); sec.id = 'sekme-' + s; sec.className = 'sekme'; $('#panel').appendChild(sec); }
      $('#panelBaslik').textContent = s === 'karakter' ? A.yasam.v.ad : BASLIK[s];
      $('#panelGeri').classList.toggle('gizli', !UST[s]);
      const menu = UST[s] || s;
      document.querySelectorAll('#altMenu button').forEach(b => b.classList.toggle('aktif', b.dataset.sekme === menu));
      document.querySelectorAll('.sekme').forEach(x => x.classList.toggle('aktif', x.id === 'sekme-' + s));
      $('#sekme-' + s).scrollTop = 0;
      try { CIZ[s](); } catch (e) { console.error(e); A.bildir('Panel hatası: ' + e.message); }
    },
    Editor, Lab, Atolye
  };
  window.Panel = Panel;
})();
