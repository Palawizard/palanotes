const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

// For fetch() and plain links to route handlers; <Link> adds the base path itself.
export function apiPath(path: string): string {
  return `${basePath}${path}`;
}
