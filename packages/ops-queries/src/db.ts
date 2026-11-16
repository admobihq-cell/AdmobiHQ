/**
 * The one thing these queries need from a database: run SQL, get rows back. A `pg` Pool satisfies it,
 * and so does a hand-rolled fake in a test. The package never opens a connection itself, so it has no
 * env loading and no import from any app.
 */
export type Db = {
  query<R extends object = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: R[]; rowCount: number | null }>
}

/** `rowsOf(db)<Row>(sql, params)` runs the query and returns just the rows. */
export const rowsOf =
  (db: Db) =>
  async <T extends object>(sql: string, params: unknown[]): Promise<T[]> =>
    (await db.query<T>(sql, params)).rows

/** SQL sums come back as strings or null; a missing figure is 0. */
export const num = (value: unknown): number => (value == null ? 0 : Number(value))
