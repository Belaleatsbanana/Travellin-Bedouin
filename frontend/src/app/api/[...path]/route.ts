import { NextRequest, NextResponse } from 'next/server';

// Read at server startup from the live container environment — not baked at build time.
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

async function proxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const target = `${BACKEND_URL}/api/${path}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');

  const init: RequestInit = { method: req.method, headers };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    (init as Record<string, unknown>).duplex = 'half';
    init.body = req.body;
  }

  try {
    const res = await fetch(target, init);
    return new NextResponse(res.body, {
      status: res.status,
      headers: new Headers(res.headers),
    });
  } catch (err) {
    console.error(`[proxy] failed to reach ${target}:`, err);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}

export const dynamic = 'force-dynamic';

export const GET    = (req: NextRequest, ctx: { params: { path: string[] } }) => proxy(req, ctx);
export const POST   = (req: NextRequest, ctx: { params: { path: string[] } }) => proxy(req, ctx);
export const PUT    = (req: NextRequest, ctx: { params: { path: string[] } }) => proxy(req, ctx);
export const PATCH  = (req: NextRequest, ctx: { params: { path: string[] } }) => proxy(req, ctx);
export const DELETE = (req: NextRequest, ctx: { params: { path: string[] } }) => proxy(req, ctx);
