import { NextResponse } from 'next/server';

let diagnoses: any[] = [];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { deviceId, issue, recommendation } = body;

    const diagnosis = {
      deviceId,
      issue,
      recommendation,
      timestamp: new Date().toISOString(),
    };

    diagnoses.push(diagnosis);

    return NextResponse.json({ success: true, diagnosis });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json(diagnoses);
}
