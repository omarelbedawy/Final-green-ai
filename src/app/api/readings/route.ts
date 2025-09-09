
import { NextRequest, NextResponse } from "next/server";

const readingsByDevice: Record<string, any[]> = {};

// Handles POST requests to add a new sensor reading.
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

    if (!readingsByDevice[deviceId]) {
      readingsByDevice[deviceId] = [];
    }
    // Keep only the last 20 readings for each device to avoid memory issues
    readingsByDevice[deviceId].push(newReading);
    if (readingsByDevice[deviceId].length > 20) {
        readingsByDevice[deviceId].shift();
    }

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

// Handles GET requests to retrieve sensor readings for a device.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');

  if (!deviceId) {
    return NextResponse.json({ error: "Device ID is required in query parameters" }, { status: 400 });
  }

  const deviceReadings = readingsByDevice[deviceId] || [];
  
  if (deviceReadings.length > 0) {
    // Return all readings for the device if they exist
    return NextResponse.json(deviceReadings);
  }

  // If no readings for the specific device exist yet, return an empty array.
  // The frontend will show a "waiting for data" state.
  return NextResponse.json([]);
}

