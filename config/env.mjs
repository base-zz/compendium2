import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const schema = z.object({
  VITE_API_BASE: z.string().url(),
  SERVER_PORT: z.number().min(1024).max(49151)
});

export const env = schema.parse(process.env);
