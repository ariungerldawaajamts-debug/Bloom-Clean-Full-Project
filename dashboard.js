(() => {
  const validSession = () => Boolean(state.session && state.session.email);
  const isAdmin = () => validSession() && state.session.role === "admin";
  const isUser = () => validSession() && state.session.role !== "admin";
  const defaultAbout = {
    aboutText1:
      "Bloom Coffee House бол цэцэг ба кофег нэгэн орон зайд хослуулсан Дархан хотын жижигхэн булан юм. Бид таны өдөр тутмын баяр, талархал, дурсамж бүрийг илүү үзэсгэлэнтэй болгохыг хүсдэг.",
    aboutText2:
      "Баглаа бүрийг шинэхэн цэцгээр анхааралтай бэлтгэж, кофены буланд аяга бүрийг тайван мөчид тохируулан урладаг. Таны илгээх бэлэг дулаан, бодолтой, мартагдашгүй байг.",
    aboutContact:
      "Дархан хот, Дархан-Уул аймаг · Өдөр бүр 09:00–21:00\n9987 3899 · hello@bloom.mn",
  };
  const adminTabNav = $("admin").querySelector(".admin-tabs");
  const headerAdminTabs = $("headerAdminTabs");

  function loadAboutContent() {
    try {
      const stored = localStorage.getItem("bloomAbout");
      if (stored === null) return { ...defaultAbout };
      const parsed = JSON.parse(stored);
      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed) ||
        typeof parsed.aboutText1 !== "string" ||
        typeof parsed.aboutText2 !== "string" ||
        typeof parsed.aboutContact !== "string"
      ) {
        throw new TypeError("Stored about content has an invalid shape.");
      }
      return {
        aboutText1: parsed.aboutText1,
        aboutText2: parsed.aboutText2,
        aboutContact: parsed.aboutContact,
      };
    } catch (error) {
      console.error("Бидний тухай мэдээллийг уншихад алдаа гарлаа.", error);
      return { ...defaultAbout };
    }
  }

  function applyAboutContent(content) {
    $("aboutText1").textContent = content.aboutText1;
    $("aboutText2").textContent = content.aboutText2;
    const contact = $("aboutContact");
    contact.replaceChildren();
    content.aboutContact.split(/\r?\n/).forEach((line, index) => {
      if (index) contact.appendChild(document.createElement("br"));
      contact.appendChild(document.createTextNode(line));
    });
  }

  function renderProfile() {
    if (!validSession()) {
      $("profile").classList.add("hidden");
      return;
    }
    if (isAdmin()) {
      try {
        const saved = localStorage.getItem("bloomAdminProfile");
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (!parsed || typeof parsed.name !== "string") {
            throw new TypeError("Stored admin profile has an invalid shape.");
          }
          state.session.name = parsed.name;
        }
      } catch (error) {
        console.error("Админы профайлыг уншихад алдаа гарлаа.", error);
      }
    }
    $("profileName").textContent = state.session.name || "";
    $("profileEmail").textContent = state.session.email || "";
    $("profileRoleRow").classList.toggle("hidden", !isAdmin());
    $("profileRole").textContent = isAdmin() ? "Админ" : "";
    $("profileNameInput").value = state.session.name || "";
    $("profileEditError").textContent = "";
    $("profileEditError").classList.add("hidden");
    $("profileName").classList.remove("hidden");
    $("profileNameInput").classList.add("hidden");
    $("editProfileName").classList.remove("hidden");
    $("saveProfileName").classList.add("hidden");
    $("cancelProfileName").classList.add("hidden");
  }

  function setProfileEditing(editing) {
    $("profileName").classList.toggle("hidden", editing);
    $("profileNameInput").classList.toggle("hidden", !editing);
    $("editProfileName").classList.toggle("hidden", editing);
    $("saveProfileName").classList.toggle("hidden", !editing);
    $("cancelProfileName").classList.toggle("hidden", !editing);
    $("profileEditError").textContent = "";
    $("profileEditError").classList.add("hidden");
    if (editing) {
      $("profileNameInput").value = state.session.name || "";
      $("profileNameInput").focus();
    }
  }

  let aboutContent = loadAboutContent();
  applyAboutContent(aboutContent);
  $("editAbout1").value = aboutContent.aboutText1;
  $("editAbout2").value = aboutContent.aboutText2;
  $("editAboutContact").value = aboutContent.aboutContact;

  orders = function () {
    if (isAdmin()) return state.orders;
    if (!isUser()) return [];
    return state.orders.filter((order) => order.userId === state.session.email);
  };

  function routeHash(route) {
    const url = new URL(window.location.href);
    url.hash = route;
    history.replaceState(null, "", url);
  }

  function userRouteTab(route) {
    const tab = route.split("/")[1];
    return ["orders", "delivery", "wishlist", "profile"].includes(tab)
      ? tab
      : "orders";
  }

  function setUserTab(tab) {
    const ids = {
      orders: "orders",
      delivery: "delivery",
      wishlist: "wishlist",
      profile: "profile",
    };
    Object.entries(ids).forEach(([key, id]) => {
      const section = $(id);
      if (section) section.classList.toggle("hidden", key !== tab);
    });
    document.querySelectorAll("[data-user-tab]").forEach((link) => {
      const active = link.dataset.userTab === tab;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function applyRoute() {
    const main = document.querySelector("main");
    const requested = location.hash.slice(1) || "home";
    let route = requested;

    if (route.startsWith("admin")) {
      if (!isAdmin()) route = isUser() ? "account/orders" : "home";
    } else if (route.startsWith("account")) {
      if (!isUser()) route = isAdmin() ? "admin/orders" : "home";
    } else if (isAdmin()) {
      route = "admin/orders";
    }

    if (route !== requested) routeHash(route);
    const view = route.startsWith("admin")
      ? "admin"
      : route.startsWith("account")
        ? "user"
        : "public";
    const profileSection = $("profile");
    if (view === "admin" && route === "admin/profile") {
      $("admin").append(profileSection);
    } else if (profileSection.parentElement !== $("userDashboard")) {
      $("userDashboard").append(profileSection);
    }
    if (view === "admin") headerAdminTabs.appendChild(adminTabNav);
    else $("admin").prepend(adminTabNav);
    main.dataset.view = view;
    document.body.dataset.view = view;
    $("userDashboard").classList.toggle("hidden", view !== "user");
    $("admin").classList.toggle("hidden", view !== "admin");
    $("userOrdersLink").classList.toggle("hidden", !isUser());
    $("userWishlistLink").classList.toggle("hidden", !isUser());
    $("adminDashboardButton").classList.toggle("hidden", !isAdmin());
    $("authButton").textContent = validSession()
      ? isAdmin()
        ? "Гарах"
        : `${state.session.name || "Миний профайл"} · Гарах`
      : "Нэвтрэх";
    renderProfile();

    if (view === "user") {
      $("userDashboardGreeting").textContent =
        `${state.session.name || "Сайн байна уу"} · Таны мэдээлэл энэ browser-ийн demo өгөгдөлд хадгалагдана.`;
      setUserTab(userRouteTab(route));
      renderOrdersBundleAware();
      renderTracking();
    } else if (view === "admin") {
      const tab = route.split("/")[1];
      setAdminTab(
        [
          "orders",
          "products",
          "bundles",
          "delivery",
          "about",
          "profile",
          "settings",
        ].includes(tab)
          ? tab
          : "orders",
      );
    }
  }

  function showOrders() {
    const list = orders();
    const orderList = $("orderList");
    if (!isUser()) {
      orderList.innerHTML = `<div class="empty">Захиалгаа харахын тулд хэрэглэгчийн бүртгэлээр нэвтэрнэ үү.</div>`;
      return;
    }
    orderList.innerHTML = list.length
      ? list
          .map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];
            return `<article class="order-card">
        <div><small>Захиалгын дугаар</small><strong>${esc(order.id)}</strong><small>${new Date(order.createdAt).toLocaleString("mn-MN")}</small></div>
        <p>${items.map((entry) => `${esc(entry.name || item(entry.id)?.name || "Бүтээгдэхүүн")} ×${Number(entry.qty) || 1}`).join(", ")}<br><b>${money(order.total)}</b> · ${esc(order.payment || "")}</p>
        <span class="status-pill">${esc(statuses[order.status] || order.status || "Тодорхойгүй")}</span>
        <button class="button ghost" type="button" data-track="${esc(order.id)}">Захиалгын дэлгэрэнгүй</button>
      </article>`;
          })
          .join("")
      : `<div class="empty">Одоогоор таны захиалга алга байна.</div>`;
  }
  renderOrdersBundleAware = showOrders;

  function showTracking() {
    const tracking = $("tracking");
    const order =
      orders().find((entry) => entry.id === state.selected) || orders()[0];
    if (!isUser() || !order) {
      tracking.innerHTML = `<div class="empty">Одоогоор таны идэвхтэй захиалга алга байна.</div>`;
      return;
    }
    state.selected = order.id;
    const step = Math.max(0, steps.indexOf(order.status));
    tracking.innerHTML = `<div class="tracking-card">
      <div class="tracking-head"><div><small>Захиалгын дугаар</small><strong>${esc(order.id)}</strong>
      <small>${new Date(order.createdAt).toLocaleDateString("mn-MN")} · ${esc(order.deliveryDate || "Хүргүүлэх өдөр сонгоогүй")}</small>
      <small>${esc(order.deliveryTime || "")} · ${esc(order.deliveryArea || "")}</small>
      <small>${esc(order.address || "")}</small>
      ${order.note ? `<small>Нэмэлт тэмдэглэл: ${esc(order.note)}</small>` : ""}</div><span class="status-pill">${esc(statuses[order.status] || order.status || "Тодорхойгүй")}</span></div>
      <div class="steps">${steps.map((status, index) => `<div class="step ${index <= step ? (index === step ? "current" : "done") : ""}">${esc(statuses[status])}</div>`).join("")}</div>
      <div class="progress"><span style="width:${(step + 1) * 25}%"></span></div>
    </div>`;
  }
  renderTracking = showTracking;

  function renderAdminDashboard() {
    if (!isAdmin()) return;
    const query = $("adminSearch").value.trim().toLocaleLowerCase("mn-MN");
    const filter = $("adminStatusFilter").value;
    const matches = state.orders.filter((order) => {
      const searchable = [
        order.id,
        order.customer,
        order.phone,
        order.createdAt,
        order.total,
      ]
        .map((value) => String(value ?? ""))
        .join(" ")
        .toLocaleLowerCase("mn-MN");
      return (
        (filter === "all" || order.status === filter) &&
        (!query || searchable.includes(query))
      );
    });
    const sales = state.orders.reduce(
      (sum, order) => sum + (Number(order.total) || 0),
      0,
    );
    $("adminStats").innerHTML = [
      ["Нийт захиалга", state.orders.length],
      ["Нийт борлуулалт", money(sales)],
      [
        "Хүлээгдэж буй",
        state.orders.filter((order) => order.status !== "delivered").length,
      ],
      [
        "Хүргэгдсэн",
        state.orders.filter((order) => order.status === "delivered").length,
      ],
    ]
      .map(
        ([label, value]) =>
          `<div class="stat"><small>${label}</small><strong>${value}</strong></div>`,
      )
      .join("");
    $("adminTable").innerHTML = matches.length
      ? matches
          .map(
            (order) => `<tr>
      <td>${esc(order.id)}</td><td>${esc(order.customer || "")}${order.note ? `<br><small>Тэмдэглэл: ${esc(order.note)}</small>` : ""}</td><td>${esc(order.phone || "")}</td>
      <td>${new Date(order.createdAt).toLocaleDateString("mn-MN")}</td><td>${money(order.total)}</td>
      <td><select aria-label="${esc(order.id)} захиалгын төлөв" data-status="${esc(order.id)}">${steps.map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${esc(statuses[status])}</option>`).join("")}</select></td>
      <td><button class="remove" type="button" data-delete-order="${esc(order.id)}">Устгах</button></td>
    </tr>`,
          )
          .join("")
      : `<tr><td colspan="7">Одоогоор захиалга алга.</td></tr>`;
    $("adminDeliveryTable").innerHTML = state.orders.length
      ? state.orders
          .map(
            (order) => `<tr>
      <td>${esc(order.id)}</td><td>${esc(order.customer || "")}</td><td>${esc(order.phone || "")}</td>
      <td>${esc(order.address || "—")}</td>
      <td>${esc(order.deliveryDate || "—")} ${esc(order.deliveryTime || "")}<br><small>${esc(order.deliveryArea || "")}</small></td>
      <td>${money(order.deliveryFee || 0)}</td>
      <td><select aria-label="${esc(order.id)} хүргэлтийн төлөв" data-delivery-status="${esc(order.id)}">${steps.map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${esc(statuses[status])}</option>`).join("")}</select></td>
    </tr>`,
          )
          .join("")
      : `<tr><td colspan="7">Одоогоор хүргэлтийн захиалга алга.</td></tr>`;
    $("toggleTracking").textContent =
      `Демо tracking: ${extraState.tracking ? "асаалттай" : "унтраалттай"}`;
  }
  renderAdmin = renderAdminDashboard;

  const previousRender = render;
  render = function () {
    previousRender();
    applyRoute();
  };

  function cartProduct(entry) {
    if (entry.kind !== "bundle") return item(entry.id);
    const saved = bundles.find(
      (bundle) =>
        entry.id === bundle.id || entry.id.startsWith(`${bundle.id}-`),
    );
    return {
      ...(saved || {}),
      ...entry,
      type: "bundle",
      flower: entry.flowerId,
      image: entry.image || saved?.image,
    };
  }

  function bundleCartDetails(entry) {
    if (entry.kind !== "bundle") return "";
    const flowerName = item(entry.flowerId)?.name || "Цэцэг";
    const coffeeNames = (entry.coffees || [])
      .map((id) => item(id)?.name)
      .filter(Boolean);
    return [
      `Цэцэг: ${flowerName}`,
      `Кофе: ${coffeeNames.length ? coffeeNames.join(", ") : "сонгоогүй"}`,
      `Карт: ${entry.card || "Энгийн мэндчилгээ"}`,
      entry.wrapping ? "Боодолтой" : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function safeProductImage(entry) {
    const product = cartProduct(entry);
    const fallback =
      entry.kind === "bundle"
        ? bundleSvg({ flower: entry.flowerId })
        : productTypeOf(product) === "flower"
          ? flowerSvg(product)
          : drinkSvg(product);
    return productVisual(
      product,
      fallback,
      entry.kind === "bundle" ? item(entry.flowerId)?.image || "" : "",
    );
  }

  function renderCartItems() {
    const container = $("cartItems");
    if (!state.cart.length) {
      container.innerHTML = `<div class="empty-cart"><p>Таны сагс одоогоор хоосон байна.</p><a class="button ghost" href="#flowers">Цэцэг, кофе үзэх</a></div>`;
      return;
    }
    container.innerHTML = state.cart
      .map((entry, index) => {
        const unitPrice = cartPrice(entry);
        const details = bundleCartDetails(entry);
        return `<article class="cart-line ${entry.kind === "bundle" ? "bundle-line" : ""}">
        <div class="cart-thumb">${safeProductImage(entry)}</div>
        <div>
          <strong>${esc(cartLabel(entry))}</strong>
          <small>${money(unitPrice)}${entry.kind === "bundle" ? " · Бэлгийн багц" : " · Нэгж үнэ"}</small>
          <div class="qty" aria-label="${esc(cartLabel(entry))} тоо ширхэг">
            <button type="button" data-qty="${index}" data-change="-1" aria-label="Нэгээр хасах">−</button>
            <span>${entry.qty}</span>
            <button type="button" data-qty="${index}" data-change="1" aria-label="Нэгээр нэмэх">+</button>
          </div>
          <button class="remove" type="button" data-remove="${index}">Устгах</button>
        </div>
        <b>${money(unitPrice * entry.qty)}</b>
        ${details ? `<div class="cart-item-details">${esc(details)}${entry.message ? `<p>${esc(entry.recipient ? `${entry.recipient}: ` : "")}${esc(entry.message)}</p>` : ""}</div>` : ""}
      </article>`;
      })
      .join("");
  }

  function totalRows(totals, includeFreeDelivery, includeFinalTotal = true) {
    const rows = [
      `<p><span>Барааны дүн</span><strong>${money(totals.items)}</strong></p>`,
    ];
    if (includeFreeDelivery || totals.fee > 0)
      rows.push(
        `<p><span>Хүргэлтийн төлбөр</span><strong>${money(totals.fee)}</strong></p>`,
      );
    if (totals.discount > 0)
      rows.push(
        `<p><span>Хөнгөлөлт</span><strong>−${money(totals.discount)}</strong></p>`,
      );
    if (totals.wrapping > 0)
      rows.push(
        `<p><span>Бэлгийн боодол</span><strong>${money(totals.wrapping)}</strong></p>`,
      );
    if (includeFinalTotal)
      rows.push(
        `<p class="final-total"><span>Нийт төлөх дүн</span><strong>${money(totals.final)}</strong></p>`,
      );
    return rows.join("");
  }

  function renderCartBreakdown() {
    const totals = checkoutTotals();
    $("cartBreakdown").innerHTML = totalRows(totals, false, false);
    $("cartTotal").textContent = money(totals.final);
  }

  function renderCheckoutSummary() {
    const summary = $("checkoutSummary");
    summary.innerHTML = state.cart.length
      ? state.cart
          .map((entry) => {
            const unitPrice = cartPrice(entry);
            const details = bundleCartDetails(entry);
            return `<article class="checkout-item">
        <div class="cart-thumb">${safeProductImage(entry)}</div>
        <div class="checkout-item-copy"><strong>${esc(cartLabel(entry))} ×${entry.qty}</strong><small>${money(unitPrice)} · Нэгж үнэ</small></div>
        <b class="checkout-item-subtotal">${money(unitPrice * entry.qty)}</b>
        ${details ? `<div class="checkout-item-details">${esc(details)}${entry.message ? `<br>${esc(entry.recipient ? `${entry.recipient}: ` : "")}${esc(entry.message)}` : ""}</div>` : ""}
      </article>`;
          })
          .join("")
      : `<p class="checkout-empty">Таны сагс хоосон байна.</p>`;
    $("priceBreakdown").innerHTML = totalRows(checkoutTotals(), true);
  }

  function renderCartPolish() {
    const previousCartRenderer = renderCartEnhanced;
    renderCartEnhanced = function () {
      previousCartRenderer();
      renderCartItems();
      renderCartBreakdown();
      if ($("checkoutModal").classList.contains("show"))
        renderCheckoutSummary();
    };
    renderCart = () => renderCartEnhanced();
    renderCartEnhanced();
  }
  renderCartPolish();
  $("cartItems").addEventListener("click", (event) => {
    if (event.target.closest('a[href="#flowers"]')) close();
  });

  let scrollBeforeOverlay = 0;
  let returnToCartAfterCheckout = false;
  function lockPageScroll() {
    if (document.body.classList.contains("bloom-overlay-open")) return;
    scrollBeforeOverlay = window.scrollY;
    document.body.style.setProperty(
      "--bloom-scroll-top",
      `${-scrollBeforeOverlay}px`,
    );
    document.body.classList.add("bloom-overlay-open");
  }
  function unlockPageScroll() {
    document.body.classList.remove("bloom-overlay-open");
    document.body.style.removeProperty("--bloom-scroll-top");
    window.scrollTo(0, scrollBeforeOverlay);
  }

  const previousLayer = layer;
  layer = function (id) {
    if (id === "checkoutModal") {
      returnToCartAfterCheckout = true;
      $("cartDrawer").classList.remove("show");
      document.body.classList.add("bloom-checkout-open");
      renderCheckoutSummary();
    } else if (id === "successModal") {
      $("checkoutModal").classList.remove("show");
      document.body.classList.remove("bloom-checkout-open");
      returnToCartAfterCheckout = false;
    }
    previousLayer(id);
    lockPageScroll();
  };
  const previousClose = close;
  close = function () {
    previousClose();
    document.body.classList.remove("bloom-checkout-open");
    if (returnToCartAfterCheckout && state.cart.length) {
      returnToCartAfterCheckout = false;
      layer("cartDrawer");
      return;
    }
    returnToCartAfterCheckout = false;
    unlockPageScroll();
  };

  $("checkoutButton").onclick = () => {
    if (!state.cart.length) return toast("Сагс хоосон байна");
    layer("checkoutModal");
    renderCheckoutSummary();
  };
  $("deliveryArea").addEventListener("change", () => {
    renderCheckoutSummary();
    renderCartBreakdown();
  });
  const previousCouponAction = $("applyCoupon").onclick;
  $("applyCoupon").onclick = (event) => {
    previousCouponAction.call($("applyCoupon"), event);
    renderCheckoutSummary();
    renderCartBreakdown();
  };

  const previousSetAdminTab = setAdminTab;
  setAdminTab = function (tab) {
    if (!isAdmin()) return;
    previousSetAdminTab(tab);
    $("profile").classList.toggle("hidden", tab !== "profile");
    $("adminManagement").classList.toggle("hidden", tab !== "settings");
    $("adminDeliveryPanel").classList.toggle("hidden", tab !== "delivery");
    $("adminStats").classList.toggle("hidden", tab !== "orders");
    $("adminTools").classList.toggle("hidden", tab !== "orders");
    $("adminTable")
      .closest(".table-wrap")
      .classList.toggle("hidden", tab !== "orders");
    if (tab === "delivery") renderAdminDashboard();
  };

  $("adminTools").append($("advanceOrder"));
  const productPanel = $("adminProductPanel");
  productPanel
    .querySelector(".admin-product-heading")
    .append($("manageAvailability"));
  productPanel.insertBefore(
    $("availabilityList"),
    productPanel.querySelector(".admin-product-filters"),
  );
  $("addDemoProduct").classList.add("hidden");

  function logout() {
    state.session = null;
    render();
    routeHash("home");
    applyRoute();
    toast("Системээс гарлаа");
  }

  $("authButton").onclick = () =>
    validSession() ? logout() : layer("authModal");
  $("userLogoutButton").onclick = logout;
  $("wishlistButton").onclick = () => {
    if (isUser()) location.hash = "#account/wishlist";
    else if (!isAdmin()) layer("authModal");
  };
  $("userOrdersLink").onclick = (event) => {
    if (!isUser()) {
      event.preventDefault();
      layer("authModal");
    }
  };
  $("userWishlistLink").onclick = (event) => {
    if (!isUser()) {
      event.preventDefault();
      layer("authModal");
    }
  };
  $("adminDashboardButton").onclick = (event) => {
    if (!isAdmin()) {
      event.preventDefault();
      if (isUser()) location.hash = "#account/orders";
      else layer("authModal");
    }
  };
  $("lookupButton").onclick = () => {
    const id = $("lookupOrderId").value.trim();
    const phone = $("lookupPhone").value.replace(/\s/g, "");
    const found = orders().find(
      (order) => order.id === id && order.phone === phone,
    );
    if (!found) {
      $("lookupError").textContent =
        "Таны захиалгын дугаар болон утас таарахгүй байна.";
      return;
    }
    $("lookupError").textContent = `Таны захиалга олдлоо: ${found.id}`;
    state.selected = found.id;
    renderTracking();
  };

  $("adminDeliveryTable").onchange = (event) => {
    const orderId = event.target.dataset.deliveryStatus;
    if (!orderId || !isAdmin()) return;
    const order = state.orders.find((entry) => entry.id === orderId);
    if (!order) return;
    order.status = event.target.value;
    order.manual = true;
    render();
    toast("Хүргэлтийн төлөв шинэчлэгдлээ");
  };

  $("editProfileName").addEventListener("click", () => setProfileEditing(true));
  $("cancelProfileName").addEventListener("click", () => renderProfile());
  $("saveProfileName").addEventListener("click", () => {
    const name = $("profileNameInput").value.trim();
    if (!name) {
      $("profileEditError").textContent = "Нэр хоосон байж болохгүй.";
      $("profileEditError").classList.remove("hidden");
      $("profileNameInput").focus();
      return;
    }

    try {
      if (isAdmin()) {
        localStorage.setItem("bloomAdminProfile", JSON.stringify({ name }));
        state.session.name = name;
      } else {
        const userIndex = state.users.findIndex(
          (user) => user.email === state.session.email,
        );
        if (userIndex < 0)
          throw new Error("Нэвтэрсэн хэрэглэгчийн бүртгэл олдсонгүй.");
        const updatedUsers = [...state.users];
        updatedUsers[userIndex] = { ...updatedUsers[userIndex], name };
        localStorage.setItem("bloom_users", JSON.stringify(updatedUsers));
        state.users = updatedUsers;
        state.session.name = name;
        $("userDashboardGreeting").textContent =
          `${name} · Таны мэдээлэл энэ browser-ийн demo өгөгдөлд хадгалагдана.`;
        $("authButton").textContent = `${name} · Гарах`;
      }
    } catch (error) {
      console.error("Профайлын нэрийг хадгалахад алдаа гарлаа.", error);
      $("profileEditError").textContent =
        "Нэрийг хадгалж чадсангүй. Дахин оролдоно уу.";
      $("profileEditError").classList.remove("hidden");
      return;
    }
    renderProfile();
    toast("Нэр хадгалагдлаа.");
  });

  $("saveAbout").addEventListener("click", () => {
    const next = {
      aboutText1: $("editAbout1").value,
      aboutText2: $("editAbout2").value,
      aboutContact: $("editAboutContact").value,
    };
    if (!next.aboutText1.trim() || !next.aboutText2.trim()) {
      alert("Догол мөрүүдийг хоосон үлдээх боломжгүй.");
      return;
    }
    try {
      localStorage.setItem("bloomAbout", JSON.stringify(next));
    } catch (error) {
      console.error("Бидний тухай мэдээллийг хадгалахад алдаа гарлаа.", error);
      alert(
        "Мэдээллийг хадгалж чадсангүй. Browser-ийн storage зайг шалгана уу.",
      );
      return;
    }
    aboutContent = next;
    applyAboutContent(aboutContent);
    toast("Бидний тухай мэдээлэл хадгалагдлаа.");
  });
  $("resetAbout").addEventListener("click", () => {
    if (!confirm("“Бидний тухай” мэдээллийг анхны төлөвт буцаах уу?")) return;
    try {
      localStorage.setItem("bloomAbout", JSON.stringify(defaultAbout));
    } catch (error) {
      console.error("Бидний тухай мэдээллийг сэргээхэд алдаа гарлаа.", error);
      alert(
        "Анхны мэдээллийг хадгалж чадсангүй. Browser-ийн storage зайг шалгана уу.",
      );
      return;
    }
    aboutContent = { ...defaultAbout };
    $("editAbout1").value = aboutContent.aboutText1;
    $("editAbout2").value = aboutContent.aboutText2;
    $("editAboutContact").value = aboutContent.aboutContact;
    applyAboutContent(aboutContent);
    toast("Бидний тухай мэдээлэл анхны төлөвт орлоо.");
  });

  adminTabNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-tab]");
    if (button && isAdmin())
      location.hash = `#admin/${button.dataset.adminTab}`;
  });
  document
    .querySelector(".user-dashboard-tabs")
    .addEventListener("click", (event) => {
      const link = event.target.closest("[data-user-tab]");
      if (link && isUser()) location.hash = `#account/${link.dataset.userTab}`;
    });
  $("loginForm").addEventListener("submit", () =>
    setTimeout(() => {
      if (!validSession()) return;
      location.hash = isAdmin() ? "#admin/orders" : "#account/orders";
    }, 0),
  );
  $("registerForm").addEventListener("submit", () =>
    setTimeout(() => {
      if (isUser()) location.hash = "#account/orders";
    }, 0),
  );
  window.addEventListener("hashchange", applyRoute);

  const legacyOrdersBox = document.querySelector(".lookup-box");
  if (legacyOrdersBox)
    legacyOrdersBox
      .querySelector("p:not(.eyebrow)")
      ?.replaceChildren(
        document.createTextNode(
          "Захиалгын хайлт нь зөвхөн таны нэвтэрсэн бүртгэлийн захиалгыг шалгана.",
        ),
      );
  applyRoute();
  if (isUser()) {
    renderOrdersBundleAware();
    renderTracking();
  }
})();
