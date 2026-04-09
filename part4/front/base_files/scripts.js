const API_BASE_STORAGE_KEY = 'hbnb_api_base_url';
const DEFAULT_LOCAL_API_BASE_URL = 'http://127.0.0.1:5000/api/v1';

function sanitizeApiBaseUrl(rawValue) {
  if (typeof rawValue !== 'string') {
    return '';
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.replace(/\/+$/, '');
}

function resolveApiBaseUrl() {
  const params = new URLSearchParams(window.location.search);
  const apiBaseFromQuery = sanitizeApiBaseUrl(params.get('api_base'));

  if (apiBaseFromQuery) {
    try {
      window.localStorage.setItem(API_BASE_STORAGE_KEY, apiBaseFromQuery);
    } catch (error) {
      // Ignore storage errors.
    }
  }

  let apiBaseFromStorage = '';
  try {
    apiBaseFromStorage = sanitizeApiBaseUrl(
      window.localStorage.getItem(API_BASE_STORAGE_KEY)
    );
  } catch (error) {
    apiBaseFromStorage = '';
  }

  if (window.location.protocol === 'file:') {
    return apiBaseFromQuery || apiBaseFromStorage || DEFAULT_LOCAL_API_BASE_URL;
  }

  return apiBaseFromQuery || '/api/v1';
}

const API_BASE_URL = resolveApiBaseUrl();
const MAX_VISIBLE_CARDS = 8;
const TOKEN_STORAGE_KEYS = ['access_token', 'token', 'jwt', 'jwt_token', 'authToken'];
const EXPIRED_TOKEN_NOTICE_KEY = 'hbnb_token_expired_notice';
const HOST_NAME_BY_USER_ID = new Map();
const AMENITY_NAME_BY_ID = new Map();
const PLACE_TITLE_BY_ID = new Map();
const HOME_STATE = { visiblePlaces: [] };
let AMENITIES_CATALOG_PROMISE = null;
const PLACE_PAGE_STATE = {
  token: '',
  isAuthenticated: false
};

// Local image pool used by card backgrounds
const IMAGE_POOL = [
  'images/place-1.jpg',
  'images/place-2.jpg',
  'images/place-3.jpg',
  'images/place-4.jpg',
  'images/place-5.jpg',
  'images/place-6.jpg',
  'images/place-7.jpg',
  'images/place-8.jpg'
];

// Fallback preview data shown when API is unavailable
const fallbackPlaces = [
  { id: 'demo-1', title: 'Ocean Breeze Loft', price: 85, image_choice: 1 },
  { id: 'demo-2', title: 'City Lights Studio', price: 110, image_choice: 2 },
  { id: 'demo-3', title: 'Palm Garden House', price: 140, image_choice: 3 },
  { id: 'demo-4', title: 'Lagoon Family Villa', price: 175, image_choice: 4 },
  { id: 'demo-5', title: 'Sunset Cabin', price: 95, image_choice: 5 },
  { id: 'demo-6', title: 'Coral View Apartment', price: 120, image_choice: 6 },
  { id: 'demo-7', title: 'Harbor Nest Retreat', price: 130, image_choice: 7 },
  { id: 'demo-8', title: 'Cliffside Escape', price: 160, image_choice: 8 }
];

// Convert unknown values to a safe numeric price
function parsePrice(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

// Display a price with 2 decimals
function formatPrice(value) {
  return `$${parsePrice(value).toFixed(2)}`;
}

// Read one query string value
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function getPlaceIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('place_id') || params.get('id');
}

function getCookieValue(name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match && match[1] ? decodeURIComponent(match[1]) : '';
}

function normalizeToken(rawToken) {
  if (typeof rawToken !== 'string') {
    return '';
  }

  let token = rawToken.trim();
  token = token.replace(/^Bearer\s+/i, '').trim();

  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }

  return token;
}

function decodeJwtPayload(token) {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64Raw = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64Raw.length % 4)) % 4);
    const base64 = base64Raw + padding;
    const json = atob(base64);
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

function isJwtExpired(payload) {
  if (!payload || typeof payload.exp !== 'number') {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
}

function markExpiredTokenNotice() {
  try {
    window.sessionStorage.setItem(EXPIRED_TOKEN_NOTICE_KEY, '1');
  } catch (error) {
    // Ignore storage errors
  }
}

function consumeExpiredTokenNotice() {
  try {
    const shouldNotify = window.sessionStorage.getItem(EXPIRED_TOKEN_NOTICE_KEY) === '1';
    if (shouldNotify) {
      window.sessionStorage.removeItem(EXPIRED_TOKEN_NOTICE_KEY);
    }
    return shouldNotify;
  } catch (error) {
    return false;
  }
}

function expireCookie(name) {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// Read auth token from storage/cookie when available
function getAuthToken() {
  for (const key of TOKEN_STORAGE_KEYS) {
    const localValue = window.localStorage.getItem(key);
    if (localValue) {
      const token = normalizeToken(localValue);
      if (!token) {
        window.localStorage.removeItem(key);
        continue;
      }

      if (isJwtExpired(decodeJwtPayload(token))) {
        window.localStorage.removeItem(key);
        markExpiredTokenNotice();
        continue;
      }

      return token;
    }

    const sessionValue = window.sessionStorage.getItem(key);
    if (sessionValue) {
      const token = normalizeToken(sessionValue);
      if (!token) {
        window.sessionStorage.removeItem(key);
        continue;
      }

      if (isJwtExpired(decodeJwtPayload(token))) {
        window.sessionStorage.removeItem(key);
        markExpiredTokenNotice();
        continue;
      }

      return token;
    }
  }

  const accessToken = getCookieValue('access_token');
  if (accessToken) {
    const token = normalizeToken(accessToken);
    if (!token || isJwtExpired(decodeJwtPayload(token))) {
      expireCookie('access_token');
      markExpiredTokenNotice();
    } else {
      return token;
    }
  }

  const tokenCookie = getCookieValue('token');
  if (tokenCookie) {
    const token = normalizeToken(tokenCookie);
    if (!token || isJwtExpired(decodeJwtPayload(token))) {
      expireCookie('token');
      markExpiredTokenNotice();
    } else {
      return token;
    }
  }

  return '';
}

function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getJwtPayload() {
  const token = getAuthToken();
  return decodeJwtPayload(token);
}

function getCurrentUserIdFromToken() {
  const payload = getJwtPayload();
  if (!payload) {
    return '';
  }

  if (typeof payload.sub === 'string') {
    return payload.sub;
  }

  if (typeof payload.identity === 'string') {
    return payload.identity;
  }

  if (typeof payload.id === 'string') {
    return payload.id;
  }

  return '';
}

function isCurrentUserAdminFromToken() {
  const payload = getJwtPayload();
  return Boolean(payload && payload.is_admin);
}

function isAuthenticatedByCookie() {
  return Boolean(getAuthToken());
}

function updateLoginLinkVisibility() {
  const loginLinks = document.querySelectorAll('a.login-link');
  const logoutLinks = document.querySelectorAll('a.logout-link');
  const myPlacesLinks = document.querySelectorAll('a.my-places-link');

  if (!loginLinks.length && !logoutLinks.length && !myPlacesLinks.length) {
    return;
  }

  const isAuthenticated = isAuthenticatedByCookie();
  const isAdmin = isCurrentUserAdminFromToken();

  loginLinks.forEach((link) => {
    link.classList.toggle('hidden', isAuthenticated);
  });

  logoutLinks.forEach((link) => {
    link.classList.toggle('hidden', !isAuthenticated);
  });

  myPlacesLinks.forEach((link) => {
    link.classList.toggle('hidden', !isAuthenticated);
    link.textContent = isAdmin ? 'All User Places' : 'My places';
  });

  const createPlaceShell = document.getElementById('create-place-shell');
  const createPlaceForm = document.getElementById('create-place-form');
  const createPlaceLoginHint = document.getElementById('create-place-login-hint');

  if (createPlaceShell && createPlaceForm) {
    createPlaceShell.hidden = false;
    createPlaceForm.hidden = !isAuthenticated;

    if (createPlaceLoginHint) {
      createPlaceLoginHint.classList.toggle('hidden', isAuthenticated);
    }
  }

  updateUserIdentityDisplay();
}

async function updateUserIdentityDisplay() {
  const identityNodes = document.querySelectorAll('.user-identity');
  if (!identityNodes.length) {
    return;
  }

  const applyIdentityStyle = (node) => {
    node.style.color = '#0f4c5c';
    node.style.fontWeight = '700';
    node.style.textShadow = '0 1px 0 rgba(255,255,255,0.6)';
  };

  const token = getAuthToken();
  const userId = getCurrentUserIdFromToken();

  if (!token) {
    identityNodes.forEach((node) => {
      node.classList.add('hidden');
      node.textContent = '';
    });
    return;
  }

  try {
    const user = userId ? await loadUserById(userId) : null;

    if (userId && !user) {
      clearAuthData();
      identityNodes.forEach((node) => {
        node.classList.add('hidden');
        node.textContent = '';
      });
      updateLoginLinkVisibility();
      return;
    }

    const name = formatUserName(user, userId || 'connected-user');

    identityNodes.forEach((node) => {
      node.textContent = `Connected as: ${name}`;
      applyIdentityStyle(node);
      node.classList.remove('hidden');
    });
  } catch (error) {
    identityNodes.forEach((node) => {
      node.textContent = 'Connected';
      applyIdentityStyle(node);
      node.classList.remove('hidden');
    });
  }
}

function bindReviewFormForPlace(reviewForm, reviewText, reviewRating, placeId, isDemo) {
  if (!reviewForm || !reviewText || !reviewRating) {
    return;
  }

  if (isDemo) {
    reviewForm.onsubmit = (event) => {
      event.preventDefault();
      alert('Please open a real place card to submit a review. Demo cards are read-only.');
    };

    reviewForm.dataset.placeId = '';
    return;
  }

  reviewForm.dataset.placeId = String(placeId || '');
  reviewForm.onsubmit = null;
}

function getCreatedAtTimestamp(place) {
  if (!place || !place.created_at) {
    return 0;
  }

  const timestamp = Date.parse(place.created_at);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function hasValidCreatedAt(place) {
  return Boolean(place && place.created_at && Number.isFinite(Date.parse(place.created_at)));
}

function clearAuthData() {
  TOKEN_STORAGE_KEYS.forEach((key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
    document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });
}

function storeAuthToken(rawToken) {
  const token = normalizeToken(rawToken);
  if (!token) {
    return;
  }

  try {
    window.localStorage.setItem('access_token', token);
    window.sessionStorage.setItem('access_token', token);
  } catch (error) {
    // Ignore storage errors.
  }

  document.cookie = `token=${token}; path=/`;
  document.cookie = `access_token=${token}; path=/`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setupLogoutLinks() {
  const logoutLinks = document.querySelectorAll('a.logout-link');
  if (!logoutLinks.length) {
    return;
  }

  logoutLinks.forEach((link) => {
    if (link.dataset.logoutReady === 'true') {
      return;
    }

    link.dataset.logoutReady = 'true';
    link.addEventListener('click', (event) => {
      event.preventDefault();
      clearAuthData();
      updateLoginLinkVisibility();
      window.location.href = 'index.html';
    });
  });
}

// Show add review navigation only for logged-in users
function updateAddReviewLink(placeId) {
  const link = document.getElementById('add-review-link');
  if (!link) {
    return;
  }

  const isDemoPlace = String(placeId || '').startsWith('demo-');
  const safePlaceId = isDemoPlace ? '' : placeId;

  const nextHref = safePlaceId
    ? `add_review.html?place_id=${encodeURIComponent(safePlaceId)}`
    : 'add_review.html';
  link.href = nextHref;
}

function checkAuthentication(options = {}) {
  const { redirectIfMissing = false } = options;
  const addReviewSection = document.getElementById('add-review');
  const cookieToken = normalizeToken(getCookieValue('token') || getCookieValue('access_token'));
  const token = cookieToken || getAuthToken();

  PLACE_PAGE_STATE.token = token;
  PLACE_PAGE_STATE.isAuthenticated = Boolean(token);

  if (addReviewSection) {
    addReviewSection.style.display = PLACE_PAGE_STATE.isAuthenticated ? 'block' : 'none';
  }

  if (!token && redirectIfMissing) {
    window.location.href = 'index.html';
  }

  return token;
}

// Block review page access from this button when user is not logged in
function setupAddReviewLinkGuard() {
  const link = document.getElementById('add-review-link');
  if (!link || link.dataset.guardReady === 'true') {
    return;
  }

  link.dataset.guardReady = 'true';
  link.addEventListener('click', (event) => {
    if (getAuthToken()) {
      return;
    }

    event.preventDefault();
    window.alert("Vous devez d'abord vous identifier pour ajouter un avis.");
  });
}

// Keep place id in URL while navigating on placehtml
function updatePlaceQuery(placeId) {
  if (!placeId) {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set('id', String(placeId));
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

// Pick an image from image_choice, image_url, or a rotating fallback
function resolveImage(place, index) {
  const choice = Number(place.image_choice);
  if (Number.isInteger(choice) && choice >= 1 && choice <= IMAGE_POOL.length) {
    return IMAGE_POOL[choice - 1];
  }

  if (typeof place.image_url === 'string' && place.image_url.trim()) {
    return place.image_url;
  }

  return IMAGE_POOL[index % IMAGE_POOL.length];
}

// Keep a rolling window of 8 and render newest first (top-left to right)
function toVisiblePlaces(places) {
  const copy = [...places];

  const hasUsableCreatedAt = copy.some((place) => hasValidCreatedAt(place));

  if (hasUsableCreatedAt) {
    return copy
      .sort((a, b) => getCreatedAtTimestamp(b) - getCreatedAtTimestamp(a))
      .slice(0, MAX_VISIBLE_CARDS);
  }

  // When created_at is unavailable, assume backend order is oldest -> newest.
  return copy.slice(-MAX_VISIBLE_CARDS).reverse();
}

function buildDisplayPlaces(apiPlaces) {
  if (!Array.isArray(apiPlaces) || !apiPlaces.length) {
    return toVisiblePlaces(fallbackPlaces);
  }

  // Keep a rolling window of 8 cards: new API places push out oldest fallback cards.
  return toVisiblePlaces([...fallbackPlaces, ...apiPlaces]);
}

function syncPlaceTitleCache(places) {
  places.forEach((place) => {
    if (place && place.id) {
      PLACE_TITLE_BY_ID.set(String(place.id), place.title || 'Untitled place');
    }
  });
}

// Build a host label from available place fields
function getHostLabel(place) {
  if (place.host_name && typeof place.host_name === 'string' && place.host_name.trim()) {
    return place.host_name;
  }

  if (place.host && typeof place.host === 'string' && place.host.trim()) {
    return place.host;
  }

  if (place.owner && (place.owner.first_name || place.owner.last_name)) {
    return `${place.owner.first_name || ''} ${place.owner.last_name || ''}`.trim();
  }

  if (place.user_id) {
    return `User ${place.user_id}`;
  }

  return 'Unknown host';
}

// Convert amenities payload to a readable text
function getAmenitiesLabel(place) {
  if (!Array.isArray(place.amenities) || !place.amenities.length) {
    return 'No amenities listed';
  }

  const resolveAmenityName = (rawValue) => {
    const value = String(rawValue || '').trim();
    if (!value) {
      return '';
    }

    const reprMatch = value.match(/^<Amenity\s+([0-9a-fA-F-]{36})>$/);
    if (reprMatch) {
      const amenityId = reprMatch[1];
      return AMENITY_NAME_BY_ID.get(amenityId) || amenityId;
    }

    const idMatch = value.match(/^[0-9a-fA-F-]{36}$/);
    if (idMatch) {
      return AMENITY_NAME_BY_ID.get(value) || value;
    }

    return value;
  };

  return place.amenities
    .map((amenity) => {
      if (typeof amenity === 'string') {
        return resolveAmenityName(amenity);
      }
      if (amenity && typeof amenity === 'object') {
        if (amenity.name) {
          return amenity.name;
        }

        if (amenity.id) {
          return AMENITY_NAME_BY_ID.get(String(amenity.id)) || amenity.id;
        }

        return '';
      }
      return '';
    })
    .filter(Boolean)
    .join(', ');
}

function getLocationLabel(place) {
  const city = place.city || '';
  const country = place.country || '';
  const fullLocation = `${city} ${country}`.trim();
  if (fullLocation) {
    return fullLocation;
  }

  if (typeof place.location === 'string' && place.location.trim()) {
    return place.location;
  }

  if (typeof place.address === 'string' && place.address.trim()) {
    return place.address;
  }

  if (
    Number.isFinite(Number(place.latitude)) &&
    Number.isFinite(Number(place.longitude))
  ) {
    return `${Number(place.latitude).toFixed(4)}, ${Number(place.longitude).toFixed(4)}`;
  }

  return 'Location not provided';
}

function parseAmenitiesInput(value) {
  if (!value || typeof value !== 'string') {
    return [];
  }

  const resolveAmenityId = (rawToken) => {
    const token = String(rawToken || '').trim();
    if (!token) {
      return '';
    }

    if (/^[0-9a-fA-F-]{36}$/.test(token)) {
      return token;
    }

    const loweredToken = token.toLowerCase();
    for (const [amenityId, amenityName] of AMENITY_NAME_BY_ID.entries()) {
      if (String(amenityName || '').trim().toLowerCase() === loweredToken) {
        return amenityId;
      }
    }

    return '';
  };

  return value
    .split(',')
    .map((item) => item.trim())
    .map((item) => resolveAmenityId(item))
    .filter(Boolean);
}

function getAmenityDisplayName(amenityId) {
  const id = String(amenityId || '').trim();
  if (!id) {
    return '';
  }

  return AMENITY_NAME_BY_ID.get(id) || id;
}

function formatAmenitiesForForm(amenities) {
  if (!Array.isArray(amenities) || !amenities.length) {
    return '';
  }

  const labels = amenities
    .map((amenity) => {
      if (typeof amenity === 'string') {
        const parsedIds = parseAmenitiesInput(amenity);
        if (parsedIds.length) {
          return getAmenityDisplayName(parsedIds[0]);
        }
        return amenity.trim();
      }

      if (amenity && typeof amenity === 'object') {
        if (amenity.name) {
          return String(amenity.name).trim();
        }

        if (amenity.id) {
          return getAmenityDisplayName(amenity.id);
        }
      }

      return '';
    })
    .filter(Boolean);

  return [...new Set(labels)].join(', ');
}

async function loadAmenitiesCatalog() {
  const response = await fetch(`${API_BASE_URL}/amenities/`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders()
    }
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((amenity) => ({
      id: String(amenity.id || '').trim(),
      name: String(amenity.name || amenity.id || 'Amenity').trim()
    }))
    .filter((amenity) => amenity.id)
    .map((amenity) => {
      AMENITY_NAME_BY_ID.set(amenity.id, amenity.name);
      return amenity;
    });
}

function getAmenitiesCatalog() {
  if (!AMENITIES_CATALOG_PROMISE) {
    AMENITIES_CATALOG_PROMISE = loadAmenitiesCatalog();
  }

  return AMENITIES_CATALOG_PROMISE;
}

function styleAmenityButton(button, isSelected) {
  button.style.border = isSelected ? '1px solid #06b6d4' : '1px solid #94a3b8';
  button.style.backgroundColor = isSelected ? 'rgba(34,211,238,0.25)' : 'rgba(255,255,255,0.08)';
  button.style.color = '#e0f2fe';
}

function updateAmenitiesInputValue(input, selectedIds) {
  input.value = Array.from(selectedIds)
    .map((amenityId) => getAmenityDisplayName(amenityId))
    .join(', ');
}

async function setupAmenitiesPicker(form, inputId) {
  if (!form) {
    return;
  }

  const input = form.querySelector(`#${inputId}`);
  if (!input) {
    return;
  }

  const previousPicker = form.querySelector(`[data-amenity-picker-for="${inputId}"]`);
  if (previousPicker) {
    previousPicker.remove();
  }

  let amenities = [];
  try {
    amenities = await getAmenitiesCatalog();
  } catch (error) {
    amenities = [];
  }

  if (!amenities.length) {
    return;
  }

  const picker = document.createElement('div');
  picker.dataset.amenityPickerFor = inputId;
  picker.style.display = 'flex';
  picker.style.flexDirection = 'column';
  picker.style.gap = '8px';
  picker.style.marginTop = '8px';

  const helper = document.createElement('p');
  helper.className = 'place-info';
  helper.textContent = 'Select amenities by name (IDs are filled automatically):';

  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexWrap = 'wrap';
  list.style.gap = '8px';

  const selectedIds = new Set(parseAmenitiesInput(input.value));
  const buttonsById = new Map();

  const syncButtons = () => {
    buttonsById.forEach((button, amenityId) => {
      styleAmenityButton(button, selectedIds.has(amenityId));
    });
  };

  amenities.forEach((amenity) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = amenity.name;
    button.style.borderRadius = '10px';
    button.style.padding = '6px 10px';
    button.style.fontSize = '13px';
    button.style.cursor = 'pointer';
    button.style.transition = 'all 120ms ease';

    button.addEventListener('click', () => {
      if (selectedIds.has(amenity.id)) {
        selectedIds.delete(amenity.id);
      } else {
        selectedIds.add(amenity.id);
      }

      updateAmenitiesInputValue(input, selectedIds);
      syncButtons();
    });

    buttonsById.set(amenity.id, button);
    list.appendChild(button);
  });

  input.addEventListener('input', () => {
    selectedIds.clear();
    parseAmenitiesInput(input.value).forEach((id) => {
      selectedIds.add(id);
    });
    syncButtons();
  });

  picker.append(helper, list);
  input.insertAdjacentElement('afterend', picker);
  syncButtons();
}

function readPlacePayloadFromForm(form) {
  const getValue = (id) => {
    const input = form.querySelector(`#${id}`);
    return input ? input.value.trim() : '';
  };

  return {
    title: getValue('place-title') || getValue('update-place-title'),
    description: getValue('place-description') || getValue('update-place-description'),
    price: parsePrice(getValue('place-price') || getValue('update-place-price')),
    latitude: Number(getValue('place-latitude') || getValue('update-place-latitude')),
    longitude: Number(getValue('place-longitude') || getValue('update-place-longitude')),
    amenities: parseAmenitiesInput(getValue('place-amenities') || getValue('update-place-amenities'))
  };
}

function renderRatingStars(rating) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return `${'★'.repeat(safeRating)}${'☆'.repeat(5 - safeRating)}`;
}

// Build one info line for place details
function createPlaceInfo(label, value) {
  const row = document.createElement('p');
  row.className = 'place-info';

  const strong = document.createElement('strong');
  strong.textContent = `${label}: `;

  row.append(strong, document.createTextNode(value));
  return row;
}

// Build one place card element
function createCard(place, index) {
  const article = document.createElement('article');
  article.className = 'place-card';
  article.style.setProperty('--card-image', `url('${resolveImage(place, index)}')`);
  article.dataset.price = String(parsePrice(place.price));

  const title = document.createElement('h2');
  title.className = 'h2-card';
  title.textContent = place.title || 'Untitled place';

  const price = document.createElement('p');
  price.className = 'mt-2';
  price.textContent = `${formatPrice(place.price)} / night`;

  const content = document.createElement('div');
  content.className = 'mt-2';
  content.innerHTML = `
    <p class="place-info"><strong>Name:</strong> ${escapeHtml(place.title || 'Untitled place')}</p>
    <p class="place-info"><strong>Description:</strong> ${escapeHtml(place.description || 'No description available')}</p>
    <p class="place-info"><strong>Location:</strong> ${escapeHtml(getLocationLabel(place))}</p>
  `;

  const detailsLink = document.createElement('a');
  detailsLink.className = 'details-button';
  detailsLink.href = `place.html?id=${encodeURIComponent(place.id || '')}`;
  detailsLink.textContent = 'View Details';

  article.append(title, price, content, detailsLink);
  return article;
}

// Render the list or an empty-state message
function renderPlaces(places) {
  const container = document.getElementById('places-list');
  if (!container) {
    return;
  }

  container.innerHTML = '';

  if (!places.length) {
    const empty = document.createElement('p');
    empty.className = 'places-empty';
    empty.textContent = 'No places available for this filter.';
    container.appendChild(empty);
    return;
  }

  places.forEach((place, index) => {
    container.appendChild(createCard(place, index));
  });
}

function ensurePriceFilterOptions() {
  const select = document.getElementById('price-filter');
  if (!select) {
    return;
  }

  const requiredOptions = ['All', '10', '50', '100'];
  const currentOptions = [...select.options].map((option) => option.value || option.textContent);
  const isExpected =
    currentOptions.length === requiredOptions.length &&
    requiredOptions.every((value, index) => currentOptions[index] === value);

  if (isExpected) {
    return;
  }

  select.innerHTML = '';
  requiredOptions.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function getSelectedMaxPrice() {
  const select = document.getElementById('price-filter');
  if (!select || select.value === 'All' || select.value === 'All prices') {
    return null;
  }

  return parsePrice(select.value);
}

function upsertFilterEmptyState(container, hasVisibleCards) {
  const existing = container.querySelector('.places-empty[data-filter-state="true"]');

  if (hasVisibleCards && existing) {
    existing.remove();
    return;
  }

  if (!hasVisibleCards && !existing) {
    const empty = document.createElement('p');
    empty.className = 'places-empty';
    empty.dataset.filterState = 'true';
    empty.textContent = 'No places match the selected max price.';
    container.appendChild(empty);
  }
}

function applyClientSidePriceFilter() {
  const container = document.getElementById('places-list');
  if (!container) {
    return;
  }

  const cards = container.querySelectorAll('.place-card');
  if (!cards.length) {
    return;
  }

  const maxPrice = getSelectedMaxPrice();
  let visibleCount = 0;

  cards.forEach((card) => {
    const cardPrice = parsePrice(card.dataset.price);
    const isVisible = maxPrice === null || cardPrice <= maxPrice;
    card.style.display = isVisible ? '' : 'none';

    if (isVisible) {
      visibleCount += 1;
    }
  });

  upsertFilterEmptyState(container, visibleCount > 0);
}

// Render extended details for one place with side navigation arrows
function renderPlaceDetails(place, currentPosition, totalPlaces, onPrevious, onNext) {
  const container = document.getElementById('place-details');
  if (!container) {
    return;
  }

  container.innerHTML = '';

  const layout = document.createElement('div');
  layout.className = 'place-carousel';

  const previousButton = document.createElement('button');
  previousButton.type = 'button';
  previousButton.className = 'place-nav-button';
  previousButton.setAttribute('aria-label', 'Previous place');
  previousButton.textContent = '←';
  previousButton.addEventListener('click', onPrevious);

  const detailCard = document.createElement('article');
  detailCard.className = 'place-card place-details';
  detailCard.style.setProperty('--card-image', `url('${resolveImage(place, 0)}')`);

  const title = document.createElement('h2');
  title.className = 'h2-card';
  title.textContent = place.title || 'Untitled place';

  const hostInfo = createPlaceInfo('Host', getHostLabel(place));
  const priceInfo = createPlaceInfo('Price', `${formatPrice(place.price)} / night`);
  const descriptionInfo = createPlaceInfo(
    'Description',
    place.description || 'No description available.'
  );
  const amenitiesInfo = createPlaceInfo('Amenities', getAmenitiesLabel(place));
  const placeIdInfo = createPlaceInfo('Place ID', String(place.id || '-'));
  const positionInfo = createPlaceInfo('Position', `${currentPosition} / ${totalPlaces}`);

  const copyIdButton = document.createElement('button');
  copyIdButton.type = 'button';
  copyIdButton.className = 'details-button';
  copyIdButton.textContent = 'Copy Place ID';
  copyIdButton.addEventListener('click', async () => {
    const placeId = String(place.id || '').trim();
    if (!placeId) {
      alert('No place ID available for this card.');
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(placeId);
      } else {
        window.prompt('Copy this Place ID:', placeId);
        return;
      }

      copyIdButton.textContent = 'Place ID copied';
      setTimeout(() => {
        copyIdButton.textContent = 'Copy Place ID';
      }, 1200);
    } catch (error) {
      window.prompt('Copy this Place ID:', placeId);
    }
  });

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'place-nav-button';
  nextButton.setAttribute('aria-label', 'Next place');
  nextButton.textContent = '→';
  nextButton.addEventListener('click', onNext);

  detailCard.append(
    title,
    hostInfo,
    priceInfo,
    descriptionInfo,
    amenitiesInfo,
    placeIdInfo,
    positionInfo,
    copyIdButton
  );
  layout.append(previousButton, detailCard, nextButton);
  container.appendChild(layout);
}

function displayPlaceDetails(place, currentPosition, totalPlaces, onPrevious, onNext) {
  renderPlaceDetails(place, currentPosition, totalPlaces, onPrevious, onNext);
}

// Render place reviews or an empty state
function renderReviews(reviews) {
  const container = document.getElementById('reviews');
  if (!container) {
    return;
  }

  container.innerHTML = '';

  const heading = document.createElement('h2');
  heading.className = 'h2-card text-white px-5';
  heading.textContent = 'Reviews';
  container.appendChild(heading);

  if (!Array.isArray(reviews) || !reviews.length) {
    const empty = document.createElement('article');
    empty.className = 'review-card';
    empty.textContent = 'No reviews yet for this place.';
    container.appendChild(empty);
    return;
  }

  reviews.forEach((review) => {
    const reviewCard = document.createElement('article');
    reviewCard.className = 'review-card';

    const comment = document.createElement('p');
    comment.className = 'place-info';
    comment.textContent = `Comment: ${review.text || 'No review text.'}`;

    const user = document.createElement('p');
    user.className = 'place-info';
    user.textContent = `User: ${review.user_name || `User ${review.user_id || '-'}`}`;

    const rating = document.createElement('p');
    rating.className = 'place-info';
    rating.textContent = `Rating: ${renderRatingStars(review.rating)} (${review.rating || 0}/5)`;

    reviewCard.append(comment, user, rating);
    container.appendChild(reviewCard);
  });
}

// Fetch places from backend API
async function loadPlaces() {
  const response = await fetch(`${API_BASE_URL}/places/`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders()
    }
  });
  if (!response.ok) {
    throw new Error('Places API unavailable');
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }

  return data;
}

// Fetch a place by id
async function loadPlaceById(placeId) {
  const response = await fetch(`${API_BASE_URL}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      ...getAuthHeaders()
    }
  });
  if (!response.ok) {
    throw new Error('Place not found');
  }
  return response.json();
}

async function fetchPlaceDetails(token, placeId) {
  if (!placeId) {
    throw new Error('Place ID missing');
  }

  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${API_BASE_URL}/places/${encodeURIComponent(placeId)}`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error('Place not found');
  }

  return response.json();
}

// Fetch all reviews linked to one place
async function loadReviewsByPlace(placeId) {
  const response = await fetch(
    `${API_BASE_URL}/reviews/by_place/${encodeURIComponent(placeId)}`,
    {
      headers: {
        ...getAuthHeaders()
      }
    }
  );
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function loadAllReviews() {
  const response = await fetch(`${API_BASE_URL}/reviews/`, {
    headers: {
      ...getAuthHeaders()
    }
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function createPlace(placeData) {
  return fetch(`${API_BASE_URL}/places/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(placeData)
  });
}

async function updatePlace(placeId, placeData) {
  return fetch(`${API_BASE_URL}/places/${encodeURIComponent(placeId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(placeData)
  });
}

async function deletePlace(placeId) {
  return fetch(`${API_BASE_URL}/places/${encodeURIComponent(placeId)}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders()
    }
  });
}

async function createReview(reviewData) {
  return fetch(`${API_BASE_URL}/reviews/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(reviewData)
  });
}

async function submitReview(token, placeId, reviewText, reviewRating, userId) {
  return fetch(`${API_BASE_URL}/reviews/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      text: reviewText,
      rating: Number(reviewRating),
      user_id: userId,
      place_id: placeId
    })
  });
}

async function handleReviewSubmissionResponse(response, reviewTextNode, reviewRatingNode) {
  if (response.ok) {
    if (reviewTextNode) {
      reviewTextNode.value = '';
    }

    if (reviewRatingNode) {
      reviewRatingNode.value = '5';
    }

    alert('Review submitted successfully.');
    return true;
  }

  const errorText = await response.text();
  alert(`Failed to submit review: ${errorText}`);
  return false;
}

async function loginUser(email, password) {
  return fetch(`${API_BASE_URL}/auth/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
}

async function registerUser(firstName, lastName, email, password) {
  return fetch(`${API_BASE_URL}/users/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      email,
      password
    })
  });
}

// Fetch one user by id
async function loadUserById(userId) {
  if (!userId) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(userId)}`, {
    headers: {
      ...getAuthHeaders()
    }
  });
  if (!response.ok) {
    return null;
  }

  return response.json();
}

// Build a display name from user payload
function formatUserName(user, userId) {
  if (!user) {
    return 'Connected user';
  }

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (fullName) {
    return fullName;
  }

  return user.email || 'Connected user';
}

async function resolveHostName(userId) {
  if (!userId) {
    return 'Unknown host';
  }

  if (HOST_NAME_BY_USER_ID.has(userId)) {
    return HOST_NAME_BY_USER_ID.get(userId);
  }

  const user = await loadUserById(userId);
  const hostName = formatUserName(user, userId);
  HOST_NAME_BY_USER_ID.set(userId, hostName);
  return hostName;
}

async function enrichPlaceWithHostName(place) {
  if (!place || !place.user_id) {
    return place;
  }

  if (place.owner && (place.owner.first_name || place.owner.last_name)) {
    return place;
  }

  const hostName = await resolveHostName(place.user_id);
  return {
    ...place,
    host_name: hostName
  };
}

// Attach user_name to each review card payload
async function enrichReviewsWithUserNames(reviews) {
  const userIds = [...new Set(reviews.map((review) => review.user_id).filter(Boolean))];

  const userEntries = await Promise.all(
    userIds.map(async (userId) => {
      const user = await loadUserById(userId);
      return [userId, formatUserName(user, userId)];
    })
  );

  const userNameById = new Map(userEntries);

  return reviews.map((review) => ({
    ...review,
    user_name: userNameById.get(review.user_id) || `User ${review.user_id || '-'}`
  }));
}

function renderReviewHistory(reviews, currentUserId) {
  const container = document.getElementById('review-history');
  if (!container) {
    return;
  }

  container.innerHTML = '';

  const heading = document.createElement('h2');
  heading.className = 'h2-card text-white px-5';
  heading.textContent = 'My Review History';
  container.appendChild(heading);

  if (!currentUserId) {
    const empty = document.createElement('article');
    empty.className = 'review-card';
    empty.textContent = 'Login to view your review history.';
    container.appendChild(empty);
    return;
  }

  const myReviews = reviews.filter((review) => review.user_id === currentUserId);
  if (!myReviews.length) {
    const empty = document.createElement('article');
    empty.className = 'review-card';
    empty.textContent = 'You have not posted reviews yet.';
    container.appendChild(empty);
    return;
  }

  myReviews.forEach((review) => {
    const card = document.createElement('article');
    card.className = 'review-card';

    const placeInfo = document.createElement('p');
    placeInfo.className = 'place-info';
    const placeTitle = PLACE_TITLE_BY_ID.get(String(review.place_id)) || `Place ${review.place_id}`;
    placeInfo.textContent = `Place: ${placeTitle}`;

    const ratingInfo = document.createElement('p');
    ratingInfo.className = 'place-info';
    ratingInfo.textContent = `Rating: ${renderRatingStars(review.rating)} (${review.rating || 0}/5)`;

    const textInfo = document.createElement('p');
    textInfo.className = 'place-info';
    textInfo.textContent = `Comment: ${review.text || 'No review text.'}`;

    card.append(placeInfo, ratingInfo, textInfo);
    container.appendChild(card);
  });
}

function renderUpdatePlaceSection(place) {
  const container = document.getElementById('place-editor-container');
  if (!container) {
    return null;
  }

  const currentUserId = getCurrentUserIdFromToken();
  const isAdmin = isCurrentUserAdminFromToken();
  const canEdit = Boolean(place && place.id && (isAdmin || currentUserId === place.user_id));

  if (!place || String(place.id).startsWith('demo-')) {
    container.innerHTML = '';
    return null;
  }

  if (!canEdit) {
    container.innerHTML = `
      <article class="auth-card">
        <h2 class="h2-card">Update This Place</h2>
        <p class="place-info">Only the owner or an admin can update this place.</p>
      </article>
    `;
    return null;
  }

  container.innerHTML = `
    <form id="update-place-form" class="auth-card">
      <h2 class="h2-card">Update This Place</h2>

      <label for="update-place-title" class="place-info">Title</label>
      <input type="text" id="update-place-title" class="auth-field" value="${escapeHtml(place.title || '')}" required>

      <label for="update-place-description" class="place-info">Description</label>
      <textarea id="update-place-description" class="auth-field" required>${escapeHtml(place.description || '')}</textarea>

      <label for="update-place-price" class="place-info">Price per night</label>
      <input type="number" id="update-place-price" class="auth-field" min="0.01" step="0.01" value="${parsePrice(place.price)}" required>

      <label for="update-place-latitude" class="place-info">Latitude</label>
      <input type="number" id="update-place-latitude" class="auth-field" min="-90" max="90" step="0.0001" value="${Number(place.latitude) || 0}" required>

      <label for="update-place-longitude" class="place-info">Longitude</label>
      <input type="number" id="update-place-longitude" class="auth-field" min="-180" max="180" step="0.0001" value="${Number(place.longitude) || 0}" required>

      <label for="update-place-amenities" class="place-info">Amenities (comma separated)</label>
      <input type="text" id="update-place-amenities" class="auth-field" value="${escapeHtml(formatAmenitiesForForm(place.amenities || []))}" placeholder="WiFi, Swimming Pool, Air Conditioning">

      <button type="submit" class="details-button">Update Place</button>
    </form>
  `;

  const form = container.querySelector('#update-place-form');
  setupAmenitiesPicker(form, 'update-place-amenities');
  return form;
}

function initCreatePlaceForm() {
  const form = document.getElementById('create-place-form');
  if (!form || form.dataset.bound === 'true') {
    return;
  }

  const amenitiesLabel = form.querySelector('label[for="place-amenities"]');
  const amenitiesInput = form.querySelector('#place-amenities');
  if (amenitiesLabel) {
    amenitiesLabel.textContent = 'Amenities (comma separated)';
  }
  if (amenitiesInput) {
    amenitiesInput.placeholder = 'WiFi, Swimming Pool, Air Conditioning';
  }

  setupAmenitiesPicker(form, 'place-amenities');

  form.dataset.bound = 'true';
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!getAuthToken()) {
      alert('Login is required to create a place.');
      return;
    }

    const payload = readPlacePayloadFromForm(form);

    try {
      const response = await createPlace(payload);
      if (!response.ok) {
        const errorText = await response.text();
        alert(`Place creation failed: ${errorText}`);
        return;
      }

      const createdPlace = await response.json();
      HOME_STATE.visiblePlaces = toVisiblePlaces([createdPlace, ...HOME_STATE.visiblePlaces]);
      syncPlaceTitleCache(HOME_STATE.visiblePlaces);
      renderPlaces(HOME_STATE.visiblePlaces);
      applyClientSidePriceFilter();
      form.reset();
      alert('Place created successfully.');
    } catch (error) {
      alert('Place creation failed: Network error');
    }
  });
}

// Home page flow
async function initHomePage() {
  ensurePriceFilterOptions();
  const select = document.getElementById('price-filter');

  let visiblePlaces = toVisiblePlaces(fallbackPlaces);
  try {
    const apiPlaces = await loadPlaces();
    visiblePlaces = buildDisplayPlaces(apiPlaces);
  } catch (error) {
    visiblePlaces = toVisiblePlaces(fallbackPlaces);
  }

  HOME_STATE.visiblePlaces = visiblePlaces;
  syncPlaceTitleCache(visiblePlaces);
  renderPlaces(visiblePlaces);
  applyClientSidePriceFilter();
  initCreatePlaceForm();

  if (select) {
    select.addEventListener('change', () => {
      applyClientSidePriceFilter();
    });
  }
}

function createMyPlaceCard(place, onDelete) {
  const card = document.createElement('article');
  card.className = 'auth-card';

  const title = document.createElement('h2');
  title.className = 'h2-card';
  title.textContent = place.title || 'Untitled place';

  const description = createPlaceInfo('Description', place.description || 'No description available');
  const price = createPlaceInfo('Price', `${formatPrice(place.price)} / night`);
  const amenities = createPlaceInfo('Amenities', getAmenitiesLabel(place));
  const placeId = createPlaceInfo('Place ID', String(place.id || '-'));

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.flexWrap = 'wrap';
  actions.style.gap = '8px';

  const editLink = document.createElement('a');
  editLink.className = 'details-button';
  editLink.href = `place.html?id=${encodeURIComponent(place.id || '')}`;
  editLink.textContent = 'Modify';

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'details-button';
  deleteButton.textContent = 'Delete';
  deleteButton.addEventListener('click', async () => {
    const confirmed = window.confirm(`Delete place "${place.title || place.id}" ?`);
    if (!confirmed) {
      return;
    }

    await onDelete(place.id);
  });

  actions.append(editLink, deleteButton);
  card.append(title, description, price, amenities, placeId, actions);
  return card;
}

async function initMyPlacesPage() {
  const container = document.getElementById('my-places-list');
  if (!container) {
    return;
  }

  const token = checkAuthentication({ redirectIfMissing: true });
  if (!token) {
    return;
  }

  const currentUserId = getCurrentUserIdFromToken();
  const isAdmin = isCurrentUserAdminFromToken();
  if (!currentUserId) {
    window.location.href = 'index.html';
    return;
  }

  const pageTitle = document.querySelector('main .h1');
  if (pageTitle) {
    pageTitle.textContent = isAdmin ? 'All User Places' : 'My Places';
  }

  let myPlaces = [];
  try {
    const allPlaces = await loadPlaces();
    const realPlaces = allPlaces.filter(
      (place) => !String(place.id || '').startsWith('demo-')
    );
    myPlaces = isAdmin
      ? realPlaces
      : realPlaces.filter((place) => String(place.user_id) === String(currentUserId));
  } catch (error) {
    myPlaces = [];
  }

  const renderMyPlaces = () => {
    container.innerHTML = '';

    if (!myPlaces.length) {
      const empty = document.createElement('article');
      empty.className = 'auth-card';
      empty.textContent = isAdmin
        ? 'No user-created places available yet.'
        : 'You have not created places yet.';
      container.appendChild(empty);
      return;
    }

    myPlaces.forEach((place) => {
      const card = createMyPlaceCard(place, async (placeId) => {
        if (!getAuthToken()) {
          alert('Your session is missing or expired. Please login again.');
          window.location.href = 'login.html';
          return;
        }

        const response = await deletePlace(placeId);
        if (!response.ok) {
          const errorText = await response.text();

          if (response.status === 401) {
            clearAuthData();
            alert('Session expired. Please login again.');
            window.location.href = 'login.html';
            return;
          }

          if (response.status === 403) {
            alert(
              `Delete failed: you must be the owner (or admin). ${errorText}`
            );
            return;
          }

          alert(`Delete failed: ${errorText}`);
          return;
        }

        myPlaces = myPlaces.filter((currentPlace) => String(currentPlace.id) !== String(placeId));
        renderMyPlaces();
        alert('Place deleted successfully.');
      });

      container.appendChild(card);
    });
  };

  renderMyPlaces();
}

// Place details page flow
async function initPlacePage() {
  const placeId = getPlaceIdFromURL();
  const token = checkAuthentication();
  const isDemoRequested = String(placeId || '').startsWith('demo-');

  try {
    await getAmenitiesCatalog();
  } catch (error) {
    // Keep place rendering even if amenities catalog cannot be loaded.
  }

  let fetchedPlaceById = null;
  if (placeId && !isDemoRequested) {
    try {
      fetchedPlaceById = await fetchPlaceDetails(token, placeId);
    } catch (error) {
      fetchedPlaceById = null;
    }
  }

  let visiblePlaces = toVisiblePlaces(fallbackPlaces);
  try {
    const apiPlaces = await loadPlaces();
    visiblePlaces = buildDisplayPlaces(apiPlaces);
  } catch (error) {
    visiblePlaces = toVisiblePlaces(fallbackPlaces);
  }

  if (!visiblePlaces.length) {
    renderReviews([]);
    return;
  }

  let currentIndex = 0;
  if (fetchedPlaceById) {
    const fetchedIndex = visiblePlaces.findIndex(
      (place) => String(place.id) === String(fetchedPlaceById.id)
    );

    if (fetchedIndex !== -1) {
      visiblePlaces[fetchedIndex] = {
        ...visiblePlaces[fetchedIndex],
        ...fetchedPlaceById
      };
      currentIndex = fetchedIndex;
    } else {
      visiblePlaces = toVisiblePlaces([fetchedPlaceById, ...visiblePlaces]);
      const insertedIndex = visiblePlaces.findIndex(
        (place) => String(place.id) === String(fetchedPlaceById.id)
      );
      currentIndex = insertedIndex !== -1 ? insertedIndex : 0;
    }
  } else if (placeId) {
    const existingIndex = visiblePlaces.findIndex(
      (place) => String(place.id) === String(placeId)
    );
    if (existingIndex !== -1) {
      currentIndex = existingIndex;
    }
  } else {
    const firstRealPlaceIndex = visiblePlaces.findIndex(
      (place) => !String(place.id || '').startsWith('demo-')
    );

    if (firstRealPlaceIndex !== -1) {
      currentIndex = firstRealPlaceIndex;
    }
  }

  const renderCurrentPlace = async () => {
    const place = visiblePlaces[currentIndex];
    const placeWithHostName = await enrichPlaceWithHostName(place);
    syncPlaceTitleCache(visiblePlaces);

    displayPlaceDetails(
      placeWithHostName,
      currentIndex + 1,
      visiblePlaces.length,
      async () => {
        currentIndex = (currentIndex - 1 + visiblePlaces.length) % visiblePlaces.length;
        await renderCurrentPlace();
      },
      async () => {
        currentIndex = (currentIndex + 1) % visiblePlaces.length;
        await renderCurrentPlace();
      }
    );

    updatePlaceQuery(placeWithHostName.id);
    updateAddReviewLink(placeWithHostName.id);

    const reviewForm = document.getElementById('review-form');
    const reviewText = document.getElementById('review-text');
    const reviewRating = document.getElementById('review-rating');
    const isDemoPlace = !placeWithHostName.id || String(placeWithHostName.id).startsWith('demo-');

    bindReviewFormForPlace(
      reviewForm,
      reviewText,
      reviewRating,
      placeWithHostName.id,
      isDemoPlace
    );

    if (isDemoPlace) {
      renderReviews([]);
      renderReviewHistory([], getCurrentUserIdFromToken());
      return;
    }

    try {
      const reviews = await loadReviewsByPlace(placeWithHostName.id);
      const enrichedReviews = await enrichReviewsWithUserNames(reviews);
      renderReviews(enrichedReviews);

      const allReviews = await loadAllReviews();
      renderReviewHistory(allReviews, getCurrentUserIdFromToken());

      if (reviewForm && reviewText && reviewRating) {
        reviewForm.onsubmit = async (event) => {
          event.preventDefault();

          const currentUserId = getCurrentUserIdFromToken();
          if (!currentUserId) {
            alert('Login is required to submit a review.');
            return;
          }

          const response = await createReview({
            text: reviewText.value.trim(),
            rating: Number(reviewRating.value),
            user_id: currentUserId,
            place_id: placeWithHostName.id
          });

          if (!response.ok) {
            const errorText = await response.text();
            alert(`Review submission failed: ${errorText}`);
            return;
          }

          reviewText.value = '';
          reviewRating.value = '5';
          await renderCurrentPlace();
        };
      }

      const updateForm = renderUpdatePlaceSection(placeWithHostName);
      if (updateForm) {
        updateForm.onsubmit = async (event) => {
          event.preventDefault();
          const payload = readPlacePayloadFromForm(updateForm);

          const response = await updatePlace(placeWithHostName.id, payload);
          if (!response.ok) {
            const errorText = await response.text();
            alert(`Place update failed: ${errorText}`);
            return;
          }

          const updated = await response.json();
          let refreshedPlace = null;
          try {
            refreshedPlace = await loadPlaceById(placeWithHostName.id);
          } catch (error) {
            refreshedPlace = null;
          }

          visiblePlaces[currentIndex] = {
            ...placeWithHostName,
            ...updated,
            ...(refreshedPlace || {}),
            id: placeWithHostName.id,
            user_id: placeWithHostName.user_id
          };
          syncPlaceTitleCache(visiblePlaces);
          alert('Place updated successfully.');
          await renderCurrentPlace();
        };
      }
    } catch (error) {
      renderReviews([]);
      renderReviewHistory([], getCurrentUserIdFromToken());
    }
  };

  await renderCurrentPlace();
}

function initStandaloneAddReviewPage() {
  const page = document.getElementById('add-review-page');
  if (!page) {
    return;
  }

  const token = checkAuthentication({ redirectIfMissing: true });
  if (!token) {
    return;
  }

  const reviewForm = document.getElementById('review-form');
  const reviewText = document.getElementById('review-text');
  const reviewRating = document.getElementById('review-rating');
  const reviewPlaceId = document.getElementById('review-place-id');
  const reviewPlaceHint = document.getElementById('review-place-hint');

  if (!reviewForm || !reviewText || !reviewRating || !reviewPlaceId) {
    return;
  }

  const updatePlaceHint = async () => {
    const placeId = reviewPlaceId.value.trim();
    if (!reviewPlaceHint) {
      return;
    }

    if (!placeId) {
      reviewPlaceHint.textContent = 'Enter a place id to post your review.';
      return;
    }

    if (String(placeId).startsWith('demo-')) {
      reviewPlaceHint.textContent =
        'Demo IDs (demo-1, demo-7, etc.) are frontend previews only and cannot be reviewed. Choose a real place ID.';
      return;
    }

    try {
      const place = await loadPlaceById(placeId);
      reviewPlaceHint.textContent = `Reviewing: ${place.title || placeId}`;
    } catch (error) {
      reviewPlaceHint.textContent = `Unknown place id: ${placeId}`;
    }
  };

  reviewPlaceId.value = getPlaceIdFromURL() || '';
  reviewPlaceId.addEventListener('input', () => {
    updatePlaceHint();
  });
  updatePlaceHint();

  reviewForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const currentUserId = getCurrentUserIdFromToken();
    if (!currentUserId) {
      alert('Login is required to submit a review.');
      return;
    }

    const placeId = reviewPlaceId.value.trim();
    if (!placeId) {
      alert('Place ID is required.');
      return;
    }

    if (String(placeId).startsWith('demo-')) {
      alert('Demo place IDs are not stored in backend. Open a real place and copy its Place ID.');
      return;
    }

    const response = await submitReview(
      token,
      placeId,
      reviewText.value.trim(),
      reviewRating.value,
      currentUserId
    );

    await handleReviewSubmissionResponse(response, reviewText, reviewRating);
  });
}

function initLoginPage() {
  const loginForm = document.getElementById('login-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      try {
        const response = await loginUser(email, password);

        if (response.ok) {
          const data = await response.json();
          storeAuthToken(data.access_token);
          window.location.href = 'index.html';
        } else {
          alert(`Login failed: ${response.statusText}`);
        }
      } catch (error) {
        alert('Login failed: Network error');
      }
    });
  }
}

function initSignupPage() {
  const signupForm = document.getElementById('signup-form');

  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const firstNameInput = document.getElementById('first-name');
      const lastNameInput = document.getElementById('last-name');
      const emailInput = document.getElementById('signup-email');
      const passwordInput = document.getElementById('signup-password');

      const firstName = firstNameInput ? firstNameInput.value.trim() : '';
      const lastName = lastNameInput ? lastNameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      try {
        const response = await registerUser(firstName, lastName, email, password);

        if (response.ok) {
          alert('Account created successfully You can now login');
          window.location.href = 'login.html';
          return;
        }

        let errorMessage = `Sign up failed: ${response.statusText}`;
        try {
          const data = await response.json();
          if (data && typeof data.message === 'string' && data.message) {
            errorMessage = `Sign up failed: ${data.message}`;
          }
        } catch (parseError) {
          // Keep default message
        }

        alert(errorMessage);
      } catch (error) {
        alert('Sign up failed: Network error');
      }
    });
  }
}

// Initialize page with API data or fallback, then bind filter events
document.addEventListener('DOMContentLoaded', async () => {
  const expiredSessionDetected = consumeExpiredTokenNotice();

  setupLogoutLinks();
  updateLoginLinkVisibility();

  if (expiredSessionDetected) {
    alert('Votre session a expire. Merci de vous reconnecter.');
  }

  initLoginPage();
  initSignupPage();
  initStandaloneAddReviewPage();

  if (document.getElementById('places-list')) {
    await initHomePage();
  }

  if (document.getElementById('my-places-list')) {
    await initMyPlacesPage();
  }

  if (document.getElementById('place-details')) {
    setupAddReviewLinkGuard();
    updateAddReviewLink(getQueryParam('id'));
    await initPlacePage();
  }
});