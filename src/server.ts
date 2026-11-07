import app from './app';
import { config } from './config';

app.listen(config.port, '0.0.0.0', () => {
  console.log(`AR Career Point API running on port ${config.port} (0.0.0.0)`);
});
