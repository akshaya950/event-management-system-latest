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

const showError = (error) => window.alert(error.message);
const eventFormFields = ["event_name", "event_date", "event_time", "venue", "category", "description"];
const readEventForm = (form) => Object.fromEntries(
    eventFormFields.map((field) => [field, form.elements[field].value.trim()])
);

const registerForm = document.getElementById("register-form");
if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(registerForm));
        if (data.password !== data.confirm_password) {
            window.alert("Passwords do not match.");
            return;
        }
        try {
            const user = await api("/api/register", {
                method: "POST",
                body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
            });
            localStorage.setItem("eventease-user", JSON.stringify(user));
            window.location.href = "/user.html";
        } catch (error) {
            showError(error);
        }
    });
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(loginForm));
        try {
            const user = await api("/api/login", { method: "POST", body: JSON.stringify(data) });
            localStorage.setItem("eventease-user", JSON.stringify(user));
            localStorage.setItem("userEmail", user.email);

            // Keep admin and normal user pages separate without changing the role.
            if (user.role === "admin" || user.email === "akshaya9484@gmail.com") {
                window.location.href = "/dashboard.html";
            } else {
                window.location.href = "/user.html";
            }
        } catch (error) {
            showError(error);
        }
    });
}

const eventForm = document.getElementById("event-form");

if (eventForm) {
    const eventId = new URLSearchParams(window.location.search).get("id");

    if (eventId) {
        document.querySelector(".page-header h1, .container h1").textContent = "Edit Event";

        const submit = eventForm.querySelector("button[type='submit']");
        submit.textContent = "Update Event";

        api(`/api/events/${encodeURIComponent(eventId)}`)
            .then((item) => {
                eventFormFields.forEach((field) => {
                    eventForm.elements[field].value = item[field] || "";
                });
            })
            .catch((error) => {
                showError(error);
                window.location.href = "/events.html";
            });
    }

    eventForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        try {
            const user = JSON.parse(localStorage.getItem("eventease-user") || "{}");
            const adminEmail = user.email;

            const url = eventId
                ? `/api/events/${encodeURIComponent(eventId)}?admin_email=${encodeURIComponent(adminEmail)}`
                : `/api/events?admin_email=${encodeURIComponent(adminEmail)}`;

            await api(url, {
                method: eventId ? "PUT" : "POST",
                body: JSON.stringify(readEventForm(eventForm)),
            });

            window.location.href = "/events.html";
        } catch (error) {
            showError(error);
        }
    });
}
  
const eventsBody = document.querySelector("#eventsTable tbody");
if (eventsBody) {
   const currentUser = JSON.parse(localStorage.getItem("eventease-user") || "{}");
const isAdmin = currentUser.email === "akshaya9484@gmail.com";
const addButton = document.querySelector(".add-btn");

if (addButton && !isAdmin) {
    addButton.style.display = "none";
}
    const search = document.getElementById("search");
    const completedBtn = document.getElementById("completedBtn");
    const emptyMessage = document.getElementById("emptyMessage");
    let events = [];
    let showCompleted = false;

    const renderEvents = () => {
        const query = search.value.trim().toLowerCase();
        const today = new Date().toISOString().slice(0, 10);

const filtered = events.filter((item) => {
    const matchesSearch =
        `${item.event_name} ${item.venue} ${item.category}`
            .toLowerCase()
            .includes(query);

    const matchesCompleted =
        !showCompleted || item.event_date < today;

    return matchesSearch && matchesCompleted;
});
        eventsBody.replaceChildren();
        filtered.forEach((item) => {
            const row = document.createElement("tr");
            [item.event_name, item.event_date, item.event_time, item.venue, item.description].forEach((value) => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.append(cell);
            });
            const actions = document.createElement("td");
            actions.className = "actions";
          if (isAdmin) {
    const edit = document.createElement("a");
    edit.href = `/edit_event.html?id=${encodeURIComponent(item.id)}`;
    edit.className = "edit-btn";
    edit.textContent = "Edit";

    const remove = document.createElement("a");
    remove.href = `/delete_event.html?id=${encodeURIComponent(item.id)}`;
    remove.className = "delete-btn";
    remove.textContent = "Delete";

    actions.append(edit, remove);
    const users = document.createElement("a");
users.href = `/registered_users.html?id=${encodeURIComponent(item.id)}`;
users.className = "edit-btn";
users.textContent = "Registered Users";

actions.append(users);
} else {
    const register = document.createElement("button");
    register.className = "register-btn";
    register.textContent = "Register";

    register.addEventListener("click", async () => {
        try {
            const user = JSON.parse(
                localStorage.getItem("eventease-user") || "{}"
            );

            if (!user.email) {
                window.alert("Please login first.");
                return;
            }

            const competition = window.prompt(
                "Enter Competition:\n\nPainting\nPencil Drawing\nSinging\nDance"
            );

            if (!competition || !competition.trim()) {
                window.alert("Please enter a competition.");
                return;
            }

            await api(
                `/api/events/${encodeURIComponent(item.id)}/register?user_email=${encodeURIComponent(user.email)}&competition=${encodeURIComponent(competition.trim())}`,
                { method: "POST" }
            );

            window.alert("Successfully registered for this event!");

        } catch (error) {
            showError(error);
        }
    });

    actions.append(register);
}

            row.append(actions);
            eventsBody.append(row);
        });
        emptyMessage.hidden = filtered.length > 0;
    };

    search.addEventListener("input", renderEvents);
    completedBtn.addEventListener("click", () => {
    showCompleted = !showCompleted;
    completedBtn.textContent = showCompleted ? "All Events" : "Completed Events";
    renderEvents();
});
    api("/api/events").then((items) => {
        events = items;
        renderEvents();
    }).catch(showError);
}

const dashboardTable = document.querySelector(".recent-events tbody");
if (dashboardTable) {
    api("/api/events").then((events) => {
        const today = new Date().toISOString().slice(0, 10);
        const upcoming = events.filter((item) => item.event_date >= today).length;
        const counts = [events.length, upcoming, events.length - upcoming];
        document.querySelectorAll(".stat-card p").forEach((value, index) => {
            value.textContent = counts[index];
        });
        dashboardTable.replaceChildren();
        events.slice(0, 5).forEach((item) => {
            const row = document.createElement("tr");
            [item.event_name, item.event_date, item.venue].forEach((value) => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.append(cell);
            });
            dashboardTable.append(row);
        });
    }).catch(showError);
}

const deleteButton = document.getElementById("confirm-delete");
if (deleteButton) {
    const eventId = new URLSearchParams(window.location.search).get("id");
    if (!eventId) {
        window.location.replace("/events.html");
    } else {
        api(`/api/events/${encodeURIComponent(eventId)}`).then((item) => {
            const name = document.getElementById("delete-event-name");
            if (name) name.textContent = item.event_name;
        }).catch((error) => {
            showError(error);
            window.location.href = "/events.html";
        });
        deleteButton.addEventListener("click", async () => {
            try {
                const user = JSON.parse(localStorage.getItem("eventease-user") || "{}");

await api(
    `/api/events/${encodeURIComponent(eventId)}?admin_email=${encodeURIComponent(user.email)}`,
    { method: "DELETE" }
);
                window.location.href = "/events.html";
            } catch (error) {
                showError(error);
            }
        });
    }
}

const logoutButton = document.getElementById("confirm-logout");
if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        try {
            await api("/api/logout", {
                method: "POST",
            });
        } catch (error) {
            showError(error);
        } finally {
            localStorage.removeItem("eventease-user");
            window.location.href = "/home.html";
        }
    });
}

const welcome = document.getElementById("welcome-name");
if (welcome) {
    try {
        const user = JSON.parse(localStorage.getItem("eventease-user"));
        if (user?.username) welcome.textContent = `Welcome back, ${user.username}!`;
    } catch {
        localStorage.removeItem("eventease-user");
    }
}