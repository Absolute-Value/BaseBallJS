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
        this.angle = 90 + Math.random() * 10 - 5;
        this.alive = true;
        this.dead_count = Math.floor(Math.random() * 60) + 60;
        this.is_strike = false
    }

    move(field_) {
        if (this.alive) {
            let vx = this.speed * Math.cos(this.angle * Math.PI / 180);
            this.x += vx
            if (this.x + vx < 0 | CANVAS_WIDTH < this.x + vx) { // 左右の壁に当たったら反射
                this.angle = 180 - this.angle;
                this.speed *= 0.5;
            }

            let vy = this.speed * Math.sin(this.angle * Math.PI / 180);
            this.y += vy
            if (this.y + vy < 0 | CANVAS_HEIGHT < this.y + vy) { // 上下の壁に当たったら反射
                this.angle = - this.angle;
                this.speed *= 0.5;
            }

            // ストライクに入っているかの判定
            if (field_.items.base_home.x - field_.items.base_home.radius < this.x + this.radius && this.x - this.radius < field_.items.base_home.x + field_.items.base_home.radius &&
                field_.items.base_home.y - field_.items.base_home.radius < this.y + this.radius && this.y - this.radius < field_.items.base_home.y) {
                this.is_strike = true;
            }
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