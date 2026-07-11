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
    fielders.holder = null;
    fielders.reset();
}

// ベースカバーの割り当て(coverTarget)が入っていれば、そこへ向かって移動する。
// 到着したら割り当てを解除して、通常の判断（自分の持ち場に戻る等）に任せる。
// trueを返したら、呼び出し側はこのフレームの他の処理をせず終える。
function moveTowardCover(fielder, fielders) {
    if (!fielder.coverTarget || fielder === fielders.holder) {
        return false;
    }
    if (fielder.speed < 2) { fielder.speed += 0.05; }
    const dx = fielder.coverTarget.x - fielder.x;
    const dy = fielder.coverTarget.y - fielder.y;
    const distance = Math.sqrt(dx ** 2 + dy ** 2);
    if (distance > 3) {
        fielder.x += dx / distance * fielder.speed;
        fielder.y += dy / distance * fielder.speed;
        return true;
    }
    fielder.coverTarget = null;
    return false;
}

// ボールを拾った野手の「持つ／投げる」判定。追いかける動き・移動そのものとは独立して呼び出せる
// （手動操作中のピッチャーのように、動きは自前で処理していても捕球判定だけは共通化したい場合に使う）。
// ボールに触れていなければfalseを返す。
function handleBallPickup(fielder, field_, batter, runners, fielders, ball, sbo_counter) {
    if (!circleCollision(ball.x, ball.y, ball.radius, fielder.x, fielder.y, fielder.radius)) {
        return false;
    }
    if (ball.is_foul) {
        ball.alive = false;
        sbo_counter.foul();
        batter.reset();
        fielders.holder = null;
        fielders.reset();
        return true;
    }
    if (fielders.holder !== fielder) {
        // 新たに拾った野手を記録し、空いている塁があれば近くの野手をカバーに向かわせる
        fielders.holder = fielder;
        fielders.assignCoverage(field_);
    }
    fielders.someome_has_ball = true;
    const humanPitching = sbo_counter.score_counter.turn !== MY_TEAM_INDEX;
    if (fielder.hold_count > 0) { // 一定時間ボールを持つ
        fielder.hold_count -= 1;
        fielder.speed = 0;
        ball.speed = 0;
    } else if (humanPitching) {
        // 自分の守備中は自動で送球しない。WASDでベースを選んでMキーで送球するのを待つ
        fielder.speed = 0;
        ball.speed = 0;
    } else {
        // 実際に進塁しようとしている（動いている）走者がいる塁にだけ送球する。
        // 塁に「いる」というだけで動いていない走者に投げてしまうと、
        // 安全に到達した走者を放っておいて意味もなく他の塁へ投げ続けてしまう。
        const movingTo = (idx) => runners.list.some(r => r.active && r.moving && r.target === idx);
        let dx, dy;
        if (movingTo(4)) { // 本塁へ向かっている走者がいる
            dx = field_.items.base_home.x - fielder.x;
            dy = field_.items.base_home.y - fielder.y;
        } else if (movingTo(3)) { // 三塁へ向かっている走者がいる
            dx = field_.items.base_third.x + field_.items.base_third.radius - fielder.x;
            dy = field_.items.base_third.y - field_.items.base_third.radius*2 - fielder.y;
        } else if (movingTo(2)) { // 二塁へ向かっている走者がいる
            dx = field_.items.base_second.x - fielder.x;
            dy = field_.items.base_second.y - field_.items.base_second.radius - fielder.y;
        } else if (movingTo(1)) { // 一塁へ向かっている走者がいる
            dx = field_.items.base_first.x - field_.items.base_first.radius - fielder.x;
            dy = field_.items.base_first.y - field_.items.base_first.radius*2 - fielder.y;
        } else {
            // 誰も進塁しようとしていない → 送球せずそのままプレーを終える
            ball.alive = false;
            fielders.someome_has_ball = false;
            concludePlay(batter, fielders);
            return true;
        }
        ball.speed = 4;
        ball.angle = Math.atan2(dy, dx) * 180 / Math.PI;
        ball.is_thrown = true;
        ball.is_pitch = false;
        // 投げた後はボールを離すので、他の野手が再び追いかけられるようにする
        // （trueのままだと誰も追いかけなくなり、送球が誰にも捕られず転がり続ける）
        fielders.someome_has_ball = false;
        fielders.holder = null;
    }
    return true;
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
        this.coverTarget = null;
    }

    move(field_, batter, runners, fielders, ball, sbo_counter) {
        if (moveTowardCover(this, fielders)) {
            return;
        }
        // 打球（is_hit）だけでなく、盗塁を刺すための送球（is_thrown）も処理対象にする
        if ((batter.is_hit || ball.is_thrown) && ball.alive) {
            if (!handleBallPickup(this, field_, batter, runners, fielders, ball, sbo_counter)) {
                if (fielders.someome_has_ball) {
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
            }
            super.move();
        }
    }
}

class Pitcher extends Fielder {
    move(field_, batter, runners, fielders, ball, sbo_counter) {
        const humanPitching = sbo_counter.score_counter.turn !== MY_TEAM_INDEX;

        if (!ball.alive && !batter.active) {
            // 投球前は、マウンドの白い棒（pitcher_line）の中だけ左右に移動できる
            const line = field_.items.pitcher_line;
            const minX = Math.min(line.x1, line.x2);
            const maxX = Math.max(line.x1, line.x2);
            if (humanPitching) {
                if (!keyIsDown(77)) { // 牽制(M)の操作中は動かさない
                    if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) { this.x -= 2; }
                    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) { this.x += 2; }
                }
            } else {
                // コンピューターも投球までの間、少しだけ左右に動く
                this.x += (Math.random() - 0.5) * 1.5;
            }
            if (this.x < minX) { this.x = minX; }
            if (this.x > maxX) { this.x = maxX; }
            return;
        }

        if (batter.is_hit && humanPitching) {
            // 打たれた後は、上下左右キーでピッチャーを自由に動かせる
            const speed = 3;
            if (keyIsDown(87) || keyIsDown(UP_ARROW)) { this.y -= speed; }
            if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) { this.y += speed; }
            if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) { this.x -= speed; }
            if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) { this.x += speed; }
            if (this.x < 0) { this.x = 0; } else if (this.x > CANVAS_WIDTH) { this.x = CANVAS_WIDTH; }
            if (this.y < 0) { this.y = 0; } else if (this.y > CANVAS_HEIGHT) { this.y = CANVAS_HEIGHT; }
            // 移動は自分で操作するので、追いかける動きは行わず、拾う・持つ・送球待ちの判定だけ共通処理に任せる
            if ((batter.is_hit || ball.is_thrown) && ball.alive) {
                handleBallPickup(this, field_, batter, runners, fielders, ball, sbo_counter);
            }
            return;
        }

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
        this.coverTarget = null;
    }

    reset() {
        super.reset();
        this.holding_ball = false;
        this.coverTarget = null;
    }

    move(field_, batter, runners, fielders, ball, sbo_counter) {
        if (moveTowardCover(this, fielders)) {
            return;
        }
        if (fielders.holder === this) {
            // フォースアウトの後、併殺を狙って持ち続けている・投げ先を決めている最中
            handleBallPickup(this, field_, batter, runners, fielders, ball, sbo_counter);
            return;
        }
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

// originBase(1〜3)にいた走者が、次の塁へ進まざるを得ないフォースプレーの状況かどうかを判定する。
// 打者がヒットして走者になっている間（is_hit）に、1〜originBase-1の塁がすべて
// 別の走者で埋まっていれば、その走者は後ろの走者（最終的には打者）に押し出されるので
// タッチしなくても塁に触れる（送球が届く）だけでアウトになる。
function isForceOut(batter, runners, originBase) {
    if (!batter.is_hit) {
        return false; // 盗塁など、打球が絡まない場面はフォースプレーにならない
    }
    for (let b = 1; b < originBase; b++) {
        if (!runners.list.some(r => r.active && r.baseIndex === b)) {
            return false;
        }
    }
    return true;
}

// 送球を捕球しても、それだけでは必ずしも走者をアウトにしない。
// フォースプレー（後ろの走者に押し出されて進まざるを得ない）なら、塁に送球が届いた時点でアウト。
// そうでなければ、捕球後は野手がその場でボールを持ち続け、実際に走者（打者自身の場合も含む）へ
// 触れたときだけアウトにする。走者がタッチされる前に塁へ到達すればセーフ。
// 捕球判定がないと送球が画面上を転がり続けてしまうため、捕球自体はここで確定させる。
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
    const forced = isForceOut(batter, runners, targetBase - 1);
    const tagged = circleCollision(runner.x, runner.y, runner.radius, fielder.x, fielder.y, fielder.radius);
    if (forced || tagged) {
        // フォースプレーなら塁に触れるだけでアウト。フォースでなければ実際にタッチできたのでアウト
        sbo_counter.out();
        runner.reset();
        fielder.holding_ball = false;
        // まだ他に刺せる走者（併殺の相方）がいるかもしれないので、まだプレーを終えず、
        // 同じ野手がそのまま持つ／別の塁へ投げるかの判断に戻す（人間の守備ならWASD+Mで自分で投げる）
        ball.alive = true;
        fielders.holder = null;
        if (!handleBallPickup(fielder, field_, batter, runners, fielders, ball, sbo_counter)) {
            concludePlay(batter, fielders); // 念のため（通常はここに来ない）
        }
        return true;
    }
    return true; // 走者はまだ到達しておらずタッチもできていない。野手はボールを持って待つ
}

class Second extends Fielder {
    move(field_, batter, runners, fielders, ball, sbo_counter) {
        if (moveTowardCover(this, fielders)) {
            return;
        }
        if (fielders.holder === this) {
            // フォースアウトの後、併殺を狙って持ち続けている・投げ先を決めている最中
            handleBallPickup(this, field_, batter, runners, fielders, ball, sbo_counter);
            return;
        }
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
        if (moveTowardCover(this, fielders)) {
            return;
        }
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
        if (moveTowardCover(this, fielders)) {
            return;
        }
        if (fielders.holder === this) {
            // フォースアウトの後、併殺を狙って持ち続けている・投げ先を決めている最中
            handleBallPickup(this, field_, batter, runners, fielders, ball, sbo_counter);
            return;
        }
        if (this.holding_ball) { // 送球を保持中。走者に触れるか、走者が塁に着くまで待つ
            handleTagPlay(this, 3, field_, batter, runners, fielders, ball, sbo_counter);
            return;
        }
        // 二塁より先に走者がいる間（二塁到達後）は、ボールの位置に関わらず必ず三塁をカバーする
        // （三塁へ向かって走り出した瞬間だけをカバー条件にしていたため、二塁にいる間は
        // 　三塁を離れてしまい、誰もいない三塁に送球されることがあった）
        const shouldCoverThird = runners.list.some(r => r.active && r.baseIndex >= 2);
        if (!shouldCoverThird && ball.x < field_.items.base_home.x) {
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
        if (moveTowardCover(this, fielders)) {
            return;
        }
        if (fielders.holder === this) {
            // フォースアウトの後、併殺を狙って持ち続けている・投げ先を決めている最中
            handleBallPickup(this, field_, batter, runners, fielders, ball, sbo_counter);
            return;
        }
        if (this.holding_ball) { // 送球を保持中。走者に触れるか、走者が塁に着くまで待つ
            handleTagPlay(this, 4, field_, batter, runners, fielders, ball, sbo_counter);
            return;
        }
        if (ball.alive && !batter.is_hit && !ball.is_thrown) { // 投球を待ち構える（盗塁やホームへの送球はここに含めない）
            // バットに当たらないよう、投球を待つ間は本塁より少し後ろの定位置へ戻す
            // （牽制や三塁走者への備えで本塁ちょうどまで出ていても、実際に投球が来たら下がる）
            const restY = field_.items.base_home.y + 30;
            if (Math.abs(this.y - restY) > 0.5) {
                const nudge_step = Math.min(Math.abs(this.y - restY), 2);
                this.y += this.y < restY ? nudge_step : -nudge_step;
            }
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
        // ホームへ向かう走者がいれば、タッグプレーとして処理する
        const runnerHeadingHere = runners.list.some(r => r.active && r.moving && r.target === 4);
        if ((batter.is_hit || ball.is_thrown) && ball.alive && runnerHeadingHere &&
            handleTagPlay(this, 4, field_, batter, runners, fielders, ball, sbo_counter)) { // ホームへ突入する走者へのタッグプレー
            return; // handleTagPlay内で捕球・タッチ判定・保留を処理済み
        }
        // キャッチャーは打球を追いかけて他の野手のように動き回らない。常にホームのカバー位置へ戻る
        // （打球を追いかけさせていると、ホームを離れてしまい誰もいないホームに送球されてしまう）
        // 牽制球が飛んでいる間や三塁に走者がいる間だけ、送球を確実に捕れるよう本塁の座標ちょうどまで出る。
        // それ以外はバットに当たらないよう本塁より少し後ろで待つ。
        // ball.is_thrownは実際に投げ直すまでリセットされないため、送球が終わった後も残り続ける。
        // ball.aliveも一緒に見て、実際に送球が飛んでいる最中かどうかを判定する
        const throwInFlight = ball.is_thrown && ball.alive;
        const runnerOnThird = runners.list.some(r => r.active && r.baseIndex === 3);
        const targetY = (throwInFlight || runnerOnThird) ? field_.items.base_home.y : field_.items.base_home.y + 30;
        if (this.speed < 2) { this.speed += 0.05; } // 走るスピードを徐々に上げる
        var dx = field_.items.base_home.x - this.x;
        var dy = targetY - this.y;
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
            catcher: new Catcher(field_.items.base_home.x, field_.items.base_home.y + 30), // キャッチャー（バットに当たらないよう本塁より少し後ろが定位置）
            first: new First(field_.items.base_first.x, field_.items.base_first.y - 50), // 一塁手
            second: new Second(field_.items.base_second.x + 120, field_.items.base_second.y + 10), // 二塁手
            short: new Short(field_.items.base_second.x - 120, field_.items.base_second.y + 10), // 遊撃手
            third: new Third(field_.items.base_third.x, field_.items.base_third.y - 50), // 三塁手
        }
        this.someome_has_ball = false;
        this.holder = null; // 現在ボールを持っている野手（手動送球・ベースカバーの割り当てに使う）
    }

    reset() {
        this.someome_has_ball = false;
        this.holder = null;
        for (let key in this.fielders) {
            this.fielders[key].reset();
        }
    }

    get(key) {
        return this.fielders[key];
    }

    // targetの塁の座標を返す。1=一塁, 2=二塁, 3=三塁, 4=本塁
    basePosition(target, field_) {
        if (target === 1) {
            return { x: field_.items.base_first.x - field_.items.base_first.radius, y: field_.items.base_first.y - field_.items.base_first.radius * 2 };
        } else if (target === 2) {
            return { x: field_.items.base_second.x, y: field_.items.base_second.y - field_.items.base_second.radius };
        } else if (target === 3) {
            return { x: field_.items.base_third.x + field_.items.base_third.radius, y: field_.items.base_third.y - field_.items.base_third.radius * 2 };
        }
        return { x: field_.items.base_home.x, y: field_.items.base_home.y };
    }

    // 投球前にピッチャーが牽制球を投げる。targetは1(一塁)/2(二塁)/3(三塁)
    pickoff(target, field_, ball) {
        const pitcher = this.fielders.pitcher;
        const pos = this.basePosition(target, field_);
        ball.throwFrom(pitcher.x, pitcher.y, pos.x, pos.y);
    }

    // ボールを持っている野手が、選んだ塁(1〜4)へ手動で送球する
    manualThrow(target, field_, ball) {
        if (!this.holder) {
            return;
        }
        const pos = this.basePosition(target, field_);
        ball.throwFrom(this.holder.x, this.holder.y, pos.x, pos.y);
        this.someome_has_ball = false;
        this.holder = null;
    }

    // ボールを拾った野手が決まった直後に呼ぶ。各塁について、近くに誰もいなければ
    // （ボールを持っている野手を除く）最も近い野手をそこへ向かわせる
    assignCoverage(field_) {
        const bases = [
            { x: field_.items.base_first.x, y: field_.items.base_first.y },
            { x: field_.items.base_second.x, y: field_.items.base_second.y },
            { x: field_.items.base_third.x, y: field_.items.base_third.y },
            { x: field_.items.base_home.x, y: field_.items.base_home.y },
        ];
        const COVER_RADIUS = 40;
        // ピッチャーは操作対象になるため、ベースカバーの割り当て対象からは除く
        const eligible = Object.keys(this.fielders)
            .filter(key => key !== 'pitcher')
            .map(key => this.fielders[key]);
        const assignedThisRound = new Set();
        for (const base of bases) {
            const covered = eligible.some(f => Math.hypot(f.x - base.x, f.y - base.y) < COVER_RADIUS);
            if (covered) {
                continue;
            }
            let nearest = null;
            let nearestDist = Infinity;
            for (const f of eligible) {
                if (f === this.holder || assignedThisRound.has(f)) {
                    continue;
                }
                const d = Math.hypot(f.x - base.x, f.y - base.y);
                if (d < nearestDist) {
                    nearestDist = d;
                    nearest = f;
                }
            }
            if (nearest) {
                nearest.coverTarget = { x: base.x, y: base.y };
                assignedThisRound.add(nearest);
            }
        }
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