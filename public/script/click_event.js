window.onload = function() {
    var login_button = document.getElementById('login_button');
    var confirm_button = document.getElementById('message_button');

    login_button.addEventListener("click", login);
    confirm_button.addEventListener("click", back_to_login);
};

function setText(id, text) {
    document.getElementById(id).textContent = text;
}

var waiting_msg = 'Wait for another client connect';
var message_updater = null;

function displayMessageBox(show, text) {
    document.getElementById('window-cover').setAttribute('class', show? 'show':'hide');
    document.getElementById('pop_up_window').setAttribute('class', show? 'show':'hide');
    document.getElementById('wait4start').style.display = (show? 'inline':'none');
    setText('loading_text', text);

    var color_block = document.getElementsByClassName('color_blocks');
    for (let i = 0 ; i < color_block.length; i++) {
        color_block[i].addEventListener("click", cblock_trigger);
    }
}

function cblock_trigger() {
    let clicked_color_hex = this.getAttribute("style", "background-color").replace('background-color:', '');
    socket.emit('click_block', clicked_color_hex);
    //alert(clicked_color_hex);
};

function login() {
    var user_name = document.getElementById('input_user_name').value;
    if (message_updater) clearInterval(message_updater);

    if (user_name && user_name.indexOf(" ") == -1) {
        setText('user_name', user_name);
        displayMessageBox(true, waiting_msg);

        let i = 1;
        message_updater = setInterval(function() {
            displayMessageBox(true, waiting_msg + ".".repeat(i));
            i++;
            if (i > 3) i = 1;
        }, 1000);

        //emit to server
        socket.emit('name_set', user_name);
    } else {
        document.getElementById('message_box').style.display = 'inline';
        document.getElementById('message_title').textContent = 'Invalid Name';
        document.getElementById('message_context').textContent = 'Name include illegon character, Please try again';
        
    }
    document.getElementById('login-panel').style.display = 'none';
}

function back_to_login() {
    if (message_updater) clearInterval(message_updater);
    document.getElementById('login-panel').style.display = 'inline';
    document.getElementById('message_box').style.display = 'none';
}