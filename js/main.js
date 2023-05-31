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

    frameRate(60);
}

function draw() {
    // Wキーまたは上キーが押されたらバッターを上に移動
    if (keyIsDown(87) || keyIsDown(UP_ARROW)) {
        batter.vy -= 1;
    }
    // Sキーまたは下キーが押されたらバッターを下に移動
    if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) {
        batter.vy += 1;
    }
    // Aキーまたは左キーが押されたらバッターを左に移動
    if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) {
        batter.vx -= 1;
    }
    // Dキーまたは右キーが押されたらバッターを右に移動
    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) {
        batter.vx += 1;
    }
    // Nキーが押されている場合
    if (keyIsDown(78)) {
        batter.swing();
    } else {
        batter.swing_back();
    }

    batter.move(); // バッターを移動
    ball.move(); // ボールを移動
    fielders.move(ball); // 野手を移動

    field_.draw(); // フィールドを描画
    batter.draw(); // バッターを描画
    fielders.draw(); // 野手を描画
    ball.draw(); // ボールを描画
}