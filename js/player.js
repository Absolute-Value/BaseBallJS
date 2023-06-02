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
        this.speed = 0;
        this.angle = 0;
    }

    move() {
        this.x += this.speed * Math.cos(this.angle * Math.PI / 180);
        this.y += this.speed * Math.sin(this.angle * Math.PI / 180);
    }

    draw() {
        noStroke();
        fill(this.color);
        ellipse(this.x, this.y, this.radius*2, this.radius*2);
    }
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
        this.distance = 100;
        this.is_hit = false;
        this.angle = this.init_angle;
        this.vx = 0;
        this.vy = 0;
    }

    swing() {
        if (this.angle > -135 && this.angle < 135) {
            this.swing_count += 1;
            this.angle -= this.swing_speed * 1.1;
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
            // バットの四隅を計算
            this.ball_top = {x: ball.x - ball.radius * Math.sin(radian), y: ball.y + ball.radius * Math.cos(radian)};
            this.bat_points = {
                x1: this.x - this.bat_width / 2 * Math.sin(radian), y1: this.y + this.bat_width / 2  * Math.cos(radian),
                x2: this.x + this.bat_width / 2 * Math.sin(radian), y2: this.y - this.bat_width / 2 * Math.cos(radian),
                x3: this.bat_top_x + this.bat_width / 2 * Math.sin(radian), y3: this.bat_top_y - this.bat_width / 2 * Math.cos(radian),
                x4: this.bat_top_x - this.bat_width / 2 * Math.sin(radian), y4: this.bat_top_y + this.bat_width / 2 * Math.cos(radian)
            };
            if (ball.alive) {
                if (triangleCollision(this.bat_points.x1, this.bat_points.y1, this.bat_points.x2, this.bat_points.y2, this.bat_points.x3, this.bat_points.y3, this.ball_top.x, this.ball_top.y) |
                    triangleCollision(this.bat_points.x1, this.bat_points.y1, this.bat_points.x3, this.bat_points.y3, this.bat_points.x4, this.bat_points.y4, this.ball_top.x, this.ball_top.y)) { // 四隅の中に含まれていたら
                    this.is_hit = true;
                    if (this.swing_count == 0) { // バットが静止していたら（バント）
                        ball.speed = 0.5 + Math.random() * 0.5;
                        ball.angle = this.angle - ball.angle;
                    } else { // バットが動いていたら
                        ball.speed = this.swing_count;
                        ball.angle = this.angle - 90;
                    }
                } else if (circleCollision(ball.x, ball.y, ball.radius, this.bat_top_x, this.bat_top_y, this.bat_width)) { // バットの先端に当たったら
                    this.is_hit = true;
                    if (this.swing_count == 0) { // バットが静止していたら（バント）
                        ball.speed = 0.5 + Math.random() * 0.5;
                    }
                    var dx = ball.x - this.bat_top_x;
                    var dy = ball.y - this.bat_top_y;
                    ball.angle = Math.atan2(dy, dx) * 180 / Math.PI;
                }
            }
        }
    }

    move(field_) {
        if (this.is_hit) {
            if (this.speed < 2) { this.speed += 0.05; } // 走るスピードを徐々に上げる
            var dx = field_.items.base_first.x - this.x;
            var dy = field_.items.base_first.y - field_.items.base_first.radius - this.y;
            this.distance = Math.sqrt(dx ** 2 + dy ** 2);
            if (this.distance >= 1) {
                this.vx = dx / this.distance * this.speed;
                this.vy = dy / this.distance * this.speed;
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
        super.draw();
        if (!this. is_hit) {
            // 薄茶色のバットを描画
            noStroke();
            fill(222, 184, 135);
            // バットの本体を描画
            triangle(this.bat_points.x1, this.bat_points.y1, this.bat_points.x2, this.bat_points.y2, this.bat_points.x3, this.bat_points.y3);
            triangle(this.bat_points.x1, this.bat_points.y1, this.bat_points.x3, this.bat_points.y3, this.bat_points.x4, this.bat_points.y4);
            // バットの先端を描画
            ellipse(this.bat_top_x, this.bat_top_y, this.bat_width, this.bat_width);
        }
    }
}

class Fielder extends Player {
    constructor(init_x, init_y, radius=6, hold_time=15) {
        super(init_x, init_y, radius);
        this.hold_time = hold_time;
        this.reset();
    }

    reset() {
        super.reset();
        this.hold_count = this.hold_time;
    }

    move(field_, batter, fielders, ball, sbo_counter) {
        if (batter.is_hit && ball.alive) {
            if (circleCollision(ball.x, ball.y, ball.radius, this.x, this.y, this.radius)) { // ボールを拾ったら
                fielders.someome_has_ball = true;
                if (this.hold_count > 0) { // 一定時間ボールを持つ
                    this.hold_count -= 1;
                    this.speed = 0;
                    ball.speed = 0;
                } else { // 一定時間ボールを持ったら、ファーストへボールを投げる
                    ball.speed = 4
                    var dx = field_.items.base_first.x - field_.items.base_first.radius - this.x;
                    var dy = field_.items.base_first.y - field_.items.base_first.radius*2 - this.y;
                    ball.angle = Math.atan2(dy, dx) * 180 / Math.PI;
                }
            } else if (fielders.someome_has_ball) {
                this.speed = 0;
            } else { // 誰もボールを拾っていないときは、ボールを追いかける
                if (this.speed < 2) { this.speed += 0.05; } // 走るスピードを徐々に上げる
                var dx = ball.x - this.x;
                var dy = ball.y - this.y;
                this.angle = Math.atan2(dy, dx) * 180 / Math.PI;
            }
            super.move();
        }
    }
}

class Catcher extends Fielder {
    move(field_, batter, fielders, ball, sbo_counter) {
        if (ball.alive && !batter.is_hit) { // バッターが打たなかったとき
            if (circleCollision(ball.x, ball.y, ball.radius, this.x, this.y, this.radius)) {
                ball.alive = false;
                if (ball.is_strike) {
                    sbo_counter.strike();
                } else {
                    sbo_counter.ball();
                }
                fielders.reset();
            } else { // 投手の球筋を追う
                this.x += ball.speed * Math.cos(ball.angle * Math.PI / 180);
            }
        } else { // バッターが打ったときは、他の野手と同じ動き
            super.move(field_, batter, fielders, ball, sbo_counter);
        }
    }
}

class First extends Player {
    move(field_, batter, fielders, ball, sbo_counter) {
        if (batter.is_hit && ball.alive) {
            if (circleCollision(ball.x, ball.y, ball.radius, this.x, this.y, this.radius)) {
                ball.alive = false;
                if (batter.distance > 1) {
                    sbo_counter.out();
                } else {
                    sbo_counter.reset();
                }
                batter.reset();
                fielders.reset();
            } else {
                if (this.speed < 2) { this.speed += 0.05; } // 走るスピードを徐々に上げる
                var dx = field_.items.base_first.x - field_.items.base_first.radius - this.x;
                var dy = field_.items.base_first.y - field_.items.base_first.radius*2 - this.y;
                var distance = Math.sqrt(dx ** 2 + dy ** 2);
                if (distance > 1) {
                    this.angle = acos(dx / distance) * 180 / PI;
                    super.move();
                }
            }
        }
    }
}


class Fielders {
    constructor(field_) {
        this.fielders = {
            pitcher: new Fielder(field_.items.pitcher_mound.x, field_.items.pitcher_mound.y), // ピッチャー
            catcher: new Catcher(field_.items.base_home.x, field_.items.base_home.y + 30), // キャッチャー
            first: new First(field_.items.base_first.x, field_.items.base_first.y - 50), // 一塁手
            second: new Fielder(field_.items.base_second.x + 120, field_.items.base_second.y + 10), // 二塁手
            short: new Fielder(field_.items.base_second.x - 120, field_.items.base_second.y + 10), // 遊撃手
            third: new Fielder(field_.items.base_third.x, field_.items.base_third.y - 50), // 三塁手
        }
        this.someome_has_ball = false;
    }

    reset() {
        this.someome_has_ball = false;
        for (let key in this.fielders) {
            this.fielders[key].reset();
        }
    }

    get(key) {
        return this.fielders[key];
    } 

    move(field_, batter, ball, sbo_counter) {
        for (let key in this.fielders) {
            this.fielders[key].move(field_, batter, this, ball, sbo_counter);
        }
    }

    draw() {
        for (let key in this.fielders) {
            this.fielders[key].draw();
        }
    }
}
