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

var username = '';           // our name
var isPlayer = false;        // player or spectator?
var playerSlot;              // one or two
var dbPlayer;                // ref to our player in firebase
var dbOpponent;              // ref to our opponent in firebase
var dbSpectator;             // ref to our spectator entry in firebase
var playerPlay = '';         // what we've played this round
var opponentPlay = '';       // what the opponent has played
var gameRunning = false;     // can we play anything right now?

$(document).ready(function() {


	// SIGN IN

	$('#btn-signout').on('click', function() {
		startSignIn();
	});

	function startSignIn() {
		// remove our previous player
		if (dbSpectator) {
			dbSpectator.remove()
		} else if (dbPlayer) {
			dbPlayer.remove();
		}

		updatePlayers();

		// set up modal dialog
		$('#modal-info-line').removeClass('text-danger').addClass('text-muted');
		$('#modal-info-line').text('');
		dbSpectators.once('value', data => {
			if (data.numChildren() === 0) return;
			$('#modal-info-line').text(data.numChildren() + ' spectating');
		});
		
		$('#signin').modal(); // present
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

	// join the server as player or spectator
	function joinAs(role, nameOverride) {
		isPlayer = (role === 'player');

		// set our username
		username = $('#name-field').val().trim();
		if (username === '') username = 'Anonymous';
		if (nameOverride) username = nameOverride;

		if (isPlayer) {
			// get current players
			db.ref('players').once('value', data => {
				if (data.numChildren() > 1) { // check if we're full
					$('#modal-info-line').text('Game full! Join as a spectator or wait for a player to leave.');
					$('#modal-info-line').addClass('text-danger').removeClass('text-muted');
					return;
				}

				playerSlot = (data.hasChild('one'))? 'two':'one'; // find open slot
				dbPlayer = db.ref('players/'+playerSlot)
				dbPlayer.set({ // register our player
					name: username,
					play: ''
				});
				dbPlayer.onDisconnect().remove(); // delete our player when we dc

				// update ui
				$('#name-display').text("Welcome, " + username);
				$('#game').removeClass('spectator');

				$('#signin').modal('hide'); // hide modal

				// all of this is in the callback from firebase
				// this allows us to block joining as a player if the server is full
			});

		} else {
			dbSpectator = dbSpectators.push({ // register as spectator
				name: username
			})
			dbSpectator.onDisconnect().remove(); // delete when we dc

			// pick a side to pretend to be when we get game updates
			// makes things simpler later on to just assume we're a player in the game
			playerSlot = 'one';

			// reset our player references now that we know we're not in the game
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


	// PLAYER MANAGEMENT

	// listen for players joining
	db.ref('players').on('child_added', snap => {
		if (snap.key !== playerSlot) { // found our opponent
			dbOpponent = snap.ref;
			status(snap.val().name + ' joined the game.', 'join');
		} else { // that's us
			dbPlayer = snap.ref;
		}
		console.log("player added", snap.val(), snap.key, playerSlot, dbPlayer, dbOpponent);

		// this just fires child_changed manually, makes things easier
		snap.ref.update({ added: true });

		updatePlayers();
		newGame();
	});

	// listen for players leaving
	db.ref('players').on('child_removed', snap => {
		if (snap.key !== playerSlot) { // bye opponent
			dbOpponent = null;
			status(snap.val().name + ' left the game.', 'join');
		} else {
			// if we're still open to run this, we must have lost socket connection
			// let's just finish the signout process and offer to sign in again
			dbPlayer = null;
			startSignIn();
		}
		console.log("player removed", snap.val(), snap.key);

		updatePlayers();
		newGame();
	});

	// set our player names in the header
	function updatePlayers() {
		updateName(dbPlayer, 'me');
		updateName(dbOpponent, 'you');
	}

	// carefully get the username from a player and display it on one side of the game
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

	// utility to set status line and icon quickly
	function status(str, icon) {
		$('#game-status').text(str);
		$('#game-result-icon').attr('src', 'assets/img/result-'+icon+'.png');
		flash($('.game-output'));
	}

	// activate css animation to flash blue behind updated elements
	function flash(element) {
		// $(element).removeClass('new').delay(100).addClass('new');
		// this wasn’t working well, disabling for now
	}


	// GAMEPLAY

	$('.game-controls button').on('click', function() {
		play($(this).attr("data-play"));
	});

	function play(p) {
		if (!isPlayer) return; // spectators can't play
		if (!gameRunning) return; // no changing your choice once the game is evaluated

		dbPlayer.update({
			play: p
		});
	}

	db.ref('players').on('child_changed', snap => {
		console.log('player changed', snap.val());
		var p = snap.val().play;

		if (snap.key === playerSlot) { // save the new play locally
			playerPlay = p;
		} else {
			opponentPlay = p;
		}

		// always show what we've picked
		$('#game-icon-me').attr('src', 'assets/img/play-'+playerPlay+'.png');
		$('#game-play-me').text(pretty(playerPlay));

		if (!isPlayer || (playerPlay !== '' && opponentPlay !== '')) {
			// either both players have played or we're a spectator
			// reveal the other player's choice
			$('#game-icon-you').attr('src', 'assets/img/play-'+opponentPlay+'.png');
			$('#game-play-you').text(pretty(opponentPlay));

			if (isPlayer) { // spectators can only watch
				evaluateGame();
				setTimeout(newGame, 3000);
			}

		} else {
			// someone still hasn't played
			if (opponentPlay !== '') { // opponent is ready, let's show that
				$('#game-icon-you').attr('src', 'assets/img/play-ready.png');
				$('#game-play-you').text(pretty('ready'));

			} else { // opponent is still thinking
				$('#game-icon-you').attr('src', 'assets/img/play-.png');
				$('#game-play-you').text(pretty('thinking'));

			}

		}

	});

	// quick way to prettify strings straight from the database/logic
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

	// both players have played, time to end the round
	function evaluateGame() {
		console.log('GAME OVER', playerPlay, opponentPlay);
		if (playerPlay === '' || opponentPlay === '') {
			console.log('ERROR: called evaluateGame() without making both plays', playerPlay, opponentPlay);
		}

		gameRunning = false; // stop those darn players from pressing buttons

		if (playerPlay === opponentPlay) {
			status("It's a tie!", 'tie');

		} else if (beatsRules[playerPlay].includes(opponentPlay)) { // see below
			status('You win!', 'win');
			if (isPlayer) { // add our win to the record books (not you, spectator)
				dbWins.child(username).transaction(current => {
					return (current || 0) + 1; // transaction isn't _necessary_ but it's nice
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
	// this object defines the rules of the game - each key holds an array of plays it beats
	// since any rps-style game is just a directed graph, you can modify these rules here to add new things
	// there's no ui support for that of course, but it's a convenient way to hold all of this info anyway

	// wipe players' plays and start again
	function newGame() {
		if (dbPlayer && dbOpponent) {
			dbPlayer.update({ play: '' });
			dbOpponent.update({ play: '' });
			gameRunning = true; // allow players to play, very important
		}
	}


  // WIN COUNTING

  // listen for players added to the record books
	dbWins.orderByKey().on('child_added', snap => {
		var entry = $('<li>', {id: 'wins-entry-'+snap.key});
		entry.text('' + snap.key + ': ');
		entry.append($('<span>', {class: 'wins-count', text: snap.val()}));
		$('#wins-list').prepend(entry);
	});

	// listen for updates to players
	dbWins.on('child_changed', snap => {
		var count = $('#wins-entry-'+snap.key).find('span');
		count.text(snap.val());
		flash(count);
	});


	// CHAT

	// listen for chat messages
	dbChat.orderByChild('time').on('child_added', snap => {
		var message = snap.val();
		console.log('message', message);

		var item = $('<li class="chat-message">');
		item.text(message.text);

		var sender = $('<span>');
		sender.text(message.sender + ': ');
		sender.addClass('chat-sender');

		item.prepend(sender);

		$('#chat-log').prepend(item);

		flash(item);
	});

	// listen for chat clear
	dbChat.on('child_removed', snap => {
		$('#chat-log').empty();
		$('#chat-cleared').show();
	});

	// send chat messages
	$('#chat-form').on('submit', function(event) {
		event.preventDefault();

		var text = $('#chat-box').val();
		$('#chat-box').val('');

		// some special commands to clean up the database if needed
		if (text === '/clear') {
			dbChat.remove();
			return;
		}
		if (text === '/reset wins') {
			dbWins.remove();
			$('#wins-list').empty();
			return;
		}
		if (text === '/reset players') {
			db.ref('players').remove();
			db.ref('spectators').remove();
			return;
		}
		if (text === '/reset everything') {
			db.ref().remove();
			return;
		}

		// send a message!
		dbChat.push({
			time: Date.now(),
			sender: username,
			text: text
		});
	});





	startSignIn();
	// joinAs('player', 'Josh');

});