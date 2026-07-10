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
const FOUL_TIMEOUT = 180; // ファウルと判定されてから、誰も処理しなくても強制的にプレーを終えるまでの時間(フレーム数、60fps換算で3秒)

function draw() {
    var up = keyIsDown(87) || keyIsDown(UP_ARROW); // Wキーまたは上キー
    var down = keyIsDown(83) || keyIsDown(DOWN_ARROW); // Sキーまたは下キー
    var left = keyIsDown(65) || keyIsDown(LEFT_ARROW); // Aキーまたは左キー
    var right = keyIsDown(68) || keyIsDown(RIGHT_ARROW); // Dキーまたは右キー

    if (up) { batter.vy -= 1; } // バッターを上に移動
    if (down) { batter.vy += 1; } // バッターを下に移動
    if (left) { batter.vx -= 1; } // バッターを左に移動
    if (right) { batter.vx += 1; } // バッターを右に移動

    // D/右=一塁の走者を選択、W/上=二塁、A/左=三塁、S/下=全員を選択
    // Mキーで選択した走者を進塁、Nキーでその塁までの範囲で帰塁させる
    // （打者が一塁へ向かって自動で走っている間の除外はRunners.selectRunners側で行う）
    if (keyIsDown(77)) { // M
        runners.tryAdvance(right, up, left, down);
    }
    if (keyIsDown(78)) { // N
        runners.tryRetreat(right, up, left, down);
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

    field_.draw(); // フィールドを描画
    runners.draw(); // バッター・ランナーを描画（打者自身がRunnerを兼ねている）
    fielders.draw(); // 野手を描画
    ball.draw(); // ボールを描画
    sbo_counter.draw(); // SBOカウンターを描画
}
