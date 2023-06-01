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
        this.turn_name = ['表', '裏'];
        this.team_name = ['C', 'D'];
        this.scores = [0, 0];
    }

    draw() {
        super.draw();
        fill('white');
        textAlign(CENTER, CENTER);
        textSize(this.height/4);
        text(this.inning + this.turn_name[this.turn], this.x + this.width/2, this.y + this.height/3/2);
        for (let i=0; i<this.scores.length; i++) {
            text(this.team_name[i], this.x + this.width / 3, this.y + (i*2+3)*this.height/3/2);
            text(this.scores[i], this.x + this.width / 3 * 2, this.y + (i*2+3)*this.height/3/2);
        }
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
        textAlign(CENTER, CENTER);
        let i = 0;
        for (let key in this.counts) {
            // テキストのサイズを指定
            fill('white');
            textSize(this.width/4);
            text(key, this.x + this.width/4/2, this.y + (i*2+1)*(this.height/3/2));
            for (let j=0; j<this.counts[key]; j++) {
                fill(this.colors[key])
                ellipse(this.x + (j*2+3)*(this.width/4/2), this.y + (i*2+1)*(this.height/3/2), this.width/5);
            }
            i++;
        }
    }

    strike() {
        this.counts['S'] += 1;
        if (this.counts['S'] >= 3) {
            this.out();
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
            this.reset();
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