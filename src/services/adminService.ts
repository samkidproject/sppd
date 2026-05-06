import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  Timestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AllowedUser, MASTER_ADMIN } from '../types';

export const adminService = {
  async getAllowedUsers(): Promise<AllowedUser[]> {
    const q = query(collection(db, 'allowed_users'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AllowedUser[];
  },

  async addAllowedUser(email: string): Promise<void> {
    const cleanEmail = email.toLowerCase().trim();
    await setDoc(doc(db, 'allowed_users', cleanEmail), {
      email: cleanEmail,
      addedAt: new Date().toISOString()
    });
  },

  async removeAllowedUser(id: string): Promise<void> {
    await deleteDoc(doc(db, 'allowed_users', id));
  },

  async isAllowed(email: string | null | undefined): Promise<boolean> {
    if (!email) return false;
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail === MASTER_ADMIN.toLowerCase()) return true;

    try {
      const docRef = doc(db, 'allowed_users', cleanEmail);
      const snapshot = await getDoc(docRef);
      return snapshot.exists();
    } catch (e) {
      console.error('Permission check error:', e);
      return false;
    }
  }
};
