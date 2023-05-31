class Ball {
    constructor(init_x, init_y, radius=4) {
        this.init_x = init_x;
        this.init_y = init_y;
        this.radius = radius;
        this.reset();
        this.alive = false;
    }

    reset() {
        this.x = this.init_x;
        this.y = this.init_y;
        this.speed = Math.random() * 3 + 3.5;
        this.angle = Math.random() * 10 - 5;
        this.vx = this.speed * Math.sin(this.angle*(Math.PI/180));
        this.vy = this.speed * Math.cos(this.angle*(Math.PI/180));
        this.alive = true;
        this.dead_count = Math.floor(Math.random() * 60) + 60;
    }

    move() {
        if (this.alive) {
            if (this.x + this.vx > CANVAS_WIDTH - this.radius || this.x + this.vx < this.radius) {
                this.vx *= -1;
            } if (this.y + this.vy > CANVAS_HEIGHT - this.radius || this.y + this.vy < this.radius) {
                this.vy *= -1;
            }
            this.x += this.vx;
            this.y += this.vy;
        } else {
            this.dead_count -= 1;
            if (this.dead_count <= 0) {
                this.reset();
            }
        }
    }

    draw() {
        if (this.alive) {
            noStroke();
            fill(230, 215, 150);
            ellipse(this.x, this.y, this.radius*2, this.radius*2);
        }
    }
}