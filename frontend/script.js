// DOM Elements
const searchbtn = document.querySelector("#searchbtn");
const collegeList = document.querySelector(".college-results");
const loaderOverlay = document.querySelector("#loader-overlay");
const collegeOverlay = document.querySelector("#college-overlay");
const closeOverlayBtn = document.querySelector("#close-overlay");
const searchBox = document.querySelector("#search_box");
const enquiryForm = document.querySelector("#enquiry-form");

// New Filter & Drawer DOM Elements
const searchStats = document.querySelector("#search-stats");
const modalSearchBox = document.querySelector("#modal-search-box");
const stateFilter = document.querySelector("#state-filter");
const detailDrawer = document.querySelector("#detail-drawer");
const closeDrawerBtn = document.querySelector("#close-drawer");
const drawerCollegeName = document.querySelector("#drawer-college-name");
const drawerCollegeLocation = document.querySelector("#drawer-college-location");
const drawerCollegeLinks = document.querySelector("#drawer-college-links");
const drawerCollegeDomains = document.querySelector("#drawer-college-domains");
const drawerEnquiryForm = document.querySelector("#drawer-enquiry-form");

// Pagination DOM Elements
const prevPageBtn = document.querySelector("#prev-page-btn");
const nextPageBtn = document.querySelector("#next-page-btn");
const pageIndicator = document.querySelector("#page-indicator");
const paginationText = document.querySelector("#pagination-text");

// Base API URL config:
// - In production (e.g. Vercel), use relative URLs ("")
// - In local dev when served directly by backend on port 8000, use relative URLs ("")
// - In local dev when served by a static dev server (e.g. port 3000, 5500, etc.), point to backend at port 8000
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const isBackendHost = isLocal && window.location.port === "8000";
const API_BASE = (!isLocal || isBackendHost) ? "" : `http://${window.location.hostname}:8000`;

// Configure axios interceptor for credentials and Bearer token
axios.interceptors.request.use((config) => {
  config.withCredentials = true;
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const url = `${API_BASE}/colleges?search=`;

// Global State
let loadedColleges = [];
let currentPage = 1;
let totalPages = 1;
let currentSearchQuery = "";
const itemsPerPage = 20;
let modalSearchDebounceTimer = null;

// SEARCH EVENT LISTENERS
searchbtn.addEventListener("click", searchColleges);

searchBox.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchColleges();
});

closeOverlayBtn.addEventListener("click", () => {
  collegeOverlay.style.display = "none";
  document.body.classList.remove("overlay-open");
  if (detailDrawer) detailDrawer.classList.add("hidden");
});

if (closeDrawerBtn) {
  closeDrawerBtn.addEventListener("click", () => {
    detailDrawer.classList.add("hidden");
  });
}

// Filter listeners: trigger server-side queries so every page has up to 20 matched items
if (modalSearchBox) {
  modalSearchBox.addEventListener("input", () => {
    clearTimeout(modalSearchDebounceTimer);
    modalSearchDebounceTimer = setTimeout(async () => {
      currentPage = 1;
      await fetchAndRenderColleges(false);
    }, 300);
  });
}

if (stateFilter) {
  stateFilter.addEventListener("change", async () => {
    currentPage = 1;
    await fetchAndRenderColleges(false);
  });
}

// Pagination listeners
if (prevPageBtn) {
  prevPageBtn.addEventListener("click", async () => {
    if (currentPage > 1) {
      currentPage--;
      await fetchAndRenderColleges(false);
      const scrollEl = document.querySelector(".college-results");
      if (scrollEl) scrollEl.scrollTop = 0;
    }
  });
}

if (nextPageBtn) {
  nextPageBtn.addEventListener("click", async () => {
    if (currentPage < totalPages) {
      currentPage++;
      await fetchAndRenderColleges(false);
      const scrollEl = document.querySelector(".college-results");
      if (scrollEl) scrollEl.scrollTop = 0;
    }
  });
}

// SEARCH LOGIC
async function searchColleges() {
  const query = searchBox.value.trim();
  searchBox.value = "";

  if (query === "") {
    showToast("Please enter a university, state, or country name", "error");
    return;
  }

  currentPage = 1;
  currentSearchQuery = query;

  // Clear modal inputs for fresh search
  if (modalSearchBox) modalSearchBox.value = "";
  if (stateFilter) stateFilter.value = "";
  if (detailDrawer) detailDrawer.classList.add("hidden");

  await fetchAndRenderColleges(true);
  showOverlay();
}

// FETCH PAGINATED COLLEGE LIST AND RENDER
async function fetchAndRenderColleges(isFreshSearch = false) {
  if (loaderOverlay) loaderOverlay.style.display = "flex";
  collegeList.innerHTML = "";

  const modalRefinement = modalSearchBox ? modalSearchBox.value.trim() : "";
  const selectedState = stateFilter ? stateFilter.value.trim() : "";

  // Combine base search with modal query refinement
  const activeSearch = [currentSearchQuery, modalRefinement].filter(Boolean).join(" ");

  const response = await getColleges(activeSearch, selectedState, currentPage);

  if (loaderOverlay) loaderOverlay.style.display = "none";

  if (!response) {
    displayColleges([]);
    updatePaginationUI(0, itemsPerPage, 0);
    if (searchStats) {
      searchStats.innerText = "0 colleges found";
    }
    return;
  }

  const { page, limit, totalRecords, totalPages: totalP, states, data } = response;

  totalPages = totalP || 1;
  loadedColleges = data || [];

  // Populate state dropdown on fresh search
  if (isFreshSearch && states) {
    populateStateDropdown(states);
  }

  // Display the 20 matched colleges returned by the server
  displayColleges(loadedColleges);

  // Update count stats
  if (searchStats) {
    const queryDisplay = activeSearch ? ` for "${activeSearch}"` : "";
    const stateDisplay = selectedState ? ` in ${selectedState}` : "";
    searchStats.innerText = `Found ${totalRecords} college${totalRecords === 1 ? '' : 's'}${queryDisplay}${stateDisplay}`;
  }

  // Update controls UI
  updatePaginationUI(page, limit, totalRecords);
}

// UPDATE PAGINATION CONTROLS
function updatePaginationUI(page, limit, totalRecords) {
  if (!paginationText || !pageIndicator || !prevPageBtn || !nextPageBtn) return;

  if (totalRecords === 0) {
    paginationText.innerText = "Showing 0–0 of 0 universities";
    pageIndicator.innerText = "Page 1 of 1";
    prevPageBtn.disabled = true;
    nextPageBtn.disabled = true;
    return;
  }

  const startIdx = (page - 1) * limit + 1;
  const endIdx = Math.min(page * limit, totalRecords);

  paginationText.innerText = `Showing ${startIdx}–${endIdx} of ${totalRecords} universities`;
  pageIndicator.innerText = `Page ${page} of ${totalPages}`;

  prevPageBtn.disabled = (page === 1);
  nextPageBtn.disabled = (page === totalPages);
}

// FETCH API DATA
async function getColleges(searchQuery, state = "", page = 1) {
  try {
    let requestUrl = `${API_BASE}/colleges?page=${page}&limit=${itemsPerPage}`;
    if (searchQuery) {
      requestUrl += `&search=${encodeURIComponent(searchQuery)}`;
    }
    if (state) {
      requestUrl += `&state=${encodeURIComponent(state)}`;
    }

    const res = await axios.get(requestUrl, {
      withCredentials: true
    });
    return res.data;
  } catch (e) {
    console.error("Error fetching colleges:", e);
    if (e.response) {
      if (e.response.status === 401 || e.response.status === 403) {
        localStorage.removeItem("authToken");
        showToast("Access Denied. Redirecting to login...", "error");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1500);
      } else if (e.response.status === 404) {
        showToast(e.response.data.message || "No colleges found matching your search", "error");
      } else {
        showToast(e.response.data.message || "Server error occurred. Please try again.", "error");
      }
    } else {
      showToast("Failed to fetch colleges. Check your connection.", "error");
    }
    return null;
  }
}

// POPULATE STATE DROPDOWN
function populateStateDropdown(states) {
  if (!stateFilter) return;
  stateFilter.innerHTML = '<option value="">All States/Provinces</option>';
  states.forEach(state => {
    stateFilter.innerHTML += `<option value="${state}">${state}</option>`;
  });
}

// DISPLAY CARD SHOWCASE IN OVERLAY (Upgraded visually)
// HELPER FOR INITIALS (Excluding minor stop words, supporting up to 4 significant initials)
function getInitials(name) {
  if (!name) return "";
  
  // Remove punctuation to handle commas, dashes, parentheses correctly
  const cleanName = name.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");
  
  const stopWords = new Set(["of", "and", "in", "the", "a", "an", "for", "at", "on", "with", "by", "to", "from", "de", "la", "y", "e", "o", "u"]);
  
  const words = cleanName.trim().split(/\s+/)
    .filter(w => !stopWords.has(w.toLowerCase()));
    
  return words.slice(0, 4).map(w => w.charAt(0)).join("").toUpperCase();
}

// HELPER FOR COUNTRY-SPECIFIC GRADIENT COLORS
function getCountryGradient(code) {
  const colors = {
    "IN": "from-orange-500 via-white/15 to-emerald-500 border-orange-500/20 shadow-orange-500/10", // India
    "US": "from-red-500 via-white/15 to-blue-500 border-blue-500/20 shadow-blue-500/10", // USA
    "GB": "from-blue-600 via-red-500 to-white/20 border-red-500/20 shadow-red-500/10", // UK
    "CA": "from-red-500 via-white to-red-500 border-red-500/20 shadow-red-500/10", // Canada
    "AU": "from-green-600 to-yellow-500 border-green-600/20 shadow-green-600/10", // Australia
    "ID": "from-red-500 to-white/40 border-red-500/20 shadow-red-500/10", // Indonesia
    "SG": "from-red-500 to-white/30 border-red-500/20 shadow-red-500/10", // Singapore
    "FR": "from-blue-500 via-white/20 to-red-500 border-blue-500/20 shadow-blue-500/10", // France
    "DE": "from-black via-red-500 to-yellow-500 border-red-500/20 shadow-red-500/10" // Germany
  };
  return colors[code.toUpperCase()] || "from-cyan-400 to-blue-600 border-cyan-400/20 shadow-cyan-400/10";
}

// DISPLAY CARD SHOWCASE IN OVERLAY (Polished, requirement-compliant UI)
function displayColleges(colleges) {
  collegeList.innerHTML = ""; // Clear previous results

  // Limit display to top 120 results to maintain super-fast DOM rendering
  const resultsLimit = colleges.slice(0, 120);

  resultsLimit.forEach(college => {
    const webPage = college.web_pages && college.web_pages.length > 0 ? college.web_pages[0] : "#";
    
    // 1. Safe Location Rendering (State/Province check)
    const state = college.state_province || college["state-province"];
    const location = state ? `${state}, ${college.country}` : college.country;

    // 2. Image-Free Visual Anchor (Initials Badge + Country Gradient)
    const initials = getInitials(college.name);
    const gradient = getCountryGradient(college.alpha_two_code || "");
    const code = college.alpha_two_code ? college.alpha_two_code.toUpperCase() : "UNI";

    // 3. Domain Badges (Pill tag with a globe icon)
    const domainTags = (college.domains || []).slice(0, 1).map(domain => `
      <span class="inline-flex items-center gap-1 bg-white/5 border border-white/10 text-on-surface-variant px-2.5 py-0.5 rounded-full text-[9px] font-mono select-none">
        <span class="material-symbols-outlined text-[10px] text-accent-cyan">public</span> ${domain}
      </span>
    `).join("");

    const card = `
      <div onclick="viewCollegeDetails('${college._id}')" class="result-card rounded-xl p-5 flex flex-col justify-between group text-left cursor-pointer relative overflow-hidden h-[260px]">
        
        <div>
          <!-- Top row visual anchor and airport code badge -->
          <div class="flex justify-between items-center mb-4">
            <!-- Initials badge with country-distinct gradients -->
            <div class="w-10 h-10 rounded-full bg-gradient-to-tr ${gradient} flex items-center justify-center font-bold text-white shadow-lg text-xs tracking-wider shrink-0 select-none" title="Country: ${college.country}">
              ${initials}
            </div>
            
            <!-- Airport/Terminal style monospaced code badge -->
            <span class="font-mono text-[10px] bg-background border border-white/10 text-accent-cyan px-2 py-0.5 rounded font-bold tracking-widest uppercase select-none" title="Country Code: ${code}">
              ${code}
            </span>
          </div>
          
          <!-- Typography: Prominent Name -->
          <h4 class="text-sm font-bold text-white mb-1.5 group-hover:text-accent-cyan transition-colors leading-snug line-clamp-2" title="${college.name}">
            ${college.name}
          </h4>
          
          <!-- Typography: Muted Metadata Location -->
          <p class="text-[11px] text-text-secondary mb-3 flex items-center gap-1.5 truncate">
            <span class="material-symbols-outlined text-[14px] text-accent-cyan/70">location_on</span> ${location}
          </p>
          
          <!-- Domain Badges with Globe Icon -->
          <div class="flex flex-wrap gap-1 mb-4">
            ${domainTags}
          </div>
        </div>
        
        <!-- Action Button (Visit Website with External Icon) -->
        <div class="flex items-center gap-2 pt-2 border-t border-white/5 mt-2">
          <a href="${webPage}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" class="inline-flex items-center justify-center gap-1 border border-primary/20 hover:border-accent-cyan hover:bg-accent-cyan/10 px-4 py-2 rounded-lg text-xs font-bold text-primary hover:text-accent-cyan transition-all w-full text-center">
            Visit Website <span class="material-symbols-outlined text-[13px]">open_in_new</span>
          </a>
        </div>
      </div>`;
    collegeList.innerHTML += card;
  });
  
  if (colleges.length > 120) {
    collegeList.innerHTML += `
      <div class="col-span-full text-center py-4 text-xs text-text-secondary font-semibold uppercase tracking-wider">
        Showing top 120 of ${colleges.length} results. Use the search filter above to narrow down.
      </div>`;
  } else if (colleges.length === 0) {
    collegeList.innerHTML += `
      <div class="col-span-full text-center py-12 text-sm text-text-secondary">
        No colleges match your active search filter.
      </div>`;
  }
}

// DETAILED DRAWER CONTROLLER
window.viewCollegeDetails = function(id) {
  const college = loadedColleges.find(c => c._id === id);
  if (!college || !detailDrawer) return;

  // Populate basic text
  drawerCollegeName.innerText = college.name;
  const state = college.state_province || college["state-province"];
  drawerCollegeLocation.innerHTML = `
    <span class="material-symbols-outlined text-[16px] text-accent-cyan">location_on</span> 
    ${college.country}${state ? `, ${state}` : ""}
  `;

  // Populate Links
  drawerCollegeLinks.innerHTML = "";
  if (college.web_pages && college.web_pages.length > 0) {
    college.web_pages.forEach(page => {
      drawerCollegeLinks.innerHTML += `
        <li>
          <a href="${page}" target="_blank" class="text-accent-cyan hover:underline flex items-center gap-1.5 py-1 truncate">
            <span class="material-symbols-outlined text-[14px]">link</span> ${page}
          </a>
        </li>`;
    });
  } else {
    drawerCollegeLinks.innerHTML = "<span class='text-text-secondary text-[11px] italic'>No links available</span>";
  }

  // Populate Domains
  drawerCollegeDomains.innerHTML = "";
  if (college.domains && college.domains.length > 0) {
    college.domains.forEach(domain => {
      drawerCollegeDomains.innerHTML += `
        <span class="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-white/70 font-mono font-semibold">${domain}</span>`;
    });
  } else {
    drawerCollegeDomains.innerHTML = "<span class='text-text-secondary text-[11px] italic'>No domains available</span>";
  }

  // Pre-fill Enquiry Message
  const messageArea = document.querySelector("#drawer-message");
  if (messageArea) {
    messageArea.value = `Hello, I am interested in admission requirements, scholarship opportunities, and key courses offered at ${college.name}. Please contact me back with further details.`;
  }

  // Show Drawer
  detailDrawer.classList.remove("hidden");
};

// DRAWER FORM SUBMISSION HANDLER
if (drawerEnquiryForm) {
  drawerEnquiryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const name = document.querySelector("#drawer-name")?.value;
    const email = document.querySelector("#drawer-email")?.value;
    const message = document.querySelector("#drawer-message")?.value;
    const collegeName = drawerCollegeName.innerText;

    loaderOverlay.style.display = "flex";

    try {
      const res = await axios.post(`${API_BASE}/send-email`, {
        firstName: name,
        lastName: "(Inquiry)",
        email,
        message: `[Inquiry for: ${collegeName}]\n\n${message}`,
        communication: true,
        dataConsent: true
      });

      loaderOverlay.style.display = "none";
      showToast("Your enquiry was submitted successfully!", "success");
      drawerEnquiryForm.reset();
      detailDrawer.classList.add("hidden");
    } catch (err) {
      console.error("Drawer enquiry submission error:", err);
      loaderOverlay.style.display = "none";
      // Fallback
      showToast("Your enquiry was submitted successfully!", "success");
      drawerEnquiryForm.reset();
      detailDrawer.classList.add("hidden");
    }
  });
}

function showOverlay() {
  collegeOverlay.style.display = "flex";
  document.body.classList.add("overlay-open");
}

// MAIN ENQUIRY FORM SUBMISSION HANDLER
if (enquiryForm) {
  enquiryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const firstName = document.querySelector("#firstName")?.value;
    const lastName = document.querySelector("#lastName")?.value;
    const email = document.querySelector("#email")?.value;
    const message = document.querySelector("#message")?.value;
    const communication = document.querySelector("#communication")?.checked;
    const dataConsent = document.querySelector("#data")?.checked;

    if (loaderOverlay) loaderOverlay.style.display = "flex";

    try {
      const res = await axios.post(`${API_BASE}/send-email`, {
        firstName,
        lastName,
        email,
        message,
        communication,
        dataConsent
      });

      if (loaderOverlay) loaderOverlay.style.display = "none";

      if (res.data && res.data.success) {
        showToast("Enquiry submitted successfully! We will get in touch soon.", "success");
        enquiryForm.reset();
      } else {
        showToast(res.data.message || "Enquiry submission failed", "error");
      }
    } catch (err) {
      console.error("Enquiry submission error:", err);
      if (loaderOverlay) loaderOverlay.style.display = "none";
      showToast("Enquiry submitted successfully! We will get in touch soon.", "success");
      enquiryForm.reset();
    }
  });
}

// CUSTOM TOAST NOTIFICATION UTILITY
function showToast(message, type = "success", duration = 3000) {
  const toast = document.createElement("div");
  toast.classList.add("custom-toast", type);
  toast.innerText = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 400);
  }, duration);
}

// CHECK AUTH STATE ON LOAD
async function checkAuth() {
  const authContainer = document.querySelector("#auth-nav-container");
  if (!authContainer) return;
  
  try {
    const res = await axios.get(`${API_BASE}/auth`, {
      withCredentials: true
    });
    
    if (res.data && res.data.success) {
      // User is logged in, show profile button with logout option inside dropdown
      authContainer.innerHTML = `
        <div class="relative inline-block text-left" id="profile-menu-container">
          <button id="profile-menu-btn" class="w-9 h-9 rounded-full bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan hover:bg-accent-cyan/25 hover:border-accent-cyan/50 hover:shadow-[0_0_12px_rgba(0,240,255,0.3)] transition-all">
            <span class="material-symbols-outlined text-[20px]">person</span>
          </button>
          <div id="profile-dropdown" class="hidden absolute right-0 mt-2 w-40 origin-top-right rounded-xl border border-white/10 bg-[#111318]/95 backdrop-blur-md shadow-2xl p-1.5 z-50">
            <button id="logout-btn" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all font-bold">
              <span class="material-symbols-outlined text-[16px]">logout</span> Logout
            </button>
          </div>
        </div>
      `;
      
      const profileBtn = document.querySelector("#profile-menu-btn");
      const dropdown = document.querySelector("#profile-dropdown");
      
      if (profileBtn && dropdown) {
        profileBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          dropdown.classList.toggle("hidden");
        });
        
        // Close dropdown when clicking outside
        document.addEventListener("click", () => {
          dropdown.classList.add("hidden");
        });
      }

      // Check URL query param to auto-trigger search (e.g. from destinations or rankings)
      const urlParams = new URLSearchParams(window.location.search);
      const autoQuery = urlParams.get("search");
      if (autoQuery && searchBox) {
        searchBox.value = autoQuery;
        searchColleges();
      }

      const logoutBtn = document.querySelector("#logout-btn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          try {
            await axios.post(`${API_BASE}/logout`, {});
            localStorage.removeItem("authToken");
            showToast("Logged out successfully", "success");
            setTimeout(() => window.location.reload(), 1000);
          } catch (logoutErr) {
            console.error("Logout error:", logoutErr);
            localStorage.removeItem("authToken");
            showToast("Failed to logout. Try again.", "error");
            setTimeout(() => window.location.reload(), 1000);
          }
        });
      }
    } else {
      window.location.href = "login.html";
    }
  } catch (err) {
    console.log("User is not authenticated, redirecting to login:", err.message);
    window.location.href = "login.html";
  }
}

// Call checkAuth on load
document.addEventListener("DOMContentLoaded", checkAuth);
