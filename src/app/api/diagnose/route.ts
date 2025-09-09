
import { NextResponse, NextRequest } from 'next/server';
import { diagnosePlant } from '@/ai/flows/diagnose-plant';

// In-memory store for diagnosis results.
// In a production app, you would use a database (e.g., Firestore, MongoDB).
const diagnosisStore: Record<string, any[]> = {};

/**
 * Handles POST requests to diagnose a plant from a photo.
 * This endpoint is designed to be called by the ESP32 device.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const photo = formData.get('photo') as File | null;

    if (!photo) {
      return NextResponse.json({ error: 'No photo uploaded' }, { status: 400 });
    }

    // Convert the image to a Data URI for the AI model
    const buffer = await photo.arrayBuffer();
    const photoDataUri = `data:${photo.type};base64,${Buffer.from(buffer).toString('base64')}`;

    // Call the AI flow to get the diagnosis
    const diagnosisResult = await diagnosePlant({ photoDataUri });

    // --- Store the result ---
    const deviceId = "ESP_CAM_SMARTGREENHOUSE_001"; // Hardcoded for this project
    const storedDiagnosis = {
      deviceId,
      disease: diagnosisResult.disease,
      remedy: diagnosisResult.remedy,
      isHealthy: diagnosisResult.isHealthy,
      timestamp: new Date().toISOString(),
    };

    if (!diagnosisStore[deviceId]) {
      diagnosisStore[deviceId] = [];
    }
    diagnosisStore[deviceId].push(storedDiagnosis);
    
    // Keep only the last 10 diagnoses to manage memory
    if (diagnosisStore[deviceId].length > 10) {
      diagnosisStore[deviceId].shift();
    }
    
    // Return the AI's diagnosis to the caller (the ESP32)
    return NextResponse.json(diagnosisResult, { status: 201 });

  } catch (error) {
    console.error('Error during diagnosis:', error);
    return NextResponse.json({ error: 'Failed to diagnose plant.' }, { status: 500 });
  }
}

/**
 * Handles GET requests to retrieve the latest diagnosis for a device.
 * This is called by the dashboard to display the diagnosis status.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get('deviceId');

  if (!deviceId) {
    return NextResponse.json({ error: "Device ID is required in query parameters" }, { status: 400 });
  }

  const diagnoses = diagnosisStore[deviceId] || [];
  
  // Return the latest diagnosis if available
  if (diagnoses.length > 0) {
      return NextResponse.json(diagnoses[diagnoses.length - 1]);
  }

  // Return empty if no diagnosis has been made yet
  return NextResponse.json(null);
}
