const navbar = document.querySelector('.navbar');
const langWrapper = document.getElementById('lang');
const langButton = langWrapper ? langWrapper.querySelector('.lang-btn') : null;
const langMenu = langWrapper ? langWrapper.querySelector('.lang-menu') : null;
const langCurrent = langWrapper ? langWrapper.querySelector('[data-lang-current]') : null;
const langOptions = langWrapper ? Array.from(langWrapper.querySelectorAll('[data-lang]')) : [];

const setNavState = () => {
  if (!navbar) return;
  if (window.scrollY > 12) {
    navbar.classList.add('nav--floating');
  } else {
    navbar.classList.remove('nav--floating');
  }
};

window.addEventListener('scroll', setNavState, { passive: true });
setNavState();

const closeLangMenu = () => {
  if (!langWrapper || !langButton) return;
  langWrapper.classList.remove('open');
  langButton.setAttribute('aria-expanded', 'false');
};

const toggleLangMenu = () => {
  if (!langWrapper || !langButton) return;
  const isOpen = langWrapper.classList.toggle('open');
  langButton.setAttribute('aria-expanded', String(isOpen));
};

if (langButton) {
  langButton.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleLangMenu();
  });
}

document.addEventListener('click', () => {
  if (langWrapper && langWrapper.classList.contains('open')) {
    closeLangMenu();
  }
});

if (langMenu) {
  langMenu.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      closeLangMenu();
      return;
    }
    const button = target.closest('button[data-lang]');
    if (!button) {
      closeLangMenu();
      return;
    }
    const nextLocale = button.dataset.lang;
    if (!nextLocale || nextLocale === currentLocale) {
      closeLangMenu();
      return;
    }
    currentLocale = nextLocale;
    document.documentElement.lang = currentLocale;
    loadTranslations(currentLocale).then(() => {
      document.documentElement.lang = currentLocale;
      applyI18n();
      reapplyDynamicTexts();
      closeLangMenu();
    });
  });
}

const revealItems = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

revealItems.forEach((item) => {
  observer.observe(item);
});

const tiltTargets = document.querySelectorAll('[data-tilt]');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion && tiltTargets.length > 0) {
  tiltTargets.forEach((card) => {
    let rafId = null;
    const maxTilt = 10;

    const updateTilt = (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const tiltX = (0.5 - y) * maxTilt;
      const tiltY = (x - 0.5) * maxTilt;
      card.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
    };

    const handleMove = (event) => {
      if (event.pointerType === 'touch') return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => updateTilt(event));
    };

    const resetTilt = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    };

    card.addEventListener('pointermove', handleMove);
    card.addEventListener('pointerenter', handleMove);
    card.addEventListener('pointerleave', resetTilt);
    card.addEventListener('pointerdown', handleMove);
  });
}

const downloadModal = document.getElementById('download-modal');
const downloadOpenButtons = document.querySelectorAll('[data-download-open]');
const downloadCloseButtons = document.querySelectorAll('[data-download-close]');
const versionPill = document.getElementById('current-version');
const heroDownloads = document.querySelector('[data-downloads-total]');

const i18n = {};
let currentLocale = document.documentElement.lang || 'en';
const localeLabelKey = {
  en: 'lang.english',
  pl: 'lang.polish',
  es: 'lang.spanish',
  fr: 'lang.french',
  ru: 'lang.russian',
  ja: 'lang.japanese',
};

const t = (key, vars = {}) => {
  const dict = i18n[currentLocale] || i18n.en;
  if (!dict) return key;
  const value = dict[key];
  if (typeof value !== 'string') return key;
  return value.replace(/\{(\w+)\}/g, (match, name) => (
    Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : match
  ));
};

const updateLangCurrent = () => {
  if (!langCurrent) return;
  const key = localeLabelKey[currentLocale] || 'lang.english';
  langCurrent.textContent = t(key);
};

const updateLangMenuSelection = () => {
  if (langOptions.length === 0) return;
  langOptions.forEach((button) => {
    const isActive = button.dataset.lang === currentLocale;
    button.setAttribute('aria-selected', String(isActive));
  });
};

const loadTranslations = async (locale) => {
  if (i18n[locale]) {
    return true;
  }
  try {
    const response = await fetch(`assets/langs/${locale}.json`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Translations response ${response.status}`);
    }
    i18n[locale] = await response.json();
    return true;
  } catch (error) {
    if (locale !== 'en') {
      currentLocale = 'en';
      return loadTranslations('en');
    }
    return false;
  }
};

const applyI18n = () => {
  const dict = i18n[currentLocale] || i18n.en;
  if (!dict) return;

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    if (!key) return;
    const value = t(key);
    if (value && value !== key) {
      element.textContent = value;
    }
  });

  document.querySelectorAll('[data-i18n-html]').forEach((element) => {
    const key = element.dataset.i18nHtml;
    if (!key) return;
    const value = t(key);
    if (value && value !== key) {
      element.innerHTML = value;
    }
  });

  document.querySelectorAll('[data-i18n-attr]').forEach((element) => {
    const mapping = element.dataset.i18nAttr;
    if (!mapping) return;
    mapping.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':').map((part) => part.trim());
      if (!attr || !key) return;
      const value = t(key);
      if (value && value !== key) {
        element.setAttribute(attr, value);
      }
    });
  });

  updateLangCurrent();
  updateLangMenuSelection();
};

const initI18n = async () => {
  await loadTranslations(currentLocale);
  document.documentElement.lang = currentLocale;
  applyI18n();
};

const i18nReady = initI18n();

const CACHE_KEY = 'pulsar-latest-release';
const CACHE_TTL = 20 * 60 * 1000;
const DOWNLOADS_CACHE_KEY = 'pulsar-release-downloads-total';
const DOWNLOADS_CACHE_TTL = 30 * 60 * 1000;
let releaseState = { status: 'idle', loadedAt: 0 };
let lastFocusedElement = null;
let lastReleaseData;
let lastReleaseError = false;
let lastDownloadsTotal;

const platformMatchers = {
  windows: {
    installer: [/\.exe$/i],
    portable: [/\.zip$/i],
  },
  macos: {
    installer: [/\.pkg$/i],
    portable: [/\.app\.tar\.gz$/i, /\.tar\.gz$/i],
  },
  linux: {
    appimage: [/\.appimage$/i],
    deb: [/\.deb$/i],
    portable: [/\.tar\.gz$/i],
  },
};

const formatBytes = (bytes) => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return '';
  const units = [
    t('units.byte'),
    t('units.kb'),
    t('units.mb'),
    t('units.gb'),
  ];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatDownloads = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const safeValue = Math.max(0, Math.floor(value));
  const formatter = new Intl.NumberFormat(currentLocale || navigator.language || 'en-US');
  return formatter.format(safeValue);
};

const setHeroDownloads = (value) => {
  if (!heroDownloads) return;
  if (typeof value === 'number') {
    const formatted = formatDownloads(value);
    if (formatted) {
      heroDownloads.textContent = `${formatted} ${t('hero.downloadsSuffix')}`;
      return;
    }
  }
  heroDownloads.textContent = t('hero.downloadsUnavailable');
};

const pickAsset = (assets, matchers, used) => {
  if (!Array.isArray(assets)) return null;
  for (const matcher of matchers) {
    const found = assets.find((asset) => {
      if (!asset || !asset.name) return false;
      if (used.has(asset.id || asset.name)) return false;
      return matcher.test(asset.name);
    });
    if (found) {
      used.add(found.id || found.name);
      return found;
    }
  }
  return null;
};

const setPlatformAsset = (platform, kind, asset) => {
  const linkEl = document.querySelector(
    `[data-asset-platform="${platform}"][data-asset-kind="${kind}"]`
  );
  if (!linkEl) return;
  const sizeEl = linkEl.querySelector('.btn-size');
  if (asset) {
    linkEl.href = asset.browser_download_url || '#';
    linkEl.classList.remove('is-disabled');
    linkEl.setAttribute('aria-disabled', 'false');
    if (sizeEl) {
      sizeEl.textContent = `(${formatBytes(asset.size)})`;
    }
  } else {
    linkEl.href = '#';
    linkEl.classList.add('is-disabled');
    linkEl.setAttribute('aria-disabled', 'true');
    if (sizeEl) {
      sizeEl.textContent = `(${t('download.assetUnavailable')})`;
    }
  }
};

const applyReleaseData = (data) => {
  if (!data) return;
  lastReleaseData = data;
  lastReleaseError = false;
  const version = data.tag_name || data.name || t('download.unknownVersion');
  if (versionPill) {
    versionPill.textContent = t('download.currentVersion', { version });
  }
  const assets = Array.isArray(data.assets) ? data.assets : [];
  const used = new Set();
  setPlatformAsset('windows', 'installer', pickAsset(assets, platformMatchers.windows.installer, used));
  setPlatformAsset('windows', 'portable', pickAsset(assets, platformMatchers.windows.portable, used));
  setPlatformAsset('macos', 'installer', pickAsset(assets, platformMatchers.macos.installer, used));
  setPlatformAsset('macos', 'portable', pickAsset(assets, platformMatchers.macos.portable, used));
  setPlatformAsset('linux', 'appimage', pickAsset(assets, platformMatchers.linux.appimage, used));
  setPlatformAsset('linux', 'deb', pickAsset(assets, platformMatchers.linux.deb, used));
  setPlatformAsset('linux', 'portable', pickAsset(assets, platformMatchers.linux.portable, used));
};

const applyReleaseError = () => {
  lastReleaseData = null;
  lastReleaseError = true;
  if (versionPill) {
    versionPill.textContent = t('download.currentVersionUnavailable');
  }
  setPlatformAsset('windows', 'installer', null);
  setPlatformAsset('windows', 'portable', null);
  setPlatformAsset('macos', 'installer', null);
  setPlatformAsset('macos', 'portable', null);
  setPlatformAsset('linux', 'appimage', null);
  setPlatformAsset('linux', 'deb', null);
  setPlatformAsset('linux', 'portable', null);
};

const reapplyDynamicTexts = () => {
  if (lastReleaseData) {
    applyReleaseData(lastReleaseData);
  } else if (lastReleaseError) {
    applyReleaseError();
  }
  if (lastDownloadsTotal !== undefined) {
    setHeroDownloads(lastDownloadsTotal);
  }
};

const loadTotalDownloads = async () => {
  if (!heroDownloads) return;

  try {
    const cached = localStorage.getItem(DOWNLOADS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (
        parsed &&
        typeof parsed.total === 'number' &&
        parsed.timestamp &&
        Date.now() - parsed.timestamp < DOWNLOADS_CACHE_TTL
      ) {
        lastDownloadsTotal = parsed.total;
        setHeroDownloads(parsed.total);
        return;
      }
    }
  } catch (error) {
    // Ignoruj cache i pobierz świeże dane
  }

  try {
    const perPage = 100;
    let page = 1;
    let total = 0;

    while (page <= 10) {
      const response = await fetch(
        `https://api.github.com/repos/FuzjaJadrowa/Pulsar/releases?per_page=${perPage}&page=${page}`,
        { headers: { Accept: 'application/vnd.github+json' } }
      );
      if (!response.ok) {
        throw new Error(`GitHub response ${response.status}`);
      }
      const releases = await response.json();
      if (!Array.isArray(releases) || releases.length === 0) break;

      releases.forEach((release) => {
        const assets = Array.isArray(release.assets) ? release.assets : [];
        assets.forEach((asset) => {
          if (typeof asset.download_count === 'number') {
            total += asset.download_count;
          }
        });
      });

      if (releases.length < perPage) break;
      page += 1;
    }

    setHeroDownloads(total);
    lastDownloadsTotal = total;
    try {
      localStorage.setItem(
        DOWNLOADS_CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), total })
      );
    } catch (error) {
      // Ignoruj
    }
  } catch (error) {
    lastDownloadsTotal = null;
    setHeroDownloads(null);
  }
};

const loadRelease = async () => {
  if (releaseState.status === 'loading') return;
  if (releaseState.status === 'loaded' && Date.now() - releaseState.loadedAt < CACHE_TTL) return;
  releaseState.status = 'loading';

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL && parsed.data) {
        applyReleaseData(parsed.data);
        releaseState.status = 'loaded';
        releaseState.loadedAt = parsed.timestamp || Date.now();
        return;
      }
    }
  } catch (error) {
    // Ignoruj i znajdź nowe dane
  }

  try {
    const response = await fetch('https://api.github.com/repos/FuzjaJadrowa/Pulsar/releases/latest', {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) {
      throw new Error(`GitHub response ${response.status}`);
    }
    const data = await response.json();
    applyReleaseData(data);
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), data })
      );
    } catch (error) {
      // Ignoruj
    }
    releaseState.status = 'loaded';
    releaseState.loadedAt = Date.now();
  } catch (error) {
    applyReleaseError();
    releaseState.status = 'loaded';
    releaseState.loadedAt = Date.now();
  }
};

const openDownloadModal = () => {
  if (!downloadModal) return;
  lastFocusedElement = document.activeElement;
  downloadModal.classList.add('is-open');
  downloadModal.classList.remove('is-closing');
  downloadModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  i18nReady.then(() => {
    loadRelease();
  });
  const closeButton = downloadModal.querySelector('.download-modal__close');
  if (closeButton) closeButton.focus();
};

const closeDownloadModal = () => {
  if (!downloadModal) return;
  if (!downloadModal.classList.contains('is-open')) return;
  downloadModal.classList.add('is-closing');
  downloadModal.classList.remove('is-open');
  downloadModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
  window.setTimeout(() => {
    if (downloadModal) {
      downloadModal.classList.remove('is-closing');
    }
  }, 260);
};

downloadOpenButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    openDownloadModal();
  });
});

i18nReady.then(() => {
  loadTotalDownloads();
});

downloadCloseButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    closeDownloadModal();
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && downloadModal && downloadModal.classList.contains('is-open')) {
    closeDownloadModal();
  }
});

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.matches('.platform-download.is-disabled')) {
    event.preventDefault();
  }
});

const faqCards = document.querySelectorAll('.faq-card');
faqCards.forEach((card) => {
  const button = card.querySelector('.faq-question');
  if (!button) return;
  button.addEventListener('click', () => {
    const isOpen = card.classList.toggle('is-open');
    button.setAttribute('aria-expanded', String(isOpen));
  });
});
