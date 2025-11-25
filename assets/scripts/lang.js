let currentLang = localStorage.getItem("lang") || "pl";
let translations = null;

async function loadEnglishTranslations() {
    if (translations) return translations;

    try {
        const response = await fetch("/assets/scripts/translations.json");
        translations = await response.json();
        applyTranslations(translations);
    } catch (err) {
        console.error("Błąd wczytywania tłumaczeń:", err);
    }
}

function applyTranslations(t) {
    if (!t) return;

    if (document.querySelector(".start")) {
        const navLinks = document.querySelectorAll('nav ul li a');
        if (navLinks.length >= 5) {
            navLinks[0].textContent = t.nav.start;
            navLinks[1].textContent = t.nav.about;
            navLinks[2].textContent = t.nav.portfolio;
            navLinks[3].textContent = t.nav.archive;
            navLinks[4].textContent = t.nav.contact;
        }

        document.querySelector('.start .title').textContent = t.start.title;
        document.querySelector('.start .subtitle').textContent = t.start.subtitle;
        document.querySelector('.start p').textContent = t.start.text;
        const startBtns = document.querySelectorAll('.start .buttons a');
        if (startBtns.length >= 2) {
            startBtns[0].textContent = t.start.btnPortfolio;
            startBtns[1].textContent = t.start.btnOrder;
        }

        document.querySelector('.about-text h2').textContent = t.about.title;
        document.querySelector('.about-text p').innerHTML = t.about.text;
        document.querySelector('.about-text h3').textContent = t.about.knownAs;
        const modrinthBtn = document.querySelector('.modrinth-btn');
        if (modrinthBtn) {
            modrinthBtn.innerHTML = `<img src="https://i.ibb.co/qY83SpBv/modrinth-new.webp" alt=""> ${t.about.modrinth}`;
        }

        const headersH3 = document.querySelectorAll('.about-text h3');
        if (headersH3.length > 1) {
            headersH3[1].textContent = t.about.donate;
        }

        document.querySelectorAll('.about-stats .stat p').forEach((el, i) => {
            if (t.about.stats[i]) el.textContent = t.about.stats[i];
        });

        document.querySelector('.portfolio-title').textContent = t.portfolio.title;
        document.querySelectorAll('.portfolio-item').forEach((item, i) => {
            if (t.portfolio.items[i]) {
                item.querySelector('h3').textContent = t.portfolio.items[i].title;
                item.querySelector('p').textContent = t.portfolio.items[i].text;
                const tags = item.querySelector('.portfolio-tags');
                tags.innerHTML = "";
                t.portfolio.items[i].tags.forEach(tag => {
                    const span = document.createElement('span');
                    span.textContent = tag;
                    tags.appendChild(span);
                });
                item.querySelector('.portfolio-year').textContent = t.portfolio.items[i].year;
            }
        });

        document.querySelector('.archive-title').textContent = t.archive.title;
        document.querySelector('.archive-text').textContent = t.archive.text;
        document.querySelector('.archive-btn').textContent = t.archive.btn;

        document.querySelector('.contact-title').textContent = t.contact.title;
        document.querySelector('.contact-text p').textContent = t.contact.text;
        const emailSpan = document.querySelector('.email-btn span');
        if (emailSpan) emailSpan.textContent = t.contact.email;

        document.querySelector('footer .footer-text').textContent = t.footer;
    }

    if (document.querySelector(".lang-archive-title")) {
        document.querySelector(".lang-archive-title").textContent = t.archivePage.title;
        document.querySelector(".lang-archive-desc").textContent = t.archivePage.desc;
        const backBtn = document.querySelector(".lang-archive-back");
        if (backBtn) backBtn.textContent = t.archivePage.back;

        const projectElements = document.querySelectorAll(".projects-grid .project-btn");
        projectElements.forEach(project => {
            const href = project.getAttribute("href");
            const folderName = href ? href.split("/").pop() : "";
            const descEl = project.querySelector(".project-desc");

            if (t.archivePage.projects && t.archivePage.projects[folderName] && descEl) {
                descEl.textContent = t.archivePage.projects[folderName];
            }
        });

        const path = window.location.pathname;
        for (const [key, value] of Object.entries(t.archivePage.projects)) {
            if (path.includes(key)) {
                const projectDesc = document.querySelector(".project-desc");
                if (projectDesc) projectDesc.textContent = value;
                break;
            }
        }

        const projectBackBtn = document.querySelector(".back-btn");
        if(projectBackBtn && !projectBackBtn.classList.contains("lang-archive-back")) {
            projectBackBtn.textContent = t.archivePage.back;
        }
    }
}

window.setLanguage = function(lang) {
    if (lang === "pl") {
        if (currentLang !== "pl") {
            localStorage.setItem("lang", "pl");
            location.reload();
        }
    } else if (lang === "en") {
        localStorage.setItem("lang", "en");
        currentLang = "en";
        loadEnglishTranslations();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    if (currentLang === "en") {
        loadEnglishTranslations();
    }

    const langBtns = document.querySelectorAll(".lang-btn");
    langBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const lang = btn.dataset.lang;
            if (lang) setLanguage(lang);
        });
    });
});