import { sql, type SQLWrapper } from 'drizzle-orm';
import { normalizeEmail } from './email-compare';

export function lowerEmailEquals(column: SQLWrapper, email: string) {
  return sql`lower(${column}) = ${normalizeEmail(email)}`;
}
