import app from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`AR Career Point API running on http://localhost:${config.port}`);
});
