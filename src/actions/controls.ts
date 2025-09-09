'use server';

import { revalidatePath } from 'next/cache';

// تخزين مؤقت لكل الأجهزة
const devices: Record<string, { autoIrrigation?: boolean; nightLight?: boolean }> = {};

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

    // لو الجهاز مش موجود، نضيفه
    if (!devices[deviceId]) {
      devices[deviceId] = {};
    }

    // نحدث القيم
    devices[deviceId] = {
      ...devices[deviceId],
      ...dataToUpdate,
    };

    // Revalidate للـ API route
    revalidatePath(`/api/controls/${deviceId}`);

    return { device: { id: deviceId, ...devices[deviceId] } };
  } catch (error) {
    console.error('Failed to update device controls:', error);
    return { error: 'Internal server error' };
  }
}
