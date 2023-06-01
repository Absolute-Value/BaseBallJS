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
    ball.move(); // ボールを移動
    fielders.move(ball); // 野手を移動

    field_.draw(); // フィールドを描画
    batter.draw(); // バッターを描画
    fielders.draw(); // 野手を描画
    ball.draw(); // ボールを描画
    sbo_counter.draw(); // SBOカウンターを描画
}

class SBOCounter {
    constructor(x=CANVAS_WIDTH-100, y=CANVAS_HEIGHT-100, width=100, height=100) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.bg_color = 'black';
        this.counts = {'S': 2, 'B': 3, 'O': 2};
        this.colors = {'S': 'yellow', 'B': 'green', 'O': 'red'};
    }

    draw() {
        noStroke();
        fill(this.bg_color);
        rect(this.x, this.y, this.width, this.height);
        // this.countsのキーと値を順番に取り出して、キーを白で縦に並べて表示する
        // キーの横に値の数だけ円を表示する
        let i = 0;
        for (let key in this.counts) {
            fill('white');
            textAlign(LEFT, TOP);
            // テキストのサイズを指定
            textSize(this.width/4);
            text(key, this.x, this.y + i*(this.height/3));
            for (let j=0; j<this.counts[key]; j++) {
                fill(this.colors[key])
                ellipse(this.x + (j+1)*(this.width/4) + this.width/4/2, this.y + i*(this.height/3) + this.width/4/2, this.width/4);
            }
            i++;
        }
    }

    strike() {
        this.counts['S'] += 1;
        if (this.counts['S'] >= 3) {
            out();
        }
    }

    foul() {
        if (this.counts['S'] < 2) {
            this.counts['S'] += 1;
        }
    }

    ball() {
        this.counts['B'] += 1;
        if (this.counts['B'] >= 4) {
            reset();
        }
    }

    out() {
        this.counts['O'] += 1;
        this.reset();
        if (this.counts['O'] >= 3) {
            this,this.counts['O'] = 0;
        }
    }

    reset() {
        this.counts['S'] = 0
        this.counts['B'] = 0
    }
}