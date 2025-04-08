import type { BunRequest } from 'bun';

// Extend the BunRequest type to include params
declare module 'bun' {
  interface BunRequest<T extends string = string> extends Request {
    params: Record<T, string>;
  }
}
