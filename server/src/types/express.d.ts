import type { UserPayload } from './auth.types.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: UserPayload;
  }
}
export {};
