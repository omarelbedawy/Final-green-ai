import { NextResponse } from 'next/server';

const controls: Record<string, any> = {};

export async function POST(req: Request, { params }: { params: { deviceId: string } }) {
  try {
    const body = await req.json();
    const { autoIrrigation, nightLight } = body;

    controls[params.deviceId] = {
      autoIrrigation,
      nightLight,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, controls: controls[params.deviceId] });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}

export async function GET(_req: Request, { params }: { params: { deviceId: string } }) {
  const data = controls[params.deviceId] || { message: 'No controls set yet' };
  return NextResponse.json(data);
}
