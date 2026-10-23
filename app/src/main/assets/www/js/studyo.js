/* Stüdyo: senaryo → set → çekim → video. Film Odası'ndaki kamera simgesinden açılır.
 *
 * Senaryo: { id, ad, muzik: 'yok'|'neseli'|'sakin'|'gerilim'|'romantik', sahneler: [{ oda, kisiler: [id], replikler: [{ kim, metin, hareket }] }] }
 *   - Sen yazabilirsin, ya da fikrini söylersin; karakterler yazar (Groq), sen düzenleyip onaylarsın.
 * Çekim: karakterler sahnenin odasına gidip yerlerini alır (set), kamera kendi açılarını seçer (geniş · yakın · ikili),
 *   konuşan karakter ağız ve hareketiyle oynar, altyazı görünür. Video: görüntü + altyazı + müzik (webm).
 *   Not: karakter sesleri telefonun ses motorundan çıktığı için videoya giremez; altyazı ve müzik girer.
 * Videolar /videolar/ klasöründe durur; "Telefona kaydet" İndirilenler/Lonca'ya kopyalar.
 */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KLASOR = '/studyo';
  const VIDEO = '/videolar';
  const HAREKET_AD = { yok: '—', dans: 'Dans', alkis: 'Alkış', el: 'El sallama', zipla: 'Zıplama', egil: 'Eğilme', dusun: 'Düşünme' };
  const MUZIK_AD = { yok: 'Müzik yok', neseli: 'Neşeli', sakin: 'Sakin', gerilim: 'Gerilim', romantik: 'Romantik' };
  const bekle = ms => new Promise(r => setTimeout(r, ms));

  // ---------------------------------------------------------------- müzik (WebAudio ile üretilir; videoya da girer)
  const MUZIK = {
    neseli: { tempo: 118, akor: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], dalga: 'triangle', arp: true },
    sakin: { tempo: 72, akor: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], dalga: 'sine', arp: false },
    gerilim: { tempo: 96, akor: [[57, 60, 63], [57, 60, 63], [56, 59, 62], [58, 61, 64]], dalga: 'sawtooth', arp: true },
    romantik: { tempo: 80, akor: [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]], dalga: 'sine', arp: true }
  };
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  function muzikBaslat(stil, hedef) {
    const m = MUZIK[stil]; if (!m) return null;
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const ana = ac.createGain(); ana.gain.value = 0.22; ana.connect(ac.destination);
    let kayitHedef = null; try { kayitHedef = ac.createMediaStreamDestination(); ana.connect(kayitHedef); } catch (e) {}
    const vurus = 60 / m.tempo; let t0 = ac.currentTime + 0.1, olcu = 0, dur = false;
    const nota = (f, bas, sure, tip, ses) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = tip; o.frequency.value = f; g.gain.setValueAtTime(0, bas); g.gain.linearRampToValueAtTime(ses, bas + 0.03); g.gain.exponentialRampToValueAtTime(0.0008, bas + sure); o.connect(g); g.connect(ana); o.start(bas); o.stop(bas + sure + 0.05); };
    const davul = bas => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(110, bas); o.frequency.exponentialRampToValueAtTime(40, bas + 0.15); g.gain.setValueAtTime(0.6, bas); g.gain.exponentialRampToValueAtTime(0.001, bas + 0.2); o.connect(g); g.connect(ana); o.start(bas); o.stop(bas + 0.25); };
    const planla = () => {
      if (dur) return;
      while (t0 < ac.currentTime + 1.2) {
        const ak = m.akor[olcu % m.akor.length];
        for (const n of ak) nota(hz(n), t0, vurus * 4, m.dalga === 'sawtooth' ? 'triangle' : 'sine', 0.07);       // pad
        nota(hz(ak[0] - 12), t0, vurus * 2, 'sine', 0.16); nota(hz(ak[0] - 12), t0 + vurus * 2, vurus * 2, 'sine', 0.14);  // bas
        if (m.arp) for (let i = 0; i < 8; i++) nota(hz(ak[i % 3] + 12), t0 + i * vurus / 2, vurus / 2, m.dalga, 0.05);
        if (stil !== 'sakin' && stil !== 'romantik') for (let i = 0; i < 4; i++) davul(t0 + i * vurus);
        t0 += vurus * 4; olcu++;
      }
      setTimeout(planla, 400);
    };
    planla();
    return { ac, akis: kayitHedef && kayitHedef.stream, dur() { dur = true; try { ana.gain.linearRampToValueAtTime(0, ac.currentTime + 0.6); setTimeout(() => ac.close(), 800); } catch (e) {} } };
  }

  // ---------------------------------------------------------------- senaryolar
  const Senaryolar = {
    liste() { try { return Depo.liste(KLASOR).filter(d => !d.dir && d.name.endsWith('.json')).map(d => Depo.okuJSON(KLASOR + '/' + d.name, null)).filter(Boolean).sort((a, b) => b.z - a.z); } catch (e) { return []; } },
    kaydet(s) { s.z = s.z || Date.now(); Depo.yazJSON(KLASOR + '/' + s.id + '.json', s); },
    sil(id) { Depo.sil(KLASOR + '/' + id + '.json'); },
    yeni() { const ev = App.evdekiler(); return { id: 's' + Date.now().toString(36), ad: 'Yeni sahne', muzik: 'neseli', sahneler: [{ oda: 'salon', kisiler: ev.slice(0, 2).map(y => y.v.id), replikler: [{ kim: ev[0].v.id, metin: 'Merhaba!', hareket: 'el' }] }] }; },
    /** Karakterden gelen senaryoyu temizler (olmayan oda/karakter atılır) */
    temizle(j) {
      const ev = App.evdekiler().map(y => y.v.id), odalar = Ev.ODALAR.filter(o => !o.etiketsiz).map(o => o.id);
      const s = { id: 's' + Date.now().toString(36), ad: String(j.ad || 'Senaryo').slice(0, 50), muzik: MUZIK_AD[j.muzik] ? j.muzik : 'neseli', sahneler: [] };
      for (const sh of (j.sahneler || []).slice(0, 4)) {
        const kisiler = (sh.kisiler || []).filter(k => ev.includes(k)).slice(0, 5);
        const replikler = (sh.replikler || []).filter(r => kisiler.includes(r.kim) && r.metin).slice(0, 12).map(r => ({ kim: r.kim, metin: String(r.metin).slice(0, 200), hareket: HAREKET_AD[r.hareket] ? r.hareket : 'yok' }));
        if (kisiler.length && replikler.length) s.sahneler.push({ oda: odalar.includes(sh.oda) ? sh.oda : 'salon', kisiler, replikler });
      }
      return s.sahneler.length ? s : null;
    }
  };

  // ---------------------------------------------------------------- yönetmen: set kurar, çeker, kaydeder
  const Yonetmen = {
    calisiyor: false,
    /** Set: karakterler sahnenin odasında yan yana, kameraya dönük durur */
    setYerleri(o, n) {
      const cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2 + 0.3, ara = Math.min(1.0, (o.x1 - o.x0 - 1) / Math.max(1, n));
      return Array.from({ length: n }, (_, i) => { const x = cx + (i - (n - 1) / 2) * ara, z = cz + (i % 2) * 0.25; const [ix, iz] = [x, z]; return Ev.yurunebilir(ix, iz) ? { x, z } : (() => { const p = Ev.enYakinBos(x, z); return { x: (p[0] + 0.5) * 0.2, z: (p[1] + 0.5) * 0.2 }; })(); });
    },
    async cek(sen, { kaydet = true, sesli = false } = {}) {
      if (Yonetmen.calisiyor) return; Yonetmen.calisiyor = true;
      const sahne = App.sahne, ev = App.evdekiler();
      if (!sahne.mod || !sahne.renderer) { Yonetmen.calisiyor = false; return App.bildir('Çekim 3D görünüm gerektirir'); }
      Panel.kapat(); App.modAyarla('ev');
      document.body.classList.add('cekimde');
      const perde = document.createElement('div'); perde.id = 'cekimPerde';
      perde.innerHTML = '<div id="cekimBaslik"></div><div id="altyazi"></div><button id="cekimDur" class="kucukBtn tehlike">■ Durdur</button><div id="cekimKayit">● KAYIT</div>';
      document.body.appendChild(perde);
      let durdur = false; $('#cekimDur').onclick = () => { durdur = true; };
      // kayıt tuvali: 3D görüntü + altyazı birleştirilir
      const kaynak = sahne.renderer.domElement, W = 720, H = Math.round(720 * kaynak.height / Math.max(1, kaynak.width));
      const kt = document.createElement('canvas'); kt.width = W; kt.height = H & ~1; const g = kt.getContext('2d');
      let altyazi = '', konusan = null, baslik = sen.ad, baslikBitis = Date.now() + 2500;
      const altEl = $('#altyazi'), basEl = $('#cekimBaslik');
      sahne.kareSonu = c => {
        const at = altyazi ? (konusan ? konusan + ': ' : '') + altyazi : '';
        if (altEl.textContent !== at) { altEl.textContent = at; altEl.classList.toggle('gizli', !at); }
        const bt = Date.now() < baslikBitis ? baslik : ''; if (basEl.textContent !== bt) { basEl.textContent = bt; basEl.classList.toggle('gizli', !bt); }
        g.drawImage(c, 0, 0, kt.width, kt.height);
        if (Date.now() < baslikBitis) { g.fillStyle = 'rgba(8,6,20,.55)'; g.fillRect(0, 0, kt.width, kt.height); g.fillStyle = '#fff'; g.font = 'bold 44px system-ui'; g.textAlign = 'center'; g.fillText(baslik, kt.width / 2, kt.height / 2); g.font = '22px system-ui'; g.fillStyle = '#c9b6ff'; g.fillText('Lonca Stüdyo', kt.width / 2, kt.height / 2 + 40); }
        if (altyazi) {
          g.font = '600 30px system-ui'; g.textAlign = 'center';
          const satirlar = [], kel = altyazi.split(' '); let s = '';
          for (const k of kel) { if (g.measureText(s + ' ' + k).width > kt.width - 80) { satirlar.push(s); s = k; } else s = s ? s + ' ' + k : k; } satirlar.push(s);
          const y0 = kt.height - 60 - satirlar.length * 38;
          g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(30, y0 - 34, kt.width - 60, satirlar.length * 38 + 50);
          if (konusan) { g.fillStyle = '#e8dcff'; g.font = '600 22px system-ui'; g.fillText(konusan, kt.width / 2, y0 - 8); g.font = '600 30px system-ui'; }
          g.fillStyle = '#fff'; satirlar.forEach((l, i) => g.fillText(l, kt.width / 2, y0 + 28 + i * 38));
        }
      };
      const muzik = sen.muzik && sen.muzik !== 'yok' ? muzikBaslat(sen.muzik) : null;
      let kayit = null, parcalar = [];
      if (kaydet && window.MediaRecorder && kt.captureStream) {
        const akis = kt.captureStream(30);
        if (muzik && muzik.akis) for (const t of muzik.akis.getAudioTracks()) akis.addTrack(t);
        const tip = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) || '';
        try { kayit = new MediaRecorder(akis, tip ? { mimeType: tip, videoBitsPerSecond: 3000000 } : undefined); kayit.ondataavailable = e => { if (e.data && e.data.size) parcalar.push(e.data); }; kayit.start(500); }
        catch (e) { kayit = null; App.bildir('Bu cihazda video kaydı başlatılamadı; sadece oynatılacak'); }
      }
      if (!kayit) $('#cekimKayit').textContent = '▶ OYNATMA';
      baslikBitis = Date.now() + 3200;   // başlık kartı kayıt başladıktan sonra görünür
      const katilan = new Set();
      try {
        sahne.mod('cekim');
        for (let si = 0; si < sen.sahneler.length && !durdur; si++) {
          const sh = sen.sahneler[si], oda = Ev.oda(sh.oda) || Ev.oda('salon');
          const oyuncular = sh.kisiler.map(id => ev.find(y => y.v.id === id)).filter(Boolean);
          // SET: oyuncular sahnenin odasında yerlerini alır, kameraya dönük (set kurulurken başlık kartı görünür)
          sahne.cekim = { tip: 'genis', oda, aci: 0.3 }; sahne._anlik = true;
          const yerler = Yonetmen.setYerleri(oda, oyuncular.length);
          oyuncular.forEach((y, i) => {
            katilan.add(y); if (y.uyuyor) y.uyan('Çekim için uyandım');
            y.dur(); y.x = yerler[i].x; y.z = yerler[i].z; y.yaw = 0; y.sabitle(true); y.hedefYaw = 0;
            y.etkinlik = { tur: 'cekim', ikon: 'kamera', metin: 'Stüdyoda çekimde: ' + sen.ad, oda: oda.ad, x: yerler[i].x, z: yerler[i].z, yolda: false, bitis: Infinity };
          });
          if (si > 0) { baslik = 'Sahne ' + (si + 1); baslikBitis = Date.now() + 1500; }
          await bekle(Math.max(0, baslikBitis - Date.now()));
          await bekle(1800);   // geniş plan: herkes yerinde
          // REPLİKLER
          for (let ri = 0; ri < sh.replikler.length && !durdur; ri++) {
            const r = sh.replikler[ri], y = oyuncular.find(o => o.v.id === r.kim); if (!y) continue;
            const diger = oyuncular.find(o => o !== y);
            const plan = ri % 3 === 0 && diger ? { tip: 'ikili', id: y.v.id, id2: diger.v.id } : { tip: 'yakin', id: y.v.id, aci: (ri % 2 ? 0.5 : -0.5) };
            sahne.cekim = plan; sahne._anlik = true;
            altyazi = r.metin; konusan = y.v.ad;
            if (r.hareket && r.hareket !== 'yok') y.hareketYap(r.hareket, Math.max(2.5, r.metin.length * 0.07));
            const sure = Math.max(2200, Math.min(7000, 900 + r.metin.length * 65));
            if (sesli) { Ses.konus(r.metin, y.v.ses, y); await Promise.race([bekle(sure + 4000), new Promise(ok => { const t = setInterval(() => { if (!Ses.konusuyorMu()) { clearInterval(t); ok(); } }, 200); })]); }
            else { y.konus(true); await bekle(sure); y.konus(false); }
            altyazi = ''; konusan = null;
            await bekle(250);
          }
          // sahne sonu: geniş plan
          sahne.cekim = { tip: 'genis', oda, aci: -0.3 }; sahne._anlik = true;
          await bekle(1500);
        }
      } finally {
        altyazi = ''; baslik = 'Son'; baslikBitis = Date.now() + 1500; await bekle(1500);
        if (muzik) muzik.dur();
        let blob = null;
        if (kayit) { await new Promise(ok => { kayit.onstop = ok; try { kayit.stop(); } catch (e) { ok(); } }); blob = new Blob(parcalar, { type: (kayit.mimeType || 'video/webm').split(';')[0] }); }
        sahne.kareSonu = null; sahne.cekim = null;
        for (const y of katilan) { y.sabitle(false); y.etkinlik = null; y._etkBekle = 0; y.olay('Stüdyoda "' + sen.ad + '" sahnesini çektik', 4); }
        perde.remove(); document.body.classList.remove('cekimde');
        App.modAyarla('ev'); Yonetmen.calisiyor = false;
        if (blob && blob.size > 1000) await Yonetmen.videoKaydet(blob, sen.ad);
      }
    },
    async videoKaydet(blob, ad) {
      const b64 = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.readAsDataURL(blob); });
      const dosya = (ad.replace(/[^\wçğıöşüÇĞİÖŞÜ \-]/g, '').trim().replace(/\s+/g, '-') || 'video') + '-' + (() => { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()); })() + '.webm';
      try { Depo.yazB64(VIDEO + '/' + dosya, b64); } catch (e) { return App.bildir('Video kaydedilemedi: ' + e.message); }
      App.telefonBildirimi('Video hazır', '"' + ad + '" Stüdyo’da seni bekliyor');
      Panel.ac('studyo');
    }
  };

  // ---------------------------------------------------------------- panel
  const Studyo = {
    duzenlenen: null,
    ciz() {
      const kok = $('#sekme-studyo'), l = Senaryolar.liste(), ev = App.evdekiler(), groq = !!App.ayar().groqAnahtar;
      let videolar = []; try { videolar = Depo.liste(VIDEO).filter(d => !d.dir).sort((a, b) => b.mtime - a.mtime); } catch (e) {}
      const d = Studyo.duzenlenen;
      if (d) return Studyo.editor(kok, d);
      kok.innerHTML = `
        <div class="kutu">
          <h3>Fikrini söyle, karakterler yazsın</h3>
          <textarea id="stFikir" rows="2" placeholder="Örn: Luna ile Leon mutfakta yemek yarışması yapsın, Medica hakem olsun"></textarea>
          <div class="satir" style="margin-top:8px"><button class="kucukBtn vurgu" id="stYazdir" ${groq ? '' : 'disabled'}>${Ikon.svg('kalem')} Senaryoyu yazsınlar</button><button class="kucukBtn" id="stYeni">Kendim yazacağım</button></div>
          ${groq ? '' : '<p class="aciklama" style="margin-top:6px">Karakterlerin yazması için Ayarlar bölümünden Groq anahtarı gerekli. Kendin yazabilirsin.</p>'}
        </div>
        <h3 class="bolumBaslik">Senaryolar</h3>
        ${l.map(s => `<div class="oneri" data-s="${s.id}"><div class="ust"><span>${s.sahneler.length} sahne · ${s.sahneler.reduce((a, b) => a + b.replikler.length, 0)} replik</span><span>${esc(MUZIK_AD[s.muzik] || '')}</span></div><b>${esc(s.ad)}</b>
          <div class="satir" style="margin-top:8px"><button class="kucukBtn vurgu" data-o="cek">${Ikon.svg('kamera')} Çek</button><button class="kucukBtn" data-o="oynat">Prova</button><button class="kucukBtn" data-o="duzen">Düzenle</button><button class="kucukBtn tehlike" data-o="sil">Sil</button></div></div>`).join('') || '<div class="bos">Henüz senaryo yok.</div>'}
        <h3 class="bolumBaslik">Videolar</h3>
        ${videolar.map(v => `<div class="oneri" data-v="${esc(v.name)}"><b>${esc(v.name)}</b><span class="aciklama" style="display:block;margin:4px 0">${(v.size / 1048576).toFixed(1)} MB</span>
          <div class="satir"><button class="kucukBtn vurgu" data-o="izle">▶ İzle</button><button class="kucukBtn" data-o="disa">${Ikon.svg('yukle')} Telefona kaydet</button><button class="kucukBtn tehlike" data-o="vsil">Sil</button></div></div>`).join('') || '<div class="bos">Henüz video yok.</div>'}
        <p class="aciklama" style="padding:6px 2px">Videoda görüntü, altyazı ve müzik var. Karakter sesleri telefonun ses motorundan çıktığı için videoya girmez ("Prova"da sesli izleyebilirsin).</p>`;
      $('#stYeni').onclick = () => { Studyo.duzenlenen = Senaryolar.yeni(); Studyo.ciz(); };
      $('#stYazdir').onclick = async () => {
        const f = $('#stFikir').value.trim(); if (!f) return App.bildir('Bir fikir yaz');
        const b = $('#stYazdir'); b.disabled = true; b.textContent = 'Yazıyorlar…';
        try { const s = await Zihin.senaryoYaz(f, App.evdekiler()); if (!s) throw new Error('Senaryo çıkmadı, tekrar dene'); Studyo.duzenlenen = s; Studyo.yeniMi = true; }
        catch (e) { App.bildir(e.message); }
        Studyo.ciz();
      };
      kok.querySelectorAll('[data-s]').forEach(div => {
        const s = l.find(x => x.id === div.dataset.s), b = k => div.querySelector('[data-o=' + k + ']');
        b('cek').onclick = () => Yonetmen.cek(s, { kaydet: true, sesli: false });
        b('oynat').onclick = () => Yonetmen.cek(s, { kaydet: false, sesli: true });
        b('duzen').onclick = () => { Studyo.duzenlenen = JSON.parse(JSON.stringify(s)); Studyo.ciz(); };
        b('sil').onclick = async () => { if (await App.sor('"' + s.ad + '" silinsin mi?', 'Sil')) { Senaryolar.sil(s.id); Studyo.ciz(); } };
      });
      kok.querySelectorAll('[data-v]').forEach(div => {
        const ad = div.dataset.v, yol = VIDEO + '/' + ad, b = k => div.querySelector('[data-o=' + k + ']');
        b('izle').onclick = () => Studyo.izle(yol);
        b('disa').onclick = () => {
          if (!window.LoncaNative || !LoncaNative.disaKaydet) { const a = document.createElement('a'); a.href = Depo.dataURL(yol); a.download = ad; a.click(); return; }
          const r = JSON.parse(LoncaNative.disaKaydet(yol, ad, 'video/webm')); App.bildir(r.ok ? 'Kaydedildi: ' + r.data : r.error);
        };
        b('vsil').onclick = async () => { if (await App.sor(ad + ' silinsin mi?', 'Sil')) { Depo.sil(yol); Studyo.ciz(); } };
      });
    },
    izle(yol) {
      const p = document.createElement('div'); p.className = 'sorPerde';
      p.innerHTML = '<div class="sorKutu" style="padding:8px"><video controls autoplay playsinline style="width:100%;max-height:70vh;border-radius:10px;background:#000"></video><div class="satir"><button class="kucukBtn" data-h="0">Kapat</button></div></div>';
      p.querySelector('video').src = Depo.dataURL(yol);
      p.querySelector('[data-h="0"]').onclick = () => p.remove();
      document.body.appendChild(p);
    },
    editor(kok, s) {
      const ev = App.evdekiler(), odalar = Ev.ODALAR.filter(o => !o.etiketsiz && !o.bos);
      const kisiSec = (sh, si) => ev.map(y => `<button data-si="${si}" data-k="${y.v.id}" class="${sh.kisiler.includes(y.v.id) ? 'secili' : ''}" style="--renk:${esc(y.v.gorunum.serit || y.v.gorunum.ust || '#a77de8')}"><i></i>${esc(y.v.ad)}</button>`).join('');
      kok.innerHTML = `
        <div class="kutu">
          ${Studyo.yeniMi ? '<p class="aciklama" style="color:#f2c94c">Karakterler bu senaryoyu yazdı. İstediğin gibi düzenle, sonra onayla.</p>' : ''}
          <label class="alan">Adı</label><input id="seAd" value="${esc(s.ad)}" maxlength="50">
          <label class="alan">Müzik</label><select id="seMuzik">${Object.entries(MUZIK_AD).map(([k, v]) => `<option value="${k}" ${s.muzik === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <div class="satir" style="margin-top:6px"><button class="kucukBtn" id="seMuzikDinle">♪ Müziği dinle</button></div>
        </div>
        ${s.sahneler.map((sh, si) => `<div class="kutu sahneKutu">
          <h3>Sahne ${si + 1}</h3>
          <label class="alan">Set (oda)</label><select data-oda="${si}">${odalar.map(o => `<option value="${o.id}" ${sh.oda === o.id ? 'selected' : ''}>${esc(o.ad)}</option>`).join('')}</select>
          <label class="alan">Oyuncular</label><div class="kisiSec">${kisiSec(sh, si)}</div>
          <label class="alan">Replikler</label>
          ${sh.replikler.map((r, ri) => `<div class="replik">
            <div class="satir"><select data-kim="${si}:${ri}" style="flex:1">${sh.kisiler.map(id => { const y = ev.find(k => k.v.id === id); return y ? `<option value="${id}" ${r.kim === id ? 'selected' : ''}>${esc(y.v.ad)}</option>` : ''; }).join('')}</select>
            <select data-hareket="${si}:${ri}" style="flex:1">${Object.entries(HAREKET_AD).map(([k, v]) => `<option value="${k}" ${r.hareket === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
            <button class="kucukBtn tehlike" data-rsil="${si}:${ri}">✕</button></div>
            <textarea data-metin="${si}:${ri}" rows="2">${esc(r.metin)}</textarea></div>`).join('')}
          <div class="satir"><button class="kucukBtn" data-rekle="${si}">+ Replik</button>${s.sahneler.length > 1 ? `<button class="kucukBtn tehlike" data-ssil="${si}">Sahneyi sil</button>` : ''}</div>
        </div>`).join('')}
        <div class="satir" style="margin-bottom:12px"><button class="kucukBtn" id="seSahneEkle">+ Sahne</button></div>
        <div class="satir" style="margin-bottom:20px"><button class="kucukBtn" id="seVazgec">Vazgeç</button><button class="kucukBtn vurgu" id="seKaydet">${Studyo.yeniMi ? 'Onayla ve kaydet' : 'Kaydet'}</button><button class="kucukBtn vurgu" id="seKaydetCek">${Ikon.svg('kamera')} Kaydet ve çek</button></div>`;
      const oku = () => {
        s.ad = $('#seAd').value.trim() || 'Sahne'; s.muzik = $('#seMuzik').value;
        kok.querySelectorAll('[data-oda]').forEach(e => { s.sahneler[+e.dataset.oda].oda = e.value; });
        kok.querySelectorAll('[data-kim]').forEach(e => { const [a, b] = e.dataset.kim.split(':').map(Number); s.sahneler[a].replikler[b].kim = e.value; });
        kok.querySelectorAll('[data-hareket]').forEach(e => { const [a, b] = e.dataset.hareket.split(':').map(Number); s.sahneler[a].replikler[b].hareket = e.value; });
        kok.querySelectorAll('[data-metin]').forEach(e => { const [a, b] = e.dataset.metin.split(':').map(Number); s.sahneler[a].replikler[b].metin = e.value.trim(); });
      };
      kok.querySelectorAll('.kisiSec button').forEach(b => b.onclick = () => {
        oku(); const sh = s.sahneler[+b.dataset.si], k = b.dataset.k;
        sh.kisiler = sh.kisiler.includes(k) ? sh.kisiler.filter(x => x !== k) : sh.kisiler.concat(k).slice(0, 5);
        if (!sh.kisiler.length) sh.kisiler = [k];
        sh.replikler.forEach(r => { if (!sh.kisiler.includes(r.kim)) r.kim = sh.kisiler[0]; });
        Studyo.ciz();
      });
      kok.querySelectorAll('[data-rekle]').forEach(b => b.onclick = () => { oku(); const sh = s.sahneler[+b.dataset.rekle]; sh.replikler.push({ kim: sh.kisiler[sh.replikler.length % sh.kisiler.length], metin: '', hareket: 'yok' }); Studyo.ciz(); });
      kok.querySelectorAll('[data-rsil]').forEach(b => b.onclick = () => { oku(); const [a, c] = b.dataset.rsil.split(':').map(Number); s.sahneler[a].replikler.splice(c, 1); Studyo.ciz(); });
      kok.querySelectorAll('[data-ssil]').forEach(b => b.onclick = () => { oku(); s.sahneler.splice(+b.dataset.ssil, 1); Studyo.ciz(); });
      $('#seSahneEkle').onclick = () => { oku(); const son = s.sahneler[s.sahneler.length - 1]; s.sahneler.push({ oda: son.oda, kisiler: son.kisiler.slice(), replikler: [{ kim: son.kisiler[0], metin: '', hareket: 'yok' }] }); Studyo.ciz(); };
      $('#seVazgec').onclick = () => { Studyo.duzenlenen = null; Studyo.yeniMi = false; Studyo.ciz(); };
      let calan = null;
      $('#seMuzikDinle').onclick = () => { if (calan) { calan.dur(); calan = null; return; } calan = muzikBaslat($('#seMuzik').value); if (calan) setTimeout(() => { if (calan) { calan.dur(); calan = null; } }, 8000); };
      const kaydet = () => {
        oku();
        for (const sh of s.sahneler) sh.replikler = sh.replikler.filter(r => r.metin);
        if (!s.sahneler.some(sh => sh.replikler.length)) { App.bildir('En az bir replik yaz'); return false; }
        s.sahneler = s.sahneler.filter(sh => sh.replikler.length);
        Senaryolar.kaydet(s); Studyo.duzenlenen = null; Studyo.yeniMi = false; return true;
      };
      $('#seKaydet').onclick = () => { if (kaydet()) Studyo.ciz(); };
      $('#seKaydetCek').onclick = () => { if (kaydet()) Yonetmen.cek(s, { kaydet: true }); };
    }
  };

  window.Studyo = Studyo; window.Yonetmen = Yonetmen; window.Senaryolar = Senaryolar;
})();
