require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function main() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });
    
    try {
        const res = await pool.query('SELECT DISTINCT map FROM battle_logs WHERE map IS NOT NULL');
        console.log("=== DB MAPS ===");
        console.log(JSON.stringify(res.rows.map(r => r.map), null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
main();
