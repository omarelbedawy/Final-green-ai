import { NextRequest, NextResponse } from 'next/server';
import { diagnosePlant } from '@/ai/flows/diagnose-plant';
import { prisma } from '@/lib/prisma';

// This endpoint allows the ESP32 to upload an image for diagnosis
export async function POST(request: NextRequest) {
  // API Key Authentication
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.ESP_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const deviceId = request.headers.get('X-Device-Id');
  if (!deviceId) {
    return NextResponse.json({ error: 'X-Device-Id header is required' }, { status: 400 });
  }

  try {
    const blob = await request.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    const photoDataUri = `data:${blob.type};base64,${buffer.toString('base64')}`;

    // Call the AI flow
    const diagnosisResult = await diagnosePlant({ photoDataUri });

    // Save diagnosis to the database
    const diagnosis = await prisma.diagnosis.create({
      data: {
        deviceId,
        isHealthy: diagnosisResult.isHealthy,
        disease: diagnosisResult.disease,
        remedy: diagnosisResult.remedy,
        imageUrl: photoDataUri, // Optionally save the image URI
      },
    });

    return NextResponse.json(diagnosis, { status: 201 });
  } catch (error) {
    console.error('Error during image diagnosis:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
