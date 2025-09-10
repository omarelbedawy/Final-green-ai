
import { NextResponse, NextRequest } from 'next/server';
import { diagnosePlant } from '@/ai/flows/diagnose-plant';
import { diagnosisStore } from '../diagnose/route';


/**
 * Handles POST requests from the ESP32 to diagnose a plant from a photo.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const photo = formData.get('photo') as File | null;
    const deviceId = "ESP_CAM_SMARTGREENHOUSE_001"; // Hardcoded for this project

    if (!photo) {
      return NextResponse.json({ error: 'No photo uploaded' }, { status: 400 });
    }

    // Convert the image to a Data URI for the AI model
    const buffer = await photo.arrayBuffer();
    const photoDataUri = `data:${photo.type};base64,${Buffer.from(buffer).toString('base64')}`;

    // Call the AI flow to get the diagnosis
    const diagnosisResult = await diagnosePlant({ photoDataUri });

    // --- Store the result ---
    const storedDiagnosis = {
      deviceId,
      disease: diagnosisResult.disease,
      remedy: diagnosisResult.remedy,
      isHealthy: diagnosisResult.isHealthy,
      photoDataUri: photoDataUri, // Store the image data
      timestamp: new Date().toISOString(),
    };

    if (!diagnosisStore[deviceId]) {
      diagnosisStore[deviceId] = [];
    }
    // Prepend the new diagnosis to the beginning of the array
    diagnosisStore[deviceId].unshift(storedDiagnosis);
    
    // Keep only the last 10 diagnoses to manage memory
    if (diagnosisStore[deviceId].length > 10) {
      diagnosisStore[deviceId] = diagnosisStore[deviceId].slice(0, 10);
    }
    
    // Return the AI's diagnosis to the caller (the ESP32)
    return NextResponse.json(diagnosisResult, { status: 201 });

  } catch (error) {
    console.error('Error during diagnosis:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to diagnose plant.', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred during diagnosis.' }, { status: 500 });
  }
}

/**
 * Handles GET requests to retrieve all diagnoses for a device.
 * This is used by the dashboard.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
        return NextResponse.json({ error: "Device ID is required" }, { status: 400 });
    }

    const diagnoses = diagnosisStore[deviceId] || [];
    
    // Return the latest diagnosis
    if (diagnoses.length > 0) {
        return NextResponse.json(diagnoses[0]);
    }

    return NextResponse.json(null);
}
