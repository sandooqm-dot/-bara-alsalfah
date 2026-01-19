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
  increment,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ✅ إعدادات مشروعك (كما ظهرت لك في Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyDQx4gF2qJZMNHWQBeMYsU4fknZHG0WFJ_ckc",
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

// ✅ إنشاء الغرفة إذا ما كانت موجودة (بدون ما نخرب أي بيانات قديمة)
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

// ✅ إضافة لاعب بدون تكرار نفس الاسم (Transaction)
export async function addPlayer(roomId, playerName) {
  const clean = String(playerName || "").trim();
  if (!clean) return;

  const ref = roomRef(roomId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);

    // لو الغرفة غير موجودة: ننشئها + نضيف اللاعب
    if (!snap.exists()) {
      tx.set(ref, {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "lobby",
        players: [{ name: clean, joinedAt: Date.now() }],
        hostStartedAt: null,
        version: 1,
        tick: 1
      });
      return;
    }

    const data = snap.data() || {};
    const players = Array.isArray(data.players) ? data.players : [];

    // تحقق من وجود الاسم مسبقاً
    const exists = players.some(p => String(p?.name || "").trim() === clean);
    if (exists) {
      // بس نحدّث updatedAt/tick عشان يصير فيه تحديث خفيف
      tx.update(ref, {
        updatedAt: serverTimestamp(),
        tick: increment(1)
      });
      return;
    }

    // إضافة لاعب جديد
    tx.update(ref, {
      updatedAt: serverTimestamp(),
      players: [...players, { name: clean, joinedAt: Date.now() }],
      tick: increment(1)
    });
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

/* ✅ (إضافة مطلوبة فقط) تحديث أي حقول للغرفة بدون تكرار الكود في الصفحات
   مثال استخدام لاحقًا:
   updateRoomFields(roomId, { phase: "ready", categoryKey: "eat" })
*/
export async function updateRoomFields(roomId, fields = {}) {
  const ref = await ensureRoom(roomId);
  await updateDoc(ref, {
    updatedAt: serverTimestamp(),
    tick: increment(1),
    ...(fields || {})
  });
}

// ✅ استماع للتحديثات مع تسجيل أي خطأ في الكونسول
export function listenRoom(roomId, cb) {
  const ref = roomRef(roomId);

  return onSnapshot(
    ref,
    (snap) => {
      cb(snap.exists() ? snap.data() : null);
    },
    (err) => {
      console.error("listenRoom error:", err);
      cb(null);
    }
  );
}
