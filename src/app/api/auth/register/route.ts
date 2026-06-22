import { NextRequest, NextResponse } from 'next/server'
import { register } from '../../../../lib/auth'
 
export async function POST(req: NextRequest) {
  const { email, password, fullName } = await req.json()
 
  if (!email || !password) {
    return NextResponse.json({ error: 'שדות חסרים' }, { status: 400 })
  }
 
  try {
    const token = await register(email, password, fullName)
    return NextResponse.json({ token })
  } catch (err: any) {
    if (err.message?.includes('unique')) {
      return NextResponse.json({ error: 'אימייל כבר קיים' }, { status: 409 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
 