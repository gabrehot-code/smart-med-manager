import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '../../../middleware/auth'
import { sql } from '../../../lib/db'
 
export async function GET(req: NextRequest) {
  return withAuth(req, async (userId) => {
    // RLS פועל כי SET LOCAL כבר הופעל ב-withAuth
    const patients = await sql`
      SELECT * FROM public.patients ORDER BY created_at DESC
    `
    return NextResponse.json(patients)
  })
}
 
export async function POST(req: NextRequest) {
  return withAuth(req, async (userId) => {
    const { fullName, possessiveNick, birthDate } = await req.json()
 
    const [patient] = await sql`
      INSERT INTO public.patients (caregiver_id, full_name, possessive_nick, birth_date)
      VALUES (${userId}, ${fullName}, ${possessiveNick}, ${birthDate})
      RETURNING *
    `
    return NextResponse.json(patient, { status: 201 })
  })
}
 