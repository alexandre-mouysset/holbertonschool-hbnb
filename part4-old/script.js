// Tailwind classes reused for each generated place card.
const cardPlace = "var(--color-bg) h-36 screen relative w-36";

// HTML template injected once per place entry from places.json.
const htmlContent = `
    <li class="item-center flex justify-center">
        <div class="${cardPlace}">
            <div class="top-2 right-2 w-10 h-10 absolute flex items-center justify-center">
                <button class="favoris-button">
                    <i data-lucide="bookmark" class="text-(--color-gray) fill-(--color-light-gray)"></i>
                </button>
            </div>
        </div>
    </li>
`;

// Previous scroll position used to detect scroll direction.
let lastScrollY = window.scrollY;
// Prevents scheduling multiple requestAnimationFrame callbacks at once.
let ticking = false;
// Ignores tiny scroll movements to avoid jitter.
const threshold = 10;
// Remembers which partial is currently displayed.
let currentPage = "home";

// Fetches the JSON dataset used to build the places grid.
async function fetchPlaces() {
    try {
        const response = await fetch("places.json");
        return await response.json();
    } catch (error) {
        console.error("Erreur :", error);
        return null;
    }
}

// Renders one card per place in the current page's `.items-store` container.
function displayPlaces(places) {
    const container = document.querySelector(".items-store");

    // The container only exists on the places page.
    if (!container) {
        return;
    }

    // Clears old cards before rendering a new page state.
    container.innerHTML = "";

    places.forEach(() => {
        container.insertAdjacentHTML("beforeend", htmlContent);
    });
}

// Reads the current route from the URL hash, defaulting to `home`.
function getCurrentPage() {
    return location.hash.replace("#", "") || "home";
}

// Looks up the navbar in the currently injected page.
function getNavbar() {
    return document.getElementById("navbar");
}

// Home-specific setup runs after `home.html` is injected.
async function initHomePage() {
    currentPage = "home";
    const data = await fetchPlaces();

    if (data) {
        displayPlaces(data);
    }
    await initNavBar();
}

// Places-specific setup loads and renders the JSON cards.
async function initFavorisPage() {
    currentPage = "favoris";
    await initNavBar();
}

// Profile-specific setup is reserved for future profile interactions.
async function initProfilePage() {
    currentPage = "profile";
    await initNavBar();
}

function renderLucideIcons() {
    lucide.createIcons({
        icons: {
          CircleUserRound: lucide.CircleUserRound,
          Bookmark: lucide.Bookmark,
          Home: lucide.Home
        },
        nameAttr: "data-lucide",
    });
}

async function initNavBar() {
    const response = await fetch("components/navbar.html");
    const navbar = await response.text();
    const navbarBox = document.getElementById("navbar-box");

    if (!navbarBox) {
        return;
    }

    navbarBox.innerHTML = navbar;
    renderLucideIcons();
}

// Runs only the initializer that matches the displayed partial.
async function initPage(page) {
  if (page === "home") {
      await initHomePage();
      return;
  }

  if (page === "favoris") {
      await initFavorisPage();
      return;
  }

  if (page === "profile") {
      await initProfilePage();
      return;
  }

  currentPage = page;
}

// Loads an HTML partial from `pages/` and injects it into the SPA root.
async function loadPage(page) {
    const app = document.getElementById("app");

    // Safety guard in case the root container is missing from index.html.
    if (!app) {
        return;
    }

    try {
        const response = await fetch(`pages/${page}.html`);

        // Throws when the requested partial does not exist.
        if (!response.ok) {
            throw new Error(`Page introuvable: ${page}`);
        }

        const html = await response.text();
        // Replaces the visible page without reloading the full document.
        app.innerHTML = html;
        // Resets the scroll baseline for the navbar hide/show logic.
        lastScrollY = window.scrollY;

        // Runs only the script meant for the page that was just injected.
        await initPage(page);
    } catch (error) {
        console.error(error);
        app.innerHTML = "<p class=\"p-4\">Impossible de charger cette page.</p>";
    }
}

// Hides the navbar on downward scroll and shows it again on upward scroll.
function handleScroll() {
    const navbar = getNavbar();

    // Some pages may fail to load; in that case there is no navbar to update.
    if (!navbar) {
        ticking = false;
        return;
    }

    const currentScrollY = window.scrollY;
    const diff = currentScrollY - lastScrollY;

    if (Math.abs(diff) < threshold) {
        ticking = false;
        return;
    }

    // On mobile, pointer-events are disabled while hidden so the visible edge
    // does not keep receiving taps.
    if (diff > 0 && currentScrollY > 80) {
        navbar.classList.add("translate-y-full", "pointer-events-none");
    } else {
        navbar.classList.remove("translate-y-full", "pointer-events-none");
    }

    lastScrollY = currentScrollY;
    ticking = false;
}

// Reloads the current partial when the URL hash changes.
window.addEventListener("hashchange", () => {
    loadPage(getCurrentPage());
});

// Uses requestAnimationFrame so scroll work stays lightweight.
window.addEventListener("scroll", () => {
    if (!ticking) {
        requestAnimationFrame(handleScroll);
        ticking = true;
    }
});

// Centralized click handling works even after `#app` content is replaced.
document.addEventListener("click", (event) => {
    // `closest()` lets clicks on inner `<a>` tags still match the parent button.
    const navButton = event.target.closest(".accueil, .favoris, .user");

    if (navButton) {
        // Prevents the browser from following the `<a>` before our SPA routing.
        event.preventDefault();

        // Updates the hash; `hashchange` then loads the matching partial.
        if (navButton.classList.contains("accueil")) {
            location.hash = "home";
        } else if (navButton.classList.contains("favoris")) {
            location.hash = "favoris";
        } else if (navButton.classList.contains("user")) {
            location.hash = "profile";
        }

        return;
    }

    const navbarTrigger = event.target.closest("#navbar-trigger");

    if (navbarTrigger) {
        const navbar = getNavbar();

        // Restores the navbar when the user taps the trigger area at the bottom.
        if (navbar) {
            navbar.classList.remove("translate-y-full", "pointer-events-none");
        }
    }
});

document.addEventListener('click', (event) => {
  const favorisButton = event.target.closest('.favoris-button');
  if (favorisButton) {
      favorisButton.classList.toggle('text-(--color-accent-yellow)');
        const svg = favorisButton.querySelector('svg');
        if (svg) {
          svg.classList.toggle('fill-(--color-accent-yellow)');
          svg.classList.toggle('fill-(--color-light-gray)');

          svg.classList.toggle('text-(--color-gray)');
          svg.classList.toggle('text-(--color-accent-yellow)');
        }
    }
});


// Initial page render when the app first loads.
loadPage(getCurrentPage());
