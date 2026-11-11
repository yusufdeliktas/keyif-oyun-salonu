# Keyif Oyun Salonu

İnternetsiz çalışan, 20 oyunluk kişisel oyun platformu. Hem bilgisayarda (tarayıcıda) hem de Android telefonda (APK) oynanır.

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
| Zindan Kaşifi | RPG | Sıra tabanlı zindan macerası: her seferinde yeniden oluşan 15 kat, 5 bölge, 3 sınıf (Savaşçı, Okçu, Büyücü), 9 beceri, 25 canavar ve 3 boss, rastgele büyülü eşyalar, tüccar, tuzaklar, yetenek seçimi, kalıcı ölüm ve Ruh Taşı ile kalıcı bonuslar, otomatik kayıt |

### Yeni nesil (modern)
| Oyun | Tür | Öne çıkanlar |
|---|---|---|
| Dron Pilotu | Simülasyon | 3B şehirde iki joystick ile dron uçuşu; serbest keşif (40 kristal), halka yarışı, kargo teslimatı; takip ve FPV kamera, mini harita, batarya ve şarj pistleri, engel algılama, yardımlı / manuel uçuş |
| Sapan Uçuşu | Simülasyon | Sapanla fırlat, süzül, para kazan; 7 yükseltme, 4 uçak (kağıt uçak → jet), roket, 4 bölge (çayır, çöl, karlı dağlar, okyanus), suda sekme, rüzgar, 21 görev |
| Birleştir | Bulmaca | Sayı birleştirme, 4×4 / 5×5 / 6×6, animasyonlar, 3 geri alma |
| Blok Yerleştir | Bulmaca | Klasik, Macera (mücevher toplama seviyeleri) ve Zamana Karşı modları; 8×8 / 10×10; jokerler (döndür, yenile, bomba, geri al, ipucu); mıknatıslı sürükle-bırak; seri ve "tahta temiz" bonusu; kaldığın yerden devam; 4 tema |
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

## Güncellemeler
Siteye yeni bir sürüm yüklendiğinde iPhone'daki uygulama bunu kendiliğinden fark eder. Ana menüdeysen hemen, oyundaysan menüye döndüğünde yenilenir. Kayıtların, rekorların ve Sapan Uçuşu'ndaki paran silinmez.

## Klasör yapısı
```
web/                  Oyun platformu (HTML5, bağımlılık yok)
  index.html
  css/style.css
  js/core.js          Platform çekirdeği: menü, skorlar, ses, oturum yönetimi
  games/*.js          Her oyun ayrı bir dosya
  games/dungeon/      Zindan Kaşifi'nin veri, harita üretimi ve piksel sanat modülleri
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
