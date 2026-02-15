import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { AntigravitySession } from '../models/types';

export class CookieExtractor {
  // Antigravity IDE'nin state.vscdb dosyası yolu
  private static readonly ANTIGRAVITY_STATE_PATH = path.join(
    os.homedir(), 
    'AppData', 
    'Roaming', 
    'Antigravity', 
    'User', 
    'globalStorage', 
    'state.vscdb'
  );

  private static readonly CHROME_PROFILES = [
    'Default',
    'Profile 1',
    'Profile 2',
    'Profile 3',
    'Antigravity',
    'AntigravityProfile'
  ];

  private static readonly BROWSER_PATHS = [
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data'),
    path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data'),
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome Dev', 'User Data'),
    path.join(os.homedir(), 'AppData', 'Local', 'Chromium', 'User Data')
  ];

  async extractSession(): Promise<AntigravitySession | null> {
    // Önce Antigravity IDE'nin state.vscdb dosyasından auth bilgilerini dene
    if (fs.existsSync(CookieExtractor.ANTIGRAVITY_STATE_PATH)) {
      try {
        const session = await this.extractFromAntigravityState();
        if (session) {
          console.log('Antigravity IDE state.vscdb dosyasından auth bilgisi alındı');
          return session;
        }
      } catch (error) {
        console.error('Antigravity state okuma hatası:', error);
      }
    }

    // Eğer state.vscdb'de yoksa, Chrome/Edge cookie'lerini dene
    for (const browserPath of CookieExtractor.BROWSER_PATHS) {
      if (!fs.existsSync(browserPath)) {
        continue;
      }

      for (const profile of CookieExtractor.CHROME_PROFILES) {
        const profilePath = path.join(browserPath, profile);
        if (!fs.existsSync(profilePath)) {
          continue;
        }

        const cookiesPath = path.join(profilePath, 'Network', 'Cookies');
        const cookiesPath2 = path.join(profilePath, 'Cookies');
        
        const cookieFile = fs.existsSync(cookiesPath) ? cookiesPath : 
                          fs.existsSync(cookiesPath2) ? cookiesPath2 : null;
        
        if (cookieFile) {
          try {
            const session = await this.extractCookiesFromDB(cookieFile);
            if (session) {
              return session;
            }
          } catch (error) {
            console.error(`Cookie okuma hatası (${profile}):`, error);
          }
        }
      }
    }

    return null;
  }

  // Antigravity IDE'nin state.vscdb dosyasından auth bilgisi al
  private async extractFromAntigravityState(): Promise<AntigravitySession | null> {
    return new Promise((resolve) => {
      try {
        const sqlite3 = require('sqlite3');
        
        const db = new sqlite3.Database(
          CookieExtractor.ANTIGRAVITY_STATE_PATH, 
          sqlite3.OPEN_READONLY, 
          (err: any) => {
            if (err) {
              console.error('State DB bağlantı hatası:', err);
              resolve(null);
              return;
            }
          }
        );

        db.get(
          "SELECT value FROM ItemTable WHERE key = 'antigravityAuthStatus'",
          [],
          (err: any, row: any) => {
            if (err) {
              console.error('State sorgu hatası:', err);
              db.close();
              resolve(null);
              return;
            }

            if (!row || !row.value) {
              db.close();
              resolve(null);
              return;
            }

            try {
              const authData = JSON.parse(row.value);
              
              if (authData.apiKey) {
                console.log('Auth bilgisi bulundu:', authData.name, authData.email);
                db.close();
                resolve({
                  cookies: `Authorization=Bearer ${authData.apiKey}`,
                  userData: {
                    name: authData.name,
                    email: authData.email,
                    userStatusProtoBinaryBase64: authData.userStatusProtoBinaryBase64
                  }
                });
              } else {
                db.close();
                resolve(null);
              }
            } catch (parseError) {
              console.error('Auth data parse hatası:', parseError);
              db.close();
              resolve(null);
            }
          }
        );
      } catch (error) {
        console.error('State okuma hatası:', error);
        resolve(null);
      }
    });
  }

  private async extractCookiesFromDB(dbPath: string): Promise<AntigravitySession | null> {
    return new Promise((resolve) => {
      try {
        // SQLite3'ü dinamik import et
        const sqlite3 = require('sqlite3');
        
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err: any) => {
          if (err) {
            console.error('SQLite bağlantı hatası:', err);
            resolve(null);
            return;
          }
        });

        // Antigravity cookie'lerini ara - Google ve antigravity domainlerini kontrol et
        db.all(
          `SELECT name, value, encrypted_value FROM cookies 
           WHERE host_key LIKE '%google.com%' 
           OR host_key LIKE '%.google.com%'
           OR host_key LIKE '%antigravity%'
            ORDER BY 
              CASE 
                WHEN host_key LIKE '%antigravity%' THEN 1
                WHEN host_key = '.google.com' THEN 2
                WHEN host_key = 'google.com' THEN 3
                ELSE 4
              END`,
           [],
           async (err: any, rows: any[]) => {
            if (err) {
              console.error('Cookie sorgu hatası:', err);
              db.close();
              resolve(null);
              return;
            }

            if (rows.length === 0) {
              db.close();
              resolve(null);
              return;
            }

            // Cookie string oluştur
            const cookies: string[] = [];
            for (const row of rows) {
              let value = row.value;
              
              // Eğer şifrelenmişse çöz
              if (row.encrypted_value && row.encrypted_value.length > 0) {
                value = await this.decryptCookie(row.encrypted_value);
              }
              
              if (value) {
                cookies.push(`${row.name}=${value}`);
              }
            }

            db.close();

            if (cookies.length === 0) {
              resolve(null);
            } else {
              resolve({
                cookies: cookies.join('; ')
              });
            }
          }
        );
      } catch (error) {
        console.error('SQLite okuma hatası:', error);
        resolve(null);
      }
    });
  }

  private async decryptCookie(encryptedValue: Buffer): Promise<string> {
    try {
      // Chrome'un yeni versiyonları AES-256-GCM kullanıyor
      // Önce eski yöntemi dene (DPAPI)
      const { execSync } = require('child_process');
      
      // Şifreli verinin başlığı var mı kontrol et (Chrome v80+)
      // v80+ versiyonlar: [version][nonce][ciphertext][tag]
      if (encryptedValue[0] === 0x76 || encryptedValue[0] === 0x31) {
        // Yeni Chrome versiyonu - AES-256-GCM
        // Bunun için daha karmaşık bir çözüm gerekli
        // Şimdilik şifrelenmemiş değeri döndürmeyi dene
        return '';
      }
      
      // Python script ile DPAPI çözme (eski Chrome versiyonları için)
      const pythonScript = `
import sys
import win32crypt
try:
    data = sys.stdin.buffer.read()
    if len(data) > 0:
        decrypted = win32crypt.CryptUnprotectData(data, None, None, None, 0)
        print(decrypted[1].decode('utf-8', errors='ignore'))
except Exception as e:
    sys.exit(1)
`;
      
      try {
        const result = execSync('python -c "' + pythonScript.replace(/"/g, '\\"') + '"', {
          input: encryptedValue,
          timeout: 5000,
          encoding: 'utf-8'
        });
        return result.trim();
      } catch (pyError) {
        // Python çalışmadıysa veya şifre çözülemediyse boş string döndür
        return '';
      }
    } catch (error) {
      console.error('Cookie şifre çözme hatası:', error);
      return '';
    }
  }

  // Alternatif: Local Storage'dan session bilgisi al
  async extractFromLocalStorage(): Promise<AntigravitySession | null> {
    for (const browserPath of CookieExtractor.BROWSER_PATHS) {
      for (const profile of CookieExtractor.CHROME_PROFILES) {
        const localStoragePath = path.join(
          browserPath, 
          profile, 
          'Local Storage', 
          'leveldb'
        );
        
        if (fs.existsSync(localStoragePath)) {
          try {
            // LevelDB'den antigravity verilerini oku
            const files = fs.readdirSync(localStoragePath);
            for (const file of files) {
              if (file.endsWith('.log') || file.endsWith('.ldb')) {
                const content = fs.readFileSync(path.join(localStoragePath, file), 'utf-8');
                const match = content.match(/antigravity[^\\x00]+/);
                if (match) {
                  // Session bilgisi bulundu
                  return { cookies: match[0] };
                }
              }
            }
          } catch (error) {
            // Hata durumunda devam et
          }
        }
      }
    }
    return null;
  }
}
