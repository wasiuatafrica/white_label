import pg from 'pg';

/**
 * Tagged-template SQL over node-postgres: `await sql\`SELECT ... WHERE id = ${id}\`` returns rows.
 * Interpolated values become bind parameters ($1, $2, ...), never raw SQL.
 * Works against any Postgres (Neon, Railway, local). The pool lets the process exit once idle.
 */
export function createSql(connectionString) {
  const pool = new pg.Pool({ connectionString, max: 2, allowExitOnIdle: true });
  return async function sql(strings, ...values) {
    const text = strings.reduce((query, part, index) => `${query}$${index}${part}`);
    const { rows } = await pool.query(text, values);
    return rows;
  };
}
