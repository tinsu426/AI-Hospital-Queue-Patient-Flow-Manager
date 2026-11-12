const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigration() {
  console.log('🔄 Running database migrations on PostgreSQL...');
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    await db.query(sql);
    console.log('✅ Migrations executed successfully! All tables and indexes are ready.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
