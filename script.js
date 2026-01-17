// مبدئيًا النمط الافتراضي هو "أجهزة متعددة"
let selectedMode = "multi";

// أزرار الأنماط
const singleBtn = document.getElementById("singleBtn");
const multiBtn = document.getElementById("multiBtn");
const startBtn = document.getElementById("startBtn");

// النمط
singleBtn.onclick = () => {
  selectedMode = "single";
  singleBtn.classList.add("active");
  multiBtn.classList.remove("active");
};

multiBtn.onclick = () => {
  selectedMode = "multi";
  multiBtn.classList.add("active");
  singleBtn.classList.remove("active");
};

// زر "ابدأ اللعب"
startBtn.onclick = () => {
  if (selectedMode === "single") {
    window.location.href = "single.html";
  } else {
    window.location.href = "multi.html";
  }
};

// ✅ منبثقة التعليمات
const howToBtn = document.getElementById("howToBtn");
const howToModal = document.getElementById("howToModal");
const closeModal = document.getElementById("closeModal");

howToBtn.onclick = () => (howToModal.style.display = "flex");
closeModal.onclick = () => (howToModal.style.display = "none");
