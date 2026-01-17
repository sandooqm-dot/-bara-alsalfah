let selectedMode = "single";

document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (!btn.dataset.mode) return;

    document.querySelectorAll(".mode-btn")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
    selectedMode = btn.dataset.mode;
  });
});

document.getElementById("startGame").addEventListener("click", () => {
  window.location.href =
    selectedMode === "single" ? "single.html" : "multi.html";
});
