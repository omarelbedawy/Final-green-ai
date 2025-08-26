import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This endpoint allows the ESP32 to post its sensor readings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      deviceId, 
      temperature, 
      humidity, 
      soilMoisture, 
      lightLevel,
      pumpState,
      fanState,
      growLedState
    } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    const reading = await prisma.reading.create({
      data: {
        deviceId,
        temperature,
        humidity,
        soilMoisture,
        lightLevel,
        pumpState,
        fanState,
        growLedState,
      },
    });

    return NextResponse.json(reading, { status: 201 });
  } catch (error) {
    console.error('Error saving sensor data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
