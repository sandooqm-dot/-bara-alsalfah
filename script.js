let selectedMode = "single";

const modeButtons = document.querySelectorAll(".mode-btn");

modeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    modeButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedMode = btn.dataset.mode;
  });
});

document.getElementById("startGame").addEventListener("click", () => {
  if (selectedMode === "single") {
    window.location.href = "single.html";
  } else {
    window.location.href = "multi.html";
  }
});
