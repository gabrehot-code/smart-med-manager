import sql from '../lib/db'

export default async function handler(req, res) {
  // שליפת נתונים
  const users = await sql`SELECT * FROM users`
  res.json(users)

  // הכנסת נתונים
  await sql`
    INSERT INTO users (name, email) 
    VALUES (${req.body.name}, ${req.body.email})
  `
}