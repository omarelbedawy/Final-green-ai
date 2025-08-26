
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateDeviceControls({
  deviceId,
  autoIrrigation,
  nightLight,
}: {
  deviceId: string;
  autoIrrigation?: boolean;
  nightLight?: boolean;
}) {
  try {
    const dataToUpdate: { autoIrrigation?: boolean; nightLight?: boolean } = {};
    if (autoIrrigation !== undefined) {
      dataToUpdate.autoIrrigation = autoIrrigation;
    }
    if (nightLight !== undefined) {
      dataToUpdate.nightLight = nightLight;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return { error: 'No control values provided' };
    }

    const device = await prisma.device.upsert({
      where: { id: deviceId },
      update: dataToUpdate,
      create: {
        id: deviceId,
        ...dataToUpdate,
      },
    });

    // Revalidate the path to ensure the API route provides fresh data
    revalidatePath(`/api/controls/${deviceId}`);

    return { device };
  } catch (error) {
    console.error('Failed to update device controls:', error);
    return { error: 'Internal server error' };
  }
}
