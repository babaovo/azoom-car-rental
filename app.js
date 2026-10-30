"use strict";

const STORAGE_KEY = "azoom-active-booking-v2";
const THEME_KEY = "azoom-theme";
const USERS_KEY = "azoom-users-v1";
const SESSION_KEY = "azoom-session-v1";

const cars = [
  {
    id: 1,
    name: "Toyota Yaris",
    category: "Compact",
    seats: 5,
    transmission: "Auto",
    fuel: "Petrol",
    pricePerDay: 58,
    colour: "#ef6b55",
    image: "assets/cars/toyota-yaris.jpg",
    imageAlt: "Red Toyota Yaris rental car outside the pickup office"
  },
  {
    id: 2,
    name: "Honda Civic",
    category: "Sedan",
    seats: 5,
    transmission: "Auto",
    fuel: "Petrol",
    pricePerDay: 72,
    colour: "#326ed1",
    image: "assets/cars/honda-civic.jpg",
    imageAlt: "Blue Honda Civic rental car outside the pickup office"
  },
  {
    id: 3,
    name: "Mazda CX-5",
    category: "SUV",
    seats: 5,
    transmission: "Auto",
    fuel: "Petrol",
    pricePerDay: 96,
    colour: "#233957",
    image: "assets/cars/mazda-cx5.jpg",
    imageAlt: "Dark blue Mazda CX-5 rental SUV outside the pickup office"
  },
  {
    id: 4,
    name: "Tesla Model 3",
    category: "Electric",
    seats: 5,
    transmission: "Auto",
    fuel: "Electric",
    pricePerDay: 118,
    colour: "#7a8798",
    image: "assets/cars/tesla-model-3.jpg",
    imageAlt: "Silver Tesla Model 3 rental car outside the pickup office"
  },
  {
    id: 5,
    name: "Kia Carnival",
    category: "SUV",
    seats: 7,
    transmission: "Auto",
    fuel: "Petrol",
    pricePerDay: 112,
    colour: "#367267",
    image: "assets/cars/kia-carnival.jpg",
    imageAlt: "Dark green Kia Carnival rental MPV outside the pickup office"
  },
  {
    id: 6,
    name: "Nissan Leaf",
    category: "Electric",
    seats: 5,
    transmission: "Auto",
    fuel: "Electric",
    pricePerDay: 88,
    colour: "#7a58a8",
    image: "assets/cars/nissan-leaf.jpg",
    imageAlt: "Pearl white Nissan Leaf rental car outside the pickup office"
  }
];

const extras = {
  gps: { label: "GPS navigation", rate: 6 },
  childSeat: { label: "Child seat", rate: 5 },
  additionalDriver: { label: "Additional driver", rate: 10 }
};

const statusLabels = {
  reserved: "Reserved",
  rented: "Car collected",
  "awaiting-inspection": "Awaiting inspection",
  inspected: "Inspection completed",
  completed: "Paid and completed"
};

const journeyStages = [
  { status: "reserved", label: "Reserved" },
  { status: "rented", label: "Collected" },
  { status: "awaiting-inspection", label: "Returned" },
  { status: "inspected", label: "Inspected" },
  { status: "completed", label: "Paid" }
];

let activeBooking = loadBooking();
let selectedCarId = cars[0].id;
let currentBookingStep = 1;
let validationErrorId = 0;
let currentUser = loadCurrentUser();
let authReturnFocus = null;

const qs = (selector, parent = document) => parent.querySelector(selector);
const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];

function loadBooking() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn("Saved booking could not be loaded.", error);
    return null;
  }
}

function saveBooking() {
  if (activeBooking) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeBooking));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadUsers() {
  try {
    const saved = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    return Array.isArray(saved)
      ? saved.filter((user) => user && typeof user.id === "string" && typeof user.name === "string" && typeof user.email === "string" && typeof user.passwordHash === "string")
      : [];
  } catch (error) {
    console.warn("Saved accounts could not be loaded.", error);
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function hashPassword(value) {
  // Demo-only one-way hash. A production app must hash passwords securely on a server.
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function loadCurrentUser() {
  try {
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return null;
    const user = loadUsers().find((item) => item.id === userId) || null;
    if (!user) localStorage.removeItem(SESSION_KEY);
    return user;
  } catch (error) {
    console.warn("The saved login session could not be loaded.", error);
    return null;
  }
}

function setAuthSession(user) {
  currentUser = user;
  if (user) localStorage.setItem(SESSION_KEY, user.id);
  else localStorage.removeItem(SESSION_KEY);
}

function accountInitial(user) {
  return String(user?.name || "U").trim().charAt(0).toUpperCase() || "U";
}

function setAuthMessage(id, message = "", type = "error", field = null) {
  const element = qs(`#${id}`);
  element.textContent = message;
  element.classList.toggle("success", type === "success");
  const panel = element.closest(".auth-panel");
  qsa("input", panel).forEach((input) => input.removeAttribute("aria-invalid"));
  if (message && field) field.setAttribute("aria-invalid", "true");
}

function setAuthMode(mode, moveFocus = false) {
  qsa("[data-auth-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.authPanel !== mode;
  });
  qsa("[data-auth-panel-target]").forEach((button) => {
    const selected = button.dataset.authPanelTarget === mode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  setAuthMessage("login-message");
  setAuthMessage("register-message");
  if (moveFocus) {
    const input = qs(mode === "register" ? "#register-name" : "#login-email");
    input.focus();
  }
}

function renderAuthUI() {
  const signedIn = Boolean(currentUser);
  const displayName = signedIn ? (currentUser.name.trim() || "Customer") : "";
  const label = qs("#account-label");
  const avatar = qs("#account-avatar");
  const accountButton = qs("#account-button");
  const dialog = qs(".auth-dialog");

  label.textContent = signedIn ? displayName.split(/\s+/)[0] : "Log in";
  avatar.textContent = accountInitial(currentUser);
  accountButton.setAttribute("aria-label", signedIn ? `Open account for ${displayName}` : "Log in or register");
  qs("#auth-guest-view").hidden = signedIn;
  qs("#auth-account-view").hidden = !signedIn;
  dialog.setAttribute("aria-labelledby", signedIn ? "account-heading" : "auth-modal-title");

  if (signedIn) {
    qs("#account-name").textContent = displayName;
    qs("#account-email").textContent = currentUser.email || "No email saved";
    qs("#account-profile-avatar").textContent = accountInitial(currentUser);
    const createdDate = new Date(currentUser.createdAt || "");
    const created = Number.isNaN(createdDate.getTime())
      ? "in this browser"
      : new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", year: "numeric" }).format(createdDate);
    qs("#account-created").textContent = `Account created ${created}`;
  }
}

function openAuthModal(mode = "login") {
  authReturnFocus = document.activeElement;
  renderAuthUI();
  if (!currentUser) setAuthMode(mode);
  qs("#auth-modal").hidden = false;
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => {
    if (currentUser) qs(".auth-dialog").focus();
    else qs(mode === "register" ? "#register-name" : "#login-email").focus();
  });
}

function closeAuthModal() {
  qs("#auth-modal").hidden = true;
  document.body.classList.remove("modal-open");
  if (authReturnFocus instanceof HTMLElement && authReturnFocus.isConnected) authReturnFocus.focus();
}

function prefillBookingFromAccount() {
  if (!currentUser) return;
  const nameInput = qs("#customer-name");
  const emailInput = qs("#customer-email");
  if (!nameInput.value) nameInput.value = currentUser.name;
  if (!emailInput.value) emailInput.value = currentUser.email;
}

function registerAccount(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("confirmPassword") || "");

  setAuthMessage("register-message");
  if (name.length < 2) {
    setAuthMessage("register-message", "Please enter your full name.", "error", qs("#register-name"));
    qs("#register-name").focus();
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setAuthMessage("register-message", "Please enter a valid email address.", "error", qs("#register-email"));
    qs("#register-email").focus();
    return;
  }
  if (password.length < 8 || !/[a-z]/i.test(password) || !/\d/.test(password)) {
    setAuthMessage("register-message", "Password must contain at least 8 characters, one letter and one number.", "error", qs("#register-password"));
    qs("#register-password").focus();
    return;
  }
  if (password !== confirmation) {
    setAuthMessage("register-message", "The two passwords do not match.", "error", qs("#register-confirm-password"));
    qs("#register-confirm-password").focus();
    return;
  }

  const users = loadUsers();
  if (users.some((user) => user.email === email)) {
    setAuthMessage("register-message", "An account with this email already exists. Try logging in.", "error", qs("#register-email"));
    qs("#register-email").focus();
    return;
  }

  const user = {
    id: `USR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    name,
    email,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };
  users.push(user);
  saveUsers(users);
  setAuthSession(user);
  form.reset();
  renderAuthUI();
  prefillBookingFromAccount();
  renderRentalDashboard();
  toast(`Welcome to AZoom, ${user.name.split(/\s+/)[0]}!`);
  qs(".auth-dialog").focus();
}

function loginAccount(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const email = normalizeEmail(formData.get("email"));
  const passwordHash = hashPassword(formData.get("password"));
  const user = loadUsers().find((item) => item.email === email && item.passwordHash === passwordHash);

  if (!user) {
    setAuthMessage("login-message", "Email or password is incorrect.", "error", qs("#login-password"));
    qs("#login-password").select();
    return;
  }

  setAuthSession(user);
  event.target.reset();
  renderAuthUI();
  prefillBookingFromAccount();
  renderRentalDashboard();
  toast(`Welcome back, ${user.name.split(/\s+/)[0]}!`);
  qs(".auth-dialog").focus();
}

function logoutAccount() {
  const firstName = currentUser?.name.split(/\s+/)[0] || "Customer";
  setAuthSession(null);
  renderAuthUI();
  renderRentalDashboard();
  closeAuthModal();
  toast(`${firstName} has been logged out.`);
}

function money(value) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 2
  }).format(Number(value) || 0);
}

function dateLabel(value) {
  if (!value) return "Not selected";
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetween(start, end) {
  if (!start || !end) return 0;
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  const difference = endDate - startDate;
  return difference > 0 ? Math.ceil(difference / 86400000) : 0;
}

function selectedCar() {
  return cars.find((car) => car.id === Number(selectedCarId)) || cars[0];
}

function carForBooking() {
  if (!activeBooking) return null;
  return cars.find((car) => car.id === Number(activeBooking.carId));
}

function canCurrentUserAccessBooking() {
  if (!activeBooking) return false;
  return !activeBooking.accountId || activeBooking.accountId === currentUser?.id;
}

function isAvailable(car) {
  return !activeBooking || activeBooking.status === "completed" || activeBooking.carId !== car.id;
}

function carPhoto(car, className = "car-photo", loading = "lazy") {
  return `<img class="${className}" src="${escapeHTML(car.image)}" alt="${escapeHTML(car.imageAlt)}" width="1200" height="800" loading="${loading}" decoding="async">`;
}

function toast(message, type = "success") {
  const region = qs("#toast-region");
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.textContent = message;
  region.append(item);
  setTimeout(() => item.remove(), 3800);
}

function showView(name, options = {}) {
  let activeView = null;
  qsa(".view").forEach((view) => {
    const selected = view.dataset.view === name;
    view.hidden = !selected;
    view.classList.toggle("active", selected);
    if (selected) activeView = view;
  });

  qsa(".nav-link").forEach((link) => {
    const activeName = name === "booking" ? "fleet" : name;
    const isActive = link.dataset.viewTarget === activeName;
    link.classList.toggle("active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  qs("#main-navigation").classList.remove("open");
  qs("#menu-toggle").setAttribute("aria-expanded", "false");

  if (name === "fleet") renderFleet();
  if (name === "booking") renderBookingSummary();
  if (name === "rental") renderRentalDashboard();
  if (name === "staff") renderStaffDashboard();

  const heading = qs("h1", activeView);
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }

  if (!options.keepPosition) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function renderCarCard(car, container) {
  const template = qs("#car-card-template");
  const card = template.content.firstElementChild.cloneNode(true);
  const available = isAvailable(car);

  card.style.setProperty("--car-colour", car.colour);
  const photo = qs(".car-photo", card);
  photo.src = car.image;
  photo.alt = car.imageAlt;
  qs(".car-status", card).textContent = available ? "Available" : "Reserved";
  qs(".car-status", card).classList.toggle("unavailable", !available);
  qs(".car-category", card).textContent = car.category;
  qs(".car-name", card).textContent = car.name;
  qs(".car-price strong", card).textContent = money(car.pricePerDay).replace("SGD", "$ ");

  const features = [
    [car.seats, "Seats"],
    [car.transmission, "Gearbox"],
    [car.fuel, "Fuel"]
  ];

  qs(".car-features", card).innerHTML = features
    .map(([value, label]) => `<li><strong>${escapeHTML(value)}</strong>${escapeHTML(label)}</li>`)
    .join("");

  const button = qs(".car-book-button", card);
  button.dataset.carId = car.id;
  button.disabled = !available;
  button.textContent = available ? "Select this car" : "Currently reserved";
  container.append(card);
}

function renderFeaturedCars() {
  const container = qs("#featured-cars");
  container.replaceChildren();
  cars.slice(0, 3).forEach((car) => renderCarCard(car, container));
}

function renderFleet() {
  const searchTerm = qs("#car-search").value.trim().toLowerCase();
  const category = qs("#category-filter").value;
  const sort = qs("#price-sort").value;

  let filtered = cars.filter((car) => {
    const matchesSearch = `${car.name} ${car.category} ${car.fuel}`.toLowerCase().includes(searchTerm);
    const matchesCategory = category === "all" || car.category === category;
    return matchesSearch && matchesCategory;
  });

  if (sort === "low") filtered.sort((a, b) => a.pricePerDay - b.pricePerDay);
  if (sort === "high") filtered.sort((a, b) => b.pricePerDay - a.pricePerDay);

  const container = qs("#fleet-cars");
  container.replaceChildren();
  filtered.forEach((car) => renderCarCard(car, container));
  qs("#result-count").textContent = `${filtered.length} car${filtered.length === 1 ? "" : "s"} found`;

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1">
        <div class="empty-icon" aria-hidden="true">⌕</div>
        <h2>No matching cars</h2>
        <p>Try another car name or choose a different category.</p>
      </div>`;
  }
}

function startBooking(carId) {
  const car = cars.find((item) => item.id === Number(carId));
  if (!car || !isAvailable(car)) {
    toast("That car is not available for a new reservation.", "error");
    return;
  }

  if (activeBooking && activeBooking.status !== "completed") {
    toast("Complete or reset the current rental before starting another booking.", "error");
    showView("rental");
    return;
  }

  selectedCarId = car.id;
  currentBookingStep = 1;
  qs("#booking-form").reset();
  applyDefaultDates();
  syncQuickSearchToBooking();
  prefillBookingFromAccount();
  showBookingStep(1);
  renderBookingSummary();
  showView("booking");
}

function applyDefaultDates() {
  const today = new Date();
  const tomorrow = new Date(today);
  const threeDaysLater = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  threeDaysLater.setDate(today.getDate() + 4);

  const minDate = localDateString(today);
  qsa('input[type="date"]').forEach((input) => {
    input.min = minDate;
  });

  if (!qs("#quick-pickup").value) qs("#quick-pickup").value = localDateString(tomorrow);
  if (!qs("#quick-return").value) qs("#quick-return").value = localDateString(threeDaysLater);
  if (!qs("#pickup-date").value) qs("#pickup-date").value = localDateString(tomorrow);
  if (!qs("#return-date").value) qs("#return-date").value = localDateString(threeDaysLater);
}

function syncQuickSearchToBooking() {
  const quickLocation = qs("#quick-location").value;
  const quickPickup = qs("#quick-pickup").value;
  const quickReturn = qs("#quick-return").value;
  if (quickLocation) qs("#pickup-office").value = quickLocation;
  if (quickPickup) qs("#pickup-date").value = quickPickup;
  if (quickReturn) qs("#return-date").value = quickReturn;
}

function currentQuote() {
  const car = selectedCar();
  const form = qs("#booking-form");
  const pickupDate = qs("#pickup-date").value;
  const returnDate = qs("#return-date").value;
  const days = daysBetween(pickupDate, returnDate);
  const selectedExtras = qsa('input[name="extras"]:checked', form).map((input) => input.value);
  const baseCost = days * car.pricePerDay;
  const extrasCost = selectedExtras.reduce((sum, key) => sum + extras[key].rate * days, 0);
  return { days, baseCost, extrasCost, total: baseCost + extrasCost, selectedExtras };
}

function renderBookingSummary() {
  const car = selectedCar();
  const quote = currentQuote();
  const pickup = qs("#pickup-date").value;
  const returning = qs("#return-date").value;
  const summary = qs("#booking-summary");

  summary.innerHTML = `
    <div class="summary-art">${carPhoto(car, "summary-photo", "eager")}</div>
    <div class="summary-body">
      <p class="eyebrow">Your selection</p>
      <h2>${escapeHTML(car.name)}</h2>
      <p>${escapeHTML(car.category)} · ${car.seats} seats · ${escapeHTML(car.transmission)}</p>
      <div class="summary-list">
        <div class="summary-row"><span>Dates</span><strong>${dateLabel(pickup)} – ${dateLabel(returning)}</strong></div>
        <div class="summary-row"><span>Rental period</span><strong>${quote.days || "—"} ${quote.days === 1 ? "day" : "days"}</strong></div>
        <div class="summary-row"><span>Car rental</span><strong>${money(quote.baseCost)}</strong></div>
        <div class="summary-row"><span>Selected extras</span><strong>${money(quote.extrasCost)}</strong></div>
      </div>
      <div class="summary-total"><span>Estimated rental</span><strong>${money(quote.total)}</strong></div>
      <p class="field-hint">Any damage cost is added only after the return inspection.</p>
    </div>`;
}

function showBookingStep(step) {
  currentBookingStep = Number(step);
  qsa("[data-form-step]").forEach((panel) => {
    const active = Number(panel.dataset.formStep) === currentBookingStep;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });

  qsa("[data-booking-step]").forEach((item) => {
    const itemStep = Number(item.dataset.bookingStep);
    item.classList.toggle("active", itemStep === currentBookingStep);
    item.classList.toggle("done", itemStep < currentBookingStep);
  });
  clearValidationErrors();
}

function clearValidationErrors() {
  qsa(".field-error").forEach((error) => error.remove());
  qsa(".invalid").forEach((item) => item.classList.remove("invalid"));
  qsa('[aria-invalid="true"]').forEach((field) => {
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
  });
}

function setFieldError(field, message) {
  field.classList.add("invalid");
  field.setAttribute("aria-invalid", "true");
  const wrapper = field.closest(".field") || field.closest(".agreement-row");
  if (!wrapper) return;
  if (wrapper.classList.contains("agreement-row")) wrapper.classList.add("invalid");
  const error = document.createElement("span");
  error.className = "field-error";
  error.id = `field-error-${++validationErrorId}`;
  error.textContent = message;
  field.setAttribute("aria-describedby", error.id);
  wrapper.append(error);
}

function validateRequiredFields(panel) {
  let valid = true;
  qsa("input[required], select[required]", panel).forEach((field) => {
    if (field.type === "checkbox") {
      if (!field.checked) {
        setFieldError(field, "Please confirm this statement before continuing.");
        valid = false;
      }
    } else if (!field.value.trim()) {
      setFieldError(field, "This field is required.");
      valid = false;
    } else if (!field.checkValidity()) {
      setFieldError(field, "Please enter a valid value.");
      valid = false;
    }
  });
  return valid;
}

function validateStep(step) {
  clearValidationErrors();
  const panel = qs(`[data-form-step="${step}"]`);
  let valid = validateRequiredFields(panel);

  if (Number(step) === 1) {
    const pickup = qs("#pickup-date");
    const returning = qs("#return-date");
    const today = localDateString(new Date());
    if (pickup.value && pickup.value < today) {
      setFieldError(pickup, "Pick-up date cannot be in the past.");
      valid = false;
    }
    if (pickup.value && returning.value && daysBetween(pickup.value, returning.value) < 1) {
      setFieldError(returning, "Return date must be after the pick-up date.");
      valid = false;
    }
  }

  if (Number(step) === 3) {
    const cardNumber = qs("#card-number");
    const expiry = qs("#card-expiry");
    const cvv = qs("#card-cvv");
    const digits = cardNumber.value.replace(/\D/g, "");

    if (digits.length !== 16) {
      setFieldError(cardNumber, "Enter a 16-digit demo card number.");
      valid = false;
    }

    if (!validExpiry(expiry.value)) {
      setFieldError(expiry, "Enter a future expiry date in MM/YY format.");
      valid = false;
    }

    if (!/^\d{3}$/.test(cvv.value)) {
      setFieldError(cvv, "CVV must contain 3 digits.");
      valid = false;
    }
  }

  if (!valid) {
    const firstInvalid = qs('[aria-invalid="true"]', panel);
    firstInvalid?.focus?.();
    toast("Please check the highlighted fields.", "error");
  }
  return valid;
}

function validExpiry(value) {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const expiry = new Date(year, month, 0, 23, 59, 59);
  return expiry >= new Date();
}

function createBooking(event) {
  event.preventDefault();
  for (const step of [1, 2, 3]) {
    showBookingStep(step);
    if (!validateStep(step)) return;
  }

  const car = selectedCar();
  if (!isAvailable(car)) {
    toast("This vehicle is no longer available.", "error");
    return;
  }

  const quote = currentQuote();
  const formData = new FormData(event.target);
  const cardDigits = String(formData.get("cardNumber")).replace(/\D/g, "");
  const bookingNumber = `AZ${String(new Date().getFullYear()).slice(-2)}${Math.floor(10000 + Math.random() * 90000)}`;

  activeBooking = {
    id: bookingNumber,
    carId: car.id,
    customerName: formData.get("customerName"),
    email: formData.get("email"),
    accountId: currentUser?.id || null,
    phone: formData.get("phone"),
    licenceNumber: formData.get("licenceNumber"),
    pickupOffice: formData.get("pickupOffice"),
    returnPark: formData.get("returnPark"),
    pickupDate: formData.get("pickupDate"),
    returnDate: formData.get("returnDate"),
    rentalDays: quote.days,
    rentalCost: quote.baseCost,
    extrasCost: quote.extrasCost,
    selectedExtras: quote.selectedExtras,
    damageCost: 0,
    damageDescription: "",
    finalTotal: quote.total,
    cardLastFour: cardDigits.slice(-4),
    status: "reserved",
    createdAt: new Date().toISOString(),
    returnedAt: null,
    inspectedAt: null,
    paidAt: null
  };

  saveBooking();
  qs("#card-number").value = "";
  qs("#card-expiry").value = "";
  qs("#card-cvv").value = "";
  renderFeaturedCars();
  renderFleet();
  toast(`Reservation ${bookingNumber} created successfully.`);
  showView("rental");
}

function statusIndex(status) {
  return journeyStages.findIndex((stage) => stage.status === status);
}

function journeyMarkup(status) {
  const activeIndex = statusIndex(status);
  return `
    <ol class="journey-progress" aria-label="Rental progress">
      ${journeyStages
        .map((stage, index) => {
          const className = index < activeIndex ? "done" : index === activeIndex ? "active" : "";
          return `<li class="${className}">${escapeHTML(stage.label)}</li>`;
        })
        .join("")}
    </ol>`;
}

function bookingDetailsMarkup(booking, car) {
  return `
    <div class="booking-reference-row">
      <div><small>Booking reference</small><strong>${escapeHTML(booking.id)}</strong></div>
      <span class="status-badge status-${booking.status}">${escapeHTML(statusLabels[booking.status])}</span>
    </div>
    <div class="rental-car-summary">
      <div class="mini-car-art">${carPhoto(car, "mini-car-photo", "eager")}</div>
      <div>
        <p class="eyebrow">${escapeHTML(car.category)}</p>
        <h2>${escapeHTML(car.name)}</h2>
        <p>${car.seats} seats · ${escapeHTML(car.transmission)} · ${escapeHTML(car.fuel)}</p>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-item"><small>Customer</small><strong>${escapeHTML(booking.customerName)}</strong></div>
      <div class="detail-item"><small>Rental period</small><strong>${dateLabel(booking.pickupDate)} – ${dateLabel(booking.returnDate)}</strong></div>
      <div class="detail-item"><small>Pick-up office</small><strong>${escapeHTML(booking.pickupOffice)}</strong></div>
      <div class="detail-item"><small>Return car park</small><strong>${escapeHTML(booking.returnPark)}</strong></div>
    </div>`;
}

function nextCustomerActionMarkup() {
  if (!activeBooking) return "";

  if (activeBooking.status === "reserved") {
    return `
      <div class="next-action">
        <h3>Next: collect the car</h3>
        <p>Visit ${escapeHTML(activeBooking.pickupOffice)} with your licence. Use the button below to simulate the counter handover.</p>
        <button class="button" type="button" data-rental-action="collect">Confirm car collection</button>
      </div>`;
  }

  if (activeBooking.status === "rented") {
    return `
      <div class="next-action">
        <h3>Return the car</h3>
        <p>Park the vehicle at the designated AZoom car park and submit the return details.</p>
        <form class="inline-form" id="return-form">
          <div class="field">
            <label for="return-location-confirm">Return car park</label>
            <input id="return-location-confirm" name="returnPark" type="text" value="${escapeHTML(activeBooking.returnPark)}" readonly required />
            <small class="field-hint">This is the designated location selected during booking.</small>
          </div>
          <div class="form-grid two-columns">
            <div class="field">
              <label for="return-odometer">Odometer reading (km)</label>
              <input id="return-odometer" name="odometer" type="number" min="1" max="999999" placeholder="25340" required />
            </div>
            <div class="field">
              <label for="fuel-level">Fuel / charge level</label>
              <select id="fuel-level" name="fuelLevel" required>
                <option value="Full">Full</option>
                <option value="Three quarters">Three quarters</option>
                <option value="Half">Half</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label for="customer-return-note">Return note (optional)</label>
            <textarea id="customer-return-note" name="returnNote" maxlength="250" placeholder="Anything the inspection team should know"></textarea>
          </div>
          <button class="button" type="submit">Confirm vehicle return</button>
        </form>
      </div>`;
  }

  if (activeBooking.status === "awaiting-inspection") {
    return `
      <div class="next-action">
        <h3>Waiting for employee inspection</h3>
        <p>The vehicle was returned to ${escapeHTML(activeBooking.returnPark)}. An AZoom employee must inspect it before the final bill is ready.</p>
        <button class="button" type="button" data-view-target="staff">Open staff inspection demo</button>
      </div>`;
  }

  if (activeBooking.status === "inspected") {
    return `
      <div class="next-action">
        <h3>Your final bill is ready</h3>
        <p>The employee inspection is complete. Review the bill and use the demo payment button to finish the rental.</p>
      </div>`;
  }

  return `
    <div class="success-panel">
      <div class="empty-icon" aria-hidden="true">✓</div>
      <h2>Rental completed</h2>
      <p>Thank you, ${escapeHTML(activeBooking.customerName)}. The final payment was recorded successfully.</p>
      <button class="button button-secondary" type="button" data-rental-action="print">Print receipt</button>
    </div>`;
}

function billMarkup() {
  if (!activeBooking || !["inspected", "completed"].includes(activeBooking.status)) return "";
  const extrasList = activeBooking.selectedExtras
    .map((key) => extras[key]?.label)
    .filter(Boolean)
    .join(", ");

  return `
    <article class="bill-card receipt">
      <p class="eyebrow">Final bill</p>
      <h2>Payment summary</h2>
      <p>Prepared after the vehicle return inspection.</p>
      <div class="bill-lines">
        <div class="bill-line"><span>Car rental (${activeBooking.rentalDays} days)</span><strong>${money(activeBooking.rentalCost)}</strong></div>
        <div class="bill-line"><span>Extras${extrasList ? `: ${escapeHTML(extrasList)}` : ""}</span><strong>${money(activeBooking.extrasCost)}</strong></div>
        <div class="bill-line"><span>Vehicle damage charge</span><strong>${money(activeBooking.damageCost)}</strong></div>
        <div class="bill-line"><span>Card</span><strong>•••• ${escapeHTML(activeBooking.cardLastFour)}</strong></div>
      </div>
      <div class="bill-total"><span>Final total</span><strong>${money(activeBooking.finalTotal)}</strong></div>
      ${activeBooking.damageDescription ? `<p class="bill-note"><strong>Inspection note:</strong> ${escapeHTML(activeBooking.damageDescription)}</p>` : ""}
      <div class="form-actions">
        <button class="button button-secondary" type="button" data-rental-action="print">Print bill</button>
        ${activeBooking.status === "inspected" ? `<button class="button" type="button" data-rental-action="pay">Pay final bill</button>` : ""}
      </div>
    </article>`;
}

function renderRentalDashboard() {
  const container = qs("#rental-dashboard");
  if (!activeBooking) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">⌁</div>
        <h2>No active rental yet</h2>
        <p>Choose a car and complete the reservation form. Your booking journey will appear here.</p>
        <button class="button" type="button" data-view-target="fleet">Browse available cars</button>
      </div>`;
    return;
  }

  if (!canCurrentUserAccessBooking()) {
    container.innerHTML = currentUser
      ? `<div class="empty-state">
          <div class="empty-icon" aria-hidden="true">◉</div>
          <h2>No rental linked to this account</h2>
          <p>This classroom demo keeps one active booking at a time. Log in with the account that created it, or reset the demo data to start again.</p>
          <button class="button" type="button" data-auth-open="login">Open account settings</button>
        </div>`
      : `<div class="empty-state">
          <div class="empty-icon" aria-hidden="true">◎</div>
          <h2>Log in to view this rental</h2>
          <p>This booking is linked to a customer account. Log in with the account that created it to continue the rental journey.</p>
          <button class="button" type="button" data-auth-open="login">Log in</button>
        </div>`;
    return;
  }

  const car = carForBooking();
  container.innerHTML = `
    <div class="rental-top-grid">
      <article class="dashboard-card">
        ${bookingDetailsMarkup(activeBooking, car)}
        ${nextCustomerActionMarkup()}
      </article>
      ${billMarkup() || `
        <aside class="dashboard-card">
          <p class="eyebrow">Current estimate</p>
          <h2>${money(activeBooking.rentalCost + activeBooking.extrasCost)}</h2>
          <p>The final total is confirmed after the return inspection. Any damage charge will be listed separately.</p>
          <div class="summary-list">
            <div class="summary-row"><span>Car rental</span><strong>${money(activeBooking.rentalCost)}</strong></div>
            <div class="summary-row"><span>Extras</span><strong>${money(activeBooking.extrasCost)}</strong></div>
            <div class="summary-row"><span>Damage charge</span><strong>Pending inspection</strong></div>
          </div>
        </aside>`}
    </div>
    <article class="dashboard-card journey-card">
      <p class="eyebrow">Rental progress</p>
      <h2>Journey status</h2>
      ${journeyMarkup(activeBooking.status)}
    </article>`;
}

function collectCar() {
  if (!activeBooking || !canCurrentUserAccessBooking() || activeBooking.status !== "reserved") {
    toast("This car cannot be collected at the current stage.", "error");
    return;
  }
  activeBooking.status = "rented";
  activeBooking.collectedAt = new Date().toISOString();
  saveBooking();
  renderRentalDashboard();
  toast("Car collection recorded. Have a safe journey!");
}

function returnCar(event) {
  event.preventDefault();
  if (!activeBooking || !canCurrentUserAccessBooking() || activeBooking.status !== "rented") {
    toast("This booking is not ready for return.", "error");
    return;
  }

  const form = event.target;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const formData = new FormData(form);
  if (formData.get("returnPark") !== activeBooking.returnPark) {
    toast("Please return the vehicle to the designated car park.", "error");
    return;
  }
  activeBooking.odometer = Number(formData.get("odometer"));
  activeBooking.fuelLevel = formData.get("fuelLevel");
  activeBooking.returnNote = formData.get("returnNote");
  activeBooking.returnedAt = new Date().toISOString();
  activeBooking.status = "awaiting-inspection";
  saveBooking();
  renderRentalDashboard();
  toast("Return submitted. The car is waiting for employee inspection.");
}

function renderStaffDashboard() {
  const container = qs("#staff-dashboard");
  if (!activeBooking) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">▣</div>
        <h2>No bookings to inspect</h2>
        <p>Create a customer reservation, collect the car and return it before using the inspection form.</p>
        <button class="button" type="button" data-view-target="fleet">Start a customer booking</button>
      </div>`;
    return;
  }

  const car = carForBooking();
  const awaiting = activeBooking.status === "awaiting-inspection";

  let inspectionContent = "";
  if (awaiting) {
    inspectionContent = `
      <article class="inspection-card">
        <p class="eyebrow">Inspection form</p>
        <h2>Record vehicle condition</h2>
        <p>Complete this form before the customer can pay the final bill.</p>
        <form id="inspection-form" novalidate>
          <fieldset class="extras-fieldset" style="display:block">
            <legend>Was any new damage found?</legend>
            <div class="damage-options">
              <label class="radio-card"><input type="radio" name="damageFound" value="no" checked /> No damage</label>
              <label class="radio-card"><input type="radio" name="damageFound" value="yes" /> Damage found</label>
            </div>
          </fieldset>
          <div id="damage-fields" hidden>
            <div class="field">
              <label for="damage-description">Damage description</label>
              <textarea id="damage-description" name="damageDescription" maxlength="300" placeholder="Example: Small scratch on rear left door"></textarea>
            </div>
            <div class="field" style="margin-top:15px">
              <label for="damage-cost">Damage cost (SGD)</label>
              <input id="damage-cost" name="damageCost" type="number" min="0" max="10000" step="0.01" placeholder="150.00" />
            </div>
          </div>
          <div class="field" style="margin-top:15px">
            <label for="employee-note">Employee note (optional)</label>
            <textarea id="employee-note" name="employeeNote" maxlength="300" placeholder="Vehicle checked at return bay 2"></textarea>
          </div>
          <button class="button" style="margin-top:20px" type="submit">Complete inspection</button>
        </form>
      </article>`;
  } else if (activeBooking.status === "inspected") {
    inspectionContent = `
      <article class="inspection-card">
        <p class="eyebrow">Inspection completed</p>
        <h2>Final bill prepared</h2>
        <p>The customer can now review and pay ${money(activeBooking.finalTotal)}.</p>
        <div class="summary-list">
          <div class="summary-row"><span>Damage result</span><strong>${activeBooking.damageCost > 0 ? "Damage found" : "No damage"}</strong></div>
          <div class="summary-row"><span>Damage cost</span><strong>${money(activeBooking.damageCost)}</strong></div>
          <div class="summary-row"><span>Final total</span><strong>${money(activeBooking.finalTotal)}</strong></div>
        </div>
        <button class="button" type="button" data-view-target="rental">Open customer bill</button>
      </article>`;
  } else {
    const messages = {
      reserved: "The customer has reserved the car but has not collected it yet.",
      rented: "The car is currently rented. An inspection can start after the customer submits the return.",
      completed: "This rental has been inspected and fully paid. The vehicle is available again."
    };
    inspectionContent = `
      <article class="inspection-card">
        <p class="eyebrow">Current status</p>
        <h2>${escapeHTML(statusLabels[activeBooking.status])}</h2>
        <p>${escapeHTML(messages[activeBooking.status] || "No employee action is required at this time.")}</p>
        <button class="button button-secondary" type="button" data-view-target="rental">Open customer journey</button>
      </article>`;
  }

  container.innerHTML = `
    <div class="staff-grid">
      <article class="dashboard-card">
        ${bookingDetailsMarkup(activeBooking, car)}
        <div class="summary-list">
          <div class="summary-row"><span>Returned odometer</span><strong>${activeBooking.odometer ? `${activeBooking.odometer.toLocaleString()} km` : "Not returned"}</strong></div>
          <div class="summary-row"><span>Fuel / charge</span><strong>${escapeHTML(activeBooking.fuelLevel || "Not recorded")}</strong></div>
          <div class="summary-row"><span>Customer note</span><strong>${escapeHTML(activeBooking.returnNote || "None")}</strong></div>
        </div>
      </article>
      ${inspectionContent}
    </div>`;
}

function toggleDamageFields(event) {
  if (event.target.name !== "damageFound") return;
  const damageFound = event.target.value === "yes";
  const fields = qs("#damage-fields");
  if (!fields) return;
  fields.hidden = !damageFound;
  qs("#damage-description").required = damageFound;
  qs("#damage-cost").required = damageFound;
  if (!damageFound) {
    qs("#damage-description").value = "";
    qs("#damage-cost").value = "";
  }
}

function completeInspection(event) {
  event.preventDefault();
  if (!activeBooking || activeBooking.status !== "awaiting-inspection") {
    toast("This booking is not ready for inspection.", "error");
    return;
  }

  clearValidationErrors();
  const form = event.target;
  const formData = new FormData(form);
  const damageFound = formData.get("damageFound") === "yes";
  const description = String(formData.get("damageDescription") || "").trim();
  const cost = Number(formData.get("damageCost") || 0);
  let valid = true;

  if (damageFound && !description) {
    setFieldError(qs("#damage-description"), "Describe the damage found during inspection.");
    valid = false;
  }
  if (damageFound && (!Number.isFinite(cost) || cost <= 0 || cost > 10000)) {
    setFieldError(qs("#damage-cost"), "Enter a damage cost between $0.01 and $10,000.");
    valid = false;
  }
  if (!valid) {
    toast("Complete the required damage details.", "error");
    return;
  }

  activeBooking.damageCost = damageFound ? Math.round(cost * 100) / 100 : 0;
  activeBooking.damageDescription = damageFound ? description : "No new damage found during inspection.";
  activeBooking.employeeNote = formData.get("employeeNote") || "";
  activeBooking.finalTotal = activeBooking.rentalCost + activeBooking.extrasCost + activeBooking.damageCost;
  activeBooking.inspectedAt = new Date().toISOString();
  activeBooking.status = "inspected";
  saveBooking();
  renderStaffDashboard();
  toast("Inspection completed and final bill prepared.");
}

function payFinalBill() {
  if (!activeBooking || !canCurrentUserAccessBooking() || activeBooking.status !== "inspected") {
    toast("The final bill is not ready for payment.", "error");
    return;
  }
  activeBooking.status = "completed";
  activeBooking.paidAt = new Date().toISOString();
  saveBooking();
  renderRentalDashboard();
  renderFeaturedCars();
  renderFleet();
  toast("Final payment successful. Rental completed!");
}

function resetDemo() {
  const confirmed = window.confirm("Reset the booking and return all vehicles to available status?");
  if (!confirmed) return;
  activeBooking = null;
  saveBooking();
  qs("#booking-form").reset();
  applyDefaultDates();
  renderAll();
  showView("home");
  toast("Demo data has been reset.");
}

function formatCardNumber(event) {
  const digits = event.target.value.replace(/\D/g, "").slice(0, 16);
  event.target.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(event) {
  const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
  event.target.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function setupTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark") document.body.classList.add("dark-theme");
  const dark = document.body.classList.contains("dark-theme");
  qs("#theme-toggle span").textContent = dark ? "☀" : "☾";
  qs("#theme-toggle").setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
}

function toggleTheme() {
  document.body.classList.toggle("dark-theme");
  const dark = document.body.classList.contains("dark-theme");
  localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  qs("#theme-toggle span").textContent = dark ? "☀" : "☾";
  qs("#theme-toggle").setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
}

function renderAll() {
  renderFeaturedCars();
  renderFleet();
  renderBookingSummary();
  renderRentalDashboard();
  renderStaffDashboard();
}

document.addEventListener("click", (event) => {
  const authOpen = event.target.closest("#account-button, [data-auth-open]");
  if (authOpen) {
    openAuthModal(authOpen.dataset.authOpen || "login");
    return;
  }

  if (event.target.closest("[data-auth-close]")) {
    closeAuthModal();
    return;
  }

  const authTab = event.target.closest("[data-auth-panel-target]");
  if (authTab) {
    setAuthMode(authTab.dataset.authPanelTarget, true);
    return;
  }

  if (event.target.closest("#logout-button")) {
    logoutAccount();
    return;
  }

  const viewButton = event.target.closest("[data-view-target]");
  if (viewButton) {
    showView(viewButton.dataset.viewTarget);
    return;
  }

  const carButton = event.target.closest(".car-book-button");
  if (carButton) {
    startBooking(carButton.dataset.carId);
    return;
  }

  const nextButton = event.target.closest("[data-next-step]");
  if (nextButton && validateStep(currentBookingStep)) {
    showBookingStep(nextButton.dataset.nextStep);
    qs("#booking-view").scrollIntoView({ behavior: "smooth" });
    return;
  }

  const previousButton = event.target.closest("[data-prev-step]");
  if (previousButton) {
    showBookingStep(previousButton.dataset.prevStep);
    return;
  }

  const actionButton = event.target.closest("[data-rental-action]");
  if (actionButton) {
    const action = actionButton.dataset.rentalAction;
    if (action === "collect") collectCar();
    if (action === "pay") payFinalBill();
    if (action === "print") window.print();
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id === "login-form") {
    loginAccount(event);
    return;
  }
  if (event.target.id === "register-form") {
    registerAccount(event);
    return;
  }
  if (event.target.id === "quick-search-form") {
    event.preventDefault();
    const pickup = qs("#quick-pickup");
    const returning = qs("#quick-return");
    if (daysBetween(pickup.value, returning.value) < 1) {
      toast("Return date must be after the pick-up date.", "error");
      returning.focus();
      return;
    }
    showView("fleet");
  }
  if (event.target.id === "booking-form") createBooking(event);
  if (event.target.id === "return-form") returnCar(event);
  if (event.target.id === "inspection-form") completeInspection(event);
});

document.addEventListener("keydown", (event) => {
  const modal = qs("#auth-modal");
  if (modal.hidden) return;
  const authTab = event.target.closest?.("[data-auth-panel-target]");
  if (authTab && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
    const nextMode = authTab.dataset.authPanelTarget === "login" ? "register" : "login";
    setAuthMode(nextMode);
    qs(`[data-auth-panel-target="${nextMode}"]`).focus();
    return;
  }
  if (event.key === "Escape") {
    closeAuthModal();
    return;
  }
  if (event.key !== "Tab") return;

  const focusable = qsa('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', modal)
    .filter((element) => !element.hidden && element.offsetParent !== null);
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

document.addEventListener("change", (event) => {
  if (event.target.matches('#booking-form input, #booking-form select')) renderBookingSummary();
  if (event.target.name === "damageFound") toggleDamageFields(event);
});

qs("#car-search").addEventListener("input", renderFleet);
qs("#category-filter").addEventListener("change", renderFleet);
qs("#price-sort").addEventListener("change", renderFleet);
qs("#card-number").addEventListener("input", formatCardNumber);
qs("#card-expiry").addEventListener("input", formatExpiry);
qs("#theme-toggle").addEventListener("click", toggleTheme);
qs("#reset-demo").addEventListener("click", resetDemo);
qs("#menu-toggle").addEventListener("click", () => {
  const nav = qs("#main-navigation");
  const open = nav.classList.toggle("open");
  qs("#menu-toggle").setAttribute("aria-expanded", String(open));
});

applyDefaultDates();
setupTheme();
renderAuthUI();
renderAll();
