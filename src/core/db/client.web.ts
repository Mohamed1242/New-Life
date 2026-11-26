export async function getDatabase(): Promise<never> {
  throw new Error("SQLite native database is not used on web");
}
