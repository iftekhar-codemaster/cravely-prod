// One-off migration: replace legacy stories docs with restaurant-linked ones.
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const NEW = [
  { id: "story-kacchi-bhai", restaurantId: "kacchi-bhai", name: "Kacchi Bhai", image: "https://loremflickr.com/400/700/kacchi?lock=301", caption: "Today's kacchi — slow cooked since dawn." },
  { id: "story-chillox", restaurantId: "chillox", name: "Chillox", image: "https://loremflickr.com/400/700/burger?lock=302", caption: "Fresh patties dropping at 6 PM." },
  { id: "story-sultans-dine", restaurantId: "sultans-dine", name: "Sultans Dine", image: "https://loremflickr.com/400/700/biriyani?lock=303", caption: "Jali kabab restocked." },
  { id: "story-star-kabab", restaurantId: "star-kabab", name: "Star Kabab", image: "https://loremflickr.com/400/700/kebab?lock=305", caption: "Charcoal grill is lit." },
];

const snap = await getDocs(collection(db, "stories"));
for (const d of snap.docs) await deleteDoc(d.ref);
console.log(`Deleted ${snap.size} legacy story doc(s)`);

for (const { id, ...data } of NEW) {
  await setDoc(doc(db, "stories", id), data);
}
console.log(`Wrote ${NEW.length} new story doc(s)`);
process.exit(0);
