// p5jsで野球ゲームを作成する
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const HOME_POS = 100

function setup() {
    var canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    canvas.parent('GameCanvas');
    field_ = new Field();
    batter = new Batter(field_.items.base_home.x - 24, field_.items.base_home.y - 8); // バッターを作成
    fielders = new Fielders(field_); // 野手を作成
    ball = new Ball(CANVAS_WIDTH/2, CANVAS_HEIGHT/2);

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
    ball.move(); // ボールを移動
    fielders.move(ball); // 野手を移動

    field_.draw(); // フィールドを描画
    batter.draw(); // バッターを描画
    fielders.draw(); // 野手を描画
    ball.draw(); // ボールを描画
}

class Base {
    constructor(x, y, radius=8) {
        this.x = x;
        this.y = y;
        this.radius = radius;
    }

    draw() {
        noStroke();
        fill(255, 255, 255);
        quad(this.x-this.radius, this.y-this.radius, 
            this.x, this.y-this.radius*2, 
            this.x+this.radius, this.y-this.radius, 
            this.x, this.y);
    }
}

class HomeBase extends Base {
    draw() {
        noStroke();
        fill(255, 255, 255);
        rect(this.x-this.radius, this.y-this.radius*2, this.radius*2, this.radius);
        triangle(this.x-this.radius, this.y-this.radius, 
            this.x, this.y, 
            this.x+this.radius, this.y-this.radius);
    }
}

class DirtCircle extends Base {
    draw() {
        noStroke();
        fill(139, 69, 19);
        ellipse(this.x, this.y, this.radius*2, this.radius*2);
    }
}

class Field {
    constructor() {
        this.items = {
            pitcher_mound: new DirtCircle(CANVAS_WIDTH / 2, CANVAS_HEIGHT - HOME_POS - 200, 40), // ピッチャーマウンド
            home_dirt: new DirtCircle(CANVAS_WIDTH / 2, CANVAS_HEIGHT - HOME_POS, 60), // ホームベース周りの土
            base_home: new HomeBase(CANVAS_WIDTH / 2, CANVAS_HEIGHT - HOME_POS, 8), // ホーム
            base_first: new Base(CANVAS_WIDTH / 2 + 200, CANVAS_HEIGHT - HOME_POS - 200, 8), // 1塁
            base_second: new Base(CANVAS_WIDTH / 2, CANVAS_HEIGHT - HOME_POS - 400, 8), // 2塁
            base_third: new Base(CANVAS_WIDTH / 2 - 200, CANVAS_HEIGHT - HOME_POS - 200, 8), // 3塁
        };
    }

    draw() {
        background(0, 128, 0);
        for (let key in this.items) {
            this.items[key].draw();
        }
    }
}

class Player {
    constructor(init_x, init_y, radius=6) {
        this.init_x = init_x;
        this.init_y = init_y;
        this.radius = radius;
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

    draw(color = 'red') {
        noStroke();
        fill(color);
        ellipse(this.x, this.y, this.radius*2, this.radius*2);
    }
}

class Batter extends Player {
    constructor(init_x, init_y, radius=6) {
        super(init_x, init_y, radius);
        this.bat_width = 6 // バットの幅
        this.bat_length = 28 // バットの長さ
        this.init_angle = 120 // バットの初期角度
        this.swing_speed = 15 // バットの振り速度
        this.reset();
    }

    reset() {
        super.reset();
        this.is_hit = false;
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

    draw(color='blue') {
        // 薄茶色のバットを描画
        var bat_x = this.x + Math.cos(this.angle*(Math.PI/180)) * this.bat_length;
        var bat_y = this.y + Math.sin(this.angle*(Math.PI/180)) * this.bat_length;
        stroke(222, 184, 135);
        strokeWeight(8);
        line(this.x, this.y, bat_x, bat_y);
        super.draw(color);
    }
}

class Fielder extends Player {
    constructor(init_x, init_y, radius=6) {
        super(init_x, init_y, radius);
    }

    move(ball) {
        return
    }
}

class Catcher extends Fielder {
    move(ball) {
        if (ball.alive && !batter.is_hit) {
            if ((this.x - ball.x) ** 2 + (this.y - ball.y) ** 2 <= (this.radius + ball.radius) ** 2) {
                ball.alive = false;
                fielders.reset();
            } else {
                this.x += ball.dx;
            }
        }
    }
}

class Fielders {
    constructor(field_) {
        this.fielders = {
            catcher: new Catcher(field_.items.base_home.x, field_.items.base_home.y + 30), // キャッチャー
            first: new Fielder(field_.items.base_first.x, field_.items.base_first.y - 50), // 一塁手
            second: new Fielder(field_.items.base_second.x + 120, field_.items.base_second.y + 10), // 二塁手
            short: new Fielder(field_.items.base_second.x - 120, field_.items.base_second.y + 10), // 遊撃手
            third: new Fielder(field_.items.base_third.x, field_.items.base_third.y - 50), // 三塁手
        }
    }

    reset() {
        for (let key in this.fielders) {
            this.fielders[key].reset();
        }
    }

    get(key) {
        return this.fielders[key];
    } 

    move(ball) {
        for (let key in this.fielders) {
            this.fielders[key].move(ball);
        }
    }

    draw() {
        for (let key in this.fielders) {
            this.fielders[key].draw();
        }
    }
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
        this.dx = this.speed * Math.sin(this.angle*(Math.PI/180));
        this.dy = this.speed * Math.cos(this.angle*(Math.PI/180));
        this.alive = true;
        this.dead_count = Math.floor(Math.random() * 60) + 60;
    }

    move() {
        if (this.alive) {
            this.x += this.dx;
            this.y += this.dy;
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