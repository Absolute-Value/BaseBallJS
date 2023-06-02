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
                if (ball.is_foul) {
                    ball.alive = false;
                    if (ball.is_foul) {
                        sbo_counter.foul();
                    } else if (batter.distance > 1) {
                        sbo_counter.out();
                    } else {
                        sbo_counter.reset();
                    }
                    batter.reset();
                    fielders.reset();
                } else {
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

class Pitcher extends Fielder {
    move(field_, batter, fielders, ball, sbo_counter) {
        if (fielders.get('short').init_x < ball.x < fielders.get('second').init_x) {
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
                if (ball.is_foul) {
                    if (this.speed < 2) { this.speed += 0.05; } // 走るスピードを徐々に上げる
                    var dx = ball.x - this.x;
                    var dy = ball.y - this.y;
                    this.angle = Math.atan2(dy, dx) * 180 / Math.PI;
                    super.move();
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
}

class Second extends Fielder {
    move(field_, batter, fielders, ball, sbo_counter) {
        if (fielders.get('short').init_x < ball.x) {
            super.move(field_, batter, fielders, ball, sbo_counter);
        }
    }
}

class Short extends Fielder {
    move(field_, batter, fielders, ball, sbo_counter) {
        if (ball.x < fielders.get('second').init_x) {
            super.move(field_, batter, fielders, ball, sbo_counter);
        }
    }
}

class Third extends Fielder {
    move(field_, batter, fielders, ball, sbo_counter) {
        if (ball.x < field_.items.base_home.x) {
            super.move(field_, batter, fielders, ball, sbo_counter);
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

class Fielders {
    constructor(field_) {
        this.fielders = {
            pitcher: new Pitcher(field_.items.pitcher_mound.x, field_.items.pitcher_mound.y), // ピッチャー
            catcher: new Catcher(field_.items.base_home.x, field_.items.base_home.y + 30), // キャッチャー
            first: new First(field_.items.base_first.x, field_.items.base_first.y - 50), // 一塁手
            second: new Second(field_.items.base_second.x + 120, field_.items.base_second.y + 10), // 二塁手
            short: new Short(field_.items.base_second.x - 120, field_.items.base_second.y + 10), // 遊撃手
            third: new Third(field_.items.base_third.x, field_.items.base_third.y - 50), // 三塁手
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
