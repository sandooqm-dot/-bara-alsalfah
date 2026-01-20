// data/firebase.js
// Firebase (Firestore) setup for "bara-alsalfah-eu" project

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer, // ✅ مهم: قراءة من السيرفر بدون كاش
  updateDoc,
  onSnapshot,
  serverTimestamp,
  increment,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ✅ إعدادات مشروعك الجديد (bara-alsalfah-eu)
const firebaseConfig = {
  apiKey: "AIzaSyDYxoP7QEy3ShH_KOTx19jqj3IbWGTEOd0",
  authDomain: "bara-alsalfah-eu.firebaseapp.com",
  projectId: "bara-alsalfah-eu",
  storageBucket: "bara-alsalfah-eu.firebasestorage.app",
  messagingSenderId: "657928540352",
  appId: "1:657928540352:web:dcf15096ac8501326e9d25",
  measurementId: "G-HKJGX94BJD"
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

// ✅ تحديث حقول الغرفة لأي صفحة مثل categories.html
export async function updateRoomFields(roomId, fields = {}) {
  const ref = await ensureRoom(roomId);

  const cleanFields = {};
  for (const k of Object.keys(fields || {})) {
    if (typeof fields[k] !== "undefined") cleanFields[k] = fields[k];
  }

  await updateDoc(ref, {
    updatedAt: serverTimestamp(),
    tick: increment(1),
    ...cleanFields
  });
}

/**
 * ✅ listenRoom (حل جذري):
 * - Snapshot للسرعة
 * - Polling من السيرفر (getDocFromServer) لكسر الكاش نهائيًا
 * - تفعيل poll عند رجوع التطبيق من الخلف (iOS)
 */
export function listenRoom(roomId, cb) {
  const ref = roomRef(roomId);

  // بدل مقارنة JSON كاملة (قد تسبب مشاكل مع كاش/ترتيب حقول)، نعتمد على tick + navTs
  let lastTick = null;
  let lastNavTs = null;

  const emitIfChanged = (data) => {
    if (!data) { cb(null); return; }

    const t = typeof data.tick === "number" ? data.tick : null;
    const n = typeof data.navTs === "number" ? data.navTs : null;

    // إذا تغيّر tick أو navTs نطلق التحديث
    if (t !== null && t === lastTick && n === lastNavTs) return;

    lastTick = t;
    lastNavTs = n;
    cb(data);
  };

  // Snapshot
  const unsub = onSnapshot(
    ref,
    { includeMetadataChanges: true },
    (snap) => {
      emitIfChanged(snap.exists() ? snap.data() : null);
    },
    (err) => {
      console.error("listenRoom error:", err);
      cb(null);
    }
  );

  // ✅ Polling من السيرفر (بدون كاش)
  let stopped = false;

  const pollFromServer = async () => {
    if (stopped) return;
    try {
      const snap = await getDocFromServer(ref);
      emitIfChanged(snap.exists() ? snap.data() : null);
    } catch (e) {
      // لو فشل السيرفر لأي سبب، نجرب كاش كخطة أخيرة
      try {
        const snap2 = await getDoc(ref);
        emitIfChanged(snap2.exists() ? snap2.data() : null);
      } catch (e2) {
        console.error("listenRoom poll error:", e2);
      }
    }
  };

  // مرة مباشرة + كل 700ms (أسرع عشان انتقال الصفحات ما يتأخر)
  pollFromServer();
  const pollId = setInterval(pollFromServer, 700);

  // ✅ iOS: إذا رجع التطبيق من الخلف، نسوي Poll فورًا
  const onVis = () => {
    if (document.visibilityState === "visible") pollFromServer();
  };
  document.addEventListener("visibilitychange", onVis);

  return () => {
    stopped = true;
    clearInterval(pollId);
    document.removeEventListener("visibilitychange", onVis);
    try { unsub(); } catch (e) {}
  };
}
