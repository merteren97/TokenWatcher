# Antigravity Token Watcher

VSCode/Antigravity için token kullanım takip eklentisi. Antigravity IDE'nin yerel API'sini kullanarak gerçek zamanlı token kullanımınızı takip edin.

## 🎯 Yeni Çalışma Prensibi

**Artık çok daha basit!** Eklenti, Antigravity IDE'nin kendi yerel API'sine bağlanır:

1. **Otomatik Process Bulma**: `language_server_windows_x64.exe` process'ini otomatik bulur
2. **Port Tespiti**: Dinleme yapan port'ları tarar ve doğru olanı bulur
3. **Yerel API**: `GetUserStatus` endpoint'inden kullanım verilerini alır
4. **Gerçek Zamanlı**: Her 5 dakikada bir otomatik güncelleme

**Artık gerek yok:**
- ❌ Cookie okuma
- ❌ API Key girmek
- ❌ Chrome/Edge ile uğraşmak
- ❌ Manuel giriş yapmak

## ✨ Özellikler

### 🎯 Gerçek Zamanlı Takip
- **Status Bar**: Sağ altta anlık kullanım yüzdesi (örn: "AG: 73%")
- **Renk Kodlaması**: 
  - 🟢 %0-79: Normal kullanım
  - 🟡 %80-89: Dikkat gerektiren
  - 🟠 %90-94: Yüksek kullanım
  - 🔴 %95+: Kritik seviye

### 📊 Detaylı Bilgi Paneli
- Circular progress bar ile görsel kullanım gösterimi
- Kullanılan / Toplam token sayıları
- Kalan token miktarı ve yüzdesi
- Plan tipi gösterimi (Free/Pro/Ultra)
- Reset geri sayımı ve tarihi

### 🔔 Akıllı Bildirimler
- **%80**: "Dikkat, kullanımınız %80'e ulaştı"
- **%90**: "Uyarı, %90 sınırında"  
- **%95**: "Kritik! Sadece %5 kaldı"
- **%99**: "ACİL! Limit dolmak üzere!"

## 🚀 Kurulum

### VSIX ile Manuel Kurulum

1. **Paketi indirin:**
   ```bash
   antigravitytokenwatcher-1.0.1.vsix
   ```

2. **Antigravity IDE'de kurun:**
   - Extensions view (Ctrl+Shift+X)
   - `...` menüsü > "Install from VSIX"
   - `.vsix` dosyasını seçin

### Gereksinimler
- **Antigravity IDE** yüklü ve çalışıyor olmalı
- Windows 10/11 (şu an sadece Windows desteği)

## 🎮 Kullanım

### Otomatik Çalışma
Eklenti Antigravity IDE açıldığında otomatik:
1. ✅ Process'i bulur
2. ✅ API'ye bağlanır
3. ✅ Token verilerini çeker
4. ✅ Status bar'ı günceller

### Manuel İşlemler

**Token verilerini yenile:**
- Command Palette (Ctrl+Shift+P) > "Antigravity: Token Verilerini Yenile"
- Status bar'a tıklayın

**Detaylı bilgi göster:**
- Command Palette > "Antigravity: Detaylı Kullanım Bilgileri"

**Yeniden bağlan (sorun olursa):**
- Command Palette > "Antigravity: Yeniden Bağlan"

### Ayarlar

VSCode Settings (Ctrl+,) üzerinden:

```json
{
  "antigravitytokenwatcher.refreshInterval": 5,      // Yenileme aralığı (dakika)
  "antigravitytokenwatcher.showNotifications": true  // Bildirimleri göster
}
```

## 🏗️ Mimari

```
AntigravityTokenWatcher/
├── src/
│   ├── extension.ts           # Ana giriş noktası
│   ├── auth/
│   │   └── processFinder.ts   # Process bulma ve bağlantı
│   ├── api/
│   │   └── antigravity.ts     # Yerel API istekleri
│   ├── ui/
│   │   ├── statusBar.ts       # Status bar yönetimi
│   │   └── webviewPanel.ts    # Detay paneli
│   ├── models/
│   │   └── types.ts           # TypeScript interfaces
│   └── utils/
│       ├── constants.ts       # Sabitler
│       └── helpers.ts         # Yardımcı fonksiyonlar
├── package.json               # Eklenti manifest
└── tsconfig.json             # TypeScript config
```

## 🔧 Sorun Giderme

### "Antigravity bulunamadı" hatası
1. Antigravity IDE'nin çalıştığından emin olun
2. Command Palette > "Antigravity: Yeniden Bağlan" deneyin
3. Antigravity'yi yeniden başlatın

### "Veri alınamadı" hatası
- Antigravity IDE'nin güncel olduğundan emin olun
- Eklentiyi yeniden başlatın (Ctrl+Shift+P > "Developer: Reload Window")

## ⚙️ Teknik Detaylar

### API Endpoint
```
POST https://127.0.0.1:{port}/exa.language_server_pb.LanguageServerService/GetUserStatus
Headers:
  - Content-Type: application/json
  - Connect-Protocol-Version: 1
  - X-Codeium-Csrf-Token: {csrf_token}
```

### Process Bulma
```powershell
# Windows PowerShell
Get-CimInstance Win32_Process -Filter "name='language_server_windows_x64.exe'"
```

## 📝 Changelog

### v1.0.1
- ✅ **YENİ**: Antigravity yerel API entegrasyonu
- ✅ **YENİ**: Otomatik process bulma
- ✅ **İYİLEŞTİRME**: Cookie/API Key gereksinimi kaldırıldı
- ✅ **İYİLEŞTİRME**: Çok daha hızlı ve güvenilir

### v1.0.0
- 🎉 İlk sürüm
- Cookie bazlı auth
- Manuel API Key desteği

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

MIT License

## 🙏 Teşekkürler

Bu proje [Henrik-3/AntigravityQuota](https://github.com/Henrik-3/AntigravityQuota) reposundaki teknik detaylardan ilham almıştır.

---

**Not:** Bu eklenti bağımsız bir projedir ve Google/Antigravity ile resmi bir bağlantısı yoktur.
