const db = require('../config/db');

async function runMigrationV2() {
  console.log('🔄 Running Migration V2: Adding Navigation & System Settings...');
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Add Navigation Columns to Departments if not existing
    console.log('... Updating departments table with floor, wing, room and map coordinates');
    await client.query(`
      ALTER TABLE departments 
      ADD COLUMN IF NOT EXISTS floor_number INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS wing VARCHAR(50) DEFAULT 'East Wing',
      ADD COLUMN IF NOT EXISTS room_number VARCHAR(50) DEFAULT 'Room 101',
      ADD COLUMN IF NOT EXISTS map_x INTEGER DEFAULT 200,
      ADD COLUMN IF NOT EXISTS map_y INTEGER DEFAULT 150;
    `);

    // 2. Create System Settings Table
    console.log('... Creating system_settings table');
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        description TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create Hospital Waypoints Table for Navigation Graph
    console.log('... Creating hospital_waypoints table');
    await client.query(`
      CREATE TABLE IF NOT EXISTS hospital_waypoints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        floor_number INTEGER NOT NULL,
        wing VARCHAR(50) NOT NULL,
        room_number VARCHAR(50),
        map_x INTEGER NOT NULL,
        map_y INTEGER NOT NULL,
        node_type VARCHAR(30) NOT NULL CHECK (node_type IN ('DEPARTMENT', 'ENTRANCE', 'HALLWAY', 'ELEVATOR', 'STAIRS', 'DESK')),
        is_active BOOLEAN DEFAULT TRUE
      );
    `);

    // 4. Update Department Floor & Room Coordinates with realistic clinical floor plan
    const deptUpdates = [
      { code: 'GEN', floor: 2, wing: 'East Wing', room: 'Room 201', x: 220, y: 160 },
      { code: 'PED', floor: 2, wing: 'East Wing', room: 'Room 202', x: 480, y: 160 },
      { code: 'CARD', floor: 2, wing: 'West Wing', room: 'Room 205', x: 220, y: 340 },
      { code: 'LAB', floor: 2, wing: 'West Wing', room: 'Room 208', x: 480, y: 340 },
      { code: 'EMER', floor: 1, wing: 'Emergency Bay', room: 'ER-Bay 1', x: 480, y: 340 },
      { code: 'RAD', floor: 1, wing: 'West Wing', room: 'Room 108', x: 220, y: 340 },
    ];

    for (const d of deptUpdates) {
      await client.query(`
        UPDATE departments
        SET floor_number = $1, wing = $2, room_number = $3, map_x = $4, map_y = $5
        WHERE code = $6;
      `, [d.floor, d.wing, d.room, d.x, d.y, d.code]);
    }

    // 5. Seed Hospital Navigation Waypoints
    console.log('... Seeding hospital navigation waypoints');
    const waypoints = [
      // Floor 1 (Ground Floor: Intake & Emergency)
      { code: 'ENTRANCE_F1', name: 'Main Hospital Entrance', floor: 1, wing: 'Main Atrium', room: 'Foyer', x: 350, y: 50, type: 'ENTRANCE' },
      { code: 'RECEPTION_F1', name: 'Central Reception & Intake', floor: 1, wing: 'Main Atrium', room: 'Desk A', x: 350, y: 140, type: 'DESK' },
      { code: 'TRIAGE_F1', name: 'Nurse Triage Station', floor: 1, wing: 'Main Atrium', room: 'Station B', x: 350, y: 240, type: 'DESK' },
      { code: 'ELEVATOR_F1', name: 'Central Elevators A & B', floor: 1, wing: 'Central Core', room: 'Core Elevators', x: 350, y: 340, type: 'ELEVATOR' },
      { code: 'STAIRS_F1', name: 'Central Stairwell', floor: 1, wing: 'Central Core', room: 'Stairs 1', x: 300, y: 340, type: 'STAIRS' },
      { code: 'RAD_F1', name: 'Radiology & Imaging', floor: 1, wing: 'West Wing', room: 'Room 108', x: 220, y: 340, type: 'DEPARTMENT' },
      { code: 'EMER_F1', name: 'Emergency & Trauma Bay', floor: 1, wing: 'Emergency Wing', room: 'ER-Bay 1', x: 480, y: 340, type: 'DEPARTMENT' },
      { code: 'PHARMACY_F1', name: 'Outpatient Pharmacy', floor: 1, wing: 'East Wing', room: 'Room 102', x: 480, y: 140, type: 'DEPARTMENT' },

      // Floor 2 (Specialist Consultations & Laboratory)
      { code: 'ELEVATOR_F2', name: 'Central Elevators A & B', floor: 2, wing: 'Central Core', room: 'Core Elevators', x: 350, y: 240, type: 'ELEVATOR' },
      { code: 'STAIRS_F2', name: 'Central Stairwell', floor: 2, wing: 'Central Core', room: 'Stairs 1', x: 300, y: 240, type: 'STAIRS' },
      { code: 'GEN_F2', name: 'General Medicine Clinic', floor: 2, wing: 'East Wing', room: 'Room 201', x: 220, y: 160, type: 'DEPARTMENT' },
      { code: 'PED_F2', name: 'Pediatrics Clinic', floor: 2, wing: 'East Wing', room: 'Room 202', x: 480, y: 160, type: 'DEPARTMENT' },
      { code: 'CARD_F2', name: 'Cardiology Clinic', floor: 2, wing: 'West Wing', room: 'Room 205', x: 220, y: 340, type: 'DEPARTMENT' },
      { code: 'LAB_F2', name: 'Diagnostic Pathology Laboratory', floor: 2, wing: 'West Wing', room: 'Room 208', x: 480, y: 340, type: 'DEPARTMENT' },
      { code: 'ADMIN_F2', name: 'Hospital Administration Office', floor: 2, wing: 'Administration Wing', room: 'Room 210', x: 350, y: 100, type: 'DEPARTMENT' },
    ];

    for (const w of waypoints) {
      await client.query(`
        INSERT INTO hospital_waypoints (code, name, floor_number, wing, room_number, map_x, map_y, node_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (code) DO UPDATE
          SET name = EXCLUDED.name,
              floor_number = EXCLUDED.floor_number,
              wing = EXCLUDED.wing,
              room_number = EXCLUDED.room_number,
              map_x = EXCLUDED.map_x,
              map_y = EXCLUDED.map_y,
              node_type = EXCLUDED.node_type;
      `, [w.code, w.name, w.floor, w.wing, w.room, w.x, w.y, w.type]);
    }

    // 6. Seed Default System Settings
    console.log('... Seeding default system settings');
    const defaultSettings = [
      {
        key: 'assistant_config',
        value: {
          name: 'CareFlow Assistant',
          wake_words: ['hey assistant', 'careflow', 'assistant'],
          voice_enabled: true,
          speech_rate: 1.0,
          speech_pitch: 1.0,
          language: 'en-US',
          ai_provider: process.env.AI_PROVIDER || 'local_clinical_engine',
          is_ai_key_configured: !!(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.AI_PROVIDER_KEY),
        },
        desc: 'Configuration for AI chatbot assistant and voice activation',
      },
      {
        key: 'voice_announcements',
        value: {
          enabled: true,
          privacy_mode: 'FIRST_NAME_AND_TICKET', // 'TICKET_ONLY', 'FIRST_NAME_AND_TICKET', 'FULL_NAME'
          language: 'en-US',
          repeat_delay_seconds: 5,
          chime_enabled: true,
        },
        desc: 'Voice queue announcement settings and patient privacy parameters',
      },
    ];

    for (const s of defaultSettings) {
      await client.query(`
        INSERT INTO system_settings (key, value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (key) DO UPDATE
          SET value = EXCLUDED.value,
              description = EXCLUDED.description,
              updated_at = CURRENT_TIMESTAMP;
      `, [s.key, JSON.stringify(s.value), s.desc]);
    }

    await client.query('COMMIT');
    console.log('✅ Migration V2 executed successfully! Navigation & Settings are ready.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration V2 failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrationV2()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigrationV2 };
