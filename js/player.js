class Player {
    constructor(init_x, init_y, radius=6) {
        this.init_x = init_x;
        this.init_y = init_y;
        this.radius = radius;
        this.reset();
    }

    reset() {
        this.x = this.init_x;
        this.y = this.init_y;
        this.dx = 0;
        this.dy = 0;
    }

    move() {
        this.x += this.dx;
        this.y += this.dy;
        this.dx = 0;
        this.dy = 0;
    }

    draw(color = 'red') {
        noStroke();
        fill(color);
        ellipse(this.x, this.y, this.radius*2, this.radius*2);
    }
}

class Batter extends Player {
    constructor(init_x, init_y, radius=6) {
        super(init_x, init_y, radius);
        this.bat_width = 6 // バットの幅
        this.bat_length = 28 // バットの長さ
        this.init_angle = 120 // バットの初期角度
        this.swing_speed = 15 // バットの振り速度
        this.reset();
    }

    reset() {
        super.reset();
        this.is_hit = false;
        this.angle = this.init_angle;
    }

    swing() {
        if (this.angle > -135 && this.angle < 135) {
            this.angle -= this.swing_speed;
        }
    }

    swing_back() {
        if (this.angle <= -135 || this.angle >= 135) {
            this.angle = this.init_angle;
        }
    }

    move() {
        this.x += this.dx;
        this.y += this.dy;
        this.dx = 0;
        this.dy = 0;
    }

    draw(color='blue') {
        // 薄茶色のバットを描画
        var bat_x = this.x + Math.cos(this.angle*(Math.PI/180)) * this.bat_length;
        var bat_y = this.y + Math.sin(this.angle*(Math.PI/180)) * this.bat_length;
        stroke(222, 184, 135);
        strokeWeight(8);
        line(this.x, this.y, bat_x, bat_y);
        super.draw(color);
    }
}

class Fielder extends Player {
    constructor(init_x, init_y, radius=6) {
        super(init_x, init_y, radius);
    }

    move(ball) {
        return
    }
}

class Catcher extends Fielder {
    move(ball) {
        if (ball.alive && !batter.is_hit) {
            if ((this.x - ball.x) ** 2 + (this.y - ball.y) ** 2 <= (this.radius + ball.radius) ** 2) {
                ball.alive = false;
                fielders.reset();
            } else {
                this.x += ball.dx;
            }
        }
    }
}

class Fielders {
    constructor(field_) {
        this.fielders = {
            pitcher: new Fielder(field_.items.pitcher_mound.x, field_.items.pitcher_mound.y), // ピッチャー
            catcher: new Catcher(field_.items.base_home.x, field_.items.base_home.y + 30), // キャッチャー
            first: new Fielder(field_.items.base_first.x, field_.items.base_first.y - 50), // 一塁手
            second: new Fielder(field_.items.base_second.x + 120, field_.items.base_second.y + 10), // 二塁手
            short: new Fielder(field_.items.base_second.x - 120, field_.items.base_second.y + 10), // 遊撃手
            third: new Fielder(field_.items.base_third.x, field_.items.base_third.y - 50), // 三塁手
        }
    }

    reset() {
        for (let key in this.fielders) {
            this.fielders[key].reset();
        }
    }

    get(key) {
        return this.fielders[key];
    } 

    move(ball) {
        for (let key in this.fielders) {
            this.fielders[key].move(ball);
        }
    }

    draw() {
        for (let key in this.fielders) {
            this.fielders[key].draw();
        }
    }
}
