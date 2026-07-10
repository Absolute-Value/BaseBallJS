// 打者はRunnerを継承する。ヒットした瞬間から「打者自身」がそのまま塁上の走者になり、
// 別のRunnerオブジェクトを新しく作らない（一塁到達時に二重表示になるのを防ぐ）。
class Batter extends Runner {
    constructor(field_, radius=6, color='blue') {
        super(field_, radius, color);
        this.bat_width = 6 // バットの幅
        this.bat_length = 28 // バットの長さ
        this.init_angle = 120 // バットの初期角度
        this.swing_speed = 15 // バットの振り速度
        this.swing_count = 0;
        this.reset();
    }

    reset() {
        super.reset(); // Runner.reset(): active/baseIndex/moving等をクリア
        if (!this.field_) {
            return; // コンストラクタ内でPlayerから暫定的に呼ばれた時点ではfield_が未設定なのでここで打ち切る
        }
        const home = this.field_.items.base_home;
        this.x = home.x - 24;
        this.y = home.y - 8;
        this.angle = this.init_angle || 120;
        this.is_hit = false;
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

    move(field_, runners, ball) {
        if (this.active) {
            // 既に走者として塁に出ている間は、打撃関連の処理（打席移動やスイング判定）は一切行わない
            // （is_hitはプレーが終わるたびfalseに戻るため、ここで打撃処理を続けさせると
            // 　塁上にいるのにWSADで動けてしまう等の不具合になる）
            super.move(); // Runner.move(): 目標の塁へ向かって走る
            return;
        }
        if (this.is_hit && !ball.is_foul) {
            // ヒットした直後の1回だけ、一塁への進塁を開始する（一塁に走者がいれば押し出す）
            this.active = true;
            runners.prepareForBatterRunner();
            this.advance();
            super.move();
        } else {
            // バットを振ったストライクを判定
            if (circleCollision(ball.x, ball.y, ball.radius, field_.items.dirt_home.x, field_.items.dirt_home.y, field_.items.dirt_home.radius) && -60 < this.angle && this.angle < 60) { // ホームベースのダートサークルに入っていて、バットが振られていたら
                ball.is_strike = true;
            }
            // バットがバッターボックスから出ないようにする
            if ((this.x - this.radius <= field_.items.batter_box_left.center_x - field_.items.batter_box_left.width / 2 && this.vx < 0) |
                (field_.items.batter_box_left.center_x + field_.items.batter_box_left.width / 2 <= this.x + this.radius && this.vx > 0)) {
                this.vx = 0;
            }
            if ((this.y - this.radius <= field_.items.batter_box_left.center_y - field_.items.batter_box_left.height / 2 && this.vy < 0) |
                (this.y + this.radius >= field_.items.batter_box_left.center_y + field_.items.batter_box_left.height / 2 && this.vy > 0)) {
                this.vy = 0;
            }
            this.x += this.vx;
            this.y += this.vy;
            this.vx = 0;
            this.vy = 0;
        }
        this.hitting(ball);
    }

    draw() {
        if (this.active) {
            // 一塁到達後（走者としてプレー中）は他の走者と同じ丸だけを描画する
            super.draw();
            return;
        }
        Player.prototype.draw.call(this); // 打席にいる間は常に打者本体を描画する
        if (!this.is_hit) {
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
