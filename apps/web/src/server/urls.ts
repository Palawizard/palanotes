import type { AppConfig } from './config';

// Absolute public URL of an app path such as `/api/auth/login`, including the base path.
export function appUrl(config: AppConfig, path: string): URL {
  return new URL(`${config.basePath}${path}`, config.publicOrigin);
}
