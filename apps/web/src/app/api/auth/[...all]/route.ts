import { NextResponse } from 'next/server';

const disabled = NextResponse.json(
  { error: 'Platform account auth is disabled' },
  { status: 503 }
);

export async function GET() {
  return disabled;
}

export async function POST() {
  return disabled;
}
