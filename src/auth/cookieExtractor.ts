import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { AntigravitySession } from '../models/types';

export class CookieExtractor {
  private static readonly CHROME_PROFILES = [
    'Default',
    'Profile 1',
    'Profile 2',
    'Profile 3'
  ];

  private static readonly BROWSER_PATHS = [
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data'),
    path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data')
  ];

  async extractSession(): Promise<AntigravitySession | null> {
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

        // Antigravity cookie'lerini ara
        db.all(
          `SELECT name, value, encrypted_value FROM cookies 
           WHERE host_key LIKE '%antigravity.google.com%' 
           OR host_key LIKE '%.antigravity.google.com%'`,
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
      // Windows DPAPI kullanarak şifre çözme
      // Bunun için windows-native addon veya child_process kullanacağız
      const { execSync } = require('child_process');
      
      // Python script ile DPAPI çözme
      const pythonScript = `
import sys
import json
try:
    import win32crypt
    import ctypes
    from ctypes import wintypes
    
    # DPAPI şifre çözme
    data = sys.stdin.buffer.read()
    decrypted = win32crypt.CryptUnprotectData(data, None, None, None, 0)
    print(decrypted[1].decode('utf-8'))
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
`;
      
      // Şifreli veriyi base64 olarak geçir
      const input = encryptedValue.toString('base64');
      
      try {
        const result = execSync('python -c "' + pythonScript.replace(/"/g, '\\"') + '"', {
          input: encryptedValue,
          timeout: 5000,
          encoding: 'utf-8'
        });
        return result.trim();
      } catch (pyError) {
        // Python çalışmadıysa, encrypted_value'yu olduğu gibi kullan
        // (bazı durumlarda şifrelenmemiş olabilir)
        return encryptedValue.toString('utf-8').replace(/\\x00/g, '');
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
