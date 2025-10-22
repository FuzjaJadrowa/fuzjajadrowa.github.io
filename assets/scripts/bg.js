const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particles = [];

function random(min, max) {
    return Math.random() * (max - min) + min;
}

class Particle {
    constructor() {
        this.x = random(0, canvas.width);
        this.y = random(0, canvas.height);
        this.radius = random(1, 2);
        this.color = `hsl(${random(0,360)}, 100%, 60%)`;
        this.speedX = random(-0.3, 0.3);
        this.speedY = random(-0.3, 0.3);
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

function init() {
    particles = [];
    for (let i = 0; i < 120; i++) {
        particles.push(new Particle());
    }
}

function animate() {
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    requestAnimationFrame(animate);
}

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    init();
});

init();
animate();