// data/firebase.js
// Firebase (Firestore) setup for "bara-alsalfah" project
// ✅ نسخة تشخيص + تنبيه واضح عند مشكلة الصلاحيات

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

// ===== تشخيص / تنبيه =====
function _onceAlert(msg) {
  try{
    if (typeof window === "undefined") return;
    if (window.__BARA_FB_ALERTED) return;
    window.__BARA_FB_ALERTED = true;
    alert(msg);
  }catch(e){}
}

function _errCode(e){
  return (e && (e.code || e.name)) ? String(e.code || e.name) : "unknown";
}

function _friendlyMessage(e){
  const code = _errCode(e);

  if(code.includes("permission-denied")){
    return "مشكلة صلاحيات Firestore (permission-denied).\n\nالحل من Firebase Console > Firestore > Rules.\nلازم تخلي القراءة/الكتابة مسموحة (مؤقتًا للاختبار) ثم نرجع نقفلها بقواعد آمنة.";
  }

  if(code.includes("failed-precondition")){
    return "Firestore غالبًا غير مفعّل أو يحتاج إعداد.\n\nادخل Firebase Console > Firestore Database وسوّ Create database (Test mode مؤقتًا).";
  }

  if(code.includes("unavailable") || code.includes("network")){
    return "مشكلة اتصال مؤقتة (network/unavailable).\nجرّب تحديث الصفحة أو تغيير الشبكة.";
  }

  return "صار خطأ في Firebase/Firestore.\nالكود: " + code;
}

function _throwWithCode(e, where){
  try{
    if (typeof window !== "undefined") {
      window.__BARA_LAST_FB_ERROR = {
        where,
        code: _errCode(e),
        message: String(e?.message || "")
      };
    }
  }catch(_){}

  const msg = _friendlyMessage(e);
  const code = _errCode(e);

  // تنبيه واضح فقط في أخطاء الإعدادات
  if(code.includes("permission-denied") || code.includes("failed-precondition")){
    _onceAlert(msg);
  }

  const err = new Error(msg);
  err.code = code;
  err.original = e;
  throw err;
}

// -------- Helpers --------
export function roomRef(roomId) {
  return doc(db, "rooms", String(roomId));
}

export async function ensureRoom(roomId) {
  const ref = roomRef(roomId);

  // ✅ نجرّب قراءة الوثيقة أولاً
  let snap;
  try{
    snap = await getDoc(ref);
  }catch(e){
    console.error("ensureRoom:getDoc error", e);
    _throwWithCode(e, "ensureRoom:getDoc");
  }

  // ✅ إذا غير موجودة ننشئها
  if (!snap.exists()) {
    try{
      await setDoc(ref, {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "lobby",          // lobby | playing
        players: [],              // [{name, joinedAt}]
        hostStartedAt: null,
        version: 1,
        tick: 0
      });
    }catch(e){
      console.error("ensureRoom:setDoc error", e);
      _throwWithCode(e, "ensureRoom:setDoc");
    }
  }

  return ref;
}

export async function addPlayer(roomId, playerName) {
  const clean = String(playerName || "").trim();
  if (!clean) return;

  let ref;
  try{
    ref = await ensureRoom(roomId);
  }catch(e){
    // ensureRoom already throws nice error
    throw e;
  }

  try{
    await updateDoc(ref, {
      updatedAt: serverTimestamp(),
      players: arrayUnion({ name: clean, joinedAt: Date.now() }),
      tick: increment(1)
    });
  }catch(e){
    console.error("addPlayer:updateDoc error", e);
    _throwWithCode(e, "addPlayer:updateDoc");
  }
}

export async function setRoomStatus(roomId, status) {
  let ref;
  try{
    ref = await ensureRoom(roomId);
  }catch(e){
    throw e;
  }

  try{
    await updateDoc(ref, {
      updatedAt: serverTimestamp(),
      status: status,
      tick: increment(1),
      hostStartedAt: status === "playing" ? Date.now() : null
    });
  }catch(e){
    console.error("setRoomStatus:updateDoc error", e);
    _throwWithCode(e, "setRoomStatus:updateDoc");
  }
}

export function listenRoom(roomId, cb) {
  const ref = roomRef(roomId);
  try{
    return onSnapshot(ref, (snap) => {
      cb(snap.exists() ? snap.data() : null);
    }, (e) => {
      console.error("listenRoom:onSnapshot error", e);
      _throwWithCode(e, "listenRoom:onSnapshot");
    });
  }catch(e){
    console.error("listenRoom error", e);
    _throwWithCode(e, "listenRoom");
  }
}
