import 'dotenv/config';
import { createApp } from './app';
import { getServerPort } from './utils/env';

const port = getServerPort();
const app = createApp();

app.listen(port, '0.0.0.0', () => {
  console.log(`Invisible Map API running on http://0.0.0.0:${port}`);
});
