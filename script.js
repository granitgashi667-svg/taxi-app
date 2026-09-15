// script.js
// TaxiDispatch Pro — version me rezervime/termine + aktivizim automatik

const AppState = {
  orders: [],
  preOrders: [],
  drivers: [],
  selectedDriver: null,
  map: null,
  markers: {}
};

// =========================
// HELPERS
// =========================

function $(id) {
  return document.getElementById(id);
}

function nowTime() {
  return new Date().toLocaleTimeString("sq-AL", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function generateId(prefix = "ORD") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// =========================
// PRE-ORDER / TERMIN
// =========================

function getPreOrderDateTime(order) {
  if (!order || !order.terminDate || !order.terminTime) {
    return null;
  }

  const date = new Date(`${order.terminDate}T${order.terminTime}:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getPreOrderState(order) {
  const scheduled = getPreOrderDateTime(order);

  if (!scheduled) {
    return "invalid";
  }

  const lead = Number(order.terminLead || 15);
  const activationTime = new Date(
    scheduled.getTime() - lead * 60 * 1000
  );

  const now = new Date();

  if (now >= scheduled) {
    return "due";
  }

  if (now >= activationTime) {
    return "ready";
  }

  return "scheduled";
}

function checkPreOrderActivations() {
  if (!Array.isArray(AppState.preOrders)) {
    AppState.preOrders = [];
  }

  const now = new Date();
  let changed = false;

  AppState.preOrders = AppState.preOrders.filter(order => {
    const scheduled = getPreOrderDateTime(order);

    if (!scheduled) {
      return true;
    }

    const lead = Number(order.terminLead || 15);

    const activationTime = new Date(
      scheduled.getTime() - lead * 60 * 1000
    );

    if (now >= activationTime) {
      order.status = "waiting";
      order.activatedAt = now.toISOString();

      AppState.orders.push({
        ...order,
        status: "waiting",
        createdAt: now.toISOString()
      });

      changed = true;
      return false;
    }

    return true;
  });

  if (changed) {
    renderOrders();
    renderPreOrders();
    saveState();
  }
}

function startPreOrderScheduler() {
  checkPreOrderActivations();

  setInterval(() => {
    checkPreOrderActivations();
  }, 5000);
}

// =========================
// STATE
// =========================

function saveState() {
  try {
    localStorage.setItem(
      "taxiDispatchState",
      JSON.stringify({
        orders: AppState.orders,
        preOrders: AppState.preOrders,
        drivers: AppState.drivers
      })
    );
  } catch (error) {
    console.error("Gabim gjatë ruajtjes:", error);
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem("taxiDispatchState");

    if (!saved) return;

    const data = JSON.parse(saved);

    AppState.orders = Array.isArray(data.orders)
      ? data.orders
      : [];

    AppState.preOrders = Array.isArray(data.preOrders)
      ? data.preOrders
      : [];

    AppState.drivers = Array.isArray(data.drivers)
      ? data.drivers
      : [];
  } catch (error) {
    console.error("Gabim gjatë ngarkimit:", error);
  }
}

// =========================
// ORDERS
// =========================

function addOrder(order) {
  AppState.orders.push(order);
  saveState();
  renderOrders();
}

function createOrderFromForm() {
  const phone = $("phone")?.value.trim() || "";
  const pickup = $("pickup")?.value.trim() || "";
  const destination = $("destination")?.value.trim() || "";

  if (!phone || !pickup || !destination) {
    alert("Plotëso numrin e telefonit, marrjen dhe destinacionin.");
    return;
  }

  const terminBox = $("termin-options");
  const terminActive =
    terminBox &&
    !terminBox.classList.contains("hidden") &&
    terminBox.style.display !== "none";

  const baseOrder = {
    id: generateId(),
    phone,
    pickup,
    destination,
    createdAt: new Date().toISOString(),
    createdTime: nowTime(),
    status: "waiting"
  };

  if (terminActive) {
    const terminDate = $("termin-date")?.value || "";
    const terminTime = $("termin-time")?.value || "";
    const terminLead = Number($("termin-lead")?.value || 15);
    const terminRepeat = $("termin-repeat")?.value || "none";

    if (!terminDate || !terminTime) {
      alert("Zgjidh datën dhe orën e terminit.");
      return;
    }

    if (terminLead < 1 || terminLead > 3000) {
      alert("Koha e aktivizimit duhet të jetë nga 1 deri në 3000 minuta.");
      return;
    }

    const scheduled = new Date(
      `${terminDate}T${terminTime}:00`
    );

    if (Number.isNaN(scheduled.getTime())) {
      alert("Data ose ora e terminit nuk është valide.");
      return;
    }

    if (scheduled <= new Date()) {
      alert("Termini duhet të jetë në të ardhmen.");
      return;
    }

    const preOrder = {
      ...baseOrder,
      terminDate,
      terminTime,
      terminLead,
      terminRepeat,
      status: "scheduled"
    };

    AppState.preOrders.push(preOrder);

    saveState();
    renderPreOrders();

    clearOrderForm();

    alert(
      `Rezervimi u ruajt për ${terminDate} në ${terminTime}.`
    );

    return;
  }

  addOrder(baseOrder);

  clearOrderForm();
}

function clearOrderForm() {
  [
    "phone",
    "pickup",
    "destination",
    "termin-date",
    "termin-time"
  ].forEach(id => {
    const el = $(id);
    if (el) el.value = "";
  });
}

// =========================
// TERMIN UI
// =========================

function toggleTermin() {
  const box = $("termin-options");
  const button = $("btn-toggle-termin");

  if (!box) return;

  const hidden =
    box.classList.contains("hidden") ||
    box.style.display === "none" ||
    !box.style.display;

  if (hidden) {
    box.classList.remove("hidden");
    box.style.display = "block";

    if (button) {
      button.classList.add("active");
      button.innerHTML =
        'REZERVIM ME TERMIN <small>Aktiv</small>';
    }
  } else {
    box.classList.add("hidden");
    box.style.display = "none";

    if (button) {
      button.classList.remove("active");
      button.innerHTML =
        'REZERVIM ME TERMIN <small>Opsionale</small>';
    }
  }
}

function closeTermin() {
  const box = $("termin-options");
  const button = $("btn-toggle-termin");

  if (!box) return;

  box.classList.add("hidden");
  box.style.display = "none";

  if (button) {
    button.classList.remove("active");
    button.innerHTML =
      'REZERVIM ME TERMIN <small>Opsionale</small>';
  }
}

// =========================
// PRE-ORDERS RENDER
// =========================

function renderPreOrders() {
  const container =
    $("preorders-list") ||
    $("pre-orders-list") ||
    $("appointments-list");

  if (!container) return;

  if (!AppState.preOrders.length) {
    container.innerHTML = `
      <div class="empty-state">
        Nuk ka rezervime të planifikuara.
      </div>
    `;
    return;
  }

  container.innerHTML = AppState.preOrders
    .map(order => {
      const state = getPreOrderState(order);

      let stateText = "PLANIFIKUAR";

      if (state === "ready") {
        stateText = "GATI PËR AKTIVIZIM";
      }

      if (state === "due") {
        stateText = "NË KOHË";
      }

      return `
        <div class="preorder-item">
          <div>
            <strong>${order.id}</strong>
            <div>${order.phone}</div>
          </div>

          <div>
            ${order.pickup}
            →
            ${order.destination}
          </div>

          <div>
            ${order.terminDate}
            ${order.terminTime}
          </div>

          <div>
            <span class="preorder-status ${state}">
              ${stateText}
            </span>
          </div>

          <div>
            <button
              onclick="activatePreOrder('${order.id}')"
              class="btn-primary"
            >
              AKTIVIZO
            </button>

            <button
              onclick="deletePreOrder('${order.id}')"
              class="btn-danger"
            >
              FSHI
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function activatePreOrder(id) {
  const index = AppState.preOrders.findIndex(
    order => order.id === id
  );

  if (index === -1) return;

  const order = AppState.preOrders[index];

  order.status = "waiting";
  order.activatedAt = new Date().toISOString();

  AppState.orders.push(order);

  AppState.preOrders.splice(index, 1);

  saveState();

  renderPreOrders();
  renderOrders();
}

function deletePreOrder(id) {
  const index = AppState.preOrders.findIndex(
    order => order.id === id
  );

  if (index === -1) return;

  if (!confirm("A dëshiron ta fshish këtë rezervim?")) {
    return;
  }

  AppState.preOrders.splice(index, 1);

  saveState();
  renderPreOrders();
}

// =========================
// ORDERS RENDER
// =========================

function renderOrders() {
  const waitingBody =
    $("waiting-orders-body") ||
    $("waiting-body");

  const activeBody =
    $("active-orders-body") ||
    $("active-body");

  const waitingOrders = AppState.orders.filter(
    order =>
      order.status === "waiting" ||
      order.status === "pending"
  );

  const activeOrders = AppState.orders.filter(
    order =>
      order.status === "active" ||
      order.status === "dispatched" ||
      order.status === "on_way"
  );

  if (waitingBody) {
    if (!waitingOrders.length) {
      waitingBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            Nuk ka porosi në pritje.
          </td>
        </tr>
      `;
    } else {
      waitingBody.innerHTML = waitingOrders
        .map(order => `
          <tr>
            <td>${order.id}</td>
            <td>${order.createdTime || ""}</td>
            <td>${order.phone || ""}</td>
            <td>${order.pickup || ""}</td>
            <td>${order.destination || ""}</td>
            <td>
              <span class="status waiting">
                PRITJE
              </span>
            </td>
            <td>
              <button
                onclick="dispatchOrder('${order.id}')"
                class="btn-primary"
              >
                DËRGO
              </button>
            </td>
          </tr>
        `)
        .join("");
    }
  }

  if (activeBody) {
    if (!activeOrders.length) {
      activeBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            Nuk ka porosi aktive.
          </td>
        </tr>
      `;
    } else {
      activeBody.innerHTML = activeOrders
        .map(order => `
          <tr>
            <td>${order.id}</td>
            <td>${order.createdTime || ""}</td>
            <td>${order.phone || ""}</td>
            <td>${order.pickup || ""}</td>
            <td>${order.destination || ""}</td>
            <td>
              ${order.driverNumber || "-"}
            </td>
            <td>
              <button
                onclick="completeOrder('${order.id}')"
                class="btn-success"
              >
                PËRFUNDO
              </button>
            </td>
          </tr>
        `)
        .join("");
    }
  }
}

// =========================
// DISPATCH
// =========================

function getDriverByNumber(number) {
  return AppState.drivers.find(
    driver =>
      String(driver.number) === String(number)
  );
}

function isDriverBusy(driver) {
  if (!driver) return false;

  return AppState.orders.some(
    order =>
      order.driverNumber &&
      String(order.driverNumber) === String(driver.number) &&
      ["active", "dispatched", "on_way"].includes(
        order.status
      )
  );
}

function getFreeDrivers() {
  return AppState.drivers.filter(
    driver => !isDriverBusy(driver)
  );
}

function dispatchOrder(orderId, driverNumber = null) {
  const order = AppState.orders.find(
    item => item.id === orderId
  );

  if (!order) return;

  let driver = null;

  if (driverNumber) {
    driver = getDriverByNumber(driverNumber);

    if (driver && isDriverBusy(driver)) {
      alert(
        `Veturë ${driver.number} është aktualisht e zënë.`
      );
      return;
    }
  }

  if (!driver) {
    const freeDrivers = getFreeDrivers();

    if (!freeDrivers.length) {
      order.status = "waiting";
      saveState();
      renderOrders();

      alert(
        "Nuk ka asnjë veturë të lirë. Porosia mbetet në pritje."
      );

      return;
    }

    driver = freeDrivers[0];
  }

  order.driverNumber = driver.number;
  order.driverId = driver.id || driver.number;
  order.status = "active";
  order.dispatchedAt = new Date().toISOString();

  saveState();
  renderOrders();
  updateVehicleMarkers();
}

function completeOrder(orderId) {
  const order = AppState.orders.find(
    item => item.id === orderId
  );

  if (!order) return;

  order.status = "completed";
  order.completedAt = new Date().toISOString();

  saveState();

  renderOrders();
  updateVehicleMarkers();
}

// =========================
// MAP / VEHICLE MARKERS
// =========================

function createVehicleMarker(driver, lat, lng) {
  if (!AppState.map) return null;

  const markerElement =
    document.createElement("div");

  markerElement.className =
    "vehicle-marker-inner";

  markerElement.dataset.number =
    driver.number;

  markerElement.textContent =
    driver.number;

  markerElement.title =
    `Veturë ${driver.number}`;

  markerElement.addEventListener(
    "click",
    () => {
      showDriverPopup(driver);
    }
  );

  // Kjo pjesë mund të lidhet me sistemin ekzistues
  // të hartës nëse përdor Leaflet/Mapbox.
  return markerElement;
}

function showDriverPopup(driver) {
  const active = AppState.orders.find(
    order =>
      order.driverNumber &&
      String(order.driverNumber) === String(driver.number) &&
      ["active", "dispatched", "on_way"].includes(
        order.status
      )
  );

  const status = active
    ? "I ZËNË"
    : "I LIRË";

  const message =
    `Veturë ${driver.number}\nStatusi: ${status}`;

  if (typeof alert === "function") {
    alert(message);
  }
}

function updateVehicleMarkers() {
  Object.keys(AppState.markers).forEach(key => {
    const marker = AppState.markers[key];

    if (!marker) return;

    const driver = getDriverByNumber(key);

    if (!driver) return;

    const busy = isDriverBusy(driver);

    const element =
      marker.getElement?.() ||
      marker._element ||
      null;

    if (element) {
      element.classList.toggle(
        "busy",
        busy
      );

      element.classList.toggle(
        "free",
        !busy
      );
    }
  });
}

// =========================
// INIT
// =========================

function initTaxiDispatch() {
  loadState();

  renderOrders();
  renderPreOrders();

  startPreOrderScheduler();

  const terminButton =
    $("btn-toggle-termin");

  if (terminButton) {
    terminButton.addEventListener(
      "click",
      toggleTermin
    );
  }

  const closeTerminButton =
    $("btn-close-termin");

  if (closeTerminButton) {
    closeTerminButton.addEventListener(
      "click",
      closeTermin
    );
  }

  const orderButton =
    $("btn-create-order") ||
    $("btn-add-order") ||
    $("btn-submit-order");

  if (orderButton) {
    orderButton.addEventListener(
      "click",
      createOrderFromForm
    );
  }
}

// =========================
// DOM READY
// =========================

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initTaxiDispatch
  );
} else {
  initTaxiDispatch();
}
