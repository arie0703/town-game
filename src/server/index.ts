import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { csrf } from 'hono/csrf';
import { HTTPException } from 'hono/http-exception';
import { db, initDb } from './db';
import { awardTitlesForAll } from './game/titles';
import { GameError } from './game/errors';
import { actionRoutes } from './routes/actions';
import { authRoutes } from './routes/auth';
import { bankRoutes } from './routes/bank';
import { battleRoutes } from './routes/battle';
import { itemRoutes } from './routes/items';
import { mapRoutes } from './routes/map';
import { meRoutes } from './routes/me';
import { realestateRoutes } from './routes/realestate';
import { residentRoutes } from './routes/residents';
import { townhallRoutes } from './routes/townhall';
import { hideoutRoutes } from './routes/hideout';
import { travelRoutes } from './routes/travel';
import { trainingRoutes } from './routes/training';

const app = new Hono().basePath('/api');

app.use(csrf());
app.use(bodyLimit({ maxSize: 16 * 1024, onError: (c) => c.json({ error: 'リクエストが大きすぎます' }, 413) }));

app.get('/health', (c) => c.json({ status: 'ok' }));
app.route('/', authRoutes);
app.route('/', meRoutes);
app.route('/', mapRoutes);
app.route('/', actionRoutes);
app.route('/', trainingRoutes);
app.route('/', itemRoutes);
app.route('/', battleRoutes);
app.route('/', realestateRoutes);
app.route('/', residentRoutes);
app.route('/', townhallRoutes);
app.route('/', hideoutRoutes);
app.route('/', travelRoutes);
app.route('/', bankRoutes);

app.onError((err, c) => {
  if (err instanceof GameError) return c.json({ error: err.message }, 400);
  if (err instanceof HTTPException) return err.getResponse();
  console.error(err);
  return c.json({ error: 'サーバーエラーが発生しました' }, 500);
});

await initDb();
await awardTitlesForAll(db);

const port = Number(process.env.API_PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API server listening on http://localhost:${info.port}`);
});
