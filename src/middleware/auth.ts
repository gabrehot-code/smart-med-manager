import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '../lib/auth'
import { sql } from '../lib/db'
 
export async function withAuth(
  req: NextRequest,
  handler: (userId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
 
  if (!token) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }
 
  try {
    const userId = verifyToken(token)
 
    // חיוני! מגדיר את ה-user_id לפני הרצת queries עם RLS
    await sql`SET LOCAL app.current_user_id = ${userId}`
 
    return handler(userId)
  } catch {
    return NextResponse.json({ error: 'טוקן לא תקין' }, { status: 401 })
  }
}
 