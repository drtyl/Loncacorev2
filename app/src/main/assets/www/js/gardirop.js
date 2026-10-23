/* Gardırop: her karakterin kombinleri. Şimdilik hazır (chibi/robot) bedenin renk kombinleri;
 * 3D kıyafet tasarımı Atölye'ye geldiğinde aynı gardıroba VRM kombinleri de eklenecek.
 * Kural: kıyafet karakterin kendi stilidir. Sen kombin hazırlayıp önerirsin ya da giydirirsin;
 * karakter de sabahları gardırobundan kendisi seçer (gerçek bir olay olarak kaydedilir).
 */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const yeniId = () => 'k' + Date.now().toString(36) + Math.floor(Math.random() * 1e3);

  /** Şablon görünüşünden ilk kombin */
  function ilkKombin(v) {
    const g = (window.KARAKTERLER || []).find(k => k.id === v.id);
    const s = (g && g.gorunum) || v.gorunum || {};
    const altTip = s.etek ? 'etek' : s.sort ? 'sort' : 'pantolon';
    return { id: yeniId(), ad: 'İlk kombin', renk: { ust: s.ust || '#7d5ba6', alt: s.etek || s.sort || s.alt || '#2a2633', ayakkabi: s.ayakkabi || '#f1eef7', altTip, bot: !!s.bot } };
  }
  /** Kombinden bedenin okuduğu görünüş alanları */
  function gorunum(r) {
    return { ust: r.ust, alt: r.alt, ayakkabi: r.ayakkabi, etek: r.altTip === 'etek' ? r.alt : '', sort: r.altTip === 'sort' ? r.alt : '', bot: !!r.bot };
  }
  function hazirla(y) {
    const v = y.v;
    if (!Array.isArray(v.gardirop) || !v.gardirop.length) { const k = ilkKombin(v); v.gardirop = [k]; v.giyiliKombin = k.id; y.kaydet(); }
    return v.gardirop;
  }

  // ---- 3D kıyafetler (VRM): her kombin bir model dosyasıdır. Atölye'de tasarlanıp dışa aktarılan .vrm buraya eklenir.
  function hazirla3d(y) {
    const v = y.v;
    if (!Array.isArray(v.gardirop3d)) v.gardirop3d = [];
    const hazir = App.hazirModel && App.hazirModel(v.id);
    if (hazir && !v.gardirop3d.some(k => k.id === 'varsayilan')) { v.gardirop3d.unshift({ id: 'varsayilan', ad: 'Atölye kombini', model: hazir }); if (!v.giyili3d) v.giyili3d = 'varsayilan'; y.kaydet(); }
    return v.gardirop3d;
  }
  const vrmModu = () => (App.ayar().beden || 'vrm') !== 'chibi' && App.sahne && !App.sahne.yedek && !!App.sahne.modelYukle;

  const Gardirop = {
    hazirla, hazirla3d,
    giydir3d(y, k, kim = 'sen') {
      y.v.giyili3d = k.id; y.kaydet();
      App.bedenKur(y);
      if (kim === 'sen') Etkinlik.olay('giydirildi', { y, ad: k.ad });
    },
    giydir(y, k, kim = 'sen') {
      y.v.kiyafet = gorunum(k.renk); y.v.giyiliKombin = k.id; y.kaydet();
      if (App.sahne && App.sahne.bedenYenile) App.sahne.bedenYenile(y.v.id);
      if (kim === 'sen') Etkinlik.olay('giydirildi', { y, ad: k.ad });
    },
    /** Karakter kendi seçer (sabah giyinme etkinliği) */
    karakterSecsin(y) {
      if (vrmModu()) {
        const l3 = hazirla3d(y), d3 = l3.filter(k => k.id !== y.v.giyili3d);
        y.v.giyinGunu = new Date().toDateString();
        if (!d3.length) { y.olay('Sabah giyindim; gardırobumda tek kombin var', 0); y.kaydet(); return; }
        const k = d3[Math.floor(Math.random() * d3.length)];
        Gardirop.giydir3d(y, k, 'kendisi');
        y.olay('Bugün gardırobumdan "' + k.ad + '" kombinini kendim seçtim', 3);
        if (App.seciliYasam && App.seciliYasam() === y) App.balon('Bugün "' + k.ad + '" giyiyorum!', 2600);
        if (Gardirop.acikMi()) Gardirop.ciz();
        return;
      }
      const l = hazirla(y), digerleri = l.filter(k => k.id !== y.v.giyiliKombin), k = (digerleri.length ? digerleri : l)[Math.floor(Math.random() * (digerleri.length || l.length))];
      y.v.giyinGunu = new Date().toDateString();
      Gardirop.giydir(y, k, 'kendisi');
      y.olay('Bugün gardırobumdan "' + k.ad + '" kombinini kendim seçtim', 3);
      if (App.seciliYasam && App.seciliYasam() === y) App.balon('Bugün "' + k.ad + '" giyiyorum!', 2600);
      if (Gardirop.acikMi()) Gardirop.ciz();
    },
    acikMi() { return !!$('#gardirop') && !$('#gardirop').classList.contains('gizli'); },
    ac(id) {
      Gardirop.secili = id || (App.seciliYasam ? App.seciliYasam().v.id : null);
      let p = $('#gardirop');
      if (!p) {
        p = document.createElement('div'); p.id = 'gardirop';
        p.innerHTML = '<div class="pencereUst"><button class="ikonBtn" id="gardiropKapat" aria-label="Kapat"></button><span>Gardırop</span></div><div id="gardiropIc"></div>';
        document.body.appendChild(p);
        p.querySelector('#gardiropKapat').innerHTML = Ikon.svg('kapat');
        p.querySelector('#gardiropKapat').onclick = Gardirop.kapat;
      }
      p.classList.remove('gizli'); Gardirop.duzenlenen = null; Gardirop.ciz();
    },
    kapat() { const p = $('#gardirop'); if (p) p.classList.add('gizli'); },
    ciz() {
      const ic = $('#gardiropIc'), ev = App.evdekiler();
      let y = ev.find(k => k.v.id === Gardirop.secili) || ev[0]; Gardirop.secili = y.v.id;
      const l = hazirla(y), giyili = l.find(k => k.id === y.v.giyiliKombin), d = Gardirop.duzenlenen, l3 = vrmModu() ? hazirla3d(y) : [];
      const sw = r => `<span class="kombinRenk"><i style="background:${esc(r.ust)}"></i><i style="background:${esc(r.alt)}"></i><i style="background:${esc(r.ayakkabi)}"></i></span>`;
      ic.innerHTML = `
        <div class="gardiropKisiler">${ev.map(k => `<button data-k="${k.v.id}" class="${k === y ? 'secili' : ''}" style="--renk:${esc(k.v.gorunum.serit || k.v.gorunum.ust || '#a77de8')}"><i></i>${esc(k.v.ad)}</button>`).join('')}</div>
        <div class="kutu">
          <h3>${esc(y.v.ad)} şu an</h3>
          <p class="aciklama">${giyili ? sw(giyili.renk) + ' <b>' + esc(giyili.ad) + '</b>' : 'Kombin seçilmedi.'}</p>
          <div class="satir"><button class="kucukBtn" id="grKendi">${esc(y.v.ad)} kendisi seçsin</button></div>
        </div>
        ${vrmModu() ? `<div class="kutu">
          <h3>3D kıyafetler (${l3.length})</h3>
          ${l3.map(k => `<div class="kombin ${k.id === y.v.giyili3d ? 'giyili' : ''}" data-id3="${esc(k.id)}"><b>${esc(k.ad)}</b><span>${k.model.startsWith('asset:') ? 'uygulamayla geldi' : 'senin eklediğin'}</span>
            <div class="satir"><button class="kucukBtn vurgu" data-e="giy3" ${k.id === y.v.giyili3d ? 'disabled' : ''}>${k.id === y.v.giyili3d ? 'Giyili' : 'Giydir'}</button>${k.id !== 'varsayilan' ? '<button class="kucukBtn tehlike" data-e="sil3">Sil</button>' : ''}</div></div>`).join('')}
          <p class="aciklama" style="margin-top:8px">Avatar Atölyesi'nde ${esc(y.v.ad)} için kıyafet tasarlayıp .vrm olarak dışa aktar, buradan gardırobuna ekle. Kimlik (beden, yüz, renkler) değişmez; sadece kıyafet ${esc(y.v.ad)}'${/[aıou]$/i.test(y.v.ad) ? 'nın' : 'nin'} seçimidir.</p>
          <div class="satir"><button class="kucukBtn vurgu" id="grVrmEkle">+ 3D kıyafet ekle (.vrm)</button><input type="file" id="grVrmInput" accept=".vrm,application/octet-stream" class="gizli"></div>
        </div>` : ''}
        <div class="kutu">
          <h3>${vrmModu() ? 'Hafif beden renkleri' : 'Kombinler'} (${l.length})</h3>${vrmModu() ? '<p class="aciklama">Bunlar sadece Ayarlar\'dan "hafif beden" seçilince görünür.</p>' : ''}
          ${l.map(k => `<div class="kombin ${k.id === y.v.giyiliKombin ? 'giyili' : ''}" data-id="${k.id}">${sw(k.renk)}<b>${esc(k.ad)}</b><span>${k.renk.altTip === 'etek' ? 'etek' : k.renk.altTip === 'sort' ? 'şort' : 'pantolon'}${k.renk.bot ? ' · bot' : ''}</span>
            <div class="satir"><button class="kucukBtn vurgu" data-e="giy" ${k.id === y.v.giyiliKombin ? 'disabled' : ''}>${k.id === y.v.giyiliKombin ? 'Giyili' : 'Giydir'}</button><button class="kucukBtn" data-e="duzenle">Düzenle</button>${l.length > 1 ? '<button class="kucukBtn tehlike" data-e="sil">Sil</button>' : ''}</div></div>`).join('')}
          <div class="satir" style="margin-top:8px"><button class="kucukBtn vurgu" id="grYeni">+ Yeni kombin</button></div>
        </div>
        ${d ? `<div class="kutu" id="grEditor">
          <h3>${d.id ? 'Kombini düzenle' : 'Yeni kombin'}</h3>
          <label class="alan">Adı</label><input id="grAd" maxlength="28" value="${esc(d.ad)}">
          <div class="renkler" style="margin-top:10px">
            <label>Üst<input type="color" id="grUst" value="${esc(d.renk.ust)}"></label>
            <label>Alt<input type="color" id="grAlt" value="${esc(d.renk.alt)}"></label>
            <label>Ayakkabı<input type="color" id="grAyk" value="${esc(d.renk.ayakkabi)}"></label>
          </div>
          <div class="satir" style="margin-top:10px">
            <select id="grTip"><option value="pantolon">Pantolon</option><option value="sort">Şort</option><option value="etek">Etek</option></select>
            <label class="anahtar" style="flex:none;margin:0"><span>Bot</span><input type="checkbox" id="grBot" ${d.renk.bot ? 'checked' : ''}></label>
          </div>
          <div class="satir" style="margin-top:12px"><button class="kucukBtn" id="grVazgec">Vazgeç</button><button class="kucukBtn vurgu" id="grKaydet">Gardıroba ekle</button><button class="kucukBtn vurgu" id="grKaydetGiy">Ekle ve giydir</button></div>
        </div>` : ''}
        <p class="aciklama" style="padding:0 4px">Kıyafet ${esc(y.v.ad)}'${/[aıou]$/i.test(y.v.ad) ? 'nın' : 'nin'} kendi tarzıdır: sen kombin hazırlayıp giydirebilirsin, ${esc(y.v.ad)} da sabahları gardırobundan kendisi seçer.</p>`;
      if (d) $('#grTip').value = d.renk.altTip || 'pantolon';
      ic.querySelectorAll('.gardiropKisiler button').forEach(b => b.onclick = () => { Gardirop.secili = b.dataset.k; Gardirop.duzenlenen = null; Gardirop.ciz(); });
      ic.querySelectorAll('.kombin').forEach(div => {
        const k = l.find(x => x.id === div.dataset.id);
        div.querySelector('[data-e=giy]').onclick = () => { Gardirop.giydir(y, k); App.bildir(y.v.ad + ': ' + k.ad); Gardirop.ciz(); };
        div.querySelector('[data-e=duzenle]').onclick = () => { Gardirop.duzenlenen = JSON.parse(JSON.stringify(k)); Gardirop.ciz(); $('#grEditor').scrollIntoView({ behavior: 'smooth' }); };
        const sil = div.querySelector('[data-e=sil]');
        if (sil) sil.onclick = async () => { if (!(await App.sor('"' + k.ad + '" gardıroptan çıkarılsın mı?', 'Çıkar'))) return; y.v.gardirop = l.filter(x => x !== k); if (y.v.giyiliKombin === k.id) Gardirop.giydir(y, y.v.gardirop[0], 'kendisi'); else y.kaydet(); Gardirop.ciz(); };
      });
      ic.querySelectorAll('[data-id3]').forEach(div => {
        const k = l3.find(x => x.id === div.dataset.id3);
        div.querySelector('[data-e=giy3]').onclick = () => { Gardirop.giydir3d(y, k); App.bildir(y.v.ad + ': ' + k.ad + ' (yükleniyor…)'); Gardirop.ciz(); };
        const sil = div.querySelector('[data-e=sil3]');
        if (sil) sil.onclick = async () => { if (!(await App.sor('"' + k.ad + '" gardıroptan çıkarılsın mı?', 'Çıkar'))) return; y.v.gardirop3d = l3.filter(x => x !== k); try { Depo.sil(k.model); } catch (e) {} if (y.v.giyili3d === k.id) Gardirop.giydir3d(y, y.v.gardirop3d[0] || { id: '' }, 'kendisi'); else y.kaydet(); Gardirop.ciz(); };
      });
      if ($('#grVrmEkle')) {
        $('#grVrmEkle').onclick = () => $('#grVrmInput').click();
        $('#grVrmInput').onchange = async e => {
          const f = e.target.files[0]; if (!f) return;
          const ad = await App.sor('Kıyafetin adı', 'Ekle', f.name.replace(/\.vrm$/i, '').slice(0, 28)); if (!ad) return;
          App.bildir('Ekleniyor…');
          const r = new FileReader();
          r.onload = () => {
            const b64 = String(r.result).split(',')[1] || '', yol = '/karakterler/' + y.v.id + '/kiyafet/' + Date.now().toString(36) + '.vrm';
            try { Depo.yazB64(yol, b64); } catch (err) { return App.bildir(err.message); }
            const k = { id: 'v' + Date.now().toString(36), ad: ad.slice(0, 28), model: yol };
            y.v.gardirop3d = l3.concat(k); y.kaydet(); y.olay('Gardırobuma yeni bir 3D kıyafet eklendi: ' + k.ad, 3);
            App.bildir('"' + k.ad + '" gardıropta'); Gardirop.ciz();
          };
          r.readAsDataURL(f);
        };
      }
      $('#grKendi').onclick = () => { if ((vrmModu() ? l3.length : l.length) < 2) return App.bildir('Seçebilmesi için en az iki kombin olmalı'); y.v.giyinGunu = ''; Gardirop.kapat(); y.istek = { tur: 'gardirop', metin: 'Gardıroptan ne giyeceğini seçiyor', sure: 10, kos: true, varinca: () => Gardirop.karakterSecsin(y) }; if (App.modAyarla) App.modAyarla('ev'); };
      $('#grYeni').onclick = () => { const g = giyili || l[0]; Gardirop.duzenlenen = { id: '', ad: 'Kombin ' + (l.length + 1), renk: JSON.parse(JSON.stringify(g.renk)) }; Gardirop.ciz(); $('#grEditor').scrollIntoView({ behavior: 'smooth' }); };
      if (d) {
        const oku = () => ({ ust: $('#grUst').value, alt: $('#grAlt').value, ayakkabi: $('#grAyk').value, altTip: $('#grTip').value, bot: $('#grBot').checked });
        const kaydet = giy => {
          const ad = ($('#grAd').value || '').trim().slice(0, 28) || 'Kombin';
          let k = d.id ? l.find(x => x.id === d.id) : null;
          if (k) { k.ad = ad; k.renk = oku(); } else { k = { id: yeniId(), ad, renk: oku() }; l.push(k); }
          y.v.gardirop = l; Gardirop.duzenlenen = null;
          if (giy || k.id === y.v.giyiliKombin) Gardirop.giydir(y, k); else { y.kaydet(); y.olay('Gardırobuma yeni bir kombin eklendi: ' + ad, 2); }
          App.bildir('"' + ad + '" gardıropta'); Gardirop.ciz();
        };
        $('#grVazgec').onclick = () => { Gardirop.duzenlenen = null; Gardirop.ciz(); };
        $('#grKaydet').onclick = () => kaydet(false);
        $('#grKaydetGiy').onclick = () => kaydet(true);
      }
    }
  };
  window.Gardirop = Gardirop;
})();
