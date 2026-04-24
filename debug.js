const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  try {
    const user = await pool.query('SELECT * FROM admin_users WHERE username = $1', ['acc@tavitax.com']);
    let roles = [];
    if (user.rows[0] && user.rows[0].roles) {
      const rolesResult = await pool.query('SELECT permissions FROM admin_roles WHERE id::text = ANY($1::text[])', [user.rows[0].roles]);
      roles = rolesResult.rows;
    }
    
    let permissions = [];
    const permSet = new Set();
    roles.forEach(r => {
      if (Array.isArray(r.permissions)) {
        r.permissions.forEach(p => permSet.add(p));
      }
    });
    permissions = Array.from(permSet);
    console.log('Permissions to be injected:', permissions);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
