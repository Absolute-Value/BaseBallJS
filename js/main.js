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

class Ball {
    constructor(init_x, init_y, radius=4) {
        this.init_x = init_x;
        this.init_y = init_y;
        this.radius = radius;
        this.reset();
        this.alive = false;
    }

    reset() {
        this.x = this.init_x;
        this.y = this.init_y;
        this.speed = Math.random() * 3 + 3.5;
        this.angle = Math.random() * 10 - 5;
        this.vx = this.speed * Math.sin(this.angle*(Math.PI/180));
        this.vy = this.speed * Math.cos(this.angle*(Math.PI/180));
        this.alive = true;
        this.dead_count = Math.floor(Math.random() * 60) + 60;
    }

    move() {
        if (this.alive) {
            if (this.x + this.vx > CANVAS_WIDTH - this.radius || this.x + this.vx < this.radius) {
                this.vx *= -1;
            } if (this.y + this.vy > CANVAS_HEIGHT - this.radius || this.y + this.vy < this.radius) {
                this.vy *= -1;
            }
            this.x += this.vx;
            this.y += this.vy;
        } else {
            this.dead_count -= 1;
            if (this.dead_count <= 0) {
                this.reset();
            }
        }
    }

    draw() {
        if (this.alive) {
            noStroke();
            fill(230, 215, 150);
            ellipse(this.x, this.y, this.radius*2, this.radius*2);
        }
    }
}