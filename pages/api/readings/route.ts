import { NextRequest, NextResponse } from 'next/server';

// تخزين القراءات
const readings: any[] = [];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { deviceId, temperature, humidity, soilMoisture, lightLevel, pumpState, fanState, growLedState, mq2 } = body;

  if (!deviceId) {
    return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
  }

  const reading = {
    deviceId,
    temperature,
    humidity,
    soilMoisture,
    lightLevel,
    gas: mq2,
    pumpState,
    fanState,
    growLedState,
    createdAt: new Date(),
  };

  readings.push(reading);

  return NextResponse.json(reading, { status: 201 });
}

// عشان تجيب القراءات كلها
export async function GET() {
  return NextResponse.json(readings);
}
