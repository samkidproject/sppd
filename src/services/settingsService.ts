import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { OrganizationSettings } from '../types';

const SETTINGS_COLLECTION = 'settings';

export const settingsService = {
  async getSettings(): Promise<OrganizationSettings | null> {
    if (!auth.currentUser) return null;
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as OrganizationSettings;
      }
      return null;
    } catch (error) {
      console.error('Error fetching settings:', error);
      return null;
    }
  },

  async saveSettings(data: OrganizationSettings): Promise<void> {
    if (!auth.currentUser) throw new Error('User not authenticated');
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, auth.currentUser.uid);
      
      // Sanitize data to remove undefined values
      const sanitizedData = { ...data };
      (Object.keys(sanitizedData) as Array<keyof OrganizationSettings>).forEach(key => {
        if (sanitizedData[key] === undefined) {
          (sanitizedData as any)[key] = '';
        }
      });

      await setDoc(docRef, {
        ...sanitizedData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }
};
