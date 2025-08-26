import { NextRequest, NextResponse } from 'next/server';
import { generatePlantConditions } from '@/ai/flows/generate-plant-conditions';

// This endpoint allows the ESP32 to fetch AI-generated thresholds
// Example: GET /api/thresholds?plantName=Tomato
export async function GET(request: NextRequest) {
  const plantName = request.nextUrl.searchParams.get('plantName');

  if (!plantName) {
    return NextResponse.json({ error: 'plantName query parameter is required' }, { status: 400 });
  }

  try {
    const conditions = await generatePlantConditions({ plantName });
    // Return only the thresholds needed by the ESP32
    return NextResponse.json({
      soilDryThreshold: conditions.soilDryThreshold,
      mq2Threshold: conditions.mq2Threshold,
      tempThreshold: conditions.tempThreshold,
      lightThreshold: conditions.lightThreshold,
    });
  } catch (error) {
    console.error(`Error generating conditions for ${plantName}:`, error);
    return NextResponse.json({ error: 'Failed to generate plant conditions' }, { status: 500 });
  }
}
