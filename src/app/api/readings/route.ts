import { NextRequest, NextResponse } from "next/server";

// Array يخزن كل القراءات اللي اتبعتت
let readings: any[] = [];

// POST → يضيف قراءة جديدة
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, temperature, humidity, soilMoisture, light } = body;

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
      timestamp: new Date().toISOString(),
    };

    readings.push(newReading);

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
export async function GET() {
  if (readings.length > 0) {
    return NextResponse.json(readings);
  }

  return NextResponse.json([
    {
      deviceId: "DUMMY_DEVICE",
      temperature: 25,
      humidity: 60,
      soilMoisture: 40,
      light: 300,
      timestamp: new Date().toISOString(),
    },
  ]);
}
