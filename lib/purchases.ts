import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const UNLOCKED_KEY = 'statuteiq_unlocked';
const PRODUCT_ID = 'com.vorotech.statuteiq.unlock';

let iapModule: typeof import('expo-in-app-purchases') | null = null;

async function getIAP() {
  if (Platform.OS === 'web') return null;
  if (!iapModule) {
    try {
      iapModule = await import('expo-in-app-purchases');
    } catch {
      iapModule = null;
    }
  }
  return iapModule;
}

export async function initPurchases(): Promise<void> {
  const iap = await getIAP();
  if (!iap) return;
  try {
    await iap.connectAsync();
  } catch {
    // Not available in simulator/Expo Go — ignore
  }
}

export async function checkUnlocked(): Promise<boolean> {
  const val = await AsyncStorage.getItem(UNLOCKED_KEY);
  return val === 'true';
}

export async function purchaseUnlock(): Promise<boolean> {
  const iap = await getIAP();
  if (!iap) {
    // Dev fallback: auto-unlock in simulator
    await AsyncStorage.setItem(UNLOCKED_KEY, 'true');
    return true;
  }
  try {
    await iap.purchaseItemAsync(PRODUCT_ID);
    await AsyncStorage.setItem(UNLOCKED_KEY, 'true');
    return true;
  } catch {
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  const iap = await getIAP();
  if (!iap) return false;
  try {
    const { responseCode, results } = await iap.getPurchaseHistoryAsync();
    const IAPResponseCode = iap.IAPResponseCode;
    if (responseCode === IAPResponseCode.OK && results && results.length > 0) {
      const hasUnlock = results.some((r: { productId: string }) => r.productId === PRODUCT_ID);
      if (hasUnlock) {
        await AsyncStorage.setItem(UNLOCKED_KEY, 'true');
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
