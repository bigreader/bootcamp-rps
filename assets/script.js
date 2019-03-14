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

const pretty = {
	'rock': 'Rock',
	'paper': 'Paper',
	'scissors': 'Scissors'
};

var username = "";
var isPlayer = false;
var playerSlot;
var dbPlayer;
var dbOpponent;
var dbSpectator;


$(document).ready(function() {

	$('#btn-signout').on('click', function() {
		startSignIn();
	});

	function startSignIn() {
		if (dbPlayer) dbPlayer.remove();
		if (dbSpectator) dbSpectator.remove();

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
			}).onDisconnect().remove();

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
			$('#game-status').text(snap.val().name + ' joined the game.');
		} else {
			dbPlayer = snap.ref;
		}
		console.log("player added", snap.val(), snap.key, playerSlot, dbPlayer, dbOpponent);

		updatePlayers();
	});

	db.ref('players').on('child_removed', snap => {
		if (snap.key !== playerSlot) {
			dbOpponent = null;
			$('#game-status').text(snap.val().name + ' left the game.');
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
	}

	function updateName(ref, side) {
		var element = $('#game-name-' + side);
		if (!ref) {
			element.text("—");
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



	$('.game-controls button').on('click', function() {
		play($(this).attr("data-play"));
	});

	function play(p) {
		if (!isPlayer) return;

		dbPlayer.update({
			play: p
		});
	}

	db.ref('players').on('child_changed', snap => {
		console.log('player changed', snap.val());
		var p = snap.val().play;

		if (snap.key === playerSlot) {
			$('#game-icon-me').attr('src', 'assets/img/play-'+p+'.png');
			$('#game-play-me').text(pretty[p]);
		} else {
			$('#game-icon-you').attr('src', 'assets/img/play-'+p+'.png');
			$('#game-play-you').text(pretty[p]);
		}

	});







	startSignIn();
	// joinAs('player', 'Josh');

});