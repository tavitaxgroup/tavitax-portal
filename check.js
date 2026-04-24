const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  try {
    const user = await pool.query('SELECT * FROM admin_users WHERE username = $1', ['acc@tavitax.com']);
    console.log('User:', user.rows[0]);
    if (user.rows[0] && user.rows[0].roles) {
      const roles = await pool.query('SELECT * FROM admin_roles WHERE id::text = ANY($1::text[])', [user.rows[0].roles]);
      console.log('Roles:', roles.rows);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
