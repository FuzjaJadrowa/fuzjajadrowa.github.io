let translations = {}
let currentLang = localStorage.getItem("lang") || "pl"

async function loadTranslations() {
    try {
        const response = await fetch("/assets/scripts/translations.json")
        translations = await response.json()
        setLanguage(currentLang)
    } catch (err) {
        console.error("Błąd wczytywania tłumaczeń:", err)
    }
}

function setLanguage(lang) {
    if (!translations[lang]) return

    const t = translations[lang]

    if (document.querySelector(".start")) {
        document.querySelector('nav ul li:nth-child(1) a').textContent = t.nav.start
        document.querySelector('nav ul li:nth-child(2) a').textContent = t.nav.about
        document.querySelector('nav ul li:nth-child(3) a').textContent = t.nav.portfolio
        document.querySelector('nav ul li:nth-child(4) a').textContent = t.nav.archive
        document.querySelector('nav ul li:nth-child(5) a').textContent = t.nav.contact

        document.querySelector('.start .title').textContent = t.start.title
        document.querySelector('.start .subtitle').textContent = t.start.subtitle
        document.querySelector('.start p').textContent = t.start.text
        document.querySelector('.start .buttons a:nth-child(1)').textContent = t.start.btnPortfolio
        document.querySelector('.start .buttons a:nth-child(2)').textContent = t.start.btnOrder

        document.querySelector('.about-text h2').textContent = t.about.title
        document.querySelector('.about-text p').innerHTML = t.about.text
        document.querySelector('.about-text h3').textContent = t.about.knownAs
        document.querySelector('.modrinth-btn').innerHTML = `<img src="https://i.ibb.co/qY83SpBv/modrinth-new.webp" alt=""> ${t.about.modrinth}`
        document.querySelector('.about-text h3 + div + h3').textContent = t.about.donate
        document.querySelectorAll('.about-stats .stat p').forEach((el, i) => el.textContent = t.about.stats[i])
        document.querySelector('footer .footer-text').textContent = t.footer
    }

    if (document.querySelector(".lang-archive-title")) {
        document.querySelector(".lang-archive-title").textContent = t.archivePage.title
        document.querySelector(".lang-archive-desc").textContent = t.archivePage.desc
        document.querySelector(".lang-archive-back").textContent = t.archivePage.back

        const projectElements = document.querySelectorAll(".projects-grid .project-btn")
        projectElements.forEach(project => {
            const folderName = project.getAttribute("href").split("/").pop()
            const descEl = project.querySelector(".project-desc")
            if (descEl && t.archivePage.projects && t.archivePage.projects[folderName]) {
                descEl.textContent = t.archivePage.projects[folderName]
            }
        })
    }

    localStorage.setItem("lang", lang)
    currentLang = lang
}

document.querySelectorAll(".lang-btn")?.forEach(btn => {
    btn.addEventListener("click", () => setLanguage(btn.dataset.lang))
})

window.addEventListener("DOMContentLoaded", loadTranslations)