// p5jsで野球ゲームを作成する
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

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
    frameRate(60);
}

const BALL_STUCK_LIMIT = 90; // ボールが止まったまま誰にも拾われない状態が続いたら強制的にプレーを終える(フレーム数)

function draw() {
    var up = keyIsDown(87) || keyIsDown(UP_ARROW); // Wキーまたは上キー
    var down = keyIsDown(83) || keyIsDown(DOWN_ARROW); // Sキーまたは下キー
    var left = keyIsDown(65) || keyIsDown(LEFT_ARROW); // Aキーまたは左キー
    var right = keyIsDown(68) || keyIsDown(RIGHT_ARROW); // Dキーまたは右キー

    if (up) { batter.vy -= 1; } // バッターを上に移動
    if (down) { batter.vy += 1; } // バッターを下に移動
    if (left) { batter.vx -= 1; } // バッターを左に移動
    if (right) { batter.vx += 1; } // バッターを右に移動

    // 打者がヒットして一塁へ走っている最中（まだ一塁に到達していない間）はWSAD/矢印を進塁操作に使わない
    var runningToFirst = batter.is_hit && batter.baseIndex < 1;
    if (!runningToFirst) {
        // D/右=一塁の走者を選択、W/上=二塁、A/左=三塁、S/下=全員を選択
        // Mキーで選択した走者を進塁、Nキーでその塁までの範囲で帰塁させる
        if (keyIsDown(77)) { // M
            runners.tryAdvance(right, up, left, down);
        }
        if (keyIsDown(78)) { // N
            runners.tryRetreat(right, up, left, down);
        }
    }

    if (!batter.is_hit) {
        // 打席中のNキーはスイング
        if (keyIsDown(78)) {
            batter.swing();
        } else {
            batter.swing_back();
        }
    }

    batter.move(field_, runners, ball); // バッターを移動
    ball.move(field_, runners); // ボールを移動（走者が走っている間は次の投球を始めない）
    fielders.move(field_, batter, runners, ball, sbo_counter); // 野手を移動
    runners.move(sbo_counter); // ランナーを移動

    // ボールが止まったまま誰にも拾われずに放置され続けたら、プレーを強制的に終える
    if (ball.alive && ball.idle_count > BALL_STUCK_LIMIT) {
        ball.alive = false;
        fielders.reset();
    }

    field_.draw(); // フィールドを描画
    runners.draw(); // バッター・ランナーを描画（打者自身がRunnerを兼ねている）
    fielders.draw(); // 野手を描画
    ball.draw(); // ボールを描画
    sbo_counter.draw(); // SBOカウンターを描画
}
