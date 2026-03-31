import { config } from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const data: Record<string, string> = {
  baegilmi: 'Koshihikarimutant(EMS)',
  jopyeong: 'HR16683-46-3/HR18129-13-16',
  jungmo1024: 'Namil-SA mutant',
  pyeongwon: 'Jinbu19/Samjiyeon4',
  namil: 'Ilpumbyeo/Namyang7',
  chamdongjin: 'Sindongjin*2/HR27195-59-3-5-5',
  saeilmi: 'Ilmibyeo*5/Hwayeongbyeo',
  chindeul: 'HR22538-GHB-36-4/Iksan471',
  namchan: 'Nikomaru/Saenuri',
  samgwang: 'Suweon361/Milyang101',
  hyeonpum: 'Iksan469//Sindongjin/Musashino7',
};

async function main() {
  for (const [id, crossInfo] of Object.entries(data)) {
    await updateDoc(doc(db, 'cultivars', id), { crossInformation: crossInfo });
    console.log(`Updated ${id}: ${crossInfo}`);
  }
  console.log('Done');
}

main().catch(console.error);
