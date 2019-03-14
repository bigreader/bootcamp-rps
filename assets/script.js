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

var username = "";
var isPlayer = false;
var dbPlayer;
var dbOpponent;


$(document).ready(function() {

	$('#btn-signout').on('click', function() {
		startSignIn();
	});

	function startSignIn() {
		if (dbPlayer) dbPlayer.remove();

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

				var slot = (data.hasChild('one'))? 'two':'one';
				dbPlayer = db.ref('players/'+slot)
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
			dbPlayer = dbSpectators.push({
				name: username
			});
			dbPlayer.onDisconnect().remove();

			$('#name-display').text('Spectating as ' + username);
			$('#game').addClass('spectator');

			$('#signin').modal('hide');

		}

	}


	$('.game-controls button').on('click', function() {
		play($(this).attr("data-play"));
	})

	function play(p) {
		console.log('playing…', p, isPlayer);
		if (!isPlayer) return;

		dbPlayer.update({
			play: p
		});

		$('#game-icon-me').attr('src', 'assets/img/play-'+p+'.png');
		$('#game-play-me').text(p);
	}


	db.ref('players').on('child_added', snap => {
		var player = snap.val();
		console.log("player added", player, snap.key);
	});





	startSignIn();
	// joinAs('player', 'Josh');

});