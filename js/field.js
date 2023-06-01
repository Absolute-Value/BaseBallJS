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

class Line {
    constructor(x1, y1, x2, y2, width=1, color='white') {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.width = width;
        this.color = color;
    }

    draw() {
        stroke(this.color);
        strokeWeight(this.width);
        line(this.x1, this.y1, this.x2, this.y2);
    }
}

class Box {
    constructor(center_x, center_y, width, height, color=null, fill_color=null) {
        this.center_x = center_x;
        this.center_y = center_y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.fill_color = fill_color;
    }

    draw() {
        if (this.color) {
            stroke(this.color);
        } else {
            noStroke();
        }
        if (this.fill_color) {
            fill(this.fill_color);
        } else {
            noFill();
        }
        rect(this.center_x-this.width/2, this.center_y-this.height/2, this.width, this.height);
    }
}

class Field {
    constructor() {
        const pos = {
            pitcher_mound: {x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - HOME_POS - 200}, // ピッチャーマウンドの位置
            base_home: {x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - HOME_POS}, // ホームベースの位置
            base_first: {x: CANVAS_WIDTH / 2 + 200, y: CANVAS_HEIGHT - HOME_POS - 200}, // 1塁の位置
            base_second: {x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - HOME_POS - 400}, // 2塁の位置
            base_third: {x: CANVAS_WIDTH / 2 - 200, y: CANVAS_HEIGHT - HOME_POS - 200}, // 3塁の位置
        }
        this.items = {
            pitcher_mound: new Circle(pos.pitcher_mound.x, pos.pitcher_mound.y, 36, DIRT_COLOR), // ピッチャーマウンド
            pitcher_line: new Line(pos.pitcher_mound.x - 10, pos.pitcher_mound.y-6, pos.pitcher_mound.x + 10, pos.pitcher_mound.y-6, width=3), // ピッチャーマウンドからホームベースへの線
            dirt_home: new Circle(pos.base_home.x, pos.base_home.y, 50, DIRT_COLOR), // ホームベース周りの土
            dirt_first: new DirtDiamond(pos.base_first.x - 15, pos.base_first.y - 8, 50, DIRT_COLOR), // 1塁周りの土
            dirt_second: new DirtDiamond(pos.base_second.x, pos.base_second.y + 15 - 8, 50, DIRT_COLOR), // 2塁周りの土
            dirt_third: new DirtDiamond(pos.base_third.x + 15, pos.base_third.y - 8, 50, DIRT_COLOR), // 3塁周りの土
            line_right: new Line(pos.base_home.x, pos.base_home.y, pos.base_home.x - 400, pos.base_home.y - 400), // ホームから1塁への線
            line_left: new Line(pos.base_home.x, pos.base_home.y, pos.base_home.x + 400, pos.base_home.y - 400), // ホームから3塁への線
            base_home_dirt: new Box(pos.base_home.x, pos.base_home.y-8, 24, 24, null, DIRT_COLOR), // ホームベース下の土（線を消すため）
            batter_box_left: new Box(pos.base_home.x-24, pos.base_home.y-8, 24, 36, 'white', DIRT_COLOR),// color='white'), // バッターボックス
            batter_box_right: new Box(pos.base_home.x+24, pos.base_home.y-8, 24, 36, 'white', DIRT_COLOR),// color='white'), // バッターボックス
            base_home: new HomeBase(pos.base_home.x, pos.base_home.y, 8), // ホーム
            base_first: new Diamond(pos.base_first.x, pos.base_first.y, 8), // 1塁
            base_second: new Diamond(pos.base_second.x, pos.base_second.y, 8), // 2塁
            base_third: new Diamond(pos.base_third.x, pos.base_third.y, 8), // 3塁
        };
    }

    draw() {
        background(0, 128, 0);
        for (let key in this.items) {
            this.items[key].draw();
        }
    }
}