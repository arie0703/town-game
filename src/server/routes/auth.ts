import bcrypt from 'bcryptjs';
import { Hono } from 'hono';
import { ABILITIES, type Abilities } from '../../shared/abilities';
import { ACCOUNT, INITIAL } from '../../shared/config';
import { clearLoginCookie, setLoginCookie, type AuthEnv } from '../auth';
import { db } from '../db';
import { addEvent } from '../events';
import { maxPowers } from '../game/status';

type Credentials = { name: string; password: string };

async function readCredentials(req: Request): Promise<Credentials | null> {
  const body = await req.json().catch(() => null);
  if (typeof body?.name !== 'string' || typeof body?.password !== 'string') return null;
  return { name: body.name.trim(), password: body.password };
}

function randomInt([min, max]: readonly [number, number]): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export const authRoutes = new Hono<AuthEnv>();

authRoutes.post('/register', async (c) => {
  const cred = await readCredentials(c.req.raw);
  if (!cred) return c.json({ error: '名前とパスワードを入力してください' }, 400);
  const { name, password } = cred;

  if ([...name].length < ACCOUNT.nameMinLength || [...name].length > ACCOUNT.nameMaxLength) {
    return c.json({ error: `名前は${ACCOUNT.nameMinLength}〜${ACCOUNT.nameMaxLength}文字で入力してください` }, 400);
  }
  // 制御文字・不可視文字（改行・ゼロ幅スペース等）を含む名前は受け付けない
  if (/\p{C}/u.test(name)) {
    return c.json({ error: '名前に使えない文字が含まれています' }, 400);
  }
  if (password.length < ACCOUNT.passwordMinLength) {
    return c.json({ error: `パスワードは${ACCOUNT.passwordMinLength}文字以上で入力してください` }, 400);
  }
  if (new TextEncoder().encode(password).length > ACCOUNT.passwordMaxBytes) {
    return c.json({ error: 'パスワードが長すぎます' }, 400);
  }

  const exists = await db.selectFrom('users').select('id').where('name', '=', name).executeTakeFirst();
  if (exists) return c.json({ error: 'その名前はすでに使われています' }, 409);

  const abilities = Object.fromEntries(ABILITIES.map((a) => [a.key, INITIAL.ability])) as Abilities;
  const powers = maxPowers(abilities);
  const passwordHash = await bcrypt.hash(password, 10);

  const userId = await db.transaction().execute(async (trx) => {
    const user = await trx
      .insertInto('users')
      .values({
        name,
        password_hash: passwordHash,
        money: INITIAL.money,
        soup_kitchen_count: 0,
        job_id: INITIAL.jobId,
        body_power: powers.body,
        brain_power: powers.brain,
        condition: INITIAL.condition,
        height: randomInt(INITIAL.heightRange),
        weight: randomInt(INITIAL.weightRange),
        hunger: INITIAL.hunger,
        lover_id: null,
        spouse_id: null,
        created_at: new Date().toISOString(),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await trx
      .insertInto('abilities')
      .values({ user_id: user.id, ...abilities })
      .execute();
    await addEvent(trx, user.id, `${name}さんが町に引っ越してきた`);
    return user.id;
  });

  await setLoginCookie(c, userId);
  return c.json({ id: userId, name }, 201);
});

authRoutes.post('/login', async (c) => {
  const cred = await readCredentials(c.req.raw);
  if (!cred) return c.json({ error: '名前とパスワードを入力してください' }, 400);

  const user = await db
    .selectFrom('users')
    .select(['id', 'name', 'password_hash'])
    .where('name', '=', cred.name)
    .executeTakeFirst();
  if (!user || !(await bcrypt.compare(cred.password, user.password_hash))) {
    return c.json({ error: '名前またはパスワードが違います' }, 401);
  }

  await setLoginCookie(c, user.id);
  return c.json({ id: user.id, name: user.name });
});

authRoutes.post('/logout', (c) => {
  clearLoginCookie(c);
  return c.json({ ok: true });
});
