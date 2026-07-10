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
        this.is_fair = false;
        this.is_foul = false;
        this.idle_count = 0; // 速度がほぼ0のまま経過したフレーム数（球が転がり続けるのを防ぐ）
        this.is_thrown = false; // 打球ではなく、盗塁を刺す等のために野手が送球したボールかどうか
        this.foul_count = 0; // ファウルと判定されてから経過したフレーム数
    }

    move(field_, runners) {
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

            // 球がほぼ止まったまま誰にも拾われない状態が続いたかを記録する
            if (this.speed <= 0.15) {
                this.idle_count += 1;
            } else {
                this.idle_count = 0;
            }

            // ストライクに入っているかの判定
            if (field_.items.base_home.x - field_.items.base_home.radius < this.x + this.radius && this.x - this.radius < field_.items.base_home.x + field_.items.base_home.radius &&
                field_.items.base_home.y - field_.items.base_home.radius < this.y + this.radius && this.y - this.radius < field_.items.base_home.y) {
                this.is_strike = true;
            }
            // フェアゾーンに入っているかの判定
            if (triangleCollision(field_.items.base_first.x, field_.items.base_first.y, field_.items.base_third.x, field_.items.base_third.y, field_.items.line_right.x2, field_.items.line_right.y2, this.x, this.y) || 
                triangleCollision(field_.items.base_first.x, field_.items.base_first.y, field_.items.base_third.x, field_.items.base_third.y, field_.items.line_left.x2, field_.items.line_left.y2, this.x, this.y)) {
                this.is_fair = true;
            }
            // ファウルゾーンに入っているかの判定
            if (!this.is_fair && 
                (triangleCollision(field_.items.line_right.x1, field_.items.line_right.y1, field_.items.line_right.x2, field_.items.line_right.y2, field_.items.line_right.x2, field_.items.line_right.y1, this.x, this.y) ||
                 triangleCollision(field_.items.line_left.x1, field_.items.line_left.y1, field_.items.line_left.x2, field_.items.line_left.y2, field_.items.line_left.x2, field_.items.line_left.y1, this.x, this.y)) 
                && !circleCollision(this.x, this.y, this.radius, field_.items.dirt_home.x, field_.items.dirt_home.y, field_.items.dirt_home.radius)) {
                this.is_foul = true;
                console.log("fowl");
            }
            // ファウルになってから経過したフレーム数を数える（誰も拾わなくても一定時間で強制的に終わらせるため）
            if (this.is_foul) {
                this.foul_count += 1;
            } else {
                this.foul_count = 0;
            }
        } else if (!runners || !runners.batter.moving) {
            // 打者が今のヒットで一塁へ走っている最中は次の投球を始めない
            // （途中で始まると、出現直後のボールをピッチャーが打球のように誤って処理してしまう）
            // ※ 他の走者の盗塁はここで止めない。盗塁は投球に対して仕掛けるものなので、
            // 　次の投球を止めてしまうと守備側が送球する機会自体がなくなってしまう。
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