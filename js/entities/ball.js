const PITCH_CURVE_MAX = 15; // 投球が基準角度からカーブできる最大角度（度）。曲がりすぎを防ぐ上限
const PITCH_CURVE_STEP = 0.35; // A/Dを押している間、1フレームあたりにカーブする角度

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
        this.speed = 0;
        this.angle = 90;
        this.pitch_base_angle = 90; // カーブの基準角度（この角度からPITCH_CURVE_MAXまでしか曲げられない）
        this.alive = false;
        this.is_strike = false
        this.is_fair = false;
        this.is_foul = false;
        this.idle_count = 0; // 速度がほぼ0のまま経過したフレーム数（球が転がり続けるのを防ぐ）
        this.is_thrown = false; // 打球ではなく、盗塁を刺す・牽制する等のために野手が送球したボールかどうか
        this.is_pitch = false; // 投手が投げてからまだ誰にも打たれていない「投球中」かどうか（この間だけカーブが効く）
        this.foul_count = 0; // ファウルと判定されてから経過したフレーム数
    }

    // ユーザーが投球する。speedModeは 'slow' | 'fast' | 'normal'
    // x, yを渡すと、そこから投げる（ピッチャーがマウンドの棒の中を移動した位置に合わせるため）
    pitch(speedMode, x=this.init_x, y=this.init_y) {
        this.x = x;
        this.y = y;
        this.speed = speedMode === 'slow' ? 3 : speedMode === 'fast' ? 6.5 : 4.5;
        this.pitch_base_angle = 90 + (Math.random() * 4 - 2); // わずかにランダムなブレを残す
        this.angle = this.pitch_base_angle;
        this.alive = true;
        this.is_strike = false;
        this.is_fair = false;
        this.is_foul = false;
        this.idle_count = 0;
        this.is_thrown = false;
        this.is_pitch = true;
        this.foul_count = 0;
    }

    // ピッチャーが牽制球などを送球する（投球ではないのでカーブしない）
    throwFrom(x, y, targetX, targetY, speed=4) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.angle = Math.atan2(targetY - y, targetX - x) * 180 / Math.PI;
        this.alive = true;
        this.is_strike = false;
        this.is_fair = false;
        this.is_foul = false;
        this.idle_count = 0;
        this.is_thrown = true;
        this.is_pitch = false;
        this.foul_count = 0;
    }

    move(field_, curveInput=0) {
        if (this.alive) {
            // 投球中（打たれても送球でもない）だけ、A/Dでゆるやかにカーブさせる。上限を超えては曲げない。
            if (this.is_pitch && curveInput !== 0) {
                this.angle += curveInput * PITCH_CURVE_STEP;
                const min = this.pitch_base_angle - PITCH_CURVE_MAX;
                const max = this.pitch_base_angle + PITCH_CURVE_MAX;
                if (this.angle < min) { this.angle = min; }
                if (this.angle > max) { this.angle = max; }
            }

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
