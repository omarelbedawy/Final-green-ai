import { NextResponse, NextRequest } from 'next/server';

// In-memory store for diagnosis results.
// In a production app, you would use a database (e.g., Firestore, MongoDB).
const diagnosisStore: Record<string, any[]> = {};

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
