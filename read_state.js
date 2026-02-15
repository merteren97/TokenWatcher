const sqlite3 = require('sqlite3').verbose();

const statePath = 'C:\\Users\\merte\\AppData\\Roaming\\Antigravity\\User\\globalStorage\\state.vscdb';

const db = new sqlite3.Database(statePath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('State DB açılamadı:', err.message);
    return;
  }
  console.log('State DB açıldı');
});

// Tabloları listele
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error('Tablo sorgu hatası:', err.message);
    return;
  }
  
  console.log('\n=== Tablolar ===');
  tables.forEach(table => console.log(table.name));
  
  // ItemTable içindeki verileri oku
  db.all("SELECT key, value FROM ItemTable", [], (err, rows) => {
    if (err) {
      console.error('Veri sorgu hatası:', err.message);
      return;
    }
    
    console.log('\n=== Tüm Veriler ===');
    rows.forEach(row => {
      console.log(`\nKey: ${row.key}`);
      try {
        const value = JSON.parse(row.value);
        console.log('Value (JSON):', JSON.stringify(value, null, 2).substring(0, 500));
      } catch (e) {
        console.log('Value (raw):', row.value ? row.value.substring(0, 200) : 'null');
      }
    });
    
    // Antigravity ile ilgili anahtarları filtrele
    console.log('\n\n=== Antigravity ile ilgili Anahtarlar ===');
    const relevantKeys = rows.filter(row => 
      row.key.toLowerCase().includes('antigravity') ||
      row.key.toLowerCase().includes('google') ||
      row.key.toLowerCase().includes('auth') ||
      row.key.toLowerCase().includes('token') ||
      row.key.toLowerCase().includes('session') ||
      row.key.toLowerCase().includes('gemini')
    );
    
    relevantKeys.forEach(row => {
      console.log(`\nKey: ${row.key}`);
      try {
        const value = JSON.parse(row.value);
        console.log('Value:', JSON.stringify(value, null, 2));
      } catch (e) {
        console.log('Value:', row.value);
      }
    });
  });
});

db.close();
