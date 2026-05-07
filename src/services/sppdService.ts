import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  runTransaction,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { SPPDData } from '../types';
import { toRoman } from '../lib/utils';

const SPPD_COLLECTION = 'sppd';
const COUNTER_COLLECTION = 'counters';
const COUNTER_DOC_ID = 'sppd_counter';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  
  // Extract index creation URL if present
  const indexUrlMatch = message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
  const indexUrl = indexUrlMatch ? indexUrlMatch[0] : null;

  if (message.includes('index') || message.includes('composite') || indexUrl) {
    console.error('--- FIREBASE INDEX REQUIRED ---');
    console.error('A composite index is needed for this query.');
    if (indexUrl) {
      console.error('CREATE INDEX HERE:', indexUrl);
    } else {
      console.error('Check your browser console for a direct link to create the required index.');
    }
    console.error('-------------------------------');
  }

  const errInfo = {
    error: message,
    indexUrl: indexUrl,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const sppdService = {
  async getNextNomorSppd(): Promise<string> {
    if (!auth.currentUser) return '';
    try {
      // Use user-specific counter document
      const counterRef = doc(db, COUNTER_COLLECTION, `counter_${auth.currentUser.uid}`);
      const nextValue = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let newValue = 1;
        if (counterDoc.exists()) {
          newValue = counterDoc.data().currentValue + 1;
        }
        transaction.set(counterRef, { currentValue: newValue });
        return newValue;
      });

      const now = new Date();
      const month = toRoman(now.getMonth() + 1);
      const year = now.getFullYear();
      const paddedCount = nextValue.toString().padStart(3, '0');
      
      return `090/SPPD/${month}/${year}/${paddedCount}`;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COUNTER_COLLECTION);
      return '';
    }
  },

  async saveSPPD(data: Partial<SPPDData>, pdfBlob: Blob, providedId: string, nomorSppd: string): Promise<string> {
    if (!auth.currentUser) throw new Error('User not authenticated');

    try {
      // 1. Convert Blob to Base64 (Data URL) - Stores inside Firestore to avoid Storage CORS
      const reader = new FileReader();
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      // 2. Save to Firestore
      const sppdRef = doc(db, SPPD_COLLECTION, providedId);
      
      // Sanitize data to remove undefined values which Firestore doesn't support
      const sanitizedData = { ...data };
      Object.keys(sanitizedData).forEach(key => {
        if (sanitizedData[key as keyof typeof sanitizedData] === undefined) {
          (sanitizedData as any)[key] = '';
        }
      });

      const sppdData = {
        ...sanitizedData,
        id: providedId,
        nomorSppd,
        pdfUrl: pdfBase64,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      };

      await setDoc(sppdRef, sppdData);
      return providedId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, SPPD_COLLECTION);
      return '';
    }
  },

  async getAllSPPD(): Promise<SPPDData[]> {
    if (!auth.currentUser) return [];
    
    try {
      const q = query(
        collection(db, SPPD_COLLECTION),
        where('createdBy', '==', auth.currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          timestamp: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString()
        } as SPPDData;
      });

      // Sort in-memory to avoid composite index requirement
      return results.sort((a, b) => {
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
        return timeB - timeA; // Descending
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, SPPD_COLLECTION);
      return [];
    }
  },

  async deleteSPPD(id: string): Promise<void> {
    if (!id) return;
    try {
      await deleteDoc(doc(db, SPPD_COLLECTION, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${SPPD_COLLECTION}/${id}`);
    }
  }
};
