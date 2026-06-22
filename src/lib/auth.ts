import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sql } from './db'
 
const JWT_SECRET = process.env.JWT_SECRET!  // שמור ב-.env
 
// --- הרשמה ---
export async function register(email: string, password: string, fullName: string) {
  const hash = await bcrypt.hash(password, 12)
 
  // 1. צור user
  const [user] = await sql`
    INSERT INTO public.users (email, password_hash)
    VALUES (${email.toLowerCase()}, ${hash})
    RETURNING id, email
  `
 
  // 2. צור profile (מחליף את ה-trigger של Supabase)
  await sql`
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (${user.id}, ${fullName}, ${email.toLowerCase()})
  `
 
  return signToken(user.id)
}
 
// --- התחברות ---
export async function login(email: string, password: string) {
  const [user] = await sql`
    SELECT id, password_hash FROM public.users
    WHERE email = ${email.toLowerCase()}
  `
 
  if (!user) throw new Error('משתמש לא נמצא')
 
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) throw new Error('סיסמה שגויה')
 
  return signToken(user.id)
}
 
// --- JWT ---
function signToken(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '30d' })
}
 
export function verifyToken(token: string): string {
  const payload = jwt.verify(token, JWT_SECRET) as { sub: string }
  return payload.sub  // userId
}
 