import { NextResponse } from 'next/server';
import { getConfig } from '@/server/config';
import { clearSessionCookie } from '@/server/cookies';
import { appUrl } from '@/server/urls';

export const dynamic = 'force-dynamic';

// POST only, so a link or an image on another site cannot sign the user out.
export function POST(): Response {
  const config = getConfig();
  const response = NextResponse.redirect(appUrl(config, '/signed-out'), 303);
  clearSessionCookie(response, config);
  return response;
}
