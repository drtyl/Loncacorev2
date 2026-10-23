package com.drtyl.lonca

import android.Manifest
import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ContentValues
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Build
import android.os.Environment
import android.provider.CalendarContract
import android.provider.MediaStore
import android.speech.tts.Voice
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Base64
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.Locale
import kotlin.math.PI
import kotlin.math.sin

/**
 * Lonca Core — v0.9
 *
 * Native taraf bilerek küçük. Görevleri:
 *  1) Evi (assets/www/index.html) bir WebView içinde açmak
 *  2) Evin dosya sistemini JS'ye açmak (window.LoncaNative)
 *  3) İnternet isteği (yapay zeka), dosya seçici
 *  4) Ses: konuşma (TextToSpeech) ve dinleme (SpeechRecognizer)
 * Ev, 3D karakter, Laboratuvar, Atölye: hepsi web katmanında.
 */
class MainActivity : Activity() {

    private lateinit var web: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private val main = Handler(Looper.getMainLooper())

    private var tts: TextToSpeech? = null
    private var ttsHazir = false
    private var recognizer: SpeechRecognizer? = null
    private var dinlemeBekliyor = false

    @Volatile private var robotParca: AudioTrack? = null

    companion object {
        private const val PICK_FILES = 4242
        private const val MIC_IZNI = 4343
        private const val BILDIRIM_IZNI = 4444
        private const val KANAL = "lonca"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WebView.setWebContentsDebuggingEnabled(true)
        web = WebView(this)
        setContentView(web)

        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            mediaPlaybackRequiresUserGesture = false
            textZoom = 100
            // uygulamayla gelen 3D modeller (assets/www/modeller) sayfadan okunabilsin
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = true
        }

        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    try { startActivity(Intent(Intent.ACTION_VIEW, request.url)) } catch (_: Exception) {}
                    return true
                }
                return false
            }
        }

        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                return try {
                    val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                        if (params.mode == FileChooserParams.MODE_OPEN_MULTIPLE) {
                            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                        }
                    }
                    startActivityForResult(Intent.createChooser(intent, "Dosya seç"), PICK_FILES)
                    true
                } catch (e: Exception) {
                    fileCallback = null
                    false
                }
            }

            override fun onConsoleMessage(msg: ConsoleMessage): Boolean {
                android.util.Log.d("LoncaJS", "${msg.message()} @${msg.sourceId()}:${msg.lineNumber()}")
                return true
            }
        }

        web.addJavascriptInterface(Bridge(File(filesDir, "lonca")), "LoncaNative")
        web.loadUrl("file:///android_asset/www/index.html")

        sesMotorunuBaslat()
        bildirimKanaliniKur()
    }

    // ---------------------------------------------------------------- BİLDİRİM

    private fun bildirimKanaliniKur() {
        try {
            if (Build.VERSION.SDK_INT >= 26) {
                val nm = getSystemService(NotificationManager::class.java)
                nm?.createNotificationChannel(NotificationChannel(KANAL, "Lonca", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "Evdekilerin mesajları, proje ve alarm bildirimleri"
                })
            }
        } catch (_: Throwable) {}
    }

    private fun bildirimIzniVarMi(): Boolean =
        Build.VERSION.SDK_INT < 33 || checkSelfPermission("android.permission.POST_NOTIFICATIONS") == PackageManager.PERMISSION_GRANTED

    private fun bildirimGoster(baslik: String, metin: String, anahtar: String) {
        try {
            if (!bildirimIzniVarMi()) return
            val ac = Intent(this, MainActivity::class.java).apply { flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP }
            val pi = PendingIntent.getActivity(this, 0, ac, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val b = Notification.Builder(this, KANAL)
                .setSmallIcon(applicationInfo.icon)
                .setContentTitle(baslik)
                .setContentText(metin)
                .setStyle(Notification.BigTextStyle().bigText(metin))
                .setContentIntent(pi)
                .setAutoCancel(true)
            val nm = getSystemService(NotificationManager::class.java)
            nm?.notify(anahtar.hashCode(), b.build())   // aynı anahtar = aynı bildirim güncellenir (tek bildirim)
        } catch (_: Throwable) {}
    }

    // ---------------------------------------------------------------- SES

    /** JS'ye ses olayı gönder: window.__loncaSes(olay, veri) */
    private fun sesOlayi(olay: String, veri: String = "") {
        val q = JSONObject.quote(veri)
        main.post {
            web.evaluateJavascript("window.__loncaSes && window.__loncaSes('$olay',$q)", null)
        }
    }

    private fun sesMotorunuBaslat() {
        try {
            tts = TextToSpeech(this) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    val t = tts ?: return@TextToSpeech
                    val r = t.setLanguage(Locale("tr", "TR"))
                    ttsHazir = r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED
                    if (!ttsHazir) { t.setLanguage(Locale.getDefault()); ttsHazir = true }
                    t.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                        override fun onStart(id: String?) { if (id?.startsWith("robot") != true) sesOlayi("konusmaBasladi") }
                        override fun onDone(id: String?) {
                            if (id?.startsWith("robot") == true) robotCal(File(cacheDir, "robot.wav")) else sesOlayi("konusmaBitti")
                        }
                        @Deprecated("eski imza")
                        override fun onError(id: String?) { sesOlayi("konusmaBitti") }
                        override fun onError(id: String?, code: Int) { sesOlayi("konusmaBitti") }
                    })
                    sesOlayi("seslerHazir")
                }
            }
        } catch (e: Throwable) {
            tts = null
        }
    }

    /**
     * Robot sesi: TTS önce dosyaya yazılır, sonra metalik efektle (halka modülasyonu + kısa yankı) çalınır.
     * WAV: 16 bit PCM. Başlıktaki "fmt " ve "data" parçaları aranır.
     */
    private fun robotCal(dosya: File) {
        Thread {
            try {
                val b = dosya.readBytes()
                val bb = ByteBuffer.wrap(b).order(ByteOrder.LITTLE_ENDIAN)
                var oran = 22050; var kanal = 1; var veriBas = -1; var veriBoy = 0
                var i = 12
                while (i + 8 <= b.size) {
                    val ad = String(b, i, 4, Charsets.US_ASCII); val boy = bb.getInt(i + 4)
                    if (ad == "fmt ") { kanal = bb.getShort(i + 10).toInt(); oran = bb.getInt(i + 12) }
                    if (ad == "data") { veriBas = i + 8; veriBoy = minOf(boy, b.size - veriBas); break }
                    i += 8 + boy + (boy and 1)
                }
                if (veriBas < 0 || veriBoy <= 0) { sesOlayi("konusmaBitti"); return@Thread }
                val n = veriBoy / 2
                val giris = ShortArray(n) { bb.getShort(veriBas + it * 2) }
                val cikis = ShortArray(n)
                val gecikme = (oran * kanal * 0.012).toInt()
                for (k in 0 until n) {
                    val t = (k / kanal).toDouble() / oran
                    val s = giris[k].toDouble()
                    var v = s * (0.55 + 0.45 * sin(2.0 * PI * 70.0 * t))            // metalik halka modülasyonu
                    if (k >= gecikme) v += cikis[k - gecikme] * 0.35                 // kısa tarak yankısı
                    cikis[k] = v.coerceIn(-32767.0, 32767.0).toInt().toShort()
                }
                val kanalMask = if (kanal == 2) AudioFormat.CHANNEL_OUT_STEREO else AudioFormat.CHANNEL_OUT_MONO
                val track = AudioTrack.Builder()
                    .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                    .setAudioFormat(AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(oran).setChannelMask(kanalMask).build())
                    .setBufferSizeInBytes(n * 2)
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build()
                track.write(cikis, 0, n)
                robotParca?.let { try { it.stop(); it.release() } catch (_: Throwable) {} }
                robotParca = track
                sesOlayi("konusmaBasladi")
                track.play()
                Thread.sleep((n.toLong() / kanal) * 1000L / oran + 120L)
                if (robotParca === track) { try { track.stop(); track.release() } catch (_: Throwable) {}; robotParca = null; sesOlayi("konusmaBitti") }
            } catch (e: Throwable) {
                sesOlayi("konusmaBitti")
            }
        }.start()
    }

    private fun dinlemeyiBaslat() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            sesOlayi("hata", "Bu telefonda konuşma tanıma servisi bulunamadı.")
            return
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            dinlemeBekliyor = true
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), MIC_IZNI)
            return
        }
        try {
            if (recognizer == null) {
                recognizer = SpeechRecognizer.createSpeechRecognizer(this).also { r ->
                    r.setRecognitionListener(object : RecognitionListener {
                        override fun onReadyForSpeech(params: Bundle?) { sesOlayi("dinliyor") }
                        override fun onBeginningOfSpeech() {}
                        override fun onRmsChanged(rmsdB: Float) { sesOlayi("seviye", rmsdB.toString()) }
                        override fun onBufferReceived(buffer: ByteArray?) {}
                        override fun onEndOfSpeech() { sesOlayi("dusunuyor") }
                        override fun onError(error: Int) { sesOlayi("dinlemeHatasi", error.toString()) }
                        override fun onResults(results: Bundle?) {
                            val list = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                            sesOlayi("sonuc", list?.firstOrNull() ?: "")
                        }
                        override fun onPartialResults(partial: Bundle?) {
                            val list = partial?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                            val t = list?.firstOrNull()
                            if (!t.isNullOrEmpty()) sesOlayi("kismi", t)
                        }
                        override fun onEvent(eventType: Int, params: Bundle?) {}
                    })
                }
            }
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, "tr-TR")
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            }
            recognizer?.startListening(intent)
        } catch (e: Throwable) {
            sesOlayi("hata", e.message ?: "Dinleme başlatılamadı")
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == BILDIRIM_IZNI) {
            val izin = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
            main.post { web.evaluateJavascript("window.__loncaBildirimIzni && window.__loncaBildirimIzni($izin)", null) }
            return
        }
        if (requestCode == MIC_IZNI) {
            val izin = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
            if (izin && dinlemeBekliyor) dinlemeyiBaslat()
            else if (!izin) sesOlayi("hata", "Mikrofon izni verilmedi.")
            dinlemeBekliyor = false
        }
    }

    // ---------------------------------------------------------------- DOSYA SEÇİCİ / YAŞAM DÖNGÜSÜ

    @Deprecated("Activity.onActivityResult")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == PICK_FILES) {
            val cb = fileCallback
            fileCallback = null
            if (cb == null) return
            if (resultCode != RESULT_OK || data == null) {
                cb.onReceiveValue(null); return
            }
            val uris = mutableListOf<Uri>()
            val clip = data.clipData
            if (clip != null) {
                for (i in 0 until clip.itemCount) uris.add(clip.getItemAt(i).uri)
            } else {
                data.data?.let { uris.add(it) }
            }
            cb.onReceiveValue(if (uris.isEmpty()) null else uris.toTypedArray())
            return
        }
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
    }

    @Deprecated("Activity.onBackPressed")
    override fun onBackPressed() {
        web.evaluateJavascript("(window.loncaBack ? window.loncaBack() : false)") { result ->
            if (result != "true") {
                @Suppress("DEPRECATION")
                super.onBackPressed()
            }
        }
    }

    override fun onPause() {
        super.onPause()
        web.evaluateJavascript("window.loncaPause && window.loncaPause()", null)
    }

    override fun onResume() {
        super.onResume()
        web.evaluateJavascript("window.loncaResume && window.loncaResume()", null)
    }

    override fun onDestroy() {
        try { tts?.stop(); tts?.shutdown() } catch (_: Throwable) {}
        try { robotParca?.release() } catch (_: Throwable) {}
        try { recognizer?.destroy() } catch (_: Throwable) {}
        super.onDestroy()
    }

    // ---------------------------------------------------------------- KÖPRÜ

    /** JS'nin gördüğü köprü: window.LoncaNative */
    inner class Bridge(private val root: File) {

        init { root.mkdirs() }

        private fun safe(path: String): File {
            val f = File(root, path.trimStart('/')).canonicalFile
            val r = root.canonicalFile
            if (f != r && !f.path.startsWith(r.path + File.separator)) {
                throw SecurityException("Evin dışına çıkılamaz: $path")
            }
            return f
        }

        private fun ok(data: Any? = null): String =
            JSONObject().put("ok", true).put("data", data ?: JSONObject.NULL).toString()

        private fun fail(e: Throwable): String =
            JSONObject().put("ok", false).put("error", e.message ?: e.toString()).toString()

        @JavascriptInterface
        fun list(path: String): String = try {
            val dir = safe(path)
            val arr = JSONArray()
            dir.listFiles()?.sortedWith(compareBy({ !it.isDirectory }, { it.name.lowercase() }))?.forEach {
                arr.put(JSONObject()
                    .put("name", it.name)
                    .put("dir", it.isDirectory)
                    .put("size", if (it.isFile) it.length() else 0)
                    .put("mtime", it.lastModified()))
            }
            ok(arr)
        } catch (e: Throwable) { fail(e) }

        @JavascriptInterface
        fun exists(path: String): Boolean = try { safe(path).exists() } catch (e: Throwable) { false }

        @JavascriptInterface
        fun read(path: String): String = try {
            ok(safe(path).readText(Charsets.UTF_8))
        } catch (e: Throwable) { fail(e) }

        @JavascriptInterface
        fun readBase64(path: String): String = try {
            ok(Base64.encodeToString(safe(path).readBytes(), Base64.NO_WRAP))
        } catch (e: Throwable) { fail(e) }

        @JavascriptInterface
        fun write(path: String, text: String): String = try {
            val f = safe(path); f.parentFile?.mkdirs(); f.writeText(text, Charsets.UTF_8); ok()
        } catch (e: Throwable) { fail(e) }

        @JavascriptInterface
        fun writeBase64(path: String, b64: String): String = try {
            val f = safe(path); f.parentFile?.mkdirs()
            f.writeBytes(Base64.decode(b64, Base64.DEFAULT)); ok()
        } catch (e: Throwable) { fail(e) }

        @JavascriptInterface
        fun mkdir(path: String): String = try { safe(path).mkdirs(); ok() } catch (e: Throwable) { fail(e) }

        @JavascriptInterface
        fun remove(path: String): String = try {
            val f = safe(path)
            if (f.canonicalFile == root.canonicalFile) throw SecurityException("Kök silinemez")
            f.deleteRecursively(); ok()
        } catch (e: Throwable) { fail(e) }

        @JavascriptInterface
        fun rename(from: String, to: String): String = try {
            val a = safe(from); val b = safe(to); b.parentFile?.mkdirs()
            if (!a.renameTo(b)) throw Exception("Yeniden adlandırılamadı")
            ok()
        } catch (e: Throwable) { fail(e) }

        @JavascriptInterface
        fun http(id: String, url: String, method: String, headersJson: String, body: String) {
            Thread {
                var status = 0
                var text: String
                try {
                    val c = URL(url).openConnection() as HttpURLConnection
                    c.requestMethod = method
                    c.connectTimeout = 20000
                    c.readTimeout = 60000
                    val h = JSONObject(headersJson)
                    val keys = h.keys()
                    while (keys.hasNext()) { val k = keys.next(); c.setRequestProperty(k, h.getString(k)) }
                    if (method != "GET" && body.isNotEmpty()) {
                        c.doOutput = true
                        c.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
                    }
                    status = c.responseCode
                    val stream = if (status in 200..299) c.inputStream else c.errorStream
                    text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
                } catch (e: Throwable) {
                    text = e.message ?: e.toString()
                }
                val b64 = Base64.encodeToString(text.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)
                main.post {
                    web.evaluateJavascript("window.__loncaHttpDone && window.__loncaHttpDone('$id',$status,'$b64')", null)
                }
            }.start()
        }

        // ---- ses
        @JavascriptInterface
        fun sesVar(): Boolean = tts != null

        @JavascriptInterface
        fun konus(metin: String, perde: Float, hiz: Float) {
            main.post {
                val t = tts
                if (t == null || !ttsHazir) { sesOlayi("konusmaBitti"); return@post }
                t.setPitch(perde)
                t.setSpeechRate(hiz)
                t.speak(metin, TextToSpeech.QUEUE_FLUSH, null, "lonca-" + System.currentTimeMillis())
            }
        }

        /** Telefondaki sesler (önce Türkçe olanlar): [{ad, dil, ulke, kalite, internet, ozellik}] */
        @JavascriptInterface
        fun sesler(): String = try {
            val t = tts
            val arr = JSONArray()
            val liste: Set<Voice> = if (t != null && ttsHazir) (t.voices ?: emptySet()) else emptySet()
            val tr = liste.filter { it.locale.language == "tr" }
            for (v in (if (tr.isNotEmpty()) tr else liste.toList()).sortedBy { it.name }) {
                arr.put(JSONObject()
                    .put("ad", v.name)
                    .put("dil", v.locale.language)
                    .put("ulke", v.locale.country)
                    .put("kalite", v.quality)
                    .put("internet", v.isNetworkConnectionRequired)
                    .put("ozellik", JSONArray(v.features?.toList() ?: emptyList<String>())))
            }
            ok(arr)
        } catch (e: Throwable) { fail(e) }

        /** Belirli bir sesle konuş. efekt: "" ya da "robot" (metalik) */
        @JavascriptInterface
        fun konusSes(metin: String, perde: Float, hiz: Float, sesAdi: String, efekt: String) {
            main.post {
                val t = tts
                if (t == null || !ttsHazir) { sesOlayi("konusmaBitti"); return@post }
                try {
                    if (sesAdi.isNotEmpty()) {
                        val v = t.voices?.firstOrNull { it.name == sesAdi }
                        if (v != null) t.voice = v else t.setLanguage(Locale("tr", "TR"))
                    }
                } catch (_: Throwable) {}
                t.setPitch(perde)
                t.setSpeechRate(hiz)
                if (efekt == "robot") {
                    robotParca?.let { try { it.stop(); it.release() } catch (_: Throwable) {}; robotParca = null }
                    val f = File(cacheDir, "robot.wav")
                    val r = t.synthesizeToFile(metin, Bundle(), f, "robot-" + System.currentTimeMillis())
                    if (r != TextToSpeech.SUCCESS) t.speak(metin, TextToSpeech.QUEUE_FLUSH, null, "lonca-" + System.currentTimeMillis())
                } else {
                    t.speak(metin, TextToSpeech.QUEUE_FLUSH, null, "lonca-" + System.currentTimeMillis())
                }
            }
        }

        @JavascriptInterface
        fun sus() { main.post { try { tts?.stop() } catch (_: Throwable) {}; try { robotParca?.let { it.stop(); it.release() }; robotParca = null } catch (_: Throwable) {} } }

        // ---- uygulamayla gelen dosyalar (assets)
        @JavascriptInterface
        fun assetBase64(path: String): String = try {
            ok(Base64.encodeToString(assets.open(path.trimStart('/')).use { it.readBytes() }, Base64.NO_WRAP))
        } catch (e: Throwable) { fail(e) }

        // ---- bildirim
        @JavascriptInterface
        fun bildirim(baslik: String, metin: String, anahtar: String) { main.post { bildirimGoster(baslik, metin, anahtar) } }

        @JavascriptInterface
        fun bildirimIzniVar(): Boolean = bildirimIzniVarMi()

        @JavascriptInterface
        fun bildirimIzniIste() {
            main.post {
                if (Build.VERSION.SDK_INT >= 33 && !bildirimIzniVarMi()) requestPermissions(arrayOf("android.permission.POST_NOTIFICATIONS"), BILDIRIM_IZNI)
                else web.evaluateJavascript("window.__loncaBildirimIzni && window.__loncaBildirimIzni(true)", null)
            }
        }

        // ---- takvim: telefonun takvim uygulaması açılır, kaydı sen onaylarsın (izin gerekmez)
        @JavascriptInterface
        fun takvimEkle(baslik: String, basla: Double, bitir: Double, aciklama: String): String = try {
            val i = Intent(Intent.ACTION_INSERT).apply {
                data = CalendarContract.Events.CONTENT_URI
                putExtra(CalendarContract.Events.TITLE, baslik)
                putExtra(CalendarContract.Events.DESCRIPTION, aciklama)
                putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, basla.toLong())
                putExtra(CalendarContract.EXTRA_EVENT_END_TIME, bitir.toLong())
            }
            main.post { try { startActivity(i) } catch (_: Throwable) {} }
            ok()
        } catch (e: Throwable) { fail(e) }

        // ---- dışa kaydet: evdeki bir dosyayı (ör. çekilen video) telefonun İndirilenler klasörüne kopyalar
        @JavascriptInterface
        fun disaKaydet(path: String, ad: String, mime: String): String = try {
            val kaynak = safe(path)
            if (Build.VERSION.SDK_INT >= 29) {
                val cv = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, ad)
                    put(MediaStore.MediaColumns.MIME_TYPE, mime)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Lonca")
                }
                val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv) ?: throw Exception("Kaydedilemedi")
                contentResolver.openOutputStream(uri)?.use { out -> kaynak.inputStream().use { it.copyTo(out) } }
                ok("İndirilenler/Lonca/$ad")
            } else {
                val dir = File(getExternalFilesDir(Environment.DIRECTORY_MOVIES), "Lonca"); dir.mkdirs()
                val hedef = File(dir, ad); kaynak.copyTo(hedef, overwrite = true)
                ok(hedef.path)
            }
        } catch (e: Throwable) { fail(e) }

        @JavascriptInterface
        fun dinle() { main.post { dinlemeyiBaslat() } }

        @JavascriptInterface
        fun dinlemeyiBirak() { main.post { try { recognizer?.cancel() } catch (_: Throwable) {} } }
    }
}
