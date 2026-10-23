# Hazır oda sayfalarını (web-src/sayfalar/*.html) uygulamanın içine tek JS dosyası olarak koyar.
# Kullanım: python3 web-src/sayfa_paketle.py   (depo kökünden)
import os, json
kok = os.path.dirname(os.path.abspath(__file__))
ortak = open(os.path.join(kok, 'sayfalar', '_ortak.css'), encoding='utf-8').read()
cikti = {}
for ad in sorted(os.listdir(os.path.join(kok, 'sayfalar'))):
    if not ad.endswith('.html'): continue
    html = open(os.path.join(kok, 'sayfalar', ad), encoding='utf-8').read().replace('/*ORTAK*/', ortak)
    cikti[ad[:-5]] = html
hedef = os.path.join(kok, '..', 'app', 'src', 'main', 'assets', 'www', 'js', 'ozellik_sayfalari.js')
with open(hedef, 'w', encoding='utf-8') as f:
    f.write('/* OTOMATİK ÜRETİLDİ: web-src/sayfalar/*.html → bu dosya (web-src/sayfa_paketle.py). Elle düzenleme; kaynak dosyayı değiştir. */\n')
    f.write('window.OZELLIK_SAYFALARI = ' + json.dumps(cikti, ensure_ascii=False).replace('</', '<\\/') + ';\n')
print('yazıldı:', ', '.join(cikti), os.path.getsize(hedef), 'bayt')
