
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