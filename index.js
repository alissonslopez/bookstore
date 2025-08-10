// ===== Config =====
const API_BASE = "https://bookstore-api-six.vercel.app";
const BOOKS_ENDPOINT = `${API_BASE}/api/books`;

// ===== DOM =====
const landing = document.getElementById("landing");
const app = document.getElementById("app");
const btnNew = document.getElementById("btn-new");
const btnBooks = document.getElementById("btn-books");
const btnGetStarted = document.getElementById("btn-get-started");
const backBtn = document.getElementById("back-btn");

const bookForm = document.getElementById("book-form");
const formMsg = document.getElementById("form-msg");
const booksContainer = document.getElementById("books-container");
const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refresh-btn");

// ===== Local cache (also saved in localStorage) =====
let booksCache = [];

// Load from localStorage immediately (so UI shows instantly)
(function restoreFromLocalStorage() {
  try {
    const raw = localStorage.getItem("bookvault_books");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        booksCache = parsed;
        renderBooks(booksCache);
        setStatus(`Loaded ${booksCache.length} book(s) from your device.`);
      }
    }
  } catch (e) {
    console.warn("Failed to read localStorage:", e);
  }
})();

// ===== Navigation =====
function showApp() {
  landing.classList.add("hidden");
  app.classList.remove("hidden");
  // If we don't have anything yet, load from API
  if (!booksCache || booksCache.length === 0) {
    loadBooks();
  }
}
function showLanding() {
  app.classList.add("hidden");
  landing.classList.remove("hidden");
}

btnBooks?.addEventListener("click", showApp);
btnGetStarted?.addEventListener("click", showApp);
backBtn?.addEventListener("click", showLanding);

btnNew?.addEventListener("click", () => {
  alert(
    "BookVault lets anyone add or delete books.\n\nAdd: use the form.\nDelete: click the trash icon on a card."
  );
});

// ===== Helpers =====
function setStatus(msg = "") {
  statusEl.textContent = msg;
}
function setFormMsg(msg = "") {
  formMsg.textContent = msg;
}
function saveToLocal() {
  try {
    localStorage.setItem("bookvault_books", JSON.stringify(booksCache));
  } catch (e) {
    console.warn("Failed to save to localStorage:", e);
  }
}

// ===== Card Markup =====
function bookCardHTML(book) {
  const { id, _id, title, author, year, imageUrl, description } = book;
  const bookId = id || _id;

  const img = imageUrl
    ? `<img src="${imageUrl}" alt="${title ?? "Book cover"}" class="h-48 w-full object-cover rounded-lg">`
    : `<div class="h-48 w-full rounded-lg bg-slate-100 grid place-items-center text-slate-400">No Image</div>`;

  return `
  <article class="book-card relative" data-id="${bookId}">
    <button class="absolute top-3 right-3 text-xl leading-none delete-btn" title="Delete" aria-label="Delete book">🗑️</button>
    ${img}
    <div class="mt-3">
      <h3 class="font-semibold text-slate-900 text-lg">${title ?? "Untitled"}</h3>
      <p class="text-sm text-slate-600">${author ?? "Unknown"}${year ? " • " + year : ""}</p>
      ${description ? `<p class="mt-3 text-sm text-slate-700 leading-6">${description}</p>` : ""}
    </div>
  </article>`;
}

function renderBooks(list) {
  if (!Array.isArray(list) || list.length === 0) {
    booksContainer.innerHTML = `<p class="text-sm text-slate-700">No books yet. Be the first to add one!</p>`;
    return;
  }
  booksContainer.innerHTML = list.map(bookCardHTML).join("");
}

// ===== API =====
async function loadBooks() {
  setStatus("Loading books…");
  try {
    const res = await fetch(BOOKS_ENDPOINT);
    if (!res.ok) throw new Error(`GET /books failed: ${res.status}`);
    const data = await res.json();
    const books = Array.isArray(data) ? data : data.books || [];
    booksCache = books;
    saveToLocal();
    renderBooks(booksCache);
    setStatus(`Loaded ${booksCache.length} book(s) from the server.`);
  } catch (err) {
    console.error(err);
    setStatus("Failed to load books.");
  }
}

async function addBook(payload) {
  const res = await fetch(BOOKS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`POST /books failed: ${res.status}`);
  return res.json();
}

async function deleteBook(id) {
  const res = await fetch(`${BOOKS_ENDPOINT}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`DELETE failed: ${res.status}`);
  return res.json();
}

// ===== Events =====
bookForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(bookForm);
  const payload = {
    title: (fd.get("title") || "").toString().trim(),
    author: (fd.get("author") || "").toString().trim(),
    year: fd.get("year") ? Number(fd.get("year")) : undefined,
    imageUrl: (fd.get("imageUrl") || "").toString().trim() || undefined,
    description: (fd.get("description") || "").toString().trim() || undefined,
  };

  if (!payload.title || !payload.author) {
    setFormMsg("Please provide both Title and Author.");
    return;
  }

  setFormMsg("Adding book…");
  try {
    const created = await addBook(payload);
    // Update cache + UI
    booksCache = [created, ...booksCache];
    saveToLocal();
    renderBooks(booksCache);
    setFormMsg("Book added!");
    bookForm.reset();
  } catch (err) {
    console.error(err);
    setFormMsg("Failed to add book.");
  }
});

booksContainer?.addEventListener("click", async (e) => {
  const btn = e.target.closest(".delete-btn");
  if (!btn) return;
  const card = btn.closest("[data-id]");
  const id = card?.dataset.id;
  if (!id) return;
  if (!confirm("Delete this book?")) return;

  try {
    await deleteBook(id);
    // Update cache + UI
    booksCache = booksCache.filter((b) => (b.id || b._id) !== id);
    saveToLocal();
    card.remove();
    setStatus("Book deleted.");
  } catch (err) {
    console.error(err);
    alert("Failed to delete book.");
  }
});

refreshBtn?.addEventListener("click", loadBooks);
