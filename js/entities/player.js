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

// 今のプレーを終える共通処理。打者(=走者)が塁上に残っていても、is_hitは必ず解除する。
// （is_hitが残ったままだと、次に投げられる投球を「打球がまだ生きている」と誤認してしまい、
// 　ピッチャーが投球をその場で拾って処理する、通常の投球判定が行われない等の不具合が起きる）
function concludePlay(batter, fielders) {
    batter.is_hit = false;
    fielders.reset();
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
        // 打球（is_hit）だけでなく、盗塁を刺すための送球（is_thrown）も処理対象にする
        if ((batter.is_hit || ball.is_thrown) && ball.alive) {
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
                    } else {
                        // 実際に進塁しようとしている（動いている）走者がいる塁にだけ送球する。
                        // 塁に「いる」というだけで動いていない走者に投げてしまうと、
                        // 安全に到達した走者を放っておいて意味もなく他の塁へ投げ続けてしまう。
                        const movingTo = (idx) => runners.list.some(r => r.active && r.moving && r.target === idx);
                        if (movingTo(4)) { // 本塁へ向かっている走者がいる
                            var dx = field_.items.base_home.x - this.x;
                            var dy = field_.items.base_home.y - this.y;
                        } else if (movingTo(3)) { // 三塁へ向かっている走者がいる
                            var dx = field_.items.base_third.x + field_.items.base_third.radius - this.x;
                            var dy = field_.items.base_third.y - field_.items.base_third.radius*2 - this.y;
                        } else if (movingTo(2)) { // 二塁へ向かっている走者がいる
                            var dx = field_.items.base_second.x - this.x;
                            var dy = field_.items.base_second.y - field_.items.base_second.radius - this.y;
                        } else if (movingTo(1)) { // 一塁へ向かっている走者がいる
                            var dx = field_.items.base_first.x - field_.items.base_first.radius - this.x;
                            var dy = field_.items.base_first.y - field_.items.base_first.radius*2 - this.y;
                        } else {
                            // 誰も進塁しようとしていない → 送球せずそのままプレーを終える
                            ball.alive = false;
                            fielders.someome_has_ball = false;
                            concludePlay(batter, fielders);
                            return;
                        }
                        ball.speed = 4;
                        ball.angle = Math.atan2(dy, dx) * 180 / Math.PI;
                        ball.is_thrown = true;
                        ball.is_pitch = false;
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
    constructor(init_x, init_y, radius=6) {
        super(init_x, init_y, radius);
        this.holding_ball = false;
    }

    reset() {
        super.reset();
        this.holding_ball = false;
    }

    move(field_, batter, runners, fielders, ball, sbo_counter) {
        if (this.holding_ball) { // 牽制球などを保持中。走者に触れるか、走者が塁に着くまで待つ
            handleTagPlay(this, 1, field_, batter, runners, fielders, ball, sbo_counter);
            return;
        }
        if ((batter.is_hit || ball.is_thrown) && ball.alive) {
            if (circleCollision(ball.x, ball.y, ball.radius, this.x, this.y, this.radius)) {
                if (batter.baseIndex < 1) { // まだ一塁に到達していなければフォースプレー（タッチ不要でアウト）
                    ball.alive = false;
                    sbo_counter.out();
                    batter.reset();
                    fielders.reset();
                } else {
                    // 打者は既にセーフ。牽制などで一塁にいる別の走者を刺せるかをタッチプレーとして判定する
                    handleTagPlay(this, 1, field_, batter, runners, fielders, ball, sbo_counter);
                }
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
        concludePlay(batter, fielders);
        return true;
    }
    if (circleCollision(runner.x, runner.y, runner.radius, fielder.x, fielder.y, fielder.radius)) {
        // ボールを持った野手が実際に走者へ触れたのでアウト
        sbo_counter.out();
        runner.reset();
        fielder.holding_ball = false;
        concludePlay(batter, fielders);
        return true;
    }
    if (!runner.moving) {
        // タッチされる前に塁へ到達できたのでセーフ
        fielder.holding_ball = false;
        concludePlay(batter, fielders);
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
        } else if ((batter.is_hit || ball.is_thrown) && ball.alive) {
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
        // 走者が三塁へ向かっている間は、ボールの位置に関わらず必ず三塁をカバーする
        // （ボールの左右だけで守備位置を決めていたため、走者が向かっているのに誰もいないことがあった）
        const runnerHeadingHere = runners.list.some(r => r.active && r.moving && r.target === 3);
        if (!runnerHeadingHere && ball.x < field_.items.base_home.x) {
            super.move(field_, batter, runners, fielders, ball, sbo_counter);
            return;
        }
        if ((batter.is_hit || ball.is_thrown) && ball.alive && handleTagPlay(this, 3, field_, batter, runners, fielders, ball, sbo_counter)) {
            return;
        }
        // 三塁をカバーする定位置へ戻る
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

class Catcher extends Fielder {
    move(field_, batter, runners, fielders, ball, sbo_counter) {
        if (this.holding_ball) { // 送球を保持中。走者に触れるか、走者が塁に着くまで待つ
            handleTagPlay(this, 4, field_, batter, runners, fielders, ball, sbo_counter);
            return;
        }
        if (ball.alive && !batter.is_hit) { // バッターが打たなかったとき
            if (circleCollision(ball.x, ball.y, ball.radius, this.x, this.y, this.radius)) {
                if (ball.is_strike) {
                    sbo_counter.strike();
                } else {
                    sbo_counter.ball();
                }
                // 盗塁を試みている走者がいれば、投球を受けたその場から刺しに行く
                // （三塁>二塁の順で、進んでいる走者へ送球する）
                const stealTarget = runners.list.some(r => r.active && r.moving && r.target === 3) ? 3
                    : runners.list.some(r => r.active && r.moving && r.target === 2) ? 2
                    : null;
                if (stealTarget === 3) {
                    var dx = field_.items.base_third.x + field_.items.base_third.radius - this.x;
                    var dy = field_.items.base_third.y - field_.items.base_third.radius*2 - this.y;
                } else if (stealTarget === 2) {
                    var dx = field_.items.base_second.x - this.x;
                    var dy = field_.items.base_second.y - field_.items.base_second.radius - this.y;
                }
                if (stealTarget) {
                    ball.speed = 4;
                    ball.angle = Math.atan2(dy, dx) * 180 / Math.PI;
                    ball.is_thrown = true;
                    ball.is_pitch = false;
                } else {
                    ball.alive = false;
                    fielders.reset();
                }
            } else { // 投手の球筋を追う。Y位置は本塁に固定したまま、X位置だけボールに合わせる
                // （ボールに向かって直接距離を詰めると、本塁に届く前の途中で捕まえてしまい、
                // 　常にボール判定になってしまうため、あくまでホームで待ち構える）
                var dx = ball.x - this.x;
                if (Math.abs(dx) > 0.5) {
                    var step = Math.min(Math.abs(dx), ball.speed + 1);
                    this.x += dx > 0 ? step : -step;
                }
            }
            return;
        }
        // 走者がホームへ向かっている間は、ボールの位置に関わらず必ずホームをカバーする
        // （追いかける処理に任せていたため、走者が向かっているのに誰もいないことがあった）
        const runnerHeadingHere = runners.list.some(r => r.active && r.moving && r.target === 4);
        if ((batter.is_hit || ball.is_thrown) && ball.alive && runnerHeadingHere &&
            handleTagPlay(this, 4, field_, batter, runners, fielders, ball, sbo_counter)) { // ホームへ突入する走者へのタッグプレー
            return; // handleTagPlay内で捕球・タッチ判定・保留を処理済み
        }
        if (!runnerHeadingHere && (field_.items.base_home.y+field_.items.base_second.y)/2 < ball.y) { // バッターが打ったときは、他の野手と同じ動き
            super.move(field_, batter, runners, fielders, ball, sbo_counter);
            return;
        }
        // ホームをカバーする定位置へ戻る
        if (this.speed < 2) { this.speed += 0.05; } // 走るスピードを徐々に上げる
        var dx = field_.items.base_home.x - this.x;
        var dy = (field_.items.base_home.y + 30) - this.y;
        var distance = Math.sqrt(dx ** 2 + dy ** 2);
        if (distance > 1) {
            this.angle = Math.atan2(dy, dx) * 180 / Math.PI;
            this.x += this.speed * Math.cos(this.angle * Math.PI / 180);
            this.y += this.speed * Math.sin(this.angle * Math.PI / 180);
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

    // 投球前にピッチャーが牽制球を投げる。targetは1(一塁)/2(二塁)/3(三塁)
    pickoff(target, field_, ball) {
        const pitcher = this.fielders.pitcher;
        let targetX, targetY;
        if (target === 1) {
            targetX = field_.items.base_first.x - field_.items.base_first.radius;
            targetY = field_.items.base_first.y - field_.items.base_first.radius * 2;
        } else if (target === 2) {
            targetX = field_.items.base_second.x;
            targetY = field_.items.base_second.y - field_.items.base_second.radius;
        } else {
            targetX = field_.items.base_third.x + field_.items.base_third.radius;
            targetY = field_.items.base_third.y - field_.items.base_third.radius * 2;
        }
        ball.throwFrom(pitcher.x, pitcher.y, targetX, targetY);
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

    // 帰塁で引き返している最中でも呼べる（moving中かどうかを問わない）。
    // これにより進塁⇔帰塁を完全に往復し終わる前に何度でも切り替えられる。
    advance() {
        if (this.active && this.baseIndex < 4) {
            this.target = this.baseIndex + 1;
            this.moving = true;
        }
    }

    // 走者を、直前にいた塁（baseIndex）まで戻す。それより後ろには戻れない。
    // advance()と同様、進塁の途中で呼んでも即座に向きを切り替えられる。
    recall() {
        if (this.active) {
            this.target = this.baseIndex;
            this.moving = true;
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

    // プレーが完全に終わり、打者(=走者)が塁上で静止しているとき、
    // 専用のRunner枠へ状態を引き継いで、打者自身は次の打者として打席へ戻す。
    // （これをしないと、走者が塁に残っている間ずっと打席に誰も表示されなくなる）
    handOffBatterIfSettled(ball) {
        if (!this.batter.active || this.batter.moving || ball.alive) {
            return;
        }
        const slot = this.list.find(r => r !== this.batter && !r.active);
        if (!slot) {
            return; // 空きがなければ何もしない（塁が全部埋まっている等、通常は起こらない）
        }
        slot.active = true;
        slot.baseIndex = this.batter.baseIndex;
        slot.moving = false;
        slot.target = this.batter.baseIndex;
        slot.run_speed = 0;
        slot.x = this.batter.x;
        slot.y = this.batter.y;
        slot.color = this.batter.color; // 攻撃側チームの色を引き継ぐ
        this.batter.reset(); // 打者は打席へ戻る
    }

    reset() {
        for (const r of this.list) {
            r.reset();
        }
    }

    // laneFirst=Dキー(一塁の走者), laneSecond=Wキー(二塁), laneThird=Aキー(三塁), laneAll=Sキー(全員)
    selectRunners(laneFirst, laneSecond, laneThird, laneAll) {
        return this.list.filter(r => {
            if (!r.active) return false;
            if (r === this.batter && r.baseIndex < 1) {
                // 打者が一塁へ向かって自動で走っている間は、全員選択(S)の対象にしない
                // （そうしないと、他の走者を操作しようとしただけで一塁への進塁が横取りされてしまう）
                return false;
            }
            return laneAll ||
                (laneFirst && r.baseIndex === 1) ||
                (laneSecond && r.baseIndex === 2) ||
                (laneThird && r.baseIndex === 3);
        });
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

    // ファウルになったら、進塁・盗塁を試みていた走者を全員、元にいた塁へ戻す
    recallAllOnFoul() {
        for (const r of this.list) {
            if (r.active && r.moving) {
                r.recall();
            }
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