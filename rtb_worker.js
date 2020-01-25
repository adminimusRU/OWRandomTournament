importScripts("ow_defines.js");
importScripts("common.js");
importScripts("random_team_builder.js");

// hint: for debugging worker in firefox (>68) set privacy.file_unique_origin = false in about:config

onmessage = function(e) {
	if ( ! Array.isArray(e.data) ) {
		return;
	}
	if ( e.data.length == 0 ) {
		return;
	}
	
	var event_type = e.data[0];
	if ( event_type == "init" ) {
		if (e.data.length < 2) {
			return;
		}
		var settings_struct = e.data[1];
		for (var setting_name in settings_struct ) {
			if ( RandomTeamBuilder.hasOwnProperty(setting_name) ) {
				RandomTeamBuilder[setting_name] = settings_struct[setting_name];
			}
		}
	} else if ( event_type == "roll" ) {
		if (e.data.length < 2) {
			return;
		}
		var lobby_struct = e.data[1];
		RandomTeamBuilder.players = lobby_struct;
		RandomTeamBuilder.teams = [];
		
		RandomTeamBuilder.onProgressChange = on_team_roll_progress;
		RandomTeamBuilder.onDebugMessage = on_team_roll_debug;
		
		RandomTeamBuilder.rollTeams();
		
		var result_struct = {
			teams: RandomTeamBuilder.teams,
			players: RandomTeamBuilder.players,
		}
		postMessage(["finish", result_struct]);
		
		close();
	}
}

function on_team_roll_progress( current_progress ) {
	var progress_struct = {
		current_progress: current_progress,
	}
	postMessage(["progress", progress_struct]);
}

function on_team_roll_debug( debug_msg ) {
	postMessage(["dbg", debug_msg]);
}
