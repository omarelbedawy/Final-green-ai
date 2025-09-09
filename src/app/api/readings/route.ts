import { NextRequest, NextResponse } from "next/server";

// متغير بسيط في الذاكرة عشان يخزن آخر قراءة
let lastReading: any = null;

// POST → يستقبل قراءات من ESP أو Postman
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      deviceId,
      temperature,
      humidity,
      soilMoisture,
      light,
    } = body;

    if (!deviceId) {
      return NextResponse.json(
        { error: "Device ID is required" },
        { status: 400 }
      );
    }

    // نخزن آخر قراءة في الذاكرة
    lastReading = {
      deviceId,
      temperature,
      humidity,
      soilMoisture,
      light,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(
      { message: "Reading saved successfully", data: lastReading },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving reading:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET → يرجع آخر قراءة محفوظة أو dummy لو مفيش
export async function GET() {
  if (lastReading) {
    return NextResponse.json(lastReading);
  }

  // dummy data لو مفيش قراءات
  return NextResponse.json({
    deviceId: "DUMMY_DEVICE",
    temperature: 25,
    humidity: 60,
    soilMoisture: 40,
    light: 300,
    timestamp: new Date().toISOString(),
  });
}
