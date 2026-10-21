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
    if (route === "admin/profile") route = "admin/settings";

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
    if (view === "admin" && route === "admin/settings") {
      $("adminManagement").append(profileSection);
    } else if (profileSection.parentElement !== $("userDashboard")) {
      $("userDashboard").append(profileSection);
    }
    if (view === "admin") headerAdminTabs.appendChild(adminTabNav);
    else $("admin").prepend(adminTabNav);
    main.dataset.view = view;
    document.body.dataset.view = view;
    headerAdminTabs.classList.remove("open");
    $("mainNav").classList.remove("open");
    $("menuToggle").setAttribute("aria-expanded", "false");
    $("menuToggle").setAttribute("aria-label", "Цэс нээх");
    $("userDashboard").classList.toggle("hidden", view !== "user");
    $("admin").classList.toggle("hidden", view !== "admin");
    $("userOrdersLink").classList.toggle("hidden", !isUser());
    $("userHeaderActions").classList.toggle("hidden", !isUser());
    $("userHeaderLogoutButton").classList.toggle("hidden", !isUser());
    $("authButton").textContent = validSession()
      ? isAdmin()
        ? "Гарах"
        : `${state.session.name || "Миний профайл"} · Гарах`
      : "Нэвтрэх";
    $("authButton").classList.toggle("hidden", isUser());
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
    orderList.replaceChildren();
    if (!isUser()) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent =
        "Захиалгаа харахын тулд хэрэглэгчийн бүртгэлээр нэвтэрнэ үү.";
      orderList.appendChild(empty);
      return;
    }
    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Одоогоор таны захиалга алга байна.";
      orderList.appendChild(empty);
      return;
    }
    list.forEach((order) => {
      const article = document.createElement("article");
      article.className = "order-card";
      const heading = document.createElement("div");
      const orderLabel = document.createElement("small");
      orderLabel.textContent = "Захиалгын дугаар";
      const orderId = document.createElement("strong");
      orderId.textContent = order.id;
      const createdAt = document.createElement("small");
      createdAt.textContent = new Date(order.createdAt).toLocaleString("mn-MN");
      heading.append(orderLabel, orderId, createdAt);

      const details = document.createElement("p");
      const items = Array.isArray(order.items) ? order.items : [];
      details.textContent = items
        .map(
          (entry) =>
            `${entry.name || item(entry.id)?.name || "Бүтээгдэхүүн"} ×${Number(entry.qty) || 1}`,
        )
        .join(", ");
      details.appendChild(document.createElement("br"));
      const total = document.createElement("b");
      total.textContent = money(order.total);
      details.appendChild(total);
      details.appendChild(
        document.createTextNode(
          ` · ${order.paymentMethod || order.payment || ""}${order.payment === "pending-review" ? " · Төлбөр шалгагдаж байна" : ""}`,
        ),
      );

      const status = document.createElement("span");
      status.className = "status-pill";
      status.textContent =
        statuses[order.status] || order.status || "Тодорхойгүй";
      const trackButton = document.createElement("button");
      trackButton.className = "button ghost";
      trackButton.type = "button";
      trackButton.dataset.track = order.id;
      trackButton.textContent = "Захиалгын дэлгэрэнгүй";
      article.append(heading, details, status, trackButton);
      orderList.appendChild(article);
    });
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

  function createAdminOrderRow(order) {
    const row = document.createElement("tr");
    const appendCell = (value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
      return cell;
    };
    appendCell(order.id);
    const customerCell = appendCell(order.customer || "");
    if (order.note) {
      const note = document.createElement("small");
      note.textContent = `Тэмдэглэл: ${order.note}`;
      customerCell.append(document.createElement("br"), note);
    }
    appendCell(order.phone || "");
    appendCell(new Date(order.createdAt).toLocaleDateString("mn-MN"));
    appendCell(money(order.total));
    appendCell(paymentStatusLabel(order));

    const statusCell = document.createElement("td");
    const statusSelect = document.createElement("select");
    statusSelect.setAttribute("aria-label", `${order.id} захиалгын төлөв`);
    statusSelect.dataset.status = order.id;
    statusSelect.disabled = !isOrderPaid(order);
    steps.forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = statuses[status];
      option.selected = status === order.status;
      statusSelect.appendChild(option);
    });
    statusCell.appendChild(statusSelect);
    row.appendChild(statusCell);

    const actionCell = document.createElement("td");
    if (order.payment === "pending-review") {
      const confirmButton = document.createElement("button");
      confirmButton.className = "button ghost";
      confirmButton.type = "button";
      confirmButton.dataset.confirmPayment = order.id;
      confirmButton.setAttribute(
        "aria-label",
        `${order.id} төлбөр баталгаажуулах`,
      );
      confirmButton.textContent = "Төлбөр баталгаажуулах";
      actionCell.appendChild(confirmButton);
    }
    const deleteButton = document.createElement("button");
    deleteButton.className = "remove";
    deleteButton.type = "button";
    deleteButton.dataset.deleteOrder = order.id;
    deleteButton.textContent = "Устгах";
    actionCell.appendChild(deleteButton);
    row.appendChild(actionCell);
    return row;
  }

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
      (sum, order) =>
        sum + (isOrderPaid(order) ? Number(order.total) || 0 : 0),
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
    const adminTable = $("adminTable");
    adminTable.replaceChildren();
    if (matches.length) {
      matches.forEach((order) =>
        adminTable.appendChild(createAdminOrderRow(order)),
      );
    } else {
      const emptyRow = document.createElement("tr");
      const emptyCell = document.createElement("td");
      emptyCell.colSpan = 8;
      emptyCell.textContent = "Одоогоор захиалга алга.";
      emptyRow.appendChild(emptyCell);
      adminTable.appendChild(emptyRow);
    }
    const deliveryTable = $("adminDeliveryTable");
    deliveryTable.replaceChildren();
    if (state.orders.length) {
      state.orders.forEach((order) => {
        const row = document.createElement("tr");
        const appendCell = (value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.appendChild(cell);
          return cell;
        };
        appendCell(order.id);
        appendCell(order.customer || "");
        appendCell(order.phone || "");
        appendCell(order.address || "—");
        const deliveryCell = appendCell(
          `${order.deliveryDate || "—"} ${order.deliveryTime || ""}`,
        );
        const area = document.createElement("small");
        area.textContent = order.deliveryArea || "";
        deliveryCell.append(document.createElement("br"), area);
        appendCell(money(order.deliveryFee || 0));

        const statusCell = document.createElement("td");
        const statusSelect = document.createElement("select");
        statusSelect.setAttribute(
          "aria-label",
          `${order.id} хүргэлтийн төлөв`,
        );
        statusSelect.dataset.deliveryStatus = order.id;
        statusSelect.disabled = !isOrderPaid(order);
        steps.forEach((status) => {
          const option = document.createElement("option");
          option.value = status;
          option.textContent = statuses[status];
          option.selected = status === order.status;
          statusSelect.appendChild(option);
        });
        statusCell.appendChild(statusSelect);
        row.appendChild(statusCell);
        deliveryTable.appendChild(row);
      });
    } else {
      const emptyRow = document.createElement("tr");
      const emptyCell = document.createElement("td");
      emptyCell.colSpan = 7;
      emptyCell.textContent = "Одоогоор хүргэлтийн захиалга алга.";
      emptyRow.appendChild(emptyCell);
      deliveryTable.appendChild(emptyRow);
    }
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
    $("profile").classList.toggle("hidden", tab !== "settings");
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
  $("userHeaderLogoutButton").onclick = logout;
  $("userLogoutButton").onclick = logout;
  $("wishlistButton").onclick = () => {
    if (isUser()) location.hash = "#account/wishlist";
    else if (!isAdmin()) location.hash = "#wishlist";
  };
  $("userOrdersLink").onclick = (event) => {
    if (!isUser()) {
      event.preventDefault();
      layer("authModal");
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
    if (!isOrderPaid(order)) {
      toast("Төлбөр баталгаажаагүй захиалгын төлөвийг өөрчлөх боломжгүй.");
      render();
      return;
    }
    order.status = event.target.value;
    order.manual = true;
    render();
    toast("Хүргэлтийн төлөв шинэчлэгдлээ");
  };
  $("adminTable").addEventListener("click", (event) => {
    const button = event.target.closest("[data-confirm-payment]");
    if (!button || !isAdmin()) return;
    const order = state.orders.find(
      (entry) => entry.id === button.dataset.confirmPayment,
    );
    if (!order || order.payment !== "pending-review") return;
    if (!confirm(`${order.id} төлбөр орсныг баталгаажуулах уу?`)) return;
    order.payment = "paid";
    order.manual = false;
    render();
    toast("Төлбөр баталгаажлаа");
  });

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
    if (button && isAdmin()) {
      headerAdminTabs.classList.remove("open");
      $("menuToggle").setAttribute("aria-expanded", "false");
      $("menuToggle").setAttribute("aria-label", "Цэс нээх");
      location.hash = `#admin/${button.dataset.adminTab}`;
    }
  });
  $("menuToggle").onclick = () => {
    const target = isAdmin() ? headerAdminTabs : $("mainNav");
    const open = target.classList.toggle("open");
    $("menuToggle").setAttribute("aria-expanded", String(open));
    $("menuToggle").setAttribute("aria-label", open ? "Цэс хаах" : "Цэс нээх");
  };
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
  if (isAdmin()) renderAdminDashboard();

  const customSelects = new WeakMap();
  let openSelect = null;
  const enabledOptionIndexes = (select) =>
    [...select.options]
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((index) => index >= 0);

  function updateCustomSelect(select) {
    const ui = customSelects.get(select);
    if (!ui) return;
    const selected = [...select.options].filter((option) => option.selected);
    ui.label.textContent = select.multiple
      ? selected.map((option) => option.textContent).join(", ") || "Сонгох"
      : selected[0]?.textContent || select.options[0]?.textContent || "Сонгох";
    ui.trigger.disabled = select.disabled;
    ui.trigger.setAttribute("aria-disabled", String(select.disabled));
    ui.trigger.setAttribute(
      "aria-expanded",
      String(openSelect?.select === select),
    );
    if (openSelect?.select === select) renderCustomSelectOptions(select);
  }

  function renderCustomSelectOptions(select) {
    const ui = customSelects.get(select);
    if (!ui) return;
    ui.menu.replaceChildren();
    [...select.options].forEach((option, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "custom-select-option";
      item.id = `${ui.id}-option-${index}`;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(option.selected));
      item.disabled = option.disabled;
      item.tabIndex = -1;
      item.textContent = option.textContent;
      if (index === ui.activeIndex) item.classList.add("is-active");
      item.addEventListener("pointerenter", () => {
        ui.activeIndex = index;
        setActiveCustomOption(select, index);
      });
      item.addEventListener("click", (event) => {
        event.stopPropagation();
        if (select.multiple) {
          option.selected = !option.selected;
        } else {
          select.selectedIndex = index;
          closeCustomSelect();
        }
        select.dispatchEvent(new Event("change", { bubbles: true }));
        updateCustomSelect(select);
        if (select.multiple) positionCustomSelect(select);
        ui.trigger.focus();
      });
      ui.menu.appendChild(item);
    });
    ui.menu.setAttribute("aria-multiselectable", String(select.multiple));
  }

  function setActiveCustomOption(select, index) {
    const ui = customSelects.get(select);
    if (!ui) return;
    ui.activeIndex = index;
    [...ui.menu.children].forEach((option, optionIndex) => {
      option.classList.toggle("is-active", optionIndex === index);
    });
    ui.trigger.setAttribute("aria-activedescendant", `${ui.id}-option-${index}`);
    ui.menu.children[index]?.scrollIntoView({ block: "nearest" });
  }

  function positionCustomSelect(select) {
    if (openSelect?.select !== select) return;
    const { trigger, menu } = openSelect;
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const availableBelow = window.innerHeight - rect.bottom - margin;
    const availableAbove = rect.top - margin;
    const placeAbove = availableBelow < 180 && availableAbove > availableBelow;
    const available = Math.max(
      80,
      Math.min(320, placeAbove ? availableAbove : availableBelow),
    );
    menu.style.width = `${Math.min(
      Math.max(rect.width, 160),
      window.innerWidth - margin * 2,
    )}px`;
    menu.style.maxHeight = `${available}px`;
    menu.style.left = `${Math.min(
      Math.max(margin, rect.left),
      window.innerWidth - menu.offsetWidth - margin,
    )}px`;
    menu.style.top = placeAbove
      ? `${Math.max(margin, rect.top - Math.min(menu.scrollHeight, available) - 6)}px`
      : `${Math.min(window.innerHeight - margin, rect.bottom + 6)}px`;
  }

  function closeCustomSelect() {
    if (!openSelect) return;
    const { select, trigger, menu, wrapper } = openSelect;
    menu.remove();
    wrapper.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    trigger.removeAttribute("aria-activedescendant");
    openSelect = null;
    updateCustomSelect(select);
  }

  function openCustomSelect(select) {
    const ui = customSelects.get(select);
    if (!ui || select.disabled) return;
    updateCustomSelect(select);
    closeCustomSelect();
    const enabled = enabledOptionIndexes(select);
    if (!enabled.length) return;
    const selectedIndex = select.selectedIndex;
    ui.activeIndex = enabled.includes(selectedIndex) ? selectedIndex : enabled[0];
    ui.menu = document.createElement("div");
    ui.menu.className = "custom-select-menu";
    ui.menu.setAttribute("role", "listbox");
    ui.menu.id = `${ui.id}-listbox`;
    ui.trigger.setAttribute("aria-controls", ui.menu.id);
    ui.wrapper.classList.add("is-open");
    renderCustomSelectOptions(select);
    document.body.appendChild(ui.menu);
    openSelect = { select, trigger: ui.trigger, menu: ui.menu, wrapper: ui.wrapper };
    ui.trigger.setAttribute("aria-expanded", "true");
    positionCustomSelect(select);
    ui.trigger.setAttribute("aria-activedescendant", `${ui.id}-option-${ui.activeIndex}`);
    ui.menu.children[ui.activeIndex]?.scrollIntoView({ block: "nearest" });
  }

  function enhanceSelect(select) {
    if (customSelects.has(select) || select.closest(".custom-select")) return;
    const wrapper = document.createElement("span");
    wrapper.className = "custom-select";
    const trigger = document.createElement("button");
    const id = `bloom-select-${Math.random().toString(36).slice(2)}`;
    trigger.type = "button";
    trigger.className = "custom-select-trigger";
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-controls", `${id}-listbox`);
    const label = select.closest("label");
    const labelText = [...(label?.childNodes || [])]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent.trim())
      .filter(Boolean)
      .join(" ");
    trigger.setAttribute(
      "aria-label",
      select.getAttribute("aria-label") ||
        labelText ||
        select.options[select.selectedIndex]?.textContent.trim() ||
        "Сонгох",
    );
    select.classList.add("custom-select-native");
    select.setAttribute("aria-hidden", "true");
    select.tabIndex = -1;
    select.parentNode.insertBefore(wrapper, select);
    wrapper.append(select, trigger);
    const ui = { id, wrapper, trigger, label: document.createElement("span"), menu: null, activeIndex: 0 };
    trigger.appendChild(ui.label);
    customSelects.set(select, ui);
    trigger.addEventListener("click", () => {
      if (openSelect?.select === select) closeCustomSelect();
      else openCustomSelect(select);
    });
    trigger.addEventListener("keydown", (event) => {
      if (!["ArrowDown", "ArrowUp", "Enter", " ", "Escape"].includes(event.key))
        return;
      event.preventDefault();
      if (event.key === "Escape") {
        closeCustomSelect();
        return;
      }
      if (!openSelect || openSelect.select !== select) {
        openCustomSelect(select);
        return;
      }
      const enabled = enabledOptionIndexes(select);
      const current = enabled.indexOf(ui.activeIndex);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const next = (current + direction + enabled.length) % enabled.length;
        setActiveCustomOption(select, enabled[next]);
      } else if (event.key === "Enter" || event.key === " ") {
        ui.menu.children[ui.activeIndex]?.click();
      }
    });
    select.addEventListener("change", () => updateCustomSelect(select));
    updateCustomSelect(select);
  }

  function scanCustomSelects(root) {
    if (root instanceof HTMLSelectElement) enhanceSelect(root);
    if (root.querySelectorAll)
      root.querySelectorAll("select").forEach(enhanceSelect);
  }

  scanCustomSelects(document);
  const selectObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === "childList" &&
        mutation.target instanceof HTMLSelectElement
      ) {
        updateCustomSelect(mutation.target);
      }
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) scanCustomSelects(node);
      });
      if (
        mutation.type === "attributes" &&
        mutation.target instanceof HTMLSelectElement
      ) {
        updateCustomSelect(mutation.target);
      }
      if (
        mutation.type === "attributes" &&
        mutation.target instanceof HTMLOptionElement
      ) {
        updateCustomSelect(mutation.target.closest("select"));
      }
    });
  });
  selectObserver.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["disabled", "selected"],
  });
  document.addEventListener("click", (event) => {
    if (
      openSelect &&
      !openSelect.wrapper.contains(event.target) &&
      !openSelect.menu.contains(event.target)
    ) closeCustomSelect();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCustomSelect();
  });
  const syncCustomSelects = () =>
    document
      .querySelectorAll("select.custom-select-native")
      .forEach(updateCustomSelect);
  const scheduleCustomSelectSync = () => queueMicrotask(syncCustomSelects);
  ["click", "change", "reset"].forEach((eventName) =>
    document.addEventListener(eventName, scheduleCustomSelectSync, true),
  );
  window.addEventListener("hashchange", scheduleCustomSelectSync);
  window.addEventListener("resize", () => {
    if (openSelect) positionCustomSelect(openSelect.select);
  });
  window.addEventListener(
    "scroll",
    () => {
      if (openSelect) positionCustomSelect(openSelect.select);
    },
    true,
  );
})();
