# Keyif Oyun Salonu

İnternetsiz çalışan, 17 oyunluk kişisel oyun platformu. Hem bilgisayarda (tarayıcıda) hem de Android telefonda (APK) oynanır.

## Hızlı başlangıç

| Nerede | Nasıl |
|---|---|
| **Android telefon** | `KeyifOyunSalonu.apk` dosyasını telefona at, aç ve kur ("Bilinmeyen kaynaklardan yükleme" iznini bir kez vermen gerekebilir). |
| **iPhone / iPad** | Safari'de **https://yusufdeliktas.github.io/keyif-oyun-salonu/** adresini aç → Paylaş → **Ana Ekrana Ekle**. İlk açılıştan sonra internetsiz çalışır. |
| **Bilgisayar** | `web/index.html` dosyasına çift tıkla ya da yukarıdaki adresi aç. |

Hiçbir şey indirilmez, hesap veya internet gerekmez. Rekorlar ve ayarlar cihazda saklanır.

## Oyunlar

### Eski nesil (klasikler)
| Oyun | Tür | Öne çıkanlar |
|---|---|---|
| Yılan | Arcade | 3 hız, duvarlı/duvarsız mod, altın elma |
| Blok Yağmuru | Bulmaca | Düşen bloklar: saklama, sıradaki 3 parça, gölge parça, seviye sistemi |
| Tuğla Kırıcı | Arcade | 7 bölüm, çok vuruşluk ve kırılmaz tuğlalar, 4 güçlendirme |
| Uzay Savunması | Aksiyon | Dalgalar, 5 silah seviyesi, kalkan, her 5. dalgada ana gemi |
| Mayın Tarlası | Bulmaca | 3 zorluk, uzun basarak bayrak, akıllı açma (chord), ilk tık güvenli |
| Raket Düellosu | Spor | 3 zorlukta yapay zeka veya aynı telefonda 2 oyuncu |
| Satranç | Strateji | Tam kurallar (rok, geçerken alma, terfi, beraberlikler), 3 seviye yapay zeka, ipucu, geri al |
| Dama | Strateji | Türk daması kuralları (zorunlu ve en çok taşı alan hamle, uçan dama), yapay zeka veya 2 oyuncu |
| Solitaire | Kart | Klondike, 1 veya 3 kart çekme, sürükle-bırak, dokununca otomatik yerleştirme, otomatik bitirme |
| Dört Taş | Strateji | 3 seviye yapay zeka veya 2 oyuncu |

### Yeni nesil (modern)
| Oyun | Tür | Öne çıkanlar |
|---|---|---|
| Birleştir | Bulmaca | Sayı birleştirme, 4×4 / 5×5 / 6×6, animasyonlar, 3 geri alma |
| Blok Yerleştir | Bulmaca | 8×8 blok bulmacası, kombo sistemi |
| Vızz! | Refleks | Tek dokunuşla uçan arı, madalyalar |
| Neon Koşucu | Refleks | Sonsuz koşu, çift zıplama, platformlar, altınlar |
| Balon Patlat | Bulmaca | Duvardan sekme, nişan çizgisi, seviyeler |
| Sudoku | Bulmaca | Her seferinde yeni ve tek çözümlü bulmaca, notlar, ipucu |
| Emoji Hafıza | Hafıza | 4 tahta boyutu, seri bonusu |

Tüm oyunlar bu proje için sıfırdan yazıldı. Klasik oyun türlerini temel alıyorlar ama isimleri, görselleri ve sesleri özgün. Sesler dosya olarak değil kodla üretiliyor.

## Platform özellikleri
- Türkçe arayüz, "Eski Nesil / Yeni Nesil / Favoriler" sekmeleri, arama, rastgele oyun düğmesi
- Her oyun için rekor kaydı (zorluk ve tahta boyutuna göre ayrı ayrı)
- Duraklatma, nasıl oynanır ekranı, oyun ayarları
- Ses ve titreşim açma/kapama, istatistikler, kayıtları sıfırlama
- Dokunmatik + klavye desteği; Android geri tuşu oyunu duraklatır, sonra menüye döner

## Klasör yapısı
```
web/                  Oyun platformu (HTML5, bağımlılık yok)
  index.html
  css/style.css
  js/core.js          Platform çekirdeği: menü, skorlar, ses, oturum yönetimi
  games/*.js          Her oyun ayrı bir dosya
android/              APK'yı üreten Android projesi (WebView sarmalayıcı)
KeyifOyunSalonu.apk   Hazır, imzalı Android uygulaması
```

## APK'yı yeniden derlemek
`web/` içinde değişiklik yaptıktan sonra:
```
cd android
gradlew.bat assembleRelease
```
Çıktı: `android/app/build/outputs/apk/release/app-release.apk`
(JDK 17 ve Android SDK gerekir. İmza anahtarı `android/keystore/` içinde, şifresi `keyif2026`. Aynı anahtarla imzalanan güncellemeler, kayıtlar silinmeden eski sürümün üzerine kurulur.)

## Yeni oyun eklemek
`web/games/` içine yeni bir dosya ekleyip `Platform.register({...})` ile kaydet, sonra `index.html` sonuna `<script>` satırını ekle. Örnek olarak `games/snake.js` dosyasına bakabilirsin.
