# Antigravity Token Watcher

VSCode için Antigravity AI token kullanım takip eklentisi. Token limitinizi, kullanım yüzdenizi ve reset tarihini gerçek zamanlı takip edin.

## Özellikler

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

### 🔐 Otomatik Oturum Yönetimi
- Chrome/Edge tarayıcılarından otomatik cookie tespiti
- Windows DPAPI şifre çözme desteği
- Manuel API Key desteği (yedek olarak)
- Çoklu profil desteği (Default, Profile 1, 2, 3)

## Kurulum

### Gereksinimler
- Windows 10/11
- VSCode 1.74.0 veya üzeri
- Chrome veya Edge (cookie otomatik tespit için)

### Adımlar

1. **Bağımlılıkları yükle:**
```bash
cd AntigravityTokenWatcher
npm install
```

2. **Derle:**
```bash
npm run compile
```

3. **VSCode'da çalıştır:**
- VSCode'da projeyi açın
- `F5` tuşuna basarak Debug modunda çalıştırın
- Yeni bir Extension Development Host penceresi açılacak

### VSIX Paketi Oluşturma

```bash
npm install -g @vscode/vsce
vsce package
```

Oluşan `.vsix` dosyasını VSCode'da şu şekilde yükleyin:
- Extensions view (Ctrl+Shift+X)
- `...` menüsü > "Install from VSIX"

## Kullanım

### Otomatik Başlatma
Eklenti VSCode açıldığında otomatik başlar ve Chrome/Edge cookie'lerini arar.

### Manuel İşlemler

**Token verilerini yenile:**
- Command Palette (Ctrl+Shift+P) > "Antigravity: Token Verilerini Yenile"
- Status bar'a tıklayın

**Detaylı bilgi göster:**
- Command Palette > "Antigravity: Detaylı Kullanım Bilgileri"
- Status bar'a tıklayın

**API Key ayarla:**
- Command Palette > "Antigravity: Manuel API Key Ayarla"
- Settings > "Antigravity Token Watcher" > "API Key"

### Ayarlar

VSCode Settings (Ctrl+,) üzerinden şu ayarları değiştirebilirsiniz:

```json
{
  "antigravitytokenwatcher.apiKey": "",              // Manuel API Key
  "antigravitytokenwatcher.refreshInterval": 5,      // Yenileme aralığı (dakika)
  "antigravitytokenwatcher.showNotifications": true  // Bildirimleri göster
}
```

## Mimari

```
AntigravityTokenWatcher/
├── src/
│   ├── extension.ts           # Ana giriş noktası
│   ├── auth/
│   │   └── cookieExtractor.ts # Windows cookie çözme
│   ├── api/
│   │   └── antigravity.ts     # API istekleri
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

## Sorun Giderme

### "Oturum bulunamadı" hatası
1. Chrome/Edge'de antigravity.google.com'a giriş yaptığınızdan emin olun
2. Eklentiyi yeniden başlatın (Ctrl+Shift+P > "Developer: Reload Window")
3. Manuel API Key ekleyin

### Cookie şifre çözme hatası
- Python ve `pywin32` paketi gerekebilir:
```bash
pip install pywin32
```

### Veriler güncellenmiyor
- Token yenileme butonuna basın
- Ayarlardan yenileme aralığını kontrol edin
- API endpoint'lerinin erişilebilir olduğunu doğrulayın

## Güvenlik

- Cookie'ler sadece yerel olarak okunur, hiçbir yere gönderilmez
- API Key'ler VSCode'un güvenli ayar deposunda saklanır
- Hiçbir kullanım verisi dışarı aktarılmaz

## Geliştirme

### Kodlama Standartları
- TypeScript strict mode
- ESLint kuralları
- Anlamlı değişken/fonksiyon isimleri

### Test
```bash
npm test
```

### Debug
- `.vscode/launch.json` yapılandırması mevcut
- F5 ile debug modunda başlatın
- Extension Development Host'ta test edin

## Yol Haritası

- [ ] Mac/Linux desteği
- [ ] Firefox cookie tespiti
- [ ] Kullanım geçmişi grafiği
- [ ] Maliyet hesaplama (Pro/Ultra planları için)
- [ ] Çoklu hesap desteği
- [ ] Otomatik limit artırma önerileri

## Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## İletişim

Sorularınız veya önerileriniz için GitHub Issues kullanabilirsiniz.

---

**Not:** Bu eklenti bağımsız bir projedir ve Google/Antigravity ile resmi bir bağlantısı yoktur.
