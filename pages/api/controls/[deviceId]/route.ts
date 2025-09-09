
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This endpoint allows the ESP32 to fetch the latest control states
export async function GET(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  const { deviceId } = params;

  if (!deviceId) {
    return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
  }

  try {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: {
        autoIrrigation: true,
        nightLight: true,
      },
    });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json({
      autoIrrigation: device.autoIrrigation,
      nightLight: device.nightLight,
    });
  } catch (error) {
    console.error(`Error fetching controls for device ${deviceId}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
