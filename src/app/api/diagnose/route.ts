
import { NextResponse, NextRequest } from 'next/server';

const diagnosisStore: Record<string, any[]> = {};

// Handles POST requests to add a new diagnosis.
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
     // Keep only the last 10 diagnoses
    if (diagnosisStore[deviceId].length > 10) {
        diagnosisStore[deviceId].shift();
    }
    
    return NextResponse.json({ success: true, diagnosis }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}

// Handles GET requests to retrieve diagnoses for a device.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get('deviceId');

  if (!deviceId) {
    // If no deviceId is specified, we can return an empty array or an error.
    // Let's return an error to encourage specific queries.
    return NextResponse.json({ error: "Device ID is required in query parameters" }, { status: 400 });
  }

  return NextResponse.json(diagnosisStore[deviceId] || []);
}
