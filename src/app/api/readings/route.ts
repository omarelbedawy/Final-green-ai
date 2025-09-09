
import { NextRequest, NextResponse } from "next/server";

// Array يخزن كل القراءات اللي اتبعتت
const readings: any[] = [];
const readingsByDevice: Record<string, any[]> = {};


// POST → يضيف قراءة جديدة
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, temperature, humidity, soilMoisture, light, mq2, pumpState, fanState, growLedState } = body;

    if (!deviceId) {
      return NextResponse.json(
        { error: "Device ID is required" },
        { status: 400 }
      );
    }

    const newReading = {
      deviceId,
      temperature,
      humidity,
      soilMoisture,
      light,
      mq2,
      pumpState,
      fanState,
      growLedState,
      timestamp: new Date().toISOString(),
    };
    
    // Store in flat array
    readings.push(newReading);

    // Store by device ID
    if (!readingsByDevice[deviceId]) {
        readingsByDevice[deviceId] = [];
    }
    readingsByDevice[deviceId].push(newReading);


    return NextResponse.json(
      { message: "Reading saved successfully", data: newReading },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving reading:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET → يرجع كل القراءات أو dummy لو مفيش
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');

  if (deviceId) {
      const deviceReadings = readingsByDevice[deviceId] || [];
       if (deviceReadings.length > 0) {
        return NextResponse.json(deviceReadings);
      }
  } else {
    if (readings.length > 0) {
      return NextResponse.json(readings);
    }
  }

  // Return dummy data only if no readings for the specific device or no readings at all exist
  return NextResponse.json([
    {
      deviceId: deviceId || "DUMMY_DEVICE",
      temperature: 25,
      humidity: 60,
      soilMoisture: 40,
      light: 300,
      mq2: 150,
      pumpState: "OFF",
      fanState: "OFF",
      growLedState: "ON",
      timestamp: new Date().toISOString(),
    },
  ]);
}
