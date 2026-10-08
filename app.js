// ==========================================================================
// EVENT MANAGEMENT SYSTEM - CORE JAVASCRIPT
// ==========================================================================

const API_TIMEOUT = 10000;

// API Utility
const api = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(result?.detail || "Something went wrong. Please try again.");
  }
  return result;
};

// Toast Notifications
const showToast = (message, type = "info") => {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

const showError = (error) => showToast(error.message || String(error), "error");

// --------------------------------------------------------------------------
// Auth & Role Management
// --------------------------------------------------------------------------
const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem("ems_user") || localStorage.getItem("eventease-user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const setCurrentUser = (user) => {
  localStorage.setItem("ems_user", JSON.stringify(user));
  localStorage.setItem("eventease-user", JSON.stringify(user));
  if (user?.email) localStorage.setItem("userEmail", user.email);
};

const clearUser = () => {
  localStorage.removeItem("ems_user");
  localStorage.removeItem("eventease-user");
  localStorage.removeItem("userEmail");
};

const isAdmin = () => {
  const user = getCurrentUser();
  return Boolean(user && (user.role || "").toLowerCase() === "admin");
};

const isLoggedIn = () => {
  return Boolean(getCurrentUser()?.email);
};

// --------------------------------------------------------------------------
// Page Protection / Access Guard
// --------------------------------------------------------------------------
const protectPage = ({ requireAdmin = false } = {}) => {
  const currentPath = window.location.pathname.toLowerCase();
  const user = getCurrentUser();

  if (!user) {
    // If on a protected page without auth, redirect to login
    showToast("Please log in to continue.", "info");
    window.location.replace("/login.html");
    return false;
  }

  if (requireAdmin && !isAdmin()) {
    showToast("Access denied: Administrator privileges required.", "error");
    window.location.replace("/dashboard.html");
    return false;
  }

  return true;
};

// Auto-check page protection based on filename
const currentFile = window.location.pathname.split("/").pop().toLowerCase();
const ADMIN_PAGES = ["add_event.html", "edit_event.html", "delete_event.html", "registered_users.html"];
const AUTH_PAGES = ["dashboard.html", ...ADMIN_PAGES];

if (ADMIN_PAGES.includes(currentFile)) {
  protectPage({ requireAdmin: true });
} else if (AUTH_PAGES.includes(currentFile)) {
  protectPage({ requireAdmin: false });
}

// --------------------------------------------------------------------------
// Dynamic Navbar & Navigation Links
// --------------------------------------------------------------------------
const initNavbar = () => {
  const user = getCurrentUser();
  const navContainer = document.querySelector(".navbar .nav-links");

  if (!navContainer) return;

  if (user) {
    const roleBadge = isAdmin()
      ? `<span class="user-badge badge-admin">👑 Admin: ${escapeHtml(user.username || "Admin")}</span>`
      : `<span class="user-badge badge-user">👤 Attendee: ${escapeHtml(user.username || "User")}</span>`;

    let linksHtml = "";
    if (isAdmin()) {
      linksHtml = `
        <a href="/dashboard.html" class="nav-link ${currentFile === 'dashboard.html' ? 'active' : ''}">Dashboard</a>
        <a href="/events.html" class="nav-link ${currentFile === 'events.html' ? 'active' : ''}">Manage Events</a>
        <a href="/add_event.html" class="nav-link ${currentFile === 'add_event.html' ? 'active' : ''}">+ Add Event</a>
        <a href="/interested_events.html" class="nav-link ${currentFile === 'interested_events.html' ? 'active' : ''}">Registrations</a>
        <a href="/about.html" class="nav-link ${currentFile === 'about.html' ? 'active' : ''}">About</a>
        ${roleBadge}
        <a href="/logout.html" class="btn btn-sm btn-secondary">Logout</a>
      `;
    } else {
      linksHtml = `
        <a href="/dashboard.html" class="nav-link ${currentFile === 'dashboard.html' ? 'active' : ''}">Dashboard</a>
        <a href="/events.html" class="nav-link ${currentFile === 'events.html' ? 'active' : ''}">Browse Events</a>
        <a href="/interested_events.html" class="nav-link ${currentFile === 'interested_events.html' ? 'active' : ''}">My Registrations</a>
        <a href="/about.html" class="nav-link ${currentFile === 'about.html' ? 'active' : ''}">About</a>
        ${roleBadge}
        <a href="/logout.html" class="btn btn-sm btn-secondary">Logout</a>
      `;
    }
    navContainer.innerHTML = linksHtml;
  } else {
    navContainer.innerHTML = `
      <a href="/home.html" class="nav-link ${currentFile === 'home.html' ? 'active' : ''}">Home</a>
      <a href="/events.html" class="nav-link ${currentFile === 'events.html' ? 'active' : ''}">Events</a>
      <a href="/about.html" class="nav-link ${currentFile === 'about.html' ? 'active' : ''}">About</a>
      <a href="/login.html" class="btn btn-sm btn-secondary">Login</a>
      <a href="/register.html" class="btn btn-sm btn-primary">Register</a>
    `;
  }
};

const escapeHtml = (str) => {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// --------------------------------------------------------------------------
// Auth Forms: Register & Login
// --------------------------------------------------------------------------
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(registerForm));

    if (data.password !== data.confirm_password) {
      showToast("Passwords do not match.", "error");
      return;
    }

    try {
      const user = await api("/api/register", {
        method: "POST",
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim(),
          password: data.password,
          role: data.role || "user",
        }),
      });

      setCurrentUser(user);
      showToast(`Account created successfully as ${user.role}! Redirecting...`, "success");
      setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 800);
    } catch (err) {
      showError(err);
    }
  });
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(loginForm));

    try {
      const user = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({
          email: data.email.trim(),
          password: data.password,
        }),
      });

      setCurrentUser(user);
      showToast(`Welcome back, ${user.username}!`, "success");
      setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 600);
    } catch (err) {
      showError(err);
    }
  });
}

// --------------------------------------------------------------------------
// Dashboard (Role-Based Views)
// --------------------------------------------------------------------------
const initDashboard = async () => {
  const dashboardContainer = document.querySelector(".main-content");
  if (!dashboardContainer || currentFile !== "dashboard.html") return;

  const user = getCurrentUser();
  if (!user) return;

  // Set welcome message & role badge
  const welcomeEl = document.getElementById("welcome-name");
  if (welcomeEl) {
    welcomeEl.innerHTML = `Welcome, <strong>${escapeHtml(user.username)}</strong>! <span class="user-badge ${isAdmin() ? 'badge-admin' : 'badge-user'}">${isAdmin() ? '👑 Administrator' : '👤 Attendee'}</span>`;
  }

  try {
    const allEvents = await api("/api/events");
    const today = new Date().toISOString().slice(0, 10);
    const upcomingEvents = allEvents.filter((item) => item.event_date >= today);

    if (isAdmin()) {
      // ADMIN DASHBOARD
      const registrations = await api(`/api/interested-events?admin_email=${encodeURIComponent(user.email)}`).catch(() => []);
      
      const statsContainer = document.querySelector(".stats-container, .stats-grid");
      if (statsContainer) {
        statsContainer.innerHTML = `
          <div class="stat-card">
            <div class="stat-info">
              <h3>Total Events</h3>
              <p>${allEvents.length}</p>
            </div>
            <div class="stat-icon indigo">📅</div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <h3>Upcoming Events</h3>
              <p>${upcomingEvents.length}</p>
            </div>
            <div class="stat-icon blue">⏰</div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <h3>Total Registrations</h3>
              <p>${registrations.length}</p>
            </div>
            <div class="stat-icon emerald">👥</div>
          </div>
        `;
      }

      // Quick Actions for Admin
      const quickActions = document.querySelector(".action-container, .card-grid");
      if (quickActions) {
        quickActions.innerHTML = `
          <div class="card">
            <h3>+ Create Event</h3>
            <p>Publish a new event, specify date, venue, category, and competition.</p>
            <a href="/add_event.html" class="btn btn-primary btn-sm">+ Add Event</a>
          </div>
          <div class="card">
            <h3>Manage Events</h3>
            <p>View, edit, or remove all scheduled events.</p>
            <a href="/events.html" class="btn btn-secondary btn-sm">Manage Events</a>
          </div>
          <div class="card">
            <h3>All Registrations</h3>
            <p>Review attendees across all events and download certificates.</p>
            <a href="/interested_events.html" class="btn btn-secondary btn-sm">View Registrations</a>
          </div>
        `;
      }

      // Recent Events Table for Admin
      const tableHead = document.querySelector(".recent-events table thead tr");
      if (tableHead) {
        tableHead.innerHTML = `
          <th>Event Name</th>
          <th>Date</th>
          <th>Venue</th>
          <th>Category</th>
          <th>Actions</th>
        `;
      }
      const tableBody = document.querySelector(".recent-events tbody");
      if (tableBody) {
        tableBody.innerHTML = allEvents.length === 0
          ? `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">No events scheduled yet. <a href="/add_event.html">Create the first event</a></td></tr>`
          : allEvents.slice(0, 5).map((evt) => `
            <tr>
              <td><strong>${escapeHtml(evt.event_name)}</strong></td>
              <td>${escapeHtml(evt.event_date)} ${escapeHtml(evt.event_time)}</td>
              <td>${escapeHtml(evt.venue)}</td>
              <td><span class="pill pill-indigo">${escapeHtml(evt.category || 'General')}</span></td>
              <td>
                <div class="actions">
                  <a href="/edit_event.html?id=${encodeURIComponent(evt.id)}" class="btn btn-sm btn-secondary">Edit</a>
                  <a href="/registered_users.html?id=${encodeURIComponent(evt.id)}" class="btn btn-sm btn-secondary">Users</a>
                </div>
              </td>
            </tr>
          `).join("");
      }

    } else {
      // ATTENDEE / USER DASHBOARD
      const myRegistrations = await api(`/api/user/registrations?user_email=${encodeURIComponent(user.email)}`).catch(() => []);
      const myUpcoming = myRegistrations.filter((item) => item.event_date >= today);

      const statsContainer = document.querySelector(".stats-container, .stats-grid");
      if (statsContainer) {
        statsContainer.innerHTML = `
          <div class="stat-card">
            <div class="stat-info">
              <h3>Available Events</h3>
              <p>${allEvents.length}</p>
            </div>
            <div class="stat-icon indigo">📅</div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <h3>My Registrations</h3>
              <p>${myRegistrations.length}</p>
            </div>
            <div class="stat-icon emerald">🎟️</div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <h3>Upcoming Enrolled</h3>
              <p>${myUpcoming.length}</p>
            </div>
            <div class="stat-icon blue">⏳</div>
          </div>
        `;
      }

      // Quick Actions for Attendee
      const quickActions = document.querySelector(".action-container, .card-grid");
      if (quickActions) {
        quickActions.innerHTML = `
          <div class="card">
            <h3>Explore Events</h3>
            <p>Browse through all available events and enroll in competitions.</p>
            <a href="/events.html" class="btn btn-primary btn-sm">Browse Events</a>
          </div>
          <div class="card">
            <h3>My Registrations</h3>
            <p>Check the events you are registered for and download certificates.</p>
            <a href="/interested_events.html" class="btn btn-secondary btn-sm">My Registrations</a>
          </div>
        `;
      }

      // Change section header
      const recentHeader = document.querySelector(".recent-events h2");
      if (recentHeader) recentHeader.textContent = "My Registered Events";

      const tableHead = document.querySelector(".recent-events table thead tr");
      if (tableHead) {
        tableHead.innerHTML = `
          <th>Event Name</th>
          <th>Competition</th>
          <th>Date</th>
          <th>Venue</th>
          <th>Certificate</th>
        `;
      }

      const tableBody = document.querySelector(".recent-events tbody");
      if (tableBody) {
        tableBody.innerHTML = myRegistrations.length === 0
          ? `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">You haven't registered for any events yet. <a href="/events.html">Browse events and register</a>!</td></tr>`
          : myRegistrations.map((reg) => `
            <tr>
              <td><strong>${escapeHtml(reg.event_name)}</strong></td>
              <td><span class="pill pill-emerald">${escapeHtml(reg.competition)}</span></td>
              <td>${escapeHtml(reg.event_date)} ${escapeHtml(reg.event_time)}</td>
              <td>${escapeHtml(reg.venue)}</td>
              <td>
                <a href="/api/events/${encodeURIComponent(reg.event_id)}/certificate?user_email=${encodeURIComponent(user.email)}&requester_email=${encodeURIComponent(user.email)}" target="_blank" class="btn btn-sm btn-secondary">
                  📥 Download PDF
                </a>
              </td>
            </tr>
          `).join("");
      }
    }
  } catch (err) {
    showError(err);
  }
};

// --------------------------------------------------------------------------
// Events Page (Role-Based Actions & Registration Modal)
// --------------------------------------------------------------------------
const initEventsPage = async () => {
  const eventsTable = document.getElementById("eventsTable");
  if (!eventsTable || currentFile !== "events.html") return;

  const user = getCurrentUser();
  const eventsBody = eventsTable.querySelector("tbody");
  const searchInput = document.getElementById("search");
  const completedBtn = document.getElementById("completedBtn");
  const emptyMessage = document.getElementById("emptyMessage");
  const addBtn = document.querySelector(".add-btn");
  const interestedBtn = document.querySelector("a[href*='interested_events']");

  // Admin visibility controls
  if (addBtn) {
    addBtn.style.display = isAdmin() ? "inline-flex" : "none";
  }
  if (interestedBtn) {
    interestedBtn.querySelector("button, a")?.textContent || (interestedBtn.textContent = isAdmin() ? "All Registrations" : "My Registrations");
  }

  let events = [];
  let userRegistrationsMap = {}; // eventId -> competition
  let showCompleted = false;

  // Fetch registered events for user if logged in
  if (user?.email && !isAdmin()) {
    try {
      const myRegs = await api(`/api/user/registrations?user_email=${encodeURIComponent(user.email)}`);
      myRegs.forEach((r) => {
        userRegistrationsMap[r.event_id] = r.competition;
      });
    } catch {
      // ignore
    }
  }

  // Create Registration Modal Dialog
  let modalOverlay = document.getElementById("registration-modal");
  if (!modalOverlay) {
    modalOverlay = document.createElement("div");
    modalOverlay.id = "registration-modal";
    modalOverlay.className = "modal-overlay";
    modalOverlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="modal-event-title">Event Registration</h2>
          <button type="button" class="modal-close" id="modal-close-btn">&times;</button>
        </div>
        <p style="color:var(--text-muted); margin-bottom: 1.25rem; font-size:0.9375rem;" id="modal-event-subtitle">Select the competition you would like to participate in.</p>
        <form id="modal-registration-form">
          <input type="hidden" id="modal-event-id" />
          <div class="form-group">
            <label for="modal-competition">Competition / Activity</label>
            <select id="modal-competition" required>
              <option value="">Select a competition...</option>
              <option value="Painting">Painting</option>
              <option value="Pencil Drawing">Pencil Drawing</option>
              <option value="Singing">Singing</option>
              <option value="Dance">Dance</option>
              <option value="Quiz">Quiz</option>
              <option value="Paper Presentation">Paper Presentation</option>
              <option value="Coding">Coding</option>
              <option value="General Participation">General Participation</option>
            </select>
          </div>
          <div class="form-group">
            <label for="modal-custom-comp">Or enter custom activity (optional)</label>
            <input type="text" id="modal-custom-comp" placeholder="e.g. Instrumental Music" />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" style="flex:1;">Confirm Registration</button>
            <button type="button" class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modalOverlay);

    const closeModal = () => modalOverlay.classList.remove("active");
    document.getElementById("modal-close-btn").addEventListener("click", closeModal);
    document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    document.getElementById("modal-registration-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const eventId = document.getElementById("modal-event-id").value;
      const compSelect = document.getElementById("modal-competition").value;
      const compCustom = document.getElementById("modal-custom-comp").value.trim();
      const selectedComp = compCustom || compSelect;

      if (!selectedComp) {
        showToast("Please select or enter a competition.", "error");
        return;
      }

      try {
        await api(
          `/api/events/${encodeURIComponent(eventId)}/register?user_email=${encodeURIComponent(user.email)}&competition=${encodeURIComponent(selectedComp)}`,
          { method: "POST" }
        );
        userRegistrationsMap[eventId] = selectedComp;
        closeModal();
        showToast(`Successfully registered for ${selectedComp}!`, "success");
        renderEvents();
      } catch (err) {
        showError(err);
      }
    });
  }

  const openRegistrationModal = (eventId, eventName) => {
    if (!isLoggedIn()) {
      showToast("Please log in to register for events.", "info");
      setTimeout(() => (window.location.href = "/login.html"), 1000);
      return;
    }
    document.getElementById("modal-event-id").value = eventId;
    document.getElementById("modal-event-title").textContent = `Register for ${eventName}`;
    document.getElementById("modal-competition").value = "";
    document.getElementById("modal-custom-comp").value = "";
    modalOverlay.classList.add("active");
  };

  const renderEvents = () => {
    const query = searchInput?.value.trim().toLowerCase() || "";
    const today = new Date().toISOString().slice(0, 10);

    const filtered = events.filter((item) => {
      const text = `${item.event_name} ${item.venue} ${item.category} ${item.description}`.toLowerCase();
      const matchesSearch = text.includes(query);
      const isPast = item.event_date < today;
      const matchesCompleted = !showCompleted || isPast;
      return matchesSearch && matchesCompleted;
    });

    eventsBody.replaceChildren();

    if (filtered.length === 0) {
      if (emptyMessage) emptyMessage.hidden = false;
      return;
    }
    if (emptyMessage) emptyMessage.hidden = true;

    filtered.forEach((item) => {
      const row = document.createElement("tr");

      // Event Details
      const isPast = item.event_date < today;
      const dateBadge = isPast ? `<span class="pill pill-gray">Completed</span>` : `<span class="pill pill-amber">Upcoming</span>`;

      row.innerHTML = `
        <td>
          <strong>${escapeHtml(item.event_name)}</strong>
          <div style="margin-top:4px;">${dateBadge} <span class="pill pill-indigo">${escapeHtml(item.category || 'General')}</span></div>
        </td>
        <td>${escapeHtml(item.event_date)}</td>
        <td>${escapeHtml(item.event_time)}</td>
        <td>${escapeHtml(item.venue)}</td>
        <td style="max-width:240px; font-size:0.875rem; color:var(--text-muted);">${escapeHtml(item.description || '-')}</td>
        <td class="actions"></td>
      `;

      const actionsCell = row.querySelector(".actions");

      if (isAdmin()) {
        actionsCell.innerHTML = `
          <a href="/edit_event.html?id=${encodeURIComponent(item.id)}" class="btn btn-sm btn-secondary">Edit</a>
          <a href="/registered_users.html?id=${encodeURIComponent(item.id)}" class="btn btn-sm btn-secondary">Users</a>
          <a href="/delete_event.html?id=${encodeURIComponent(item.id)}" class="btn btn-sm btn-danger">Delete</a>
        `;
      } else {
        const isRegistered = Boolean(userRegistrationsMap[item.id]);

        if (isRegistered) {
          actionsCell.innerHTML = `
            <span class="pill pill-emerald" style="padding:0.4rem 0.65rem;">✓ Registered (${escapeHtml(userRegistrationsMap[item.id])})</span>
            <a href="/api/events/${encodeURIComponent(item.id)}/certificate?user_email=${encodeURIComponent(user?.email || '')}&requester_email=${encodeURIComponent(user?.email || '')}" target="_blank" class="btn btn-sm btn-secondary">
              📥 Certificate
            </a>
          `;
        } else {
          const registerBtn = document.createElement("button");
          registerBtn.className = "btn btn-sm btn-primary";
          registerBtn.textContent = "Register";
          registerBtn.addEventListener("click", () => openRegistrationModal(item.id, item.event_name));
          actionsCell.appendChild(registerBtn);
        }
      }

      eventsBody.appendChild(row);
    });
  };

  if (searchInput) searchInput.addEventListener("input", renderEvents);

  if (completedBtn) {
    completedBtn.addEventListener("click", () => {
      showCompleted = !showCompleted;
      completedBtn.textContent = showCompleted ? "All Events" : "Completed Events";
      completedBtn.className = showCompleted ? "btn btn-sm btn-secondary" : "btn btn-sm btn-outline";
      renderEvents();
    });
  }

  try {
    events = await api("/api/events");
    renderEvents();
  } catch (err) {
    showError(err);
  }
};

// --------------------------------------------------------------------------
// Add / Edit Event Forms
// --------------------------------------------------------------------------
const eventFormFields = ["event_name", "event_date", "event_time", "venue", "category", "description"];
const eventForm = document.getElementById("event-form");

if (eventForm) {
  const eventId = new URLSearchParams(window.location.search).get("id");
  const user = getCurrentUser();

  if (eventId) {
    const pageTitle = document.querySelector(".page-header h1, .form-header h1, .container h1");
    if (pageTitle) pageTitle.textContent = "Edit Event";
    const submitBtn = eventForm.querySelector("button[type='submit']");
    if (submitBtn) submitBtn.textContent = "Update Event";

    api(`/api/events/${encodeURIComponent(eventId)}`)
      .then((item) => {
        eventFormFields.forEach((field) => {
          if (eventForm.elements[field]) eventForm.elements[field].value = item[field] || "";
        });
      })
      .catch((err) => {
        showError(err);
        window.location.href = "/events.html";
      });
  }

  eventForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isAdmin()) {
      showToast("Only administrators can save events.", "error");
      return;
    }

    const payload = Object.fromEntries(
      eventFormFields.map((f) => [f, eventForm.elements[f]?.value.trim() || ""])
    );

    try {
      const url = eventId
        ? `/api/events/${encodeURIComponent(eventId)}?admin_email=${encodeURIComponent(user.email)}`
        : `/api/events?admin_email=${encodeURIComponent(user.email)}`;

      await api(url, {
        method: eventId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      showToast(`Event ${eventId ? 'updated' : 'created'} successfully!`, "success");
      setTimeout(() => {
        window.location.href = "/events.html";
      }, 700);
    } catch (err) {
      showError(err);
    }
  });
}

// --------------------------------------------------------------------------
// Delete Event Confirmation
// --------------------------------------------------------------------------
const deleteButton = document.getElementById("confirm-delete");
if (deleteButton) {
  const eventId = new URLSearchParams(window.location.search).get("id");
  const user = getCurrentUser();

  if (!eventId) {
    window.location.replace("/events.html");
  } else {
    api(`/api/events/${encodeURIComponent(eventId)}`)
      .then((item) => {
        const nameEl = document.getElementById("delete-event-name");
        if (nameEl) nameEl.textContent = item.event_name;
      })
      .catch((err) => {
        showError(err);
        window.location.href = "/events.html";
      });

    deleteButton.addEventListener("click", async () => {
      try {
        await api(
          `/api/events/${encodeURIComponent(eventId)}?admin_email=${encodeURIComponent(user.email)}`,
          { method: "DELETE" }
        );
        showToast("Event deleted successfully.", "success");
        setTimeout(() => {
          window.location.href = "/events.html";
        }, 600);
      } catch (err) {
        showError(err);
      }
    });
  }
}

// --------------------------------------------------------------------------
// Logout Confirmation
// --------------------------------------------------------------------------
const logoutButton = document.getElementById("confirm-logout");
if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    clearUser();
    showToast("Logged out successfully.", "info");
    setTimeout(() => {
      window.location.href = "/home.html";
    }, 500);
  });
}

// --------------------------------------------------------------------------
// Registered Users (Admin View for a specific Event)
// --------------------------------------------------------------------------
const initRegisteredUsersPage = async () => {
  const usersTable = document.getElementById("usersTable");
  if (!usersTable || currentFile !== "registered_users.html") return;

  const eventId = new URLSearchParams(window.location.search).get("id");
  const user = getCurrentUser();
  const tbody = usersTable.querySelector("tbody");

  if (!eventId) {
    window.location.href = "/events.html";
    return;
  }

  try {
    const eventData = await api(`/api/events/${encodeURIComponent(eventId)}`);
    const pageHeader = document.querySelector(".page-header h1, .container h1");
    if (pageHeader) {
      pageHeader.textContent = `Attendees for "${eventData.event_name}"`;
    }

    const attendees = await api(
      `/api/events/${encodeURIComponent(eventId)}/registrations?admin_email=${encodeURIComponent(user.email)}`
    );

    tbody.innerHTML = "";

    if (attendees.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted);">No attendees have registered for this event yet.</td></tr>`;
      return;
    }

    attendees.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td>${escapeHtml(item.email)}</td>
        <td><span class="pill pill-emerald">${escapeHtml(item.competition || 'General')}</span></td>
        <td>
          <a href="/api/events/${encodeURIComponent(eventId)}/certificate?user_email=${encodeURIComponent(item.email)}&admin_email=${encodeURIComponent(user.email)}" target="_blank" class="btn btn-sm btn-secondary">
            📥 Generate Certificate
          </a>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    showError(err);
  }
};

// --------------------------------------------------------------------------
// Interested Events / Registrations Overview
// --------------------------------------------------------------------------
const initInterestedEventsPage = async () => {
  const interestedTable = document.getElementById("interestedTable");
  if (!interestedTable || currentFile !== "interested_events.html") return;

  const user = getCurrentUser();
  const titleEl = document.querySelector(".page-header h1, .container h1");

  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  try {
    let registrations = [];

    if (isAdmin()) {
      if (titleEl) titleEl.textContent = "All Event Registrations (Admin View)";
      registrations = await api(`/api/interested-events?admin_email=${encodeURIComponent(user.email)}`);
    } else {
      if (titleEl) titleEl.textContent = "My Registered Events";
      const myRegs = await api(`/api/user/registrations?user_email=${encodeURIComponent(user.email)}`);
      registrations = myRegs.map((r) => ({
        name: user.username,
        email: user.email,
        event_id: r.event_id,
        event_name: r.event_name,
        competition: r.competition,
        event_date: r.event_date,
        event_time: r.event_time,
        venue: r.venue,
      }));
    }

    interestedTable.innerHTML = "";

    if (registrations.length === 0) {
      interestedTable.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">No registrations found.</td></tr>`;
      return;
    }

    registrations.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td>${escapeHtml(item.email)}</td>
        <td>${escapeHtml(item.event_name)}</td>
        <td><span class="pill pill-emerald">${escapeHtml(item.competition || 'General')}</span></td>
        <td>${escapeHtml(item.event_date)} ${escapeHtml(item.event_time)}</td>
        <td>${escapeHtml(item.venue)}</td>
        <td>
          <a href="/api/events/${encodeURIComponent(item.event_id || 1)}/certificate?user_email=${encodeURIComponent(item.email)}&requester_email=${encodeURIComponent(user.email)}" target="_blank" class="btn btn-sm btn-secondary">
            📥 Certificate
          </a>
        </td>
      `;
      interestedTable.appendChild(row);
    });
  } catch (err) {
    showError(err);
  }
};

// --------------------------------------------------------------------------
// Global Page Initialization
// --------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initDashboard();
  initEventsPage();
  initRegisteredUsersPage();
  initInterestedEventsPage();
});