var socket = io();

socket.on('paired', function(name) {
    setText('opponent_name', name);
    clearInterval(message_updater);
});

function counterDisplay(round) {
    if (isNaN(round)) round = 1;
    clearInterval(message_updater);
    displayMessageBox(true, `ROUND ${round}　　- 3 -`);
    
    let i = 2;
    message_updater = setInterval(function() {
        displayMessageBox(true, `ROUND ${round}　　- ${i} -`);
        i--;
        if (i == 0) clearInterval(message_updater);
    }, 1000);
}

socket.on('timer', function(sec) {
    setText('timer', sec);
});

socket.on('times_up', function() {
    displayMessageBox(true, "TIMES UP!");
});

socket.on('game_start_count', counterDisplay);

socket.on('game_start', function() {
    displayMessageBox(false);
});

socket.on('new_round', function(round) {
    setText('user_score', 0);
    setText('opponent_score', 0);
    setText('wrong_count', 0);
    setText('user_round_text', round);
    setText('opponent_round_text', round);
    //counterDisplay(round);
});

socket.on('game_finished', function(winner) {
    if (winner == 'TIE') {
        displayMessageBox(true, 'GAME OVER\n- Tie! -');
    } else if (winner == socket.id) {
        displayMessageBox(true, 'GAME OVER\n- You Win! -');
    } else {
        displayMessageBox(true, 'GAME OVER\n- You Lose! -');
    }
});

socket.on('score_update', function(data) {
    if (data.id == socket.id) {
        setText('user_score', data.score);
    } else {
        setText('opponent_score', data.score);
    }
});

socket.on('update_color', function(data) {
    let { id, color } = data;
    let isMine = (id == socket.id);

    let color_blocks = document.getElementsByClassName((isMine? "":"opponent_") + 'color_blocks');
    for (let i = 0; i < 16; i++) {
        let style = "background-color:";

        if (i == color.rand_index) {
            style += color.answer;
        } else {
            style += color.main;
        }
        color_blocks[i].setAttribute('style', style);
    }
});

socket.on('wrong_count_update',function(wrong_counter){
    setText('wrong_count',wrong_counter);
});

socket.on('update_win_count',function(data){
    for (let i = 0; i < data.length; i++) {
        if (data[i].id == socket.id) {
            setText('user_win_count_text', data[i].win_count);
        } else {
            setText('opponent_win_count_text', data[i].win_count);
        }
    }
});

socket.on('opponent_disconnected', function() {
    /*refresh the page*/
    clearInterval(message_updater);
    displayMessageBox(true, `OPPONENT DISCONNECTED, REFRESH: 3`);
    
    let i = 2;
    message_updater = setInterval(function() {
        displayMessageBox(true, `OPPONENT DISCONNECTED, REFRESH: ${i}`);
        if (i == 0) location.reload();
        i--;
    }, 1000);
});