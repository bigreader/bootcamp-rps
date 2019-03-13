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



$(document).ready(function() {


	$('#btn-spectate').on('click', function() {
		joinAs('spectator');
	});

	$('#btn-join').on('click', function() {
		joinAs('player');
	});

	$('#btn-signout').on('click', function() {
		$('#signin').modal();
	})

	function joinAs(role) {
		username = $('#name-field').val().trim();
		$('#signin').modal('hide');

		if (username === "") username = "Anonymous";

		if (role === 'player') {
			$('#name-display').text("Welcome, " + username);
			$('#game').removeClass('spectator');
		} else {
			$('#name-display').text("Spectating as " + username);
			$('#game').addClass('spectator');
		}
	}





	// $('#signin').modal();

});