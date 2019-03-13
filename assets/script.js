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

var username = "";
var isPlayer;
var dbPlayer;


$(document).ready(function() {

	$('#btn-signout').on('click', function() {
		if (dbPlayer) dbPlayer.remove();
		$('#signin').modal();
	});


	$('#btn-spectate').on('click', function() {
		joinAs('spectator');
	});

	$('#btn-join').on('click', function() {
		joinAs('player');
	});

	function joinAs(role) {
		isPlayer = (role === 'player');

		username = $('#name-field').val().trim();
		if (username === "") username = "Anonymous";

		$('#signin').modal('hide');


		if (isPlayer) {
			$('#name-display').text("Welcome, " + username);
			$('#game').removeClass('spectator');

			dbPlayer = db.ref('/players/').push({
				name: username,
				play: ""
			});
			dbPlayer.onDisconnect().remove();
		} else {
			$('#name-display').text("Spectating as " + username);
			$('#game').addClass('spectator');

			dbPlayer = db.ref('/spectators/').push({
				name: username
			});
			dbPlayer.onDisconnect().remove();
		}
	}


	$('.game-controls button').on('click', function() {
		play($(this).attr("data-play"));
		console.log(this);
	})

	function play(p) {
		if (!isPlayer) return;

		console.log('playing…', p)

		dbPlayer.set({
			name: username,
			play: p
		});
	}





	// $('#signin').modal();

});