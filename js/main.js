// p5jsで野球ゲームを作成する
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function setup() {
    var canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    canvas.parent('GameCanvas');
    field_ = new Field();
    batter = new Batter(field_.items.base_home.x - 24, field_.items.base_home.y - 8); // バッターを作成
    fielders = new Fielders(field_); // 野手を作成
    ball = new Ball(fielders.get('pitcher').x, fielders.get('pitcher').y); // ボールを作成
    score_counter = new ScoreCounter();
    sbo_counter = new SBOCounter();
    frameRate(60);
}

function draw() {
    if (keyIsDown(87) || keyIsDown(UP_ARROW)) { // Wキーまたは上キーが押されたら
        batter.vy -= 1; // バッターを上に移動
    }
    if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) { // Sキーまたは下キーが押されたら
        batter.vy += 1; // バッターを下に移動
    }
    if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) { // Aキーまたは左キーが押されたら
        batter.vx -= 1; // バッターを左に移動
    }
    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) { // Dキーまたは右キーが押されたら
        batter.vx += 1; // バッターを右に移動
    }
    // Nキーが押されている場合
    if (keyIsDown(78)) {
        batter.swing();
    } else {
        batter.swing_back();
    }

    batter.move(field_); // バッターを移動
    batter.hitting(ball); // バッターがボールを打つ
    ball.move(field_); // ボールを移動
    fielders.move(field_, batter, ball, sbo_counter); // 野手を移動

    field_.draw(); // フィールドを描画
    batter.draw(); // バッターを描画
    fielders.draw(); // 野手を描画
    ball.draw(); // ボールを描画
    score_counter.draw(); // スコアカウンターを描画
    sbo_counter.draw(); // SBOカウンターを描画
}
