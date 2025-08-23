
'use server';

import { redirect } from 'next/navigation';
import { diagnosePlant as diagnosePlantFlow } from '@/ai/flows/diagnose-plant';

export async function searchPlant(formData: FormData) {
  const plantName = formData.get('plantName') as string;
  if (plantName && plantName.trim()) {
    redirect(`/connect-device?plantName=${encodeURIComponent(plantName.trim())}`);
  }
}


export async function diagnosePlant(formData: FormData) {
  const photo = formData.get('photo') as File;
  if (!photo) {
    throw new Error('No photo provided');
  }

  // Convert image to data URI
  const buffer = await photo.arrayBuffer();
  const photoDataUri = `data:${photo.type};base64,${Buffer.from(buffer).toString('base64')}`;

  const result = await diagnosePlantFlow({ photoDataUri });
  return result;
}
