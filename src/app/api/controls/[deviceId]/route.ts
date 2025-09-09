import { NextRequest, NextResponse } from 'next/server';

// تخزين مؤقت للتحكمات
const deviceControls: Record<string, { autoIrrigation: boolean; nightLight: boolean }> = {};

export async function GET(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  const { deviceId } = params;

  if (!deviceId) {
    return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
  }

  // لو الجهاز مش موجود، نحطله قيم افتراضية
  if (!deviceControls[deviceId]) {
    deviceControls[deviceId] = { autoIrrigation: true, nightLight: false };
  }

  return NextResponse.json(deviceControls[deviceId]);
}
