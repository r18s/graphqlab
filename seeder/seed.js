import pg from 'pg'
import { fakerPT_BR as faker } from '@faker-js/faker'

const USERS = 100
const MAX_POSTS = 5
const MAX_COMMENTS = 3

faker.seed(42)

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')

async function main() {
  const client = await pool.connect()
  try {
    const { rows } = await client.query('SELECT count(*)::int AS n FROM users')
    if (rows[0].n > 0) {
      if (process.env.SEED_FORCE !== '1') {
        console.log(`Banco já tem ${rows[0].n} usuários, nada a fazer (use SEED_FORCE=1 para semear de novo).`)
        return
      }
      console.log('SEED_FORCE=1: limpando tabelas...')
      await client.query('TRUNCATE users, posts, comments RESTART IDENTITY CASCADE')
    }

    await client.query('BEGIN')

    const users = Array.from({ length: USERS }, (_, i) => {
      const name = faker.person.fullName()
      // sufixo com o índice garante unicidade de username/email
      return { name, username: `${slug(name)}.${i + 1}`, email: `user${i + 1}@graphqlab.dev`, bio: faker.person.bio() }
    })
    const { rows: userRows } = await client.query(
      `INSERT INTO users (name, username, email, bio)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[]) RETURNING id`,
      [users.map((u) => u.name), users.map((u) => u.username), users.map((u) => u.email), users.map((u) => u.bio)],
    )
    const userIds = userRows.map((r) => r.id)

    // 0 a 5 posts por usuário
    const posts = userIds.flatMap((userId) =>
      Array.from({ length: faker.number.int({ min: 0, max: MAX_POSTS }) }, () => ({
        user_id: userId,
        title: faker.lorem.sentence({ min: 3, max: 8 }),
        body: faker.lorem.paragraphs({ min: 1, max: 3 }),
        created_at: faker.date.past({ years: 1 }),
      })),
    )
    const { rows: postRows } = await client.query(
      `INSERT INTO posts (user_id, title, body, created_at)
       SELECT * FROM unnest($1::int[], $2::text[], $3::text[], $4::timestamptz[]) RETURNING id, created_at`,
      [posts.map((p) => p.user_id), posts.map((p) => p.title), posts.map((p) => p.body), posts.map((p) => p.created_at)],
    )

    // 0 a 3 comentários por post, escritos por usuários aleatórios, sempre depois do post
    const comments = postRows.flatMap((post) =>
      Array.from({ length: faker.number.int({ min: 0, max: MAX_COMMENTS }) }, () => ({
        post_id: post.id,
        user_id: faker.helpers.arrayElement(userIds),
        body: faker.lorem.sentences({ min: 1, max: 3 }),
        created_at: faker.date.between({ from: post.created_at, to: new Date() }),
      })),
    )
    if (comments.length) {
      await client.query(
        `INSERT INTO comments (post_id, user_id, body, created_at)
         SELECT * FROM unnest($1::int[], $2::int[], $3::text[], $4::timestamptz[])`,
        [comments.map((c) => c.post_id), comments.map((c) => c.user_id), comments.map((c) => c.body), comments.map((c) => c.created_at)],
      )
    }

    await client.query('COMMIT')
    console.log(`Seed ok: ${userIds.length} usuários, ${postRows.length} posts, ${comments.length} comentários.`)
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
