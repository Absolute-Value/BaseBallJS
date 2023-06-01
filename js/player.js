class Player {
    constructor(init_x, init_y, radius=6, color='red') {
        this.init_x = init_x;
        this.init_y = init_y;
        this.radius = radius;
        this.color = color;
        this.reset();
    }

    reset() {
        this.x = this.init_x;
        this.y = this.init_y;
        this.vx = 0;
        this.vy = 0;
        this.speed = 0;
    }

    move() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx, this.vy = 0, 0;
    }

    draw() {
        noStroke();
        fill(this.color);
        ellipse(this.x, this.y, this.radius*2, this.radius*2);
    }
}

// 与えられた4つの点を利用して、与えられた点(cx, cy)が四角形の内部にあるかどうかを検出する
// 参考: https://en.wikipedia.org/wiki/Point_in_polygon
function pointInTriangle(x1, y1, x2, y2, x3, y3, px, py) {
    var d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
    var d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
    var d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
    return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
}

class Batter extends Player {
    constructor(init_x, init_y, radius=6, color='blue') {
        super(init_x, init_y, radius, color);
        this.bat_width = 6 // バットの幅
        this.bat_length = 28 // バットの長さ
        this.init_angle = 120 // バットの初期角度
        this.swing_speed = 15 // バットの振り速度
        this.swing_count = 0;
        this.reset();
    }

    reset() {
        super.reset();
        this.is_hit = false;
        this.angle = this.init_angle;
    }

    swing() {
        if (this.angle > -135 && this.angle < 135) {
            this.swing_count += 1;
            this.angle -= this.swing_speed;
        } else {
            this.swing_count = 0;
        }
    }

    swing_back() {
        this.swing_count = 0;
        if (this.angle <= -135 || this.angle >= 135) {
            this.angle = this.init_angle;
        }
    }

    hitting(ball) { // バットに当たったボールを跳ね返す
        if (!this.is_hit) {
            let radian = this.angle * (Math.PI/180);
            this.bat_top_x = this.x + Math.cos(radian) * this.bat_length;
            this.bat_top_y = this.y + Math.sin(radian) * this.bat_length;
            
            let ball_top = {x: ball.x + ball.radius * Math.sin(radian), y: ball.y + ball.radius * Math.cos(radian)};
            let bat_points = {
                x1: this.x - this.bat_width / 2 * Math.sin(radian), y1: this.y - this.bat_width / 2 * Math.cos(radian),
                x2: this.x + this.bat_width / 2 * Math.sin(radian), y2: this.y + this.bat_width / 2 * Math.cos(radian),
                x3: this.bat_top_x + this.bat_width / 2 * Math.sin(radian), y3: this.bat_top_y + this.bat_width / 2 * Math.cos(radian),
                x4: this.bat_top_x - this.bat_width / 2 * Math.sin(radian), y4: this.bat_top_y - this.bat_width / 2 * Math.cos(radian)
            }
            if (pointInTriangle(bat_points.x1, bat_points.y1, bat_points.x2, bat_points.y2, bat_points.x3, bat_points.y3, ball_top.x, ball_top.y) |
                pointInTriangle(bat_points.x1, bat_points.y1, bat_points.x3, bat_points.y3, bat_points.x4, bat_points.y4, ball_top.x, ball_top.y)) {
                this.is_hit = true;
                if (this.swing_count == 0) { // バットが静止していたら
                    ball.vy = -5;
                    ball.vx = 0;
                } else {
                    ball.vx = this.swing_count * Math.sin(radian);
                    ball.vy = - this.swing_count * Math.cos(radian);
                }
            }
        }
    }

    move(field_) {
        if (this.is_hit) {
            if (this.speed < 2) { this.speed += 0.05; } // 走るスピードを徐々に上げる
            let dx = field_.items.base_first.x - this.x;
            let dy = field_.items.base_first.y - this.y;
            let distance = Math.sqrt(dx ** 2 + dy ** 2);
            if (distance >= 1) {
                this.vx = dx / distance * this.speed;
                this.vy = dy / distance * this.speed;
            }
        } else {
            if ((this.x - this.radius <= field_.items.batter_box_left.center_x - field_.items.batter_box_left.width / 2 && this.vx < 0) | 
                (field_.items.batter_box_left.center_x + field_.items.batter_box_left.width / 2 <= this.x + this.radius && this.vx > 0)) {
                this.vx = 0;
            }
            if ((this.y - this.radius <= field_.items.batter_box_left.center_y - field_.items.batter_box_left.height / 2 && this.vy < 0) |
                (this.y + this.radius >= field_.items.batter_box_left.center_y + field_.items.batter_box_left.height / 2 && this.vy > 0)) {
                this.vy = 0;
            }
        } 
        this.x += this.vx;
        this.y += this.vy;
        this.vx = 0;
        this.vy = 0;
    }

    draw() {
        if (!this. is_hit) {
            // 薄茶色のバットを描画
            stroke(222, 184, 135);
            strokeWeight(8);
            line(this.x, this.y, this.bat_top_x,this.bat_top_y);
        }
        super.draw();
    }
}

class Fielder extends Player {
    constructor(init_x, init_y, radius=6) {
        super(init_x, init_y, radius);
    }

    move(batter, ball, sbo_counter) {
        if (batter.is_hit && ball.alive) {
            if ((this.x - ball.x) ** 2 + (this.y - ball.y) ** 2 <= (this.radius + ball.radius) ** 2) {
                ball.alive = false;
                sbo_counter.out();
                batter.reset();
            } else {
                if (this.speed < 2) { this.speed += 0.05; } // 走るスピードを徐々に上げる
                let dx = ball.x - this.x;
                let dy = ball.y - this.y;
                let distance = Math.sqrt(dx ** 2 + dy ** 2);
                if (distance >= 1) {
                    this.vx = dx / distance * this.speed;
                    this.vy = dy / distance * this.speed;
                }
            }
        }
    }
}

class Catcher extends Fielder {
    move(batter, ball, sbo_counter) {
        if (ball.alive && !batter.is_hit) {
            if ((this.x - ball.x) ** 2 + (this.y - ball.y) ** 2 <= (this.radius + ball.radius) ** 2) {
                ball.alive = false;
                if (ball.is_strike) {
                    sbo_counter.strike();
                } else {
                    sbo_counter.ball();
                }
                fielders.reset();
            } else {
                this.x += ball.vx;
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

    move(batter, ball, sbo_counter) {
        for (let key in this.fielders) {
            if (key != "pitcher") {
                this.fielders[key].move(batter, ball, sbo_counter);
            }
        }
    }

    draw() {
        for (let key in this.fielders) {
            this.fielders[key].draw();
        }
    }
}
