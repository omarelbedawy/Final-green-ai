
import { NextResponse, NextRequest } from 'next/server';

let thresholds: Record<string, any> = {};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { deviceId, soilDryThreshold, mq2Threshold, tempThreshold, lightThreshold } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    thresholds[deviceId] = {
      soilDryThreshold,
      mq2Threshold,
      tempThreshold,
      lightThreshold,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, thresholds: thresholds[deviceId] });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
        return NextResponse.json({ error: "Device ID is required" }, { status: 400 });
    }
    
    const deviceThresholds = thresholds[deviceId] || null;
    return NextResponse.json(deviceThresholds);
}
