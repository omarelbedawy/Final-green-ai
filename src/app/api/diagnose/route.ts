
import { NextResponse } from 'next/server';

let diagnoses: any[] = [];

// In-memory storage for diagnoses
const diagnosisStore: Record<string, any[]> = {};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { deviceId, issue, recommendation } = body;

    if (!deviceId) {
        return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    const diagnosis = {
      deviceId,
      issue,
      recommendation,
      timestamp: new Date().toISOString(),
    };

    if (!diagnosisStore[deviceId]) {
      diagnosisStore[deviceId] = [];
    }
    diagnosisStore[deviceId].push(diagnosis);
    
    // For simplicity, we can also keep a flat list if needed elsewhere
    diagnoses.push(diagnosis);

    return NextResponse.json({ success: true, diagnosis }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get('deviceId');

  if (deviceId) {
    return NextResponse.json(diagnosisStore[deviceId] || []);
  }

  // Return all diagnoses if no deviceId is specified
  return NextResponse.json(diagnoses);
}
