const translations = {
    pl: {
        nav: {
            start: "START",
            about: "O MNIE",
            portfolio: "PORTFOLIO",
            archive: "ARCHIWUM",
            contact: "KONTAKT"
        },
        popup: {
            copied: "Skopiowano email!",
            error: "Błąd kopiowania!"
        },
        start: {
            title: "FUZJA JĄDROWA",
            subtitle: "Twórca video i developer",
            text: "Zajmuje się tworzeniem i montowaniem filmów oraz programuje i tworzę mody do Minecraft.",
            btnPortfolio: "Zobacz portfolio",
            btnOrder: "Zamów projekt"
        },
        about: {
            title: "O MNIE",
            text: `Siema! Nazywam się <span class="bold">Fuzja</span> i jestem
                <span class="bold-red">montażystą filmów</span> od kilku lat.
                Od niedawna zacząłem zajmować się również
                <span class="bold-green">programowaniem</span> modów do Minecrafta
                oraz innych cyfrowych wyzwań.`,
            knownAs: "W internecie znany jestem jako:",
            donate: "Jeśli podobają ci się moje projekty możesz bezinteresownie przekazać mi dotacje:",
            stats: ["100+ stworzonych filmów", "Niska cena", "Gwarancja jakości"]
        },
        portfolio: {
            title: "PORTFOLIO",
            items: [
                { title: "Overlay dla jheyvu", text: "Prosty animowany overlay z gwiadeczkami i motylkami.", tags: ["Photoshop", "After Effects"], year: "2025" },
                { title: "GUI Video Downloader", text: "Aplikacja do pobierania video i audio z różnych stron.", tags: ["Python", "JSON"], year: "2025" },
                { title: "Days Of Destiny", text: "Horrorowy mod do Minecrafta z funkcjami wychodzącymi poza grę.", tags: ["Java"], year: "2025" }
            ]
        },
        archive: {
            title: "ARCHIWUM",
            text: "Tutaj znajdziesz wszystkie moje projekty dostępne do pobrania. Niektóre z nich mogą być już niedostępne na innych stronach.",
            btn: "Zobacz"
        },
        contact: {
            title: "KONTAKT",
            text: "Jeśli chcesz zamówić projekt dotyczący zaprogramowania czegoś lub zmontowania jakiegoś filmu odezwij się na maila i zobaczymy czy będę wstanie zrealizować twoje oczekiwania!",
            email: "Email: dlafuzji@gmail.com"
        },
        footer: "© 2025 Fuzja Jądrowa. Wszystkie prawa zastrzeżone."
    },
    en: {
        nav: {
            start: "HOME",
            about: "ABOUT ME",
            portfolio: "PORTFOLIO",
            archive: "ARCHIVE",
            contact: "CONTACT"
        },
        popup: {
            copied: "Email copied!",
            error: "Copy failed!"
        },
        start: {
            title: "FUZJA JĄDROWA",
            subtitle: "Video creator and developer",
            text: "I create and edit films, as well as programming and create mods for Minecraft.",
            btnPortfolio: "See portfolio",
            btnOrder: "Order a project"
        },
        about: {
            title: "ABOUT ME",
            text: `Hi! My name is <span class="bold">Fuzja</span> and I have been a
                <span class="bold-red">video editor</span> for several years.
                Recently, I also started
                <span class="bold-green">programming</span> Minecraft mods
                and taking on other digital challenges.`,
            knownAs: "On the internet I'm known as:",
            donate: "If you like my projects you can support me with a donation:",
            stats: ["100+ created videos", "Low price", "Quality guarantee"]
        },
        portfolio: {
            title: "PORTFOLIO",
            items: [
                { title: "Overlay for jheyvu", text: "Simple animated overlay with stars and butterflies.", tags: ["Photoshop", "After Effects"], year: "2025" },
                { title: "GUI Video Downloader", text: "Application for downloading video and audio from various sites.", tags: ["Python", "JSON"], year: "2025" },
                { title: "Days Of Destiny", text: "Horror Minecraft mod with features beyond the game.", tags: ["Java"], year: "2025" }
            ]
        },
        archive: {
            title: "ARCHIVE",
            text: "Here you can find all my projects available for download. Some of them may no longer be available elsewhere.",
            btn: "See"
        },
        contact: {
            title: "CONTACT",
            text: "If you want to order a project related to programming or video editing, send me an email and we'll see if I can cope your expectations!",
            email: "Email: dlafuzji@gmail.com"
        },
        footer: "© 2025 Fuzja Jadrowa. All rights reserved."
    }
}

function setLanguage(lang) {
    const t = translations[lang]

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
    document.querySelector('.about-text h3 + div + h3').textContent = t.about.donate
    document.querySelectorAll('.about-stats .stat p').forEach((el, i) => el.textContent = t.about.stats[i])

    document.querySelector('.portfolio-title').textContent = t.portfolio.title
    document.querySelectorAll('.portfolio-item').forEach((item, i) => {
        item.querySelector('h3').textContent = t.portfolio.items[i].title
        item.querySelector('p').textContent = t.portfolio.items[i].text
        const tags = item.querySelector('.portfolio-tags')
        tags.innerHTML = ""
        t.portfolio.items[i].tags.forEach(tag => {
            const span = document.createElement('span')
            span.textContent = tag
            tags.appendChild(span)
        })
        item.querySelector('.portfolio-year').textContent = t.portfolio.items[i].year
    })

    document.querySelector('.archive-title').textContent = t.archive.title
    document.querySelector('.archive-text').textContent = t.archive.text
    document.querySelector('.archive-btn').textContent = t.archive.btn

    document.querySelector('.contact-title').textContent = t.contact.title
    document.querySelector('.contact-text p').textContent = t.contact.text
    document.querySelector('.email-btn span').textContent = t.contact.email

    document.querySelector('footer .footer-text').textContent = t.footer

    localStorage.setItem("lang", lang);
    window.currentLang = lang;
}

document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        setLanguage(btn.dataset.lang)
    })
})

window.addEventListener("DOMContentLoaded", () => {
    const savedLang = localStorage.getItem("lang") || "pl"
    setLanguage(savedLang)
})