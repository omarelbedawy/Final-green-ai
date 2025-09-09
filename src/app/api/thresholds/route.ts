import { NextRequest, NextResponse } from 'next/server';

// قيم افتراضية للـ thresholds
export async function GET(request: NextRequest) {
  const plantName = request.nextUrl.searchParams.get('plantName');

  if (!plantName) {
    return NextResponse.json({ error: 'plantName query parameter is required' }, { status: 400 });
  }

  return NextResponse.json({
    soilDryThreshold: 400,
    mq2Threshold: 200,
    tempThreshold: 30,
    lightThreshold: 300,
  });
}
