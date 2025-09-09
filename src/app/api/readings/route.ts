import { NextResponse } from 'next/server';

let readings: any[] = [];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { deviceId, temperature, humidity, soilMoisture, light } = body;

    const reading = {
      deviceId,
      temperature,
      humidity,
      soilMoisture,
      light,
      timestamp: new Date().toISOString(),
    };

    readings.push(reading);

    return NextResponse.json({ success: true, reading });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json(readings);
}
