import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This endpoint allows the ESP32 to post its sensor readings
export async function POST(request: NextRequest) {
  // API Key Authentication
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.ESP_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
      growLedState,
      mq2
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
        gas: mq2, // Ensure your schema uses 'gas'
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
