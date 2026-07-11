// p5jsで野球ゲームを作成する
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const MY_TEAM_INDEX = 0; // 自チーム = D(青)。表(D攻撃)は自分が打撃、裏(C攻撃)は自分が投球・守備を操作する

function setup() {
    var canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    canvas.parent('GameCanvas');
    field_ = new Field();
    batter = new Batter(field_); // バッターを作成（打者自身がそのまま走者にもなる）
    runners = new Runners(field_, batter); // ランナーを作成（打者を含めて管理する）
    fielders = new Fielders(field_); // 野手を作成
    ball = new Ball(fielders.get('pitcher').x, fielders.get('pitcher').y); // ボールを作成
    sbo_counter = new SBOCounter();
    sbo_counter.runners = runners; // チェンジ時に走者をクリアできるようにする
    sbo_counter.batter = batter; // フォアボールで打者をそのまま一塁の走者にできるようにする
    last_turn = sbo_counter.score_counter.turn;
    updateTeamColors(); // 表(D)は攻撃=青、守備=赤で開始
    n_was_down = false;
    suppress_swing = false;
    pitch_wait_timer = randomPitchWait();
    frameRate(60);
}

const BALL_STUCK_LIMIT = 90; // ボールが止まったまま誰にも拾われない状態が続いたら強制的にプレーを終える(フレーム数)
const FOUL_TIMEOUT = 180; // ファウルと判定されてから、誰も処理しなくても強制的にプレーを終えるまでの時間(フレーム数、60fps換算で3秒)

// ピッチャーが自動で投げるまでに持っている時間をランダムに決める（60fps換算で約1〜3秒）
function randomPitchWait() {
    return Math.floor(Math.random() * 120) + 60;
}

// 攻守交代のたびに、攻撃側チームと守備側チームの色を入れ替える
function updateTeamColors() {
    const turn = sbo_counter.score_counter.turn;
    const battingColor = sbo_counter.score_counter.team_color[turn];
    const fieldingColor = sbo_counter.score_counter.team_color[1 - turn];
    batter.color = battingColor;
    for (const r of runners.list) {
        r.color = battingColor;
    }
    for (const key in fielders.fielders) {
        fielders.get(key).color = fieldingColor;
    }
}

function draw() {
    var up = keyIsDown(87) || keyIsDown(UP_ARROW); // Wキーまたは上キー
    var down = keyIsDown(83) || keyIsDown(DOWN_ARROW); // Sキーまたは下キー
    var left = keyIsDown(65) || keyIsDown(LEFT_ARROW); // Aキーまたは左キー
    var right = keyIsDown(68) || keyIsDown(RIGHT_ARROW); // Dキーまたは右キー

    // 自チーム(D/青)が攻撃中なら打撃操作、そうでなければ投球操作を受け付ける
    var humanBatting = sbo_counter.score_counter.turn === MY_TEAM_INDEX;
    var humanPitching = !humanBatting;

    if (humanBatting) {
        if (up) { batter.vy -= 1; } // バッターを上に移動
        if (down) { batter.vy += 1; } // バッターを下に移動
        if (left) { batter.vx -= 1; } // バッターを左に移動
        if (right) { batter.vx += 1; } // バッターを右に移動
    }

    var n_down = keyIsDown(78);
    var n_pressed = n_down && !n_was_down; // このフレームで新しく押された（押しっぱなしでは反応しない）

    // 投球前（ボールが死んでいて、打者がまだ打席にいる）は、投球そのものを行う番
    var waitingToPitch = !ball.alive && !batter.active;
    if (waitingToPitch) {
        if (humanPitching) {
            // 自分の守備中は、自動では投げない。必ずNキーで自分から投球する
            if (keyIsDown(77)) { // M: AWD+Mで牽制球（D=一塁、W=二塁、A=三塁）
                if (right) { fielders.pickoff(1, field_, ball); }
                else if (up) { fielders.pickoff(2, field_, ball); }
                else if (left) { fielders.pickoff(3, field_, ball); }
            } else if (n_pressed) { // N: 投球する。W=遅い球、S=速い球、なにもなしで中くらいの速さ
                var speedMode = up ? 'slow' : down ? 'fast' : 'normal';
                ball.pitch(speedMode);
                // 投球に使ったNキーを離すまでは、そのままスイングに使われないようにする
                suppress_swing = true;
            }
        } else {
            // 相手チームの投球は操作できない。ランダムな間を置いて普通の球を自動で投げる
            pitch_wait_timer -= 1;
            if (pitch_wait_timer <= 0) {
                ball.pitch('normal');
            }
        }
    } else {
        pitch_wait_timer = randomPitchWait(); // 次に投球を待つときのための時間を再抽選しておく
        if (humanBatting) {
            // D/右=一塁の走者を選択、W/上=二塁、A/左=三塁、S/下=全員を選択
            // Mキーで選択した走者を進塁、Nキーでその塁までの範囲で帰塁させる
            if (keyIsDown(77)) { // M
                runners.tryAdvance(right, up, left, down);
            }
            if (keyIsDown(78)) { // N
                runners.tryRetreat(right, up, left, down);
            }
        }
    }

    if (!n_down) {
        suppress_swing = false; // Nを離したら、次に押したときは通常通りスイングできる
    }

    // 自分の守備中、誰かがボールを持っていたら、WASD/矢印で塁を選んでMキーで手動送球する
    // （D/右=一塁、W/上=二塁、A/左=三塁、S/下=本塁）
    if (humanPitching && fielders.holder && keyIsDown(77)) {
        if (right) { fielders.manualThrow(1, field_, ball); }
        else if (up) { fielders.manualThrow(2, field_, ball); }
        else if (left) { fielders.manualThrow(3, field_, ball); }
        else if (down) { fielders.manualThrow(4, field_, ball); }
    }

    if (humanBatting && !batter.is_hit && ball.alive) {
        // 投球が来ている間のNキーはスイング（投球に使ったNキーの押しっぱなしでは振らない）
        if (n_down && !suppress_swing) {
            batter.swing();
        } else {
            batter.swing_back();
        }
    }

    n_was_down = n_down;

    // 投球中はA/Dでカーブさせる（自チームが投球しているときだけ操作できる。曲げすぎないようball.js側で上限を設けている）
    var curveInput = humanPitching ? ((left ? 1 : 0) - (right ? 1 : 0)) : 0;

    batter.move(field_, runners, ball); // バッターを移動
    ball.move(field_, curveInput); // ボールを移動
    fielders.move(field_, batter, runners, ball, sbo_counter); // 野手を移動

    // ファウルになったら、進塁・盗塁を試みていた走者は全員元の塁へ戻す
    if (ball.is_foul) {
        runners.recallAllOnFoul();
        // ファウルのボールを誰も処理しなくても、3秒経ったら強制的にプレーを終える
        if (ball.alive && ball.foul_count > FOUL_TIMEOUT) {
            ball.alive = false;
            sbo_counter.foul();
            concludePlay(batter, fielders);
        }
    }

    runners.move(sbo_counter); // ランナーを移動

    // ボールが止まったまま誰にも拾われずに放置され続けたら、プレーを強制的に終える
    // （走者が塁の間を走っている最中に発動すると、守備陣が初期位置へ戻ってしまうので待つ）
    if (ball.alive && ball.idle_count > BALL_STUCK_LIMIT && !runners.list.some(r => r.moving)) {
        ball.alive = false;
        concludePlay(batter, fielders);
    }

    // プレーが完全に終わり、打者(=走者)が塁上で静止していたら、専用のランナー枠に引き継いで
    // 打者自身は次の打者として打席に戻す（そうしないと走者が塁にいる間ずっと打席に誰も現れない）
    runners.handOffBatterIfSettled(ball);

    // 攻守交代が起きたら、選手の色を入れ替える
    if (sbo_counter.score_counter.turn !== last_turn) {
        last_turn = sbo_counter.score_counter.turn;
        updateTeamColors();
    }

    field_.draw(); // フィールドを描画
    runners.draw(); // バッター・ランナーを描画（打者自身がRunnerを兼ねている）
    fielders.draw(); // 野手を描画
    ball.draw(); // ボールを描画
    sbo_counter.draw(); // SBOカウンターを描画
}
