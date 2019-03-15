var config = {
	apiKey: "AIzaSyAgnq3U7wk7hmpbR0dCoZ_X2kQCiGUR34s",
	authDomain: "rock-paper-scissors-81600.firebaseapp.com",
	databaseURL: "https://rock-paper-scissors-81600.firebaseio.com",
	projectId: "rock-paper-scissors-81600",
	storageBucket: "rock-paper-scissors-81600.appspot.com",
	messagingSenderId: "261486112642"
};
firebase.initializeApp(config);
var db = firebase.database();
var dbSpectators = db.ref('spectators');
var dbChat = db.ref('chat');
var dbWins = db.ref('wins');

var username = '';
var isPlayer = false;
var playerSlot;
var dbPlayer;
var dbOpponent;
var dbSpectator;
var playerPlay = '';
var opponentPlay = '';
var gameRunning = false;

$(document).ready(function() {

	$('#btn-signout').on('click', function() {
		startSignIn();
	});

	function startSignIn() {
		if (dbSpectator) {
			dbSpectator.remove()
		} else if (dbPlayer) {
			dbPlayer.remove();
		}

		updatePlayers();

		$('#modal-info-line').removeClass('text-danger').addClass('text-muted');
		$('#modal-info-line').text('');
		dbSpectators.once('value', data => {
			if (data.numChildren() === 0) return;
			$('#modal-info-line').text(data.numChildren() + ' spectating');
		});
		
		$('#signin').modal();
	}


	$('#btn-spectate').on('click', function() {
		joinAs('spectator');
	});

	$('#btn-join').on('click', function() {
		joinAs('player');
	});

	$('.modal form').on('submit', function(event) {
		event.preventDefault();
		joinAs('player');
	});

	function joinAs(role, nameOverride) {
		isPlayer = (role === 'player');

		username = $('#name-field').val().trim();
		if (username === '') username = 'Anonymous';
		if (nameOverride) username = nameOverride;

		if (isPlayer) {
			db.ref('players').once('value', data => {
				if (data.numChildren() > 1) {
					$('#modal-info-line').text('Game full! Join as a spectator or wait for a player to leave.');
					$('#modal-info-line').addClass('text-danger').removeClass('text-muted');
					return;
				}

				playerSlot = (data.hasChild('one'))? 'two':'one';
				dbPlayer = db.ref('players/'+playerSlot)
				dbPlayer.set({
					name: username,
					play: ''
				});
				dbPlayer.onDisconnect().remove();

				$('#name-display').text("Welcome, " + username);
				$('#game').removeClass('spectator');

				$('#signin').modal('hide');
			});

		} else {
			dbSpectator = dbSpectators.push({
				name: username
			})
			dbSpectator.onDisconnect().remove();

			playerSlot = 'one';

			db.ref('players').once('child_added', snap => {
				if (snap.key !== playerSlot) {
					dbOpponent = snap.ref;
				} else {
					dbPlayer = snap.ref;
				}
				console.log("ONCE player added", snap.val(), snap.key, playerSlot, dbPlayer, dbOpponent);
			});

			updatePlayers();

			$('#name-display').text('Spectating as ' + username);
			$('#game').addClass('spectator');

			$('#signin').modal('hide');

		}

	}


	db.ref('players').on('child_added', snap => {
		if (snap.key !== playerSlot) {
			dbOpponent = snap.ref;
			status(snap.val().name + ' joined the game.', 'join');
		} else {
			dbPlayer = snap.ref;
		}
		console.log("player added", snap.val(), snap.key, playerSlot, dbPlayer, dbOpponent);

		snap.ref.update({ added: true });

		updatePlayers();
	});

	db.ref('players').on('child_removed', snap => {
		if (snap.key !== playerSlot) {
			dbOpponent = null;
			status(snap.val().name + ' left the game.', 'join');
		} else {
			dbPlayer = null;
			startSignIn();
		}
		console.log("player removed", snap.val(), snap.key);

		updatePlayers();
	});


	function updatePlayers() {
		updateName(dbPlayer, 'me');
		updateName(dbOpponent, 'you');
		newGame();
	}

	function updateName(ref, side) {
		var element = $('#game-name-' + side);
		if (!ref) {
			element.text("—");
			$('#game-icon-' + side).attr('src', 'assets/img/play-absent.png');
			$('#game-play-' + side).text('');
			return;
		}
		ref.once('value', data => {
			if (!data.exists()) {
				element.text("—");
				return;
			}
			element.text(data.val().name);

		});
	}

	function status(str, icon) {
		$('#game-status').text(str);
		$('#game-result-icon').attr('src', 'assets/img/result-'+icon+'.png');
		flash($('.game-output'));
	}

	function flash(element) {
		// $(element).removeClass('new').delay(100).addClass('new');
		// this wasn’t working well, disabling for now
	}



	$('.game-controls button').on('click', function() {
		play($(this).attr("data-play"));
	});

	function play(p) {
		if (!isPlayer) return;
		if (!gameRunning) return;

		dbPlayer.update({
			play: p
		});
	}

	db.ref('players').on('child_changed', snap => {
		console.log('player changed', snap.val());
		var p = snap.val().play;

		if (snap.key === playerSlot) {
			playerPlay = p;
		} else {
			opponentPlay = p;
		}

		$('#game-icon-me').attr('src', 'assets/img/play-'+playerPlay+'.png');
		$('#game-play-me').text(pretty(playerPlay));

		if (!isPlayer || (playerPlay !== '' && opponentPlay !== '')) {
			$('#game-icon-you').attr('src', 'assets/img/play-'+opponentPlay+'.png');
			$('#game-play-you').text(pretty(opponentPlay));

			evaluateGame();
			setTimeout(newGame, 3000);

		} else {
			if (opponentPlay !== '') {
				$('#game-icon-you').attr('src', 'assets/img/play-ready.png');
				$('#game-play-you').text(pretty('ready'));

			} else {
				$('#game-icon-you').attr('src', 'assets/img/play-.png');
				$('#game-play-you').text(pretty('thinking'));

			}

		}

	});

	function pretty(str) {
		if (str === '') str = 'thinking';
		return (prettyDict[str] || str);
	}
	const prettyDict = {
		'rock': 'Rock',
		'paper': 'Paper',
		'scissors': 'Scissors',
		'ready': '• • •',
		'thinking': '• • •'
	};


	function evaluateGame() {
		console.log('GAME OVER', playerPlay, opponentPlay);
		if (playerPlay === '' || opponentPlay === '') {
			console.log('ERROR: called evaluateGame() without making both plays', playerPlay, opponentPlay);
		}

		gameRunning = false;

		if (playerPlay === opponentPlay) {
			status("It's a tie!", 'tie');

		} else if (beatsRules[playerPlay].includes(opponentPlay)) {
			status('You win!', 'win');
			if (isPlayer) {
				dbWins.child(username).transaction(current => {
					return (current || 0) + 1;
				});
			}

		} else {
			status('You lose.', 'lose');

		}
	}
	const beatsRules = {
		'rock': ['scissors'],
		'paper': ['rock'],
		'scissors': ['paper']
	}

	function newGame() {
		if (dbPlayer && dbOpponent) {
			dbPlayer.update({ play: '' });
			dbOpponent.update({ play: '' });
			gameRunning = true;
		}
	}



	dbWins.orderByKey().on('child_added', snap => {
		var entry = $('<li>', {id: 'wins-entry-'+snap.key})
		entry.text('' + snap.key + ': ');
		entry.append($('<span>', {class: 'wins-count', text: snap.val()}));
		$('#wins-list').prepend(entry);
	});

	dbWins.on('child_changed', snap => {
		var count = $('#wins-entry-'+snap.key).find('span');
		count.text(snap.val());
		flash(count);
	});



	dbChat.orderByChild('time').on('child_added', snap => {
		var message = snap.val();
		console.log('message', message);

		var item = $('<li class="chat-message">');
		item.text(message.text);

		var sender = $('<span>')
		sender.text(message.sender + ': ');
		sender.addClass('chat-sender');

		item.prepend(sender);

		$('#chat-log').prepend(item);

		flash(item);
	});

	dbChat.on('child_removed', snap => {
		$('#chat-log').empty();
		$('#chat-cleared').show();
	});

	$('#chat-form').on('submit', function(event) {
		event.preventDefault();

		var text = $('#chat-box').val();
		$('#chat-box').val('');

		if (text === '/clear') {
			dbChat.remove();
			return;
		}
		if (text === '/resetwins') {
			dbWins.remove();
			$('#wins-list').empty();
			return;
		}

		dbChat.push({
			time: Date.now(),
			sender: username,
			text: text
		});
	});





	startSignIn();
	// joinAs('player', 'Josh');

});