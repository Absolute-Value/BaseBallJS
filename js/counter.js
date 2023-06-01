class Counter {
    constructor(x=0, y=0, width=100, height=100) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.bg_color = 'black';
    }

    draw() {
        noStroke();
        fill(this.bg_color);
        rect(this.x, this.y, this.width, this.height);
    }
}

class ScoreCounter extends Counter {
    constructor(x=0, y=CANVAS_HEIGHT-100, width=100, height=100) {
        super(x, y, width, height);
        this.inning = 1;
        this.turn = 0;
        this.turn_name = {0: '表', 1: '裏'};
    }

    draw() {
        super.draw();
        fill('white');
        textAlign(CENTER, CENTER);
        textSize(this.height/4);
        text(this.inning + this.turn_name[this.turn], this.x + this.width/2, this.y + this.height/3/2);
    }
}

class SBOCounter extends Counter {
    constructor(x=CANVAS_WIDTH-100, y=CANVAS_HEIGHT-100, width=100, height=100) {
        super(x, y, width, height);
        this.counts = {'S': 0, 'B': 0, 'O': 0};
        this.colors = {'S': 'yellow', 'B': 'green', 'O': 'red'};
    }

    draw() {
        super.draw();
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