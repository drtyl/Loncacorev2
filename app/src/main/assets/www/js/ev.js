/* Ev: odalar, duvarlar/kapılar, mobilyalar, eşyalar (oda özellikleri) ve yürüme haritası.
 * Birim: metre. x = soldan sağa (0..GEN), z = yukarıdan aşağıya (0..DER). Ekranda üst = z küçük.
 *
 *  z 0..4.5   : Nova | Orion | Atlas | Mira | Luna            (karakter odaları, 4 m)
 *  z 4.5..5.7 : Koridor
 *  sol x 0..4.5      : Carbon | Leon | Müzik Odası
 *  sağ x 15.5..20    : Medica | Nexsus | Boş oda
 *  orta x 4.5..15.5  : Salon | Mutfak  /  Çalışma | Kütüphane  /  Atölye | Sanat Odası | Film Odası
 *
 * Mobilyalar ve "noktalar" (etkinlik yerleri) oda içi koordinatla yazılır, yükleme anında eve çevrilir.
 * Nokta: [x, z, bakış] — bakış 0 = ekrana doğru (+z), PI = arka duvara doğru.
 */
(function () {
  const GEN = 20, DER = 21, SURUM = 3;
  const P = Math.PI;
  const UST = 4.5, KOR = 5.7, SOL = 4.5, SAG = 15.5, R1 = 10.8, R2 = 15.9;

  const ODALAR = [
    // karakter odaları (üst sıra)
    { id: 'nova', ad: "Nova'nın odası", etiket: 'Nova', sahip: 'nova', x0: 0, z0: 0, x1: 4, z1: UST, zemin: '#a58bc4' },
    { id: 'orion', ad: "Orion'un odası", etiket: 'Orion', sahip: 'orion', x0: 4, z0: 0, x1: 8, z1: UST, zemin: '#5d6d9a' },
    { id: 'atlas', ad: "Atlas'ın odası", etiket: 'Atlas', sahip: 'atlas', x0: 8, z0: 0, x1: 12, z1: UST, zemin: '#8f9399', karo: true },
    { id: 'mira', ad: "Mira'nın odası", etiket: 'Mira', sahip: 'mira', x0: 12, z0: 0, x1: 16, z1: UST, zemin: '#d39a7c' },
    { id: 'luna', ad: "Luna'nın odası", etiket: 'Luna', sahip: 'luna', x0: 16, z0: 0, x1: 20, z1: UST, zemin: '#5a5f8f' },
    { id: 'koridor', ad: 'Koridor', x0: 0, z0: UST, x1: GEN, z1: KOR, zemin: '#9c7a5a', etiketsiz: true },
    // sol sütun
    { id: 'carbon', ad: "Carbon'un odası", etiket: 'Carbon', sahip: 'carbon', x0: 0, z0: KOR, x1: SOL, z1: R1, zemin: '#5b5550', karo: true },
    { id: 'leon', ad: "Leon'un odası", etiket: 'Leon', sahip: 'leon', x0: 0, z0: R1, x1: SOL, z1: R2, zemin: '#b07b52' },
    { id: 'muzik', ad: 'Müzik Odası', x0: 0, z0: R2, x1: SOL, z1: DER, zemin: '#7a4a5e' },
    // sağ sütun
    { id: 'medica', ad: "Medica'nın odası", etiket: 'Medica', sahip: 'medica', x0: SAG, z0: KOR, x1: GEN, z1: R1, zemin: '#cfd8cc', karo: true },
    { id: 'nexsus', ad: "Nexsus'un odası", etiket: 'Nexsus', sahip: 'nexsus', x0: SAG, z0: R1, x1: GEN, z1: R2, zemin: '#8a9099', karo: true },
    { id: 'bos', ad: 'Boş oda', x0: SAG, z0: R2, x1: GEN, z1: DER, zemin: '#a3998e', bos: true },
    // orta
    { id: 'salon', ad: 'Salon', x0: SOL, z0: KOR, x1: 11, z1: R1, zemin: '#b07a4a' },
    { id: 'mutfak', ad: 'Mutfak', x0: 11, z0: KOR, x1: SAG, z1: R1, zemin: '#d9cdb8', karo: true },
    { id: 'calisma', ad: 'Çalışma', x0: SOL, z0: R1, x1: 9.5, z1: R2, zemin: '#a87046' },
    { id: 'kutuphane', ad: 'Kütüphane', x0: 9.5, z0: R1, x1: SAG, z1: R2, zemin: '#8c5a36' },
    { id: 'atolye', ad: 'Atölye', x0: SOL, z0: R2, x1: 8.17, z1: DER, zemin: '#9a9188', karo: true },
    { id: 'sanat', ad: 'Sanat Odası', x0: 8.17, z0: R2, x1: 11.83, z1: DER, zemin: '#c09466' },
    { id: 'film', ad: 'Film Odası', x0: 11.83, z0: R2, x1: SAG, z1: DER, zemin: '#5a4a6e' }
  ];
  const odaById = id => ODALAR.find(o => o.id === id);

  // İç duvarlar ve kapı aralıkları (ev koordinatı)
  const IC_DUVARLAR = [
    // üst sıra / koridor
    { yatay: true, z: UST, a: 0, b: GEN, kapilar: [[1.7, 2.5], [5.7, 6.5], [9.7, 10.5], [13.7, 14.5], [17.7, 18.5]] },
    ...[4, 8, 12, 16].map(x => ({ yatay: false, x, a: 0, b: UST, kapilar: [] })),
    // koridor / alt
    { yatay: true, z: KOR, a: 0, b: GEN, kapilar: [[3.2, 4.1], [9.9, 10.8], [14.4, 15.3], [15.9, 16.8]] },
    // sıra arası
    { yatay: true, z: R1, a: 0, b: GEN, kapilar: [[6.5, 7.5], [12.5, 13.5]] },
    { yatay: true, z: R2, a: 0, b: GEN, kapilar: [[5.8, 6.8], [10.2, 11.0], [13.2, 14.2]] },
    // dikey
    { yatay: false, x: SOL, a: KOR, b: DER, kapilar: [[12.8, 13.8], [17.9, 18.9]] },
    { yatay: false, x: SAG, a: KOR, b: DER, kapilar: [[12.8, 13.8], [17.9, 18.9]] },
    { yatay: false, x: 11, a: KOR, b: R1, kapilar: [[7.6, 8.6]] },
    { yatay: false, x: 9.5, a: R1, b: R2, kapilar: [[12.8, 13.8]] },
    { yatay: false, x: 8.17, a: R2, b: DER, kapilar: [[17.9, 18.9]] },
    { yatay: false, x: 11.83, a: R2, b: DER, kapilar: [[17.9, 18.9]] }
  ];
  /** Kapılar çıkarılmış duvar parçaları: {x0,z0,x1,z1, ic} */
  function duvarParcalari() {
    const p = [
      { x0: 0, z0: 0, x1: GEN, z1: 0, ic: false, arka: true }, { x0: 0, z0: 0, x1: 0, z1: DER, ic: false },
      { x0: GEN, z0: 0, x1: GEN, z1: DER, ic: false }, { x0: 0, z0: DER, x1: GEN, z1: DER, ic: false, on: true }
    ];
    for (const d of IC_DUVARLAR) {
      let bas = d.a;
      const kesik = [...d.kapilar].sort((a, b) => a[0] - b[0]);
      for (const [k0, k1] of kesik.concat([[d.b, d.b]])) {
        if (k0 > bas + 0.01) p.push(d.yatay ? { x0: bas, z0: d.z, x1: k0, z1: d.z, ic: true } : { x0: d.x, z0: bas, x1: d.x, z1: k0, ic: true });
        bas = k1;
      }
    }
    return p;
  }
  const DUVARLAR = duvarParcalari();

  // ---------- oda içi döşeme (yerel koordinat)
  // Karakter odası (üst sıra, 4 x 4.5): yatak sol arka, komodin, gardırop sağ duvar, tema eşyaları
  const TEMA = {
    nova: { renk: '#b48be8', esya: [
      { tip: 'masa', x: 2.75, z: 0.38, w: 1.0, d: 0.6, h: 0.75, ekransiz: true, isiksiz: true },
      { tip: 'sandalye', x: 2.75, z: 1.05, w: 0.5, d: 0.5, h: 0.9, renk: '#7a5ca8' },
      { tip: 'pano', x: 0.7, z: 3.75, w: 1.0, d: 0.35, h: 1.4 },
      { tip: 'bitki', x: 3.55, z: 3.9, w: 0.45, d: 0.45, h: 0.9 }],
      noktalar: { is: [[2.75, 1.0, P]], ozel: [[1.2, 3.3, P]] } },
    orion: { renk: '#8fd6ff', esya: [
      { tip: 'kitaplik', x: 2.75, z: 0.3, w: 1.0, d: 0.4, h: 1.8 },
      { tip: 'berjer', x: 0.85, z: 3.6, w: 0.85, d: 0.85, h: 0.8, renk: '#3d5a9a' },
      { tip: 'kure', x: 3.5, z: 3.8, w: 0.5, d: 0.5, h: 1.0 }],
      noktalar: { is: [[2.75, 0.95, P]], ozel: [[0.85, 3.55, 0]] } },
    atlas: { renk: '#4a6fa5', esya: [
      { tip: 'agirlik', x: 2.75, z: 0.35, w: 1.0, d: 0.45, h: 0.9 },
      { tip: 'kosubandi', x: 0.75, z: 3.55, w: 0.75, d: 1.5, h: 1.2 },
      { tip: 'yogamati', x: 3.3, z: 3.6, w: 0.7, d: 1.4, engel: false }],
      noktalar: { is: [[0.75, 3.5, P], [3.3, 3.6, 0]], ozel: [[2.75, 1.05, P]] } },
    mira: { renk: '#e2735f', esya: [
      { tip: 'dolap', x: 2.75, z: 0.3, w: 1.0, d: 0.45, h: 0.9 },
      { tip: 'sovale', x: 0.9, z: 3.5, w: 0.7, d: 0.5, h: 1.5 },
      { tip: 'bitki', x: 3.55, z: 3.9, w: 0.45, d: 0.45, h: 1.0 }],
      noktalar: { is: [[0.9, 4.05, P]], ozel: [[2.75, 1.0, P]] } },
    luna: { renk: '#d9a85a', esya: [
      { tip: 'tv', x: 2.75, z: 0.3, w: 1.1, d: 0.4, h: 0.5 },
      { tip: 'kediagaci', x: 0.75, z: 3.7, w: 0.7, d: 0.7, h: 1.6 },
      { tip: 'puf', x: 3.3, z: 3.6, w: 0.65, d: 0.65, h: 0.4, renk: '#24306a' }],
      noktalar: { is: [[2.75, 1.3, P]], ozel: [[1.3, 3.5, -P / 2]] } },
    // yan odalar (4.5 x 5.1) — sol sütun için yazılır, sağ sütunda aynalanır
    carbon: { renk: '#c0622e', esya: [
      { tip: 'bilgisayar', x: 0.45, z: 3.9, w: 1.5, d: 0.65, h: 0.75, yon: P / 2 },
      { tip: 'sandalye', x: 1.2, z: 3.9, w: 0.5, d: 0.5, h: 0.9, yon: P / 2, renk: '#2a2a2e' },
      { tip: 'dolap', x: 2.6, z: 4.8, w: 1.1, d: 0.45, h: 0.9, yon: P },
      { tip: 'bitki', x: 4.05, z: 4.7, w: 0.45, d: 0.45, h: 0.9 }],
      noktalar: { is: [[1.15, 3.9, -P / 2]], ozel: [[2.6, 4.2, P]] } },
    leon: { renk: '#c4623a', esya: [
      { tip: 'tirmanma', x: 0.1, z: 3.9, w: 1.6, d: 0.12, h: 1.6, yon: P / 2 },
      { tip: 'yogamati', x: 2.5, z: 4.1, w: 1.4, d: 0.7, engel: false },
      { tip: 'top', x: 3.5, z: 4.6, w: 0.3, d: 0.3, engel: false },
      { tip: 'bitki', x: 4.05, z: 0.45, w: 0.45, d: 0.45, h: 0.9 }],
      noktalar: { is: [[0.55, 3.9, -P / 2], [2.5, 4.1, 0]], ozel: [[3.0, 3.6, 0]] } },
    medica: { renk: '#8fb39a', esya: [
      { tip: 'saglikdolabi', x: 0.3, z: 3.9, w: 1.1, d: 0.45, h: 1.6, yon: P / 2 },
      { tip: 'yogamati', x: 2.5, z: 4.1, w: 1.4, d: 0.7, engel: false, renk: '#8fb39a' },
      { tip: 'bitki', x: 4.05, z: 4.7, w: 0.55, d: 0.55, h: 1.3 },
      { tip: 'bitki', x: 4.05, z: 0.45, w: 0.45, d: 0.45, h: 0.9 }],
      noktalar: { is: [[0.95, 3.9, -P / 2], [2.5, 4.1, 0]], ozel: [[2.6, 3.4, 0]] } },
    nexsus: { renk: '#2fe6d6', yataksiz: true, esya: [
      { tip: 'sarj', x: 1.1, z: 1.3, w: 1.0, d: 1.0, engel: false },
      { tip: 'sunucu', x: 0.35, z: 3.9, w: 1.4, d: 0.6, h: 1.7, yon: P / 2 },
      { tip: 'sunucu', x: 2.6, z: 4.75, w: 1.0, d: 0.6, h: 1.2, yon: P },
      { tip: 'bitki', x: 4.05, z: 0.45, w: 0.45, d: 0.45, h: 0.8 }],
      noktalar: { is: [[1.0, 3.9, -P / 2]], ozel: [[2.6, 4.0, P]] } }
  };

  function karakterOdasi(o) {
    const t = TEMA[o.id], m = [], ust = o.z0 === 0;
    if (ust) {
      if (!t.yataksiz) m.push({ tip: 'yatak', x: 0.95, z: 1.25, w: 1.2, d: 2.0, h: 0.5, renk: t.renk });
      m.push({ tip: 'komodin', x: 1.85, z: 0.3, w: 0.42, d: 0.38, h: 0.5 });
      m.push({ tip: 'gardirop', x: 3.72, z: 1.05, w: 1.0, d: 0.5, h: 1.9, yon: -P / 2, renk: t.renk, gardirop: o.sahip });
      m.push({ tip: 'hali', x: 2.2, z: 2.9, w: 2.2, d: 1.4, renk: t.renk, soluk: true, engel: false });
      o.noktalar = Object.assign({ uyku: [0.95, 1.35, 0], dolap: [3.15, 1.05, -P / 2], oda: [[2.2, 2.7, 0], [1.6, 3.0, 0.4], [2.8, 2.9, -0.4]] }, t.noktalar);
    } else {
      if (!t.yataksiz) m.push({ tip: 'yatak', x: 1.15, z: 1.35, w: 1.2, d: 2.0, h: 0.5, yon: P / 2, renk: t.renk });
      m.push({ tip: 'komodin', x: 0.3, z: 0.38, w: 0.42, d: 0.38, h: 0.5, yon: P / 2 });
      m.push({ tip: 'gardirop', x: 2.75, z: 0.3, w: 1.0, d: 0.5, h: 1.9, renk: t.renk, gardirop: o.sahip });
      m.push({ tip: 'hali', x: 2.6, z: 2.7, w: 2.2, d: 1.6, renk: t.renk, soluk: true, engel: false });
      o.noktalar = Object.assign({ uyku: t.yataksiz ? [1.1, 1.3, 0] : [1.25, 1.35, P / 2], dolap: [2.75, 0.95, P], oda: [[2.6, 2.6, 0], [3.2, 2.9, -0.4], [2.0, 2.9, 0.4]] }, t.noktalar);
    }
    return m.concat(t.esya.map(e => Object.assign({}, e)));
  }

  const ORTAK = {
    koridor: [
      { tip: 'hali', x: 10, z: 0.6, w: 17, d: 0.7, renk: '#6f4a80', soluk: true, engel: false },
      { tip: 'bitki', x: 0.35, z: 0.6, w: 0.45, d: 0.45, h: 0.9 },
      { tip: 'bitki', x: 19.65, z: 0.6, w: 0.45, d: 0.45, h: 0.9 }
    ],
    salon: [
      { tip: 'kitaplik', x: 0.95, z: 0.3, w: 1.5, d: 0.4, h: 1.5 },
      { tip: 'lamba', x: 0.35, z: 1.1, w: 0.35, d: 0.35, h: 1.4 },
      { tip: 'tv', x: 3.0, z: 0.3, w: 1.8, d: 0.45, h: 0.5 },
      { tip: 'duvarsaati', x: 4.6, z: 0.1, w: 0.42, d: 0.06, h: 0.1, yuk: 1.15, engel: false },
      { tip: 'hali', x: 3.0, z: 2.8, w: 3.4, d: 2.4, renk: '#cbb7d9', engel: false },
      { tip: 'koltuk', x: 3.0, z: 1.45, w: 2.4, d: 0.9, h: 0.8, renk: '#e8ddd0' },
      { tip: 'sehpa', x: 3.0, z: 2.65, w: 1.1, d: 0.6, h: 0.42 },
      { tip: 'berjer', x: 5.3, z: 2.75, w: 0.9, d: 0.9, h: 0.8, yon: -P / 2, renk: '#e8ddd0' },
      { tip: 'puf', x: 4.3, z: 4.1, w: 0.7, d: 0.7, h: 0.4, renk: '#5a4a8a' },
      { tip: 'bitki', x: 0.4, z: 4.65, w: 0.5, d: 0.5, h: 1.0 },
      { tip: 'bitki', x: 6.1, z: 4.65, w: 0.5, d: 0.5, h: 0.9 }
    ],
    mutfak: [
      { tip: 'tezgah', x: 1.7, z: 0.35, w: 3.0, d: 0.6, h: 0.9 },
      { tip: 'buzdolabi', x: 4.15, z: 1.6, w: 0.7, d: 0.7, h: 1.8, yon: -P / 2 },
      { tip: 'yemekmasasi', x: 2.6, z: 3.0, w: 1.5, d: 0.9, h: 0.75 },
      { tip: 'bitki', x: 4.1, z: 4.7, w: 0.45, d: 0.45, h: 0.8 }
    ],
    calisma: [
      { tip: 'masa', x: 3.9, z: 0.4, w: 1.6, d: 0.7, h: 0.75 },
      { tip: 'sandalye', x: 3.9, z: 1.15, w: 0.55, d: 0.55, h: 0.9 },
      { tip: 'toplanti', x: 2.2, z: 3.1, w: 1.8, d: 1.0, h: 0.75 },
      { tip: 'pano', x: 0.35, z: 0.9, w: 1.1, d: 0.3, h: 1.4, yon: P / 2 },
      { tip: 'dolap', x: 4.75, z: 4.1, w: 1.1, d: 0.45, h: 0.9, yon: -P / 2 },
      { tip: 'bitki', x: 0.4, z: 4.7, w: 0.45, d: 0.45, h: 0.8 }
    ],
    kutuphane: [
      { tip: 'kitaplik', x: 1.3, z: 0.3, w: 2.0, d: 0.4, h: 1.8 },
      { tip: 'kitaplik', x: 5.0, z: 0.3, w: 1.6, d: 0.4, h: 1.8 },
      { tip: 'kitaplik', x: 5.75, z: 3.7, w: 1.4, d: 0.4, h: 1.6, yon: -P / 2 },
      { tip: 'hali', x: 3.0, z: 2.7, w: 2.6, d: 2.0, renk: '#6f4a80', engel: false },
      { tip: 'berjer', x: 2.35, z: 2.3, w: 0.85, d: 0.85, h: 0.8, renk: '#7d5ba6' },
      { tip: 'berjer', x: 3.65, z: 2.3, w: 0.85, d: 0.85, h: 0.8, renk: '#7d5ba6' },
      { tip: 'sehpa', x: 3.0, z: 3.3, w: 0.7, d: 0.5, h: 0.42 },
      { tip: 'lamba', x: 0.4, z: 4.6, w: 0.35, d: 0.35, h: 1.4 }
    ],
    atolye: [
      { tip: 'tezgah', x: 1.83, z: 4.75, w: 2.6, d: 0.6, h: 0.9, yon: P, atolye: true },
      { tip: 'dolap', x: 2.95, z: 0.3, w: 1.0, d: 0.45, h: 0.9 },
      { tip: 'kitaplik', x: 3.45, z: 3.2, w: 1.0, d: 0.4, h: 1.5, yon: -P / 2 },
      { tip: 'bitki', x: 0.4, z: 0.45, w: 0.45, d: 0.45, h: 0.8 }
    ],
    sanat: [
      { tip: 'hali', x: 1.8, z: 2.7, w: 2.2, d: 1.6, renk: '#e3c6a8', engel: false },
      { tip: 'sovale', x: 1.8, z: 2.0, w: 0.7, d: 0.5, h: 1.5 },
      { tip: 'dolap', x: 0.85, z: 0.3, w: 1.1, d: 0.45, h: 0.9 },
      { tip: 'sehpa', x: 1.2, z: 4.65, w: 1.1, d: 0.6, h: 0.42 },
      { tip: 'bitki', x: 3.25, z: 4.7, w: 0.45, d: 0.45, h: 0.9 }
    ],
    film: [
      { tip: 'perde', x: 1.83, z: 4.95, w: 2.6, d: 0.12, h: 1.4 },
      { tip: 'koltuk', x: 1.83, z: 2.0, w: 2.2, d: 0.9, h: 0.8, renk: '#3d3550' },
      { tip: 'puf', x: 0.6, z: 3.6, w: 0.6, d: 0.6, h: 0.4, renk: '#7d5ba6' },
      { tip: 'bitki', x: 3.3, z: 0.45, w: 0.45, d: 0.45, h: 0.9 }
    ],
    muzik: [
      { tip: 'piyano', x: 2.6, z: 0.4, w: 1.5, d: 0.6, h: 1.2 },
      { tip: 'gitar', x: 0.45, z: 0.5, w: 0.4, d: 0.4, h: 1.0 },
      { tip: 'hoparlor', x: 0.35, z: 4.6, w: 0.45, d: 0.4, h: 1.0, yon: P / 2 },
      { tip: 'hoparlor', x: 4.1, z: 4.6, w: 0.45, d: 0.4, h: 1.0, yon: -P / 2 },
      { tip: 'davul', x: 1.3, z: 3.5, w: 1.0, d: 0.9, h: 0.9 },
      { tip: 'hali', x: 2.4, z: 3.3, w: 2.6, d: 1.8, renk: '#4a2a3e', engel: false },
      { tip: 'puf', x: 3.2, z: 3.4, w: 0.6, d: 0.6, h: 0.4, renk: '#c9a227' }
    ],
    bos: []
  };
  // Ortak odaların etkinlik noktaları (yerel)
  const ORTAK_NOKTA = {
    salon: { dinlen: [[2.2, 2.0, 0], [3.8, 2.0, 0], [3.0, 3.4, P], [4.85, 2.75, -P / 2]], saat: [[4.2, 0.95, P], [5.0, 0.95, P]] },
    mutfak: { yemek: [[1.9, 2.5, P * 0.75], [3.3, 2.5, -P * 0.75], [1.9, 3.55, P * 0.25], [3.3, 3.55, -P * 0.25]], kahvalti: [[1.2, 1.0, P], [2.3, 1.0, P]] },
    calisma: { calis: [[3.9, 1.1, P], [1.5, 2.45, P * 0.8], [2.9, 2.45, -P * 0.8], [2.2, 3.85, 0]] },
    kutuphane: { oku: [[2.35, 2.25, 0], [3.65, 2.25, 0], [1.3, 0.95, P], [5.0, 0.95, P]] },
    film: { izle: [[1.4, 2.05, 0], [2.25, 2.05, 0], [0.6, 3.15, 0.3], [2.9, 2.9, -0.3]] },
    sanat: { galeri: [[1.8, 2.75, P], [1.1, 2.5, P * 0.8], [2.5, 2.5, -P * 0.8]] },
    muzik: { muzik: [[2.6, 1.05, P], [1.3, 2.8, P], [3.2, 2.9, 0]] },
    atolye: { atolye: [[1.83, 4.1, 0], [1.1, 4.1, 0], [2.6, 4.1, 0]] }
  };

  // yerel → ev koordinatı (sağ sütundaki yan odalar aynalanır)
  function cevir(o, m) {
    const ayna = o.x0 >= SAG;
    const x = ayna ? o.x1 - m.x : o.x0 + m.x;
    let yon = m.yon || 0; if (ayna && yon) yon = -yon;
    return Object.assign({}, m, { x, z: o.z0 + m.z, yon, oda: o.id });
  }
  function noktaCevir(o, n) { const ayna = o.x0 >= SAG; return [ayna ? o.x1 - n[0] : o.x0 + n[0], o.z0 + n[1], ayna ? -(n[2] || 0) : (n[2] || 0)]; }

  const MOBILYA = [];
  for (const o of ODALAR) {
    const yerel = TEMA[o.id] ? karakterOdasi(o) : (ORTAK[o.id] || []);
    for (const m of yerel) MOBILYA.push(Object.assign({ engel: true }, cevir(o, m)));
    const nk = o.noktalar || ORTAK_NOKTA[o.id] || {};
    o.nokta = {};
    for (const k in nk) {
      const v = nk[k];
      o.nokta[k] = Array.isArray(v[0]) ? v.map(n => noktaCevir(o, n)) : noktaCevir(o, v);
    }
  }
  // pencereler: karakter odalarının arka duvarında
  const PENCERELER = ODALAR.filter(o => o.z0 === 0).map(o => ({ x: o.x0 + 2.75, z: 0 }));

  // Yeni eşyaların konacağı yedek noktalar (ortak odalarda)
  const ESYA_YERLERI = [
    ['salon', 2.0, 3.6], ['calisma', 3.9, 1.2], ['mutfak', 1.5, 1.0], ['kutuphane', 4.5, 2.0], ['atolye', 1.0, 3.0],
    ['salon', 5.5, 1.2], ['calisma', 1.0, 4.2], ['sanat', 3.0, 3.0], ['film', 3.0, 4.0], ['muzik', 3.5, 1.6],
    ['kutuphane', 1.0, 3.5], ['mutfak', 0.8, 4.4], ['atolye', 2.4, 1.8], ['salon', 1.6, 4.4]
  ].map(([id, x, z]) => { const o = odaById(id); return { x: o.x0 + x, z: o.z0 + z }; });

  // ---------- yürüme ızgarası
  const H = 0.2, NX = Math.round(GEN / H), NZ = Math.round(DER / H);
  const R = 0.22, T = 0.12; // karakter yarıçapı, duvar kalınlığı
  let engel = null;

  function izgaraKur() {
    engel = new Uint8Array(NX * NZ);
    for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) {
      const x = (ix + 0.5) * H, z = (iz + 0.5) * H;
      let e = x < R || x > GEN - R || z < R || z > DER - R;
      if (!e) for (const d of DUVARLAR) {
        if (!d.ic) continue;
        const px = Math.max(d.x0, Math.min(d.x1, x)), pz = Math.max(d.z0, Math.min(d.z1, z));
        if (Math.hypot(x - px, z - pz) < R + T / 2) { e = true; break; }
      }
      if (!e) for (const m of MOBILYA) {
        if (!m.engel) continue;
        const dik = m.yon && Math.abs(Math.sin(m.yon)) > 0.5;
        const w = (dik ? m.d : m.w) / 2 + R, d = (dik ? m.w : m.d) / 2 + R;
        if (Math.abs(x - m.x) < w && Math.abs(z - m.z) < d) { e = true; break; }
      }
      engel[iz * NX + ix] = e ? 1 : 0;
    }
  }
  const hucre = (x, z) => [Math.max(0, Math.min(NX - 1, Math.floor(x / H))), Math.max(0, Math.min(NZ - 1, Math.floor(z / H)))];
  const merkez = (ix, iz) => ({ x: (ix + 0.5) * H, z: (iz + 0.5) * H });
  const bosMu = (ix, iz) => ix >= 0 && iz >= 0 && ix < NX && iz < NZ && !engel[iz * NX + ix];

  function enYakinBos(x, z) {
    if (!engel) izgaraKur();
    const [cx, cz] = hucre(x, z);
    if (bosMu(cx, cz)) return [cx, cz];
    for (let r = 1; r < 40; r++) {
      let en = null, enD = 1e9;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        if (bosMu(cx + dx, cz + dz)) { const d = dx * dx + dz * dz; if (d < enD) { enD = d; en = [cx + dx, cz + dz]; } }
      }
      if (en) return en;
    }
    return [cx, cz];
  }

  /** A* yol bulma (ikili yığın ile). Dönen: [{x,z}, ...] */
  function yolBul(ax, az, bx, bz) {
    if (!engel) izgaraKur();
    const [sx, sz] = enYakinBos(ax, az), [hx, hz] = enYakinBos(bx, bz);
    const N = NX * NZ, bas = sz * NX + sx, hedef = hz * NX + hx;
    if (bas === hedef) return [merkez(hx, hz)];
    const g = new Float32Array(N).fill(1e9), gel = new Int32Array(N).fill(-1), kapali = new Uint8Array(N);
    const h = i => Math.hypot(i % NX - hx, ((i / NX) | 0) - hz);
    const yigin = [[h(bas), bas]]; g[bas] = 0;
    const it = (a) => { yigin.push(a); let i = yigin.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (yigin[p][0] <= yigin[i][0]) break; [yigin[p], yigin[i]] = [yigin[i], yigin[p]]; i = p; } };
    const al = () => { const ust = yigin[0], son = yigin.pop(); if (yigin.length) { yigin[0] = son; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let k = i; if (l < yigin.length && yigin[l][0] < yigin[k][0]) k = l; if (r < yigin.length && yigin[r][0] < yigin[k][0]) k = r; if (k === i) break; [yigin[k], yigin[i]] = [yigin[i], yigin[k]]; i = k; } } return ust; };
    while (yigin.length) {
      const [, c] = al();
      if (kapali[c]) continue;
      if (c === hedef) break;
      kapali[c] = 1;
      const cx = c % NX, cz = (c / NX) | 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx, nz = cz + dz;
        if (!bosMu(nx, nz)) continue;
        if (dx && dz && (!bosMu(cx + dx, cz) || !bosMu(cx, cz + dz))) continue;
        const n = nz * NX + nx; if (kapali[n]) continue;
        const ng = g[c] + (dx && dz ? 1.4142 : 1);
        if (ng < g[n]) { g[n] = ng; gel[n] = c; it([ng + h(n), n]); }
      }
    }
    let son = hedef;
    if (gel[hedef] === -1) {
      // hedef ulaşılamayan bir köşede (ör. yatağın arkası): ulaşılabilen en yakın hücreye git
      let en = -1, enD = 1e9;
      const [tx, tz] = hucre(bx, bz);   // asıl hedefe (yakın boş hücreye değil) en yakın ulaşılabilen hücre
      for (let i = 0; i < N; i++) if (kapali[i] && i !== bas) { const d = Math.hypot(i % NX - tx, ((i / NX) | 0) - tz); if (d < enD) { enD = d; en = i; } }
      if (en < 0 || enD > 12) return [];
      son = en;
    }
    const yol = []; let c = son;
    while (c !== bas && c !== -1) { yol.push(merkez(c % NX, (c / NX) | 0)); c = gel[c]; }
    yol.reverse();
    return sadelestir({ x: ax, z: az }, yol);
  }

  function gorus(a, b) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (H * 0.5));
    for (let i = 1; i < n; i++) {
      const t = i / n; const [ix, iz] = hucre(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
      if (!bosMu(ix, iz)) return false;
    }
    return true;
  }
  function sadelestir(bas, yol) {
    if (yol.length < 3) return yol;
    const s = []; let onceki = bas, i = 0;
    while (i < yol.length) {
      let j = yol.length - 1;
      while (j > i && !gorus(onceki, yol[j])) j--;
      s.push(yol[j]); onceki = yol[j]; i = j + 1;
    }
    return s;
  }

  function rastgeleBos(odaId) {
    if (!engel) izgaraKur();
    const o = ODALAR.find(o => o.id === odaId) || ODALAR[Math.floor(Math.random() * ODALAR.length)];
    for (let k = 0; k < 60; k++) {
      const x = o.x0 + 0.4 + Math.random() * (o.x1 - o.x0 - 0.8), z = o.z0 + 0.4 + Math.random() * (o.z1 - o.z0 - 0.8);
      const [ix, iz] = hucre(x, z);
      if (bosMu(ix, iz)) return merkez(ix, iz);
    }
    const [ix, iz] = enYakinBos((o.x0 + o.x1) / 2, (o.z0 + o.z1) / 2);
    return merkez(ix, iz);
  }

  function odaBul(x, z) { return ODALAR.find(o => x >= o.x0 && x < o.x1 && z >= o.z0 && z < o.z1) || ODALAR[0]; }

  // ---------- eşyalar (kalıcı)
  const ESYA_YOL = '/ev/esyalar.json';
  let onbellek = null;
  const Ev = {
    GEN, DER, SURUM, ODALAR, DUVARLAR, MOBILYA, PENCERELER, yolBul, enYakinBos, rastgeleBos, odaBul,
    oda: odaById,
    /** Karakterin kendi odası */
    odasi(karakterId) { return ODALAR.find(o => o.sahip === karakterId) || null; },
    /** Bir odanın etkinlik noktaları: tek nokta [x,z,yaw] ya da liste */
    nokta(odaId, tur) { const o = odaById(odaId); return o && o.nokta ? o.nokta[tur] : null; },
    /** Bir türün geçtiği bütün noktalar (ortak odalar) */
    noktalar(tur) { const l = []; for (const o of ODALAR) { const n = o.nokta && o.nokta[tur]; if (n) l.push(...(Array.isArray(n[0]) ? n : [n])); } return l; },
    /** Karakterin kendi yatağında yatış pozu: {x, z, yaw, yuk, yatay}. Robot şarj istasyonunda ayakta "uyur". */
    yatakPoz(karakterId) {
      const o = ODALAR.find(o => o.sahip === karakterId); if (!o) return null;
      const yatak = MOBILYA.find(m => m.oda === o.id && m.tip === 'yatak');
      if (yatak) {
        const yon = yatak.yon || 0, k = yatak.d / 2 - 0.22;   // ayaklar yatağın ayak ucunda, baş yastıkta
        return { x: yatak.x + Math.sin(yon) * k, z: yatak.z + Math.cos(yon) * k, yaw: yon, yuk: 0.44, yatay: true };
      }
      const sarj = MOBILYA.find(m => m.oda === o.id && m.tip === 'sarj');
      return sarj ? { x: sarj.x, z: sarj.z, yaw: 0, yuk: 0.06, yatay: false } : null;
    },
    /** Yerel oda koordinatını eve çevirir */
    yerel(odaId, x, z) { const o = odaById(odaId); return o ? { x: o.x0 >= SAG ? o.x1 - x : o.x0 + x, z: o.z0 + z } : { x, z }; },
    odaAdi(id) { return (ODALAR.find(o => o.id === id) || {}).ad || id; },
    yurunebilir(x, z) { if (!engel) izgaraKur(); const [ix, iz] = hucre(x, z); return bosMu(ix, iz); },
    esyalar() { if (!onbellek) onbellek = Depo.okuJSON(ESYA_YOL, []); return onbellek.slice(); },
    esyalariKaydet(l) { onbellek = l.slice(); Depo.yazJSON(ESYA_YOL, l); },
    bosYer(dolu) {
      const kume = new Set(dolu.map(e => e.x.toFixed(1) + ',' + e.z.toFixed(1)));
      const y = ESYA_YERLERI.find(y => !kume.has(y.x.toFixed(1) + ',' + y.z.toFixed(1)));
      return y ? { x: y.x, z: y.z } : rastgeleBos();
    },
    /** Bir odanın içinde, başka eşyalara yakın olmayan yürünebilir bir yer */
    odadaYer(odaId, dolu) {
      if (!engel) izgaraKur();
      const o = odaById(odaId); if (!o) return null;
      const cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2;
      for (let r = 0; r < 6; r++) for (let a = 0; a < 8; a++) {
        const x = cx + Math.cos(a * Math.PI / 4) * r * 0.55, z = cz + Math.sin(a * Math.PI / 4) * r * 0.55;
        if (x < o.x0 + 0.4 || x > o.x1 - 0.4 || z < o.z0 + 0.4 || z > o.z1 - 0.4) continue;
        const [ix, iz] = hucre(x, z);
        if (bosMu(ix, iz) && !dolu.some(e => Math.hypot(e.x - x, e.z - z) < 0.8)) return { x, z };
      }
      return null;
    },
    esyaEkle({ ad, dosya, ikon = 'sayfa', oda }) {
      const l = Ev.esyalar();
      const yer = (oda && Ev.odadaYer(oda, l)) || Ev.bosYer(l);
      const e = { id: 'e' + Date.now().toString(36), ad, dosya, ikon, oda: odaBul(yer.x, yer.z).id, x: yer.x, z: yer.z };
      l.push(e); Ev.esyalariKaydet(l);
      return e;
    },
    /** Eski (2 odalı) evden kalan eşyaları yeni evin yerlerine taşır */
    tasi() {
      const eski = Ev.esyalar(), yeni = [];
      for (const e of eski) { if (/^ozel-/.test(e.id)) continue; const y = Ev.bosYer(yeni); yeni.push(Object.assign({}, e, { x: y.x, z: y.z, oda: odaBul(y.x, y.z).id })); }
      Ev.esyalariKaydet(yeni);
    },
    esyaSil(id) { Ev.esyalariKaydet(Ev.esyalar().filter(e => e.id !== id)); },
    esyaBul(id) { return Ev.esyalar().find(e => e.id === id) || null; }
  };
  window.Ev = Ev;
})();
