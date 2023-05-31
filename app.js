var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static('public'));

/** @type {Map<string, Player>} */
var joined_players = new Map();

class FightRoom {
    /**
     * @param {Player} player1 
     * @param {Player} player2 
     */
    constructor(player1, player2) {
        this.players = [player1, player2];

        this.round = 1;
        this.timer = null;
        this.counter = null;

        this.players[0].setRoom(this);
        this.players[1].setRoom(this);

        this.emitToOpponent(this.players[0], 'paired', this.players[0].name);
        this.emitToOpponent(this.players[1], 'paired', this.players[1].name);
        this.start();
    }

    broadcast(event, data) {
        this.players[0].socket.emit(event, data);
        this.players[1].socket.emit(event, data);
    }

    /**
     * @param {Player} player 
     * @param {string} event 
     * @param {*} data 
     */
    emitToOpponent(player, event, data) {
        if (player.id == this.players[0].id) {
            this.players[1].socket.emit(event, data);
        } else {
            this.players[0].socket.emit(event, data);
        }
    }

    disconn(player) {
        this.emitToOpponent(player, 'opponent_disconnected');
        this.clearTimer();
        if (this.counter) clearTimeout(this.counter);
    }

    startTimer() {
        this.clearTimer();

        let sec = 60;
        this.timer = setInterval(() => {
            this.broadcast('timer', sec);
            if (sec == 0) {
                this.broadcast('times_up');
                this.clearTimer();
                this.newRound();
            }
            sec--;
        }, 1000);
    }

    clearTimer() {
        if (this.timer) clearInterval(this.timer);
    }
    clearWrongCount(){
        this.players.forEach((obj) => {
            obj.click_wrong_counter = 0;
          });
    }

    newRound() {
        this.clearTimer();
        this.clearWrongCount();
        if (this.players[0].score > this.players[1].score) {
            this.players[0].win_count++;
        }
        else{
            this.players[1].win_count++;
        }
        this.broadcast('update_win_count',[
            { id :this.players[0].id, win_count: this.players[0].win_count },
            { id :this.players[1].id, win_count: this.players[1].win_count }
        ])

        setTimeout(() => {
            if (this.round == 3) {
                let winnerId = "TIE";
    
                if (this.players[0].win_count > this.players[1].win_count) {
                    winnerId = this.players[0].id;
                }
                else if (this.players[1].win_count > this.players[0].win_count) {
                    winnerId = this.players[1].id;
                }
    
                this.broadcast('game_finished', winnerId);
                return;
            }
    
            this.players[0].score = 0;
            this.players[1].score = 0;
    
            this.round++;
            this.broadcast('new_round', this.round);
            this.start();
        }, 2500);
    }

    start() {
        this.broadcast('game_start_count', this.round);
        // 3秒後開始
        if (this.counter) clearTimeout(this.counter);
        this.counter = setTimeout(() => {
            this.broadcast('game_start');
            this.players[0].start();
            this.players[1].start();
            this.startTimer();
        }, 3000);
    }
}

class Player {
    constructor(socket) {
        this.socket = socket;
        this.id = socket.id;

        this.name = "";

        this.score = 0;
        this.win_count = 0;
        this.answer_color = "";
        this.click_wrong_counter = 0;

        /** @type {?FightRoom} */
        this.room = null;
        
        console.log(this.id + ' connected');

        // 客戶端斷線
        this.socket.conn.on('close', (reason) => {
			console.log(this.id + ' disconnected');
			joined_players.delete(this.id);
            if (this.room)
                this.room.disconn(this);
		});

        // 登入 (或名字設定?)
        this.socket.on('name_set', (name) => {
            this.name = name;
            joined_players.set(this.id, this); // 加入等待房間
        });

        this.socket.on('click_block', (color) => {
            let check = (color == this.answer_color);
            // this.socket.emit('click_result', check);

            if (check) {
                this.score++;
                this.generateColor();
            } else {
                if (this.click_wrong_counter <= 2 && this.score !=0){
                    this.click_wrong_counter ++;
                }
                else{
                    this.score--;
                    this.click_wrong_counter = 0;
                }
                this.socket.emit('wrong_count_update',this.click_wrong_counter);
            }

            if (this.score < 0)
                this.score = 0;

            this.room.broadcast('score_update', {
                id: this.id,
                score: this.score
            });
        });
    }

    setRoom(room) {
        this.room = room;
    }

    get isWaiting() {
        return this.room == null;
    }

    generateColor() {
        let { main, answer, randIndex } = randomSimilarColorHex_HSV(8,8,8,16);
        this.answer_color = answer;

        // 生成後廣播
        this.room.broadcast('update_color', {
            id: this.id,
            color: {
                main,
                answer,
                rand_index: randIndex
            }
        });
    }

    start() {
        this.generateColor();
    }
}


io.on('connection', (socket) => {
    new Player(socket);
});

http.listen(3000,"0.0.0.0", function () {
    console.log('final term project listening on port 3000!');

    // 定期檢查是不是有人沒配對 (這裡舉例2秒)
    setInterval(() => {
        let tempPlayer = null;
        for (let [playerId, player] of joined_players) {
            if (!player.isWaiting) continue;

            if (!tempPlayer) {
                tempPlayer = player;
                continue;
            }

            new FightRoom(tempPlayer, player);
            break;
        }
    }, 2000);
});

// ========================== color generator ==========================
function getRandom(max) {
    return Math.floor(Math.random() * max);
}

function randomSimilarColorHex_HSV(hueRange = 10, saturationRange = 10, valueRange = 10, count = 4) {
    const h = getRandom(360);
    const s = Math.max(0, Math.min(100, getRandom(101) + Math.floor(Math.random() * saturationRange * 2 + 1) - saturationRange));
    const v = Math.max(0, Math.min(100, getRandom(101) + Math.floor(Math.random() * valueRange * 2 + 1) - valueRange));
    
    let newH = h + Math.floor(Math.random() * hueRange * 2 + 1) - hueRange;
    if (newH < 0) newH += 360;
    else if (newH > 360) newH -= 360;
    
    const newS = Math.max(0, Math.min(100, s + Math.floor(Math.random() * saturationRange * 2 + 1) - saturationRange));
    const newV = Math.max(0, Math.min(100, v + Math.floor(Math.random() * valueRange * 2 + 1) - valueRange));
    
    return {
        main:  hsvToHex(h,s,v),
        answer:  hsvToHex(newH,newS,newV),
        randIndex: getRandom(count)
    }

function hsvToRgb(h, s, v) {
    let r, g, b, i, f, p, q, t;
    h /= 360;
    s /= 100;
    v /= 100;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0:
        r = v, g = t, b = p; break;
      case 1:
        r = q, g = v, b = p; break;
      case 2:
        r = p, g = v, b = t; break;
      case 3:
        r = p, g = q, b = v; break;
      case 4:
        r = t, g = p, b = v; break;
      case 5:
        r = v, g = p, b = q; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
function rgbToHex([r, g, b]) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function hsvToHex(h, s, v) {
    const [r, g, b] = hsvToRgb(h, s, v);
    return rgbToHex([r, g, b]);
  }
}
// ========================== color generator ==========================