import { NextResponse } from 'next/server';

let thresholds: Record<string, any> = {};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { deviceId, minTemp, maxTemp, minHumidity, maxHumidity } = body;

    thresholds[deviceId] = {
      minTemp,
      maxTemp,
      minHumidity,
      maxHumidity,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, thresholds: thresholds[deviceId] });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json(thresholds);
}
