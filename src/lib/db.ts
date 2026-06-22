import { neon } from '@neondatabase/serverless'
 
export const sql = neon(process.env.DATABASE_URL!)
 
// מגדיר את ה-user_id לפני כל query (מחליף את auth.uid() של Supabase)
export async function withUser<T>(
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  await sql`SET LOCAL app.current_user_id = ${userId}`
  return fn()
}
 