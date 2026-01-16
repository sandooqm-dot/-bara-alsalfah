// data/firebase.js
// Firebase (Firestore) setup for "bara-alsalfah" project

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  increment
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ✅ إعدادات مشروعك (كما ظهرت لك في Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyDQx4gJZMHNWQBeMYsU4fknZHG0WFJ_ckc",
  authDomain: "bara-alsalfah.firebaseapp.com",
  projectId: "bara-alsalfah",
  storageBucket: "bara-alsalfah.firebasestorage.app",
  messagingSenderId: "658748312832",
  appId: "1:658748312832:web:3e0c970ba54bb25c0437e5",
  measurementId: "G-82ZV2RDDDP"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// -------- Helpers --------
export function roomRef(roomId) {
  return doc(db, "rooms", String(roomId));
}

export async function ensureRoom(roomId) {
  const ref = roomRef(roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: "lobby",          // lobby | playing
      players: [],              // [{name, joinedAt}]
      hostStartedAt: null,
      version: 1,
      tick: 0
    });
  }
  return ref;
}

export async function addPlayer(roomId, playerName) {
  const ref = await ensureRoom(roomId);
  const clean = String(playerName || "").trim();
  if (!clean) return;

  // نخزن كـ object عشان مستقبلًا نقدر نضيف خصائص
  await updateDoc(ref, {
    updatedAt: serverTimestamp(),
    players: arrayUnion({ name: clean, joinedAt: Date.now() }),
    tick: increment(1)
  });
}

export async function setRoomStatus(roomId, status) {
  const ref = await ensureRoom(roomId);
  await updateDoc(ref, {
    updatedAt: serverTimestamp(),
    status: status,
    tick: increment(1),
    hostStartedAt: status === "playing" ? Date.now() : null
  });
}

export function listenRoom(roomId, cb) {
  const ref = roomRef(roomId);
  return onSnapshot(ref, (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });
}
