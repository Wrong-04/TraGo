import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBZsq6sj9xpO3hAM0hjGf317Xdt7a_W-gQ",
  authDomain: "trago-ab3e5.firebaseapp.com",
  databaseURL: "https://trago-ab3e5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "trago-ab3e5",
  storageBucket: "trago-ab3e5.firebasestorage.app",
  messagingSenderId: "678197524294",
  appId: "1:678197524294:web:25473011114f9f101c1747"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MOCK_TRIPS = [
  {
    title: 'Đà Nẵng - Hội An',
    startDate: '2024-05-20',
    endDate: '2024-05-24',
    days: 4,
    distance: 378,
    imageUrl: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800',
    createdAt: new Date().toISOString()
  },
  {
    title: 'Sapa - Lào Cai',
    startDate: '2024-05-10',
    endDate: '2024-05-12',
    days: 3,
    distance: 256,
    imageUrl: 'https://images.unsplash.com/photo-1557335200-a65f7f032602?w=800',
    createdAt: new Date().toISOString()
  },
  {
    title: 'Phú Quốc',
    startDate: '2024-04-01',
    endDate: '2024-04-05',
    days: 5,
    distance: 182,
    imageUrl: 'https://images.unsplash.com/photo-1557456170-0cf4f4d0d362?w=800',
    createdAt: new Date().toISOString()
  }
];

async function pushData() {
  console.log("Đang đẩy dữ liệu lên Firestore...");
  const tripsCol = collection(db, 'trips');
  for (const trip of MOCK_TRIPS) {
    try {
      const docRef = await addDoc(tripsCol, trip);
      console.log("Đã thêm trip với ID: ", docRef.id);
    } catch (e) {
      console.error("Lỗi thêm trip: ", e);
    }
  }
  console.log("Hoàn tất!");
  process.exit(0);
}

pushData();
