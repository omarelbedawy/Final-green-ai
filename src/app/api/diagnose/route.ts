import { NextRequest, NextResponse } from 'next/server';

// تخزين مؤقت للتشخيصات
const diagnoses: any[] = [];

export async function POST(request: NextRequest) {
  const deviceId = request.headers.get('X-Device-Id');
  if (!deviceId) {
    return NextResponse.json({ error: 'X-Device-Id header is required' }, { status: 400 });
  }

  try {
    const blob = await request.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    const photoDataUri = `data:${blob.type};base64,${buffer.toString('base64')}`;

    const diagnosis = {
      deviceId,
      isHealthy: true,
      disease: null,
      remedy: null,
      imageUrl: photoDataUri,
      createdAt: new Date(),
    };

    diagnoses.push(diagnosis);

    return NextResponse.json(diagnosis, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(diagnoses);
}
