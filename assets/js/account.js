import { dialog } from "./utils.js?v=20260920";
import { completedCount } from "./progress.js?v=20260920";
export function setupAccount() {
  const names = ["login", "register", "recovery", "verification"];
  const titles = {
    login: "Selamat datang kembali",
    register: "Mulai langkah belajarmu",
    recovery: "Pulihkan akses akun",
    verification: "Verifikasi nomor ponsel",
  };
  const $ = (id) => document.getElementById(id);
  const descriptions = new Map(
    [...document.querySelectorAll("[data-account-form] input")].map((input) => [
      input,
      input.getAttribute("aria-describedby"),
    ]),
  );
  let active = "login",
    revision = 0;
  function clearSecrets() {
    document.querySelectorAll("[data-account-form] input").forEach((input) => {
      input.value = "";
      input.removeAttribute("aria-invalid");
      const description = descriptions.get(input);
      if (description) input.setAttribute("aria-describedby", description);
      else input.removeAttribute("aria-describedby");
    });
    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
      $(button.dataset.passwordToggle).type = "password";
      button.textContent = "Lihat";
      button.setAttribute("aria-pressed", "false");
    });
  }
  function switchTo(name, focus = false) {
    if (!names.includes(name)) return;
    active = name;
    revision++;
    clearSecrets();
    $("account-title").textContent = titles[name];
    $("account-success").hidden = true;
    $("account-feedback").hidden = true;
    for (const id of names) {
      $("account-" + id).hidden = id !== name;
      $("tab-" + id).setAttribute("aria-selected", String(id === name));
      $("tab-" + id).tabIndex = id === name ? 0 : -1;
    }
    if (focus) $("tab-" + name).focus();
  }
  function feedback(message, invalid) {
    const node = $("account-feedback");
    node.textContent = message;
    node.hidden = false;
    if (invalid) {
      invalid.setAttribute("aria-invalid", "true");
      invalid.setAttribute("aria-describedby", "account-feedback");
      invalid.focus();
    }
  }
  for (const [index, name] of names.entries()) {
    const tab = $("tab-" + name);
    tab.addEventListener("click", () => switchTo(name));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key))
        return;
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? 3
            : (index + (event.key === "ArrowRight" ? 1 : 3)) % 4;
      switchTo(names[next], true);
    });
    const form = $("account-" + name);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form.getAttribute("aria-busy") === "true") return;
      form
        .querySelectorAll("[aria-invalid]")
        .forEach((input) => input.removeAttribute("aria-invalid"));
      const invalid = [...form.querySelectorAll("input")].find(
        (input) =>
          !input.validity.valid ||
          !input.value.trim() ||
          (input.minLength > 0 && input.value.length < input.minLength),
      );
      if (invalid) {
        feedback(
          invalid.type === "email"
            ? "Isi alamat email contoh yang valid."
            : invalid.type === "password" && name === "register"
              ? "Gunakan frasa sandi contoh minimal 12 karakter."
              : "Lengkapi kolom latihan yang ditandai.",
          invalid,
        );
        return;
      }
      if (name === "verification") {
        if (!/^\+?\d[\d\s-]{7,17}$/.test($("verification-phone").value)) {
          feedback(
            "Isi format nomor ponsel contoh yang valid.",
            $("verification-phone"),
          );
          return;
        }
        if ($("verification-code").value !== "123456") {
          feedback(
            "Kode latihan belum sesuai. Gunakan 123456; ini bukan kode SMS sungguhan.",
            $("verification-code"),
          );
          return;
        }
      }
      const ticket = revision,
        button = form.querySelector("[type=submit]"),
        label = button.textContent;
      button.disabled = true;
      button.textContent = "Memeriksa…";
      form.setAttribute("aria-busy", "true");
      // Yield one frame so assistive technology and the interface announce the pending state.
      await new Promise((resolve) => setTimeout(resolve, 240));
      button.disabled = false;
      button.textContent = label;
      form.removeAttribute("aria-busy");
      if (ticket !== revision || active !== name) return;
      clearSecrets();
      if (name === "recovery") {
        feedback(
          "Alur pemulihan sudah diperiksa. Tidak ada email yang dikirim; pemulihan akun sungguhan belum tersedia.",
        );
        return;
      }
      form.hidden = true;
      $("account-feedback").hidden = true;
      $("account-success").hidden = false;
      $("account-success-text").textContent =
        name === "verification"
          ? "Kode latihan sesuai. Tidak ada nomor yang didaftarkan atau SMS yang dikirim. Kamu dapat melanjutkan belajar sebagai tamu."
          : name === "register"
            ? "Alur pendaftaran berhasil dicoba. Akun sungguhan tidak dibuat dan data formulir tidak disimpan. Semua materi tetap terbuka."
            : "Alur masuk berhasil dicoba. Ini pratinjau akun; tidak ada sesi autentikasi yang dibuat. Kamu dapat melanjutkan belajar sebagai tamu.";
      $("account-success").focus();
    });
    form.querySelector("fieldset").disabled = false;
  }
  document
    .querySelectorAll("[data-account-open]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        switchTo(button.dataset.accountOpen, true),
      ),
    );
  document
    .querySelectorAll("[data-provider]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        dialog(
          "Metode belum tersedia",
          `Masuk dengan ${button.dataset.provider} belum tersedia. Kamu tetap dapat membaca seluruh materi dan menggunakan Studio tanpa akun.`,
        ),
      ),
    );
  document.querySelectorAll("[data-password-toggle]").forEach((button) =>
    button.addEventListener("click", () => {
      const input = $(button.dataset.passwordToggle),
        visible = input.type === "password";
      input.type = visible ? "text" : "password";
      button.textContent = visible ? "Sembunyikan" : "Lihat";
      button.setAttribute("aria-pressed", String(visible));
    }),
  );
  function refreshProgress() {
    document.querySelectorAll("[data-account-progress]").forEach((node) => {
      node.textContent = `${completedCount()} dari 3 modul selesai`;
    });
  }
  window.addEventListener("storage", refreshProgress);
  window.addEventListener("loka:progress", refreshProgress);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) switchTo(active);
    refreshProgress();
  });
  window.addEventListener("pagehide", () => {
    revision++;
    clearSecrets();
  });
  window.addEventListener("loka:navigate", () => {
    if (location.hash !== "#akun") {
      revision++;
      clearSecrets();
    }
  });
  refreshProgress();
  switchTo("login");
}
