import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OrganizationSettings } from '../types';

const SETTINGS_COLLECTION = 'settings';
const ORG_DOC_ID = 'org';

export const settingsService = {
  async getSettings(): Promise<OrganizationSettings | null> {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, ORG_DOC_ID);
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
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, ORG_DOC_ID);
      await setDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }
};
