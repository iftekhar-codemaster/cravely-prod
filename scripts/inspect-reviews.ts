import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};
const db = getFirestore(initializeApp(cfg));

const foods = await getDocs(collection(db, "foods"));
console.log("=== foods ===");
foods.forEach((d) => {
  const v = d.data() as Record<string, unknown>;
  console.log(`id=${d.id} name=${v.name} rating=${v.rating} reviews=${v.reviews}`);
});

const reviews = await getDocs(collection(db, "reviews"));
console.log(`=== reviews (${reviews.size}) ===`);
reviews.forEach((d) => {
  const v = d.data() as Record<string, unknown>;
  console.log(`id=${d.id} foodId=${JSON.stringify(v.foodId)} rating=${v.rating} author=${v.authorName}`);
});
