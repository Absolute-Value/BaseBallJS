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
        this.holding_ball = false;
    }

    move(field_, batter, runners, fielders, ball, sbo_counter) {
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
                        if (runners.is_runner.third) { // 三塁にランナーがいるとき、ホームへボールを投げる
                            var dx = field_.items.base_home.x - this.x;
                            var dy = field_.items.base_home.y - this.y;
                        } else if (runners.is_runner.second) { // 二塁にランナーがいるとき、サードへボールを投げる
                            var dx = field_.items.base_third.x + field_.items.base_third.radius - this.x;
                            var dy = field_.items.base_third.y - field_.items.base_third.radius*2 - this.y;
                        } else if (runners.is_runner.first) { // 一塁にランナーがいるとき、セカンドへボールを投げる
                            var dx = field_.items.base_second.x - this.x;
                            var dy = field_.items.base_second.y - field_.items.base_second.radius - this.y;
                        } else { // ランナーがいないとき、ファーストへボールを投げる
                            var dx = field_.items.base_first.x - field_.items.base_first.radius - this.x;
                            var dy = field_.items.base_first.y - field_.items.base_first.radius*2 - this.y;
                        }
                        ball.angle = Math.atan2(dy, dx) * 180 / Math.PI;
                        // 投げた後はボールを離すので、他の野手が再び追いかけられるようにする
                        // （trueのままだと誰も追いかけなくなり、送球が誰にも捕られず転がり続ける）
                        fielders.someome_has_ball = false;
                    }
                }
            } else if (fielders.someome_has_ball) {
                this.speed = 0;
            } else { // 誰もボールを拾っていないときは、ボールを追いかける
                if (this.speed < 2) { this.speed += 0.05; } // 走るスピードを徐々に上げる
                // ボールの現在位置ではなく、少し先の予測位置を追いかける（現在位置だけを追うと常に後手に回る）
                var lead = 8;
                var bvx = ball.speed * Math.cos(ball.angle * Math.PI / 180);
                var bvy = ball.speed * Math.sin(ball.angle * Math.PI / 180);
                var dx = (ball.x + bvx * lead) - this.x;
                var dy = (ball.y + bvy * lead) - this.y;
                this.angle = Math.atan2(dy, dx) * 180 / Math.PI;
            }
            super.move();
        }
    }
}

class Pitcher extends Fielder {
    move(field_, batter, runners, fielders, ball, sbo_counter) {
        // 元のコードは `a < b < c` という誤った連鎖比較になっており、正しく範囲判定できていなかった
        if (fielders.get('short').init_x < ball.x && ball.x < fielders.get('second').init_x) {
            super.move(field_, batter, runners, fielders, ball, sbo_counter);
        }
    }
}

class First extends Player {
    move(field_, batter, runners, fielders, ball, sbo_counter) {
        if (batter.is_hit && ball.alive) {
            if (circleCollision(ball.x, ball.y, ball.radius, this.x, this.y, this.radius)) {
                ball.alive = false;
                if (batter.baseIndex < 1) { // まだ一塁に到達していなければアウト
                    sbo_counter.out();
                    batter.reset();
                } else {
                    sbo_counter.reset(); // 既に一塁へ到達済みならセーフ。走者としてそのまま残す
                }
                fielders.reset();
            } else {
                if (ball.is_foul && field_.items.base_home.x < ball.x) {
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

// 送球を捕球しても、それだけでは走者をアウトにしない。
// 捕球後は野手がその場でボールを持ち続け、実際に走者（打者自身の場合も含む）へ触れたときだけアウトにする。
// 走者がタッチされる前に塁へ到達すればセーフ。捕球判定がないと送球が画面上を転がり続けてしまうため、
// 捕球自体はここで確定させる。
function handleTagPlay(fielder, targetBase, field_, batter, runners, fielders, ball, sbo_counter) {
    if (!fielder.holding_ball) {
        if (!circleCollision(ball.x, ball.y, ball.radius, fielder.x, fielder.y, fielder.radius)) {
            return false; // まだ送球が届いていない
        }
        fielder.holding_ball = true;
        ball.alive = false;
    }

    const runner = runners.list.find(r => r.active && r.moving && r.target === targetBase);
    if (!runner) {
        // 盗塁などタッチ対象の走者がいない送球だった → そのままプレー終了
        fielder.holding_ball = false;
        fielders.reset();
        return true;
    }
    if (circleCollision(runner.x, runner.y, runner.radius, fielder.x, fielder.y, fielder.radius)) {
        // ボールを持った野手が実際に走者へ触れたのでアウト
        sbo_counter.out();
        runner.reset();
        fielder.holding_ball = false;
        fielders.reset();
        return true;
    }
    if (!runner.moving) {
        // タッチされる前に塁へ到達できたのでセーフ
        fielder.holding_ball = false;
        fielders.reset();
        return true;
    }
    return true; // 走者はまだ到達しておらずタッチもできていない。野手はボールを持って待つ
}

class Second extends Fielder {
    move(field_, batter, runners, fielders, ball, sbo_counter) {
        if (this.holding_ball) { // 送球を保持中。走者に触れるか、走者が塁に着くまで待つ
            handleTagPlay(this, 2, field_, batter, runners, fielders, ball, sbo_counter);
            return;
        }
        if (ball.x > field_.items.base_second.x) {
            super.move(field_, batter, runners, fielders, ball, sbo_counter);
        } else if (batter.is_hit && ball.alive) {
            if (handleTagPlay(this, 2, field_, batter, runners, fielders, ball, sbo_counter)) {
                return;
            }
            if (this.speed < 2) { this.speed += 0.05; } // 走るスピードを徐々に上げる
            var dx = field_.items.base_second.x - this.x;
            var dy = field_.items.base_second.y - field_.items.base_second.radius - this.y;
            var distance = Math.sqrt(dx ** 2 + dy ** 2);
            if (distance > 1) {
                this.angle = Math.acos(dx / distance) * 180 / Math.PI;
                this.x += this.speed * Math.cos(this.angle * Math.PI / 180);
                this.y -= this.speed * Math.sin(this.angle * Math.PI / 180);
            }
        }
    }
}

class Short extends Fielder {
    move(field_, batter, runners, fielders, ball, sbo_counter) {
        if (ball.x < field_.items.base_second.x) {
            super.move(field_, batter, runners, fielders, ball, sbo_counter);
        } else {
            if (batter.is_hit && ball.alive) {
                if (this.speed < 2) { this.speed += 0.05; } // 走るスピードを徐々に上げる
                var dx = field_.items.base_second.x - this.x;
                var dy = field_.items.base_second.y - field_.items.base_second.radius - this.y;
                var distance = Math.sqrt(dx ** 2 + dy ** 2);
                if (distance > 1) {
                    this.angle = Math.acos(dx / distance) * 180 / Math.PI;
                    this.x += this.speed * Math.cos(this.angle * Math.PI / 180);
                    this.y -= this.speed * Math.sin(this.angle * Math.PI / 180);
                }
            }
        }
    }
}

class Third extends Fielder {
    move(field_, batter, runners, fielders, ball, sbo_counter) {
        if (this.holding_ball) { // 送球を保持中。走者に触れるか、走者が塁に着くまで待つ
            handleTagPlay(this, 3, field_, batter, runners, fielders, ball, sbo_counter);
            return;
        }
        if (ball.x < field_.items.base_home.x) {
            super.move(field_, batter, runners, fielders, ball, sbo_counter);
        } else if (batter.is_hit && ball.alive) {
            if (handleTagPlay(this, 3, field_, batter, runners, fielders, ball, sbo_counter)) {
                return;
            }
            if (this.speed < 2) { this.speed += 0.05; } // 走るスピードを徐々に上げる
            var dx = field_.items.base_third.x + field_.items.base_first.radius - this.x;
            var dy = field_.items.base_third.y - field_.items.base_third.radius*2 - this.y;
            var distance = Math.sqrt(dx ** 2 + dy ** 2);
            if (distance > 1) {
                this.angle = Math.acos(dx / distance) * 180 / Math.PI;
                this.x += this.speed * Math.cos(this.angle * Math.PI / 180);
                this.y += this.speed * Math.sin(this.angle * Math.PI / 180);
            }
        }
    }
}

class Catcher extends Fielder {
    move(field_, batter, runners, fielders, ball, sbo_counter) {
        if (this.holding_ball) { // 送球を保持中。走者に触れるか、走者が塁に着くまで待つ
            handleTagPlay(this, 4, field_, batter, runners, fielders, ball, sbo_counter);
            return;
        }
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
        } else if (batter.is_hit && ball.alive && runners.list.some(r => r.active && r.moving && r.target === 4) &&
            handleTagPlay(this, 4, field_, batter, runners, fielders, ball, sbo_counter)) { // ホームへ突入する走者へのタッグプレー
            // handleTagPlay内で捕球・タッチ判定・保留を処理済み
        } else if ((field_.items.base_home.y+field_.items.base_second.y)/2 < ball.y) { // バッターが打ったときは、他の野手と同じ動き
            super.move(field_, batter, runners, fielders, ball, sbo_counter);
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

    move(field_, batter, runners, ball, sbo_counter) {
        for (let key in this.fielders) {
            this.fielders[key].move(field_, batter, runners, this, ball, sbo_counter);
        }
    }

    draw() {
        for (let key in this.fielders) {
            this.fielders[key].draw();
        }
    }
}

// ベースを走る走者。baseIndexは 0=ホーム(打者走者の出発点), 1=一塁, 2=二塁, 3=三塁, 4=ホーム(生還)
// Batterはこのクラスを継承し、打者自身がヒットした瞬間からそのまま走者になる（別オブジェクトを作らない）
class Runner extends Player {
    constructor(field_, radius=6, color='blue') {
        super(0, 0, radius, color); // Playerのコンストラクタがthis.reset()を呼ぶ
        this.field_ = field_;
    }

    reset() {
        super.reset();
        this.active = false;
        this.baseIndex = 0;
        this.moving = false;
        this.target = 0;
        this.run_speed = 0;
        this.scored = false;
    }

    basePos(idx) {
        const f = this.field_.items;
        if (idx === 1) return { x: f.base_first.x, y: f.base_first.y };
        if (idx === 2) return { x: f.base_second.x, y: f.base_second.y };
        if (idx === 3) return { x: f.base_third.x, y: f.base_third.y };
        return { x: f.base_home.x, y: f.base_home.y }; // 0 or 4
    }

    advance() {
        if (this.active && !this.moving && this.baseIndex < 4) {
            this.target = this.baseIndex + 1;
            this.moving = true;
        }
    }

    // 進塁中の走者を、直前にいた塁（baseIndex）まで戻す。静止中は何もしない＝その塁より後ろには戻れない
    recall() {
        if (this.active && this.moving) {
            this.target = this.baseIndex;
        }
    }

    move() {
        if (this.active && this.moving) {
            if (this.run_speed < 2) { this.run_speed += 0.05; }
            const p = this.basePos(this.target);
            const dx = p.x - this.x;
            const dy = p.y - this.y;
            const distance = Math.sqrt(dx ** 2 + dy ** 2);
            if (distance > 2) {
                this.x += dx / distance * this.run_speed;
                this.y += dy / distance * this.run_speed;
            } else if (this.target === 4) {
                this.baseIndex = 4;
                this.moving = false;
                this.run_speed = 0;
                this.scored = true; // 生還。呼び出し側で得点処理してreset()する
            } else if (this.target === 0) {
                // 帰塁でホームまで戻った。this.reset()で完全に初期化する
                // （打者はis_hitなど自分固有の状態も持つため、baseIndex/active等だけを個別に戻すと
                // 　is_hitがtrueのまま残り、次の投球以降ずっと「打球処理中」として扱われてしまう）
                this.reset();
            } else {
                this.baseIndex = this.target;
                this.moving = false;
                this.run_speed = 0;
            }
        }
    }

    draw() {
        if (this.active && (this.baseIndex !== 0 || this.moving)) {
            super.draw();
        }
    }
}

class Runners {
    constructor(field_, batter) {
        this.field_ = field_;
        this.batter = batter;
        // list[0]は打者自身（ヒットした瞬間からそのまま走者になる）。残りは他の走者用の枠（同時に塁上にいるのは最大3人）
        this.list = [batter, new Runner(field_), new Runner(field_), new Runner(field_)];
    }

    // Fielderの送球先判定などが使う互換プロパティ
    get is_runner() {
        return {
            first: this.list.some(r => r.active && r.baseIndex === 1),
            second: this.list.some(r => r.active && r.baseIndex === 2),
            third: this.list.some(r => r.active && r.baseIndex === 3),
        };
    }

    runnerAt(idx) {
        return this.list.find(r => r.active && !r.moving && r.baseIndex === idx);
    }

    // 打者が打った瞬間に呼ぶ。一塁に走者がいれば押し出す（打者自身は自分でRunnerとして一塁へ進む）
    prepareForBatterRunner() {
        if (this.runnerAt(1)) {
            this.forceAdvance(1);
        }
    }

    // idx塁の走者を（先が塞がっていれば連鎖的に）1つ先へ押し出す
    forceAdvance(idx) {
        const runner = this.runnerAt(idx);
        if (!runner) return;
        const next = this.runnerAt(idx + 1);
        if (next) {
            this.forceAdvance(idx + 1);
        }
        runner.advance();
    }

    reset() {
        for (const r of this.list) {
            r.reset();
        }
    }

    // laneFirst=Dキー(一塁の走者), laneSecond=Wキー(二塁), laneThird=Aキー(三塁), laneAll=Sキー(全員)
    selectRunners(laneFirst, laneSecond, laneThird, laneAll) {
        return this.list.filter(r => r.active && (
            laneAll ||
            (laneFirst && r.baseIndex === 1) ||
            (laneSecond && r.baseIndex === 2) ||
            (laneThird && r.baseIndex === 3)
        ));
    }

    tryAdvance(laneFirst, laneSecond, laneThird, laneAll) {
        for (const r of this.selectRunners(laneFirst, laneSecond, laneThird, laneAll)) {
            r.advance();
        }
    }

    tryRetreat(laneFirst, laneSecond, laneThird, laneAll) {
        for (const r of this.selectRunners(laneFirst, laneSecond, laneThird, laneAll)) {
            r.recall();
        }
    }

    move(sbo_counter) {
        for (const r of this.list) {
            // 打者自身の移動はmain.jsからbatter.move(field_, runners, ball)として呼ばれているので、ここでは呼ばない
            if (r !== this.batter) {
                r.move();
            }
            if (r.scored) {
                sbo_counter.score_counter.scores[sbo_counter.score_counter.turn] += 1;
                r.reset();
            }
        }
    }

    draw() {
        for (const r of this.list) {
            r.draw();
        }
    }
}