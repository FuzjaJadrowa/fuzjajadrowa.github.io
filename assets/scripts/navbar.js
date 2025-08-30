document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.navbar .hamburger');
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelector('.navbar ul');

    function toggleMenu() {
        navbar.classList.toggle('active');

        if(navbar.classList.contains('active')) {
            navLinks.style.maxHeight = navLinks.scrollHeight + "px";
        } else {
            navLinks.style.maxHeight = "0px";
        }
    }

    hamburger.addEventListener('click', toggleMenu);

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if(window.innerWidth <= 768) {
                toggleMenu();
            }
        });
    });

    window.addEventListener('resize', () => {
        if(window.innerWidth > 768) {
            navLinks.style.maxHeight = null;
            navbar.classList.remove('active');
        }
    });
});