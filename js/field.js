const HOME_POS = 100; // ホームベースの下からの位置
const DIRT_COLOR = '#8b4513'; // (139, 69, 19)を16進数へ変換

class Diamond {
    constructor(x, y, radius=8, color='white') {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
    }

    draw() {
        noStroke();
        fill(this.color);
        quad(this.x-this.radius, this.y-this.radius, 
            this.x, this.y-this.radius*2, 
            this.x+this.radius, this.y-this.radius, 
            this.x, this.y);
    }
}

class DirtDiamond extends Diamond{
    draw() {
        noStroke();
        fill(DIRT_COLOR);
        quad(this.x-this.radius, this.y, 
            this.x, this.y-this.radius, 
            this.x+this.radius, this.y, 
            this.x, this.y+this.radius);
    }
}

class HomeBase extends Diamond {
    draw() {
        noStroke();
        fill(this.color);
        rect(this.x-this.radius, this.y-this.radius*2, this.radius*2, this.radius);
        triangle(this.x-this.radius, this.y-this.radius, 
            this.x, this.y, 
            this.x+this.radius, this.y-this.radius);
    }
}

class Circle extends Diamond {
    draw() {
        noStroke();
        fill(this.color);
        ellipse(this.x, this.y, this.radius*2, this.radius*2);
    }
}

class Field {
    constructor() {
        this.items = {
            pitcher_mound: new Circle(CANVAS_WIDTH / 2, CANVAS_HEIGHT - HOME_POS - 200, 36, DIRT_COLOR), // ピッチャーマウンド
            dirt_home: new Circle(CANVAS_WIDTH / 2, CANVAS_HEIGHT - HOME_POS, 50, DIRT_COLOR), // ホームベース周りの土
            dirt_first: new DirtDiamond(CANVAS_WIDTH / 2 + 200 - 15, CANVAS_HEIGHT - HOME_POS - 200 - 8, 50, DIRT_COLOR), // 1塁周りの土
            dirt_second: new DirtDiamond(CANVAS_WIDTH / 2, CANVAS_HEIGHT - HOME_POS - 400 + 15 - 8, 50, DIRT_COLOR), // 2塁周りの土
            dirt_third: new DirtDiamond(CANVAS_WIDTH / 2 - 200 + 15, CANVAS_HEIGHT - HOME_POS - 200 - 8, 50, DIRT_COLOR), // 3塁周りの土
            base_home: new HomeBase(CANVAS_WIDTH / 2, CANVAS_HEIGHT - HOME_POS, 8), // ホーム
            base_first: new Diamond(CANVAS_WIDTH / 2 + 200, CANVAS_HEIGHT - HOME_POS - 200, 8), // 1塁
            base_second: new Diamond(CANVAS_WIDTH / 2, CANVAS_HEIGHT - HOME_POS - 400, 8), // 2塁
            base_third: new Diamond(CANVAS_WIDTH / 2 - 200, CANVAS_HEIGHT - HOME_POS - 200, 8), // 3塁
        };
    }

    draw() {
        background(0, 128, 0);
        for (let key in this.items) {
            this.items[key].draw();
        }
    }
}