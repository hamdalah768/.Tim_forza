/* Keep navigation usable and explain a failed module load without hiding content. */
import("./main.js?v=20260920").catch((error) => {
  console.error("LokaNaik: fitur interaktif gagal dimuat.", error);
  if (document.getElementById("site-load-error")) return;
  const notice = document.createElement("section");
  notice.id = "site-load-error";
  notice.className = "load-error";
  notice.setAttribute("role", "alert");
  const message = document.createElement("p");
  message.textContent =
    location.protocol === "file:"
      ? "Buka situs melalui alamat hosting atau Live Server agar fitur interaktif dapat digunakan."
      : "Fitur interaktif belum termuat. Muat ulang halaman; jika masih bermasalah, hubungi pengelola situs.";
  const reload = document.createElement("button");
  reload.type = "button";
  reload.className = "loka-btn";
  reload.textContent = "Muat ulang halaman";
  reload.addEventListener("click", () => location.reload());
  notice.append(message, reload);
  (document.querySelector("main") || document.body).prepend(notice);
});
