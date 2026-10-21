(() => {
  const modal = document.getElementById("authModal");
  const overlay = document.getElementById("overlay");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const recoveryPanel = document.getElementById("passwordRecovery");
  const requestForm = document.getElementById("passwordResetRequestForm");
  const resetForm = document.getElementById("passwordResetForm");
  const recoveryEmail = document.getElementById("recoveryEmail");
  const requestError = document.getElementById("recoveryEmailError");
  const requestStatus = document.getElementById("recoveryRequestStatus");
  const resetError = document.getElementById("passwordResetError");
  const resetNote = document.getElementById("recoveryResetNote");
  const authSecurityNote = document.getElementById("authSecurityNote");
  const tabs = document.querySelector(".auth-tabs");
  const recoveryApiEnabled = window.BLOOM_PASSWORD_RESET_API === true;
  const requestEndpoint = "/api/auth/password-reset";
  const confirmEndpoint = "/api/auth/password-reset/confirm";
  let resetEmail = "";
  let resetToken = "";
  let lastAuthTrigger = null;

  function setFieldError(input, messageElement, message) {
    messageElement.textContent = message;
    input.setAttribute("aria-invalid", String(Boolean(message)));
  }

  function showRecovery() {
    loginForm.classList.add("hidden");
    registerForm.classList.add("hidden");
    recoveryPanel.classList.remove("hidden");
    tabs.classList.add("hidden");
    authSecurityNote.classList.add("hidden");
    requestForm.classList.remove("hidden");
    resetForm.classList.add("hidden");
    setFieldError(recoveryEmail, requestError, "");
    requestStatus.textContent = "";
    recoveryEmail.value = document.getElementById("loginEmail").value.trim();
    recoveryEmail.focus();
  }

  function showLogin(message = "") {
    recoveryPanel.classList.add("hidden");
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
    tabs.classList.remove("hidden");
    authSecurityNote.classList.remove("hidden");
    document.querySelectorAll("[data-auth-tab]").forEach(button => {
      button.classList.toggle("active", button.dataset.authTab === "login");
    });
    loginForm.reset();
    document.getElementById("loginEmail").value = resetEmail;
    document.getElementById("loginStatus").textContent = message;
    document.getElementById("loginEmail").focus();
  }

  function openModal() {
    overlay.classList.add("show");
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    if (modal.classList.contains("show")) return;
    if (modal.contains(document.activeElement)) {
      if (lastAuthTrigger && document.contains(lastAuthTrigger)) lastAuthTrigger.focus();
      else document.activeElement.blur();
    }
    modal.setAttribute("aria-hidden", "true");
  }

  function getTokenFromUrl() {
    const search = new URLSearchParams(window.location.search);
    const hashParts = window.location.hash.split("?");
    const hashParams = new URLSearchParams(hashParts[1] || "");
    const token = search.get("reset_token") || hashParams.get("token");
    const isResetRoute = hashParts[0] === "#reset-password" || search.has("reset_token");
    return isResetRoute ? token : "";
  }

  document.getElementById("authButton").addEventListener("click", event => {
    if (!document.getElementById("authModal").classList.contains("show")) {
      const mobileAuthTrigger = document.getElementById("mobileAuthButton");
      lastAuthTrigger = mobileAuthTrigger?.getClientRects().length
        ? mobileAuthTrigger
        : event.currentTarget;
    }
  }, true);

  document.getElementById("forgotPasswordLink").addEventListener("click", showRecovery);
  document.getElementById("recoveryBackButton").addEventListener("click", () => {
    recoveryPanel.classList.add("hidden");
    loginForm.classList.remove("hidden");
    tabs.classList.remove("hidden");
    authSecurityNote.classList.remove("hidden");
    document.getElementById("loginEmail").focus();
  });

  recoveryEmail.addEventListener("input", () => setFieldError(recoveryEmail, requestError, ""));
  requestForm.addEventListener("submit", async event => {
    event.preventDefault();
    const email = recoveryEmail.value.trim().toLowerCase();
    if (!email) {
      setFieldError(recoveryEmail, requestError, "И-мэйл хаягаа оруулна уу.");
      recoveryEmail.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError(recoveryEmail, requestError, "И-мэйл хаягаа зөв форматаар оруулна уу.");
      recoveryEmail.focus();
      return;
    }

    setFieldError(recoveryEmail, requestError, "");
    requestStatus.textContent = "";
    if (recoveryApiEnabled) {
      try {
        const response = await fetch(requestEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        if (!response.ok) throw new Error(`Нууц үг сэргээх хүсэлт амжилтгүй боллоо (${response.status}).`);
        requestStatus.textContent = "Хүсэлтийг серверт хүргэлээ. Бүртгэлтэй бол имэйлээ шалгана уу.";
        return;
      } catch (error) {
        requestStatus.textContent = error.message || "Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.";
        return;
      }
    }

    let users;
    try {
      users = JSON.parse(localStorage.getItem("bloom_users") || "[]");
    } catch (error) {
      console.error("Demo бүртгэлийг уншихад алдаа гарлаа.", error);
      requestStatus.textContent = "Demo бүртгэлийн мэдээллийг уншиж чадсангүй.";
      return;
    }
    if (!Array.isArray(users)) {
      requestStatus.textContent = "Demo бүртгэлийн мэдээллийн бүтэц буруу байна.";
      return;
    }
    if (!users.some(user => user && user.email === email)) {
      setFieldError(recoveryEmail, requestError, "Энэ и-мэйл demo бүртгэлд олдсонгүй.");
      recoveryEmail.focus();
      return;
    }

    resetEmail = email;
    resetToken = "";
    requestForm.classList.add("hidden");
    resetForm.classList.remove("hidden");
    resetNote.textContent = "Демо горим: и-мэйл илгээгээгүй, хэн болохыг баталгаажуулаагүй, нэг удаагийн token ашиглаагүй. Энэ төхөөрөмжийн demo бүртгэлийн нууц үг л өөрчлөгдөнө.";
    document.getElementById("newPassword").focus();
  });

  resetForm.addEventListener("submit", async event => {
    event.preventDefault();
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmNewPassword").value;
    if (newPassword.length < 8) {
      resetError.textContent = "Шинэ нууц үг дор хаяж 8 тэмдэгт байна уу.";
      document.getElementById("newPassword").setAttribute("aria-invalid", "true");
      document.getElementById("newPassword").focus();
      return;
    }
    if (newPassword !== confirmPassword) {
      resetError.textContent = "Оруулсан хоёр нууц үг таарахгүй байна.";
      document.getElementById("confirmNewPassword").setAttribute("aria-invalid", "true");
      document.getElementById("confirmNewPassword").focus();
      return;
    }
    document.getElementById("newPassword").setAttribute("aria-invalid", "false");
    document.getElementById("confirmNewPassword").setAttribute("aria-invalid", "false");
    resetError.textContent = "";

    if (resetToken) {
      try {
        const response = await fetch(confirmEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: resetToken, password: newPassword })
        });
        if (!response.ok) throw new Error(`Сэргээх холбоос хүчингүй эсвэл хугацаа нь дууссан байна (${response.status}).`);
        showLogin("Нууц үг амжилттай шинэчлэгдлээ. Шинэ нууц үгээрээ нэвтэрнэ үү.");
        resetToken = "";
        resetEmail = "";
        return;
      } catch (error) {
        resetError.textContent = error.message || "Сервертэй холбогдож чадсангүй. Нууц үг шинэчлэгдсэнгүй.";
        return;
      }
    }

    try {
      if (typeof window.bloomUpdateDemoPassword !== "function") {
        throw new Error("Demo нууц үг шинэчлэх боломжгүй байна.");
      }
      window.bloomUpdateDemoPassword(resetEmail, newPassword);
      showLogin("Demo нууц үг энэ төхөөрөмж дээр шинэчлэгдлээ. Шинэ нууц үгээрээ нэвтэрнэ үү.");
      resetEmail = "";
    } catch (error) {
      console.error("Demo нууц үгийг шинэчлэхэд алдаа гарлаа.", error);
      resetError.textContent = error.message || "Demo нууц үгийг хадгалж чадсангүй.";
    }
  });

  resetForm.addEventListener("input", event => {
    if (event.target.matches("input")) {
      event.target.setAttribute("aria-invalid", "false");
      resetError.textContent = "";
    }
  });

  const modalObserver = new MutationObserver(() => {
    const isOpen = modal.classList.contains("show");
    if (isOpen) modal.setAttribute("aria-hidden", "false");
    else closeModal();
  });
  modalObserver.observe(modal, { attributes: true, attributeFilter: ["class"] });

  modal.addEventListener("keydown", event => {
    if (event.key !== "Tab" || !modal.classList.contains("show")) return;
    const focusable = [...modal.querySelectorAll("button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex='-1'])")]
      .filter(element => !element.closest(".hidden") && element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  resetToken = getTokenFromUrl();
  if (resetToken) {
    openModal();
    recoveryPanel.classList.remove("hidden");
    loginForm.classList.add("hidden");
    registerForm.classList.add("hidden");
    tabs.classList.add("hidden");
    authSecurityNote.classList.add("hidden");
    requestForm.classList.add("hidden");
    resetForm.classList.remove("hidden");
    resetNote.textContent = "Нууц үг шинэчлэх хүсэлтийг серверээр шалгаж байна. Холбоос нэг удаагийн бөгөөд хугацаатай байх ёстой.";
    document.getElementById("newPassword").focus();
  }
})();
