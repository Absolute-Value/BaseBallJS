// p5jsで野球ゲームを作成する
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const HOME_POS = 100

function setup() {
    createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    field_ = new Field();
    batter = new Batter(field_.bases.base_home.x - 24, field_.bases.base_home.y - 8);
    ball = new Ball(400, 300);

    frameRate(60);
}

function draw() {
    // Wキーまたは上キーが押されたらバッターを上に移動
    if (keyIsDown(87) || keyIsDown(UP_ARROW)) {
        batter.dy -= 1;
    }
    // Sキーまたは下キーが押されたらバッターを下に移動
    if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) {
        batter.dy += 1;
    }
    // Aキーまたは左キーが押されたらバッターを左に移動
    if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) {
        batter.dx -= 1;
    }
    // Dキーまたは右キーが押されたらバッターを右に移動
    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) {
        batter.dx += 1;
    }
    // Nキーが押されている場合
    if (keyIsDown(78)) {
        batter.swing();
    } else {
        batter.swing_back();
    }

    batter.move(); // バッターを移動

    field_.draw(); // フィールドを描画
    batter.draw(); // バッターを描画
    ball.draw(); // ボールを描画
}

class Base {
    constructor(x, y, r=8) {
        this.x = x;
        this.y = y;
        this.r = r;
    }

    draw() {
        noStroke();
        fill(255, 255, 255);
        quad(this.x-this.r, this.y-this.r, 
            this.x, this.y-this.r*2, 
            this.x+this.r, this.y-this.r, 
            this.x, this.y);
    }
}

class HomeBase extends Base {
    draw() {
        noStroke();
        fill(255, 255, 255);
        rect(this.x-this.r, this.y-this.r*2, this.r*2, this.r);
        triangle(this.x-this.r, this.y-this.r, 
            this.x, this.y, 
            this.x+this.r, this.y-this.r);
    }
}

class Field {
    constructor() {
        this.bases = {
            base_home: new HomeBase(CANVAS_WIDTH / 2, CANVAS_HEIGHT - HOME_POS, 8), // ホーム
            base_first: new Base(CANVAS_WIDTH / 2 + 200, CANVAS_HEIGHT - HOME_POS - 200, 8), // 1塁
            base_second: new Base(CANVAS_WIDTH / 2, CANVAS_HEIGHT - HOME_POS - 400, 8), // 2塁
            base_third: new Base(CANVAS_WIDTH / 2 - 200, CANVAS_HEIGHT - HOME_POS - 200, 8), // 3塁
        };
    }

    draw() {
        noStroke();
        background(0, 128, 0);
        // 茶色で描画ピッチャーマウンドを描画
        fill(139, 69, 19);
        ellipse(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 200 - HOME_POS, 80, 80);
        // 白でベースを描画
        for (let key in this.bases) {
            this.bases[key].draw();
        }
    }
}

class Player {
    constructor(init_x, init_y, r=12) {
        this.init_x = init_x;
        this.init_y = init_y;
        this.r = r;
        this.reset();
    }

    reset() {
        this.x = this.init_x;
        this.y = this.init_y;
        this.dx = 0;
        this.dy = 0;
    }

    move() {
        this.x += this.dx;
        this.y += this.dy;
        this.dx = 0;
        this.dy = 0;
    }

    draw() {
        noStroke();
        fill(0, 0, 255);
        ellipse(this.x, this.y, this.r, this.r);
    }
}

class Batter extends Player {
    constructor(init_x, init_y, r=12) {
        super(init_x, init_y, r);
        this.bat_width = 6 // バットの幅
        this.bat_length = 28 // バットの長さ
        this.init_angle = 120 // バットの初期角度
        this.swing_speed = 15 // バットの振り速度
        this.reset();
    }

    reset() {
        super.reset();
        this.angle = this.init_angle;
    }

    swing() {
        if (this.angle > -135 && this.angle < 135) {
            this.angle -= this.swing_speed;
        }
    }

    swing_back() {
        if (this.angle <= -135 || this.angle >= 135) {
            this.angle = this.init_angle;
        }
    }

    move() {
        this.x += this.dx;
        this.y += this.dy;
        this.dx = 0;
        this.dy = 0;
    }

    draw() {
        // 薄茶色のバットを描画
        var bat_x = this.x + Math.cos(this.angle) * this.bat_length;
        var bat_y = this.y + Math.sin(this.angle) * this.bat_length;
        stroke(180, 100, 50);
        strokeWeight(8);
        line(this.x, this.y, bat_x, bat_y);
        super.draw();
    }
}

class Ball {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.r = 8;
    }
    draw() {
        noStroke();
        fill(230, 215, 150);
        ellipse(this.x, this.y, this.r, this.r);
    }
}