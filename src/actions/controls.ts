'use server';

import { revalidatePath } from 'next/cache';

// نخزن البيانات في ميموري بدل DB
const devices: Record<string, any> = {};

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
    if (!devices[deviceId]) {
      devices[deviceId] = { id: deviceId };
    }
    if (autoIrrigation !== undefined) {
      devices[deviceId].autoIrrigation = autoIrrigation;
    }
    if (nightLight !== undefined) {
      devices[deviceId].nightLight = nightLight;
    }

    revalidatePath(`/api/controls/${deviceId}`);

    return { device: devices[deviceId] };
  } catch (error) {
    console.error('Failed to update device controls:', error);
    return { error: 'Internal server error' };
  }
}
