// 料理屋 昇月庵 ─ 目次の開閉、著作権表記の年、ご予約の入口の出し分け
(function () {
  "use strict";

  // 著作権表記の年は、見ている時点の年を出す
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  // 小さい画面の目次（ヘッダーと下の帯の両方から開閉できる）
  var header = document.querySelector(".site-header");
  var toggles = Array.prototype.slice.call(document.querySelectorAll(".nav-toggle"));
  var list = document.getElementById("nav-list");
  if (header && toggles.length && list) {
    var opener = null;
    var setOpen = function (open) {
      header.classList.toggle("is-open", open);
      document.documentElement.classList.toggle("menu-open", open);
      document.documentElement.style.overflow = open ? "hidden" : "";
      toggles.forEach(function (b) {
        b.setAttribute("aria-expanded", String(open));
        b.textContent = open ? b.dataset.close : b.dataset.open;
      });
      if (open) {
        var first = list.querySelector("a");
        if (first) first.focus({ preventScroll: true });
      } else if (opener) {
        opener.focus({ preventScroll: true });
        opener = null;
      }
    };
    toggles.forEach(function (b) {
      b.addEventListener("click", function () {
        var open = b.getAttribute("aria-expanded") !== "true";
        if (open) opener = b;
        setOpen(open);
      });
    });
    list.addEventListener("click", function (e) {
      if (e.target.closest("a")) { opener = null; setOpen(false); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("is-open")) setOpen(false);
    });
    // 大きい画面に戻ったら閉じる
    window.matchMedia("(min-width: 960px)").addEventListener("change", function (m) {
      if (m.matches) { opener = null; setOpen(false); }
    });
  }

  // ご予約の章が見えている間は、右下の「ご予約」を引っ込める
  var float = document.querySelector(".reserve-float");
  var reserve = document.getElementById("reserve");
  if (float && reserve && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      float.classList.toggle("is-hidden", entries[0].isIntersecting);
    }, { rootMargin: "0px 0px -30% 0px" }).observe(reserve);
  }
})();
