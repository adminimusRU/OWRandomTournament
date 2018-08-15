function export_lobby( format ) {
	var export_str = "";
	if ( format == "json" ) {
		var export_struct = {
			format_version: 3,
			players: lobby
			};
		export_str = JSON.stringify(export_struct, null, ' ');
	} else if ( format == "text" ) {
		for( i in lobby) {
			var player_id = lobby[i].id.trim().replace("-", "#");
			export_str += player_id + "\n";
		}
	} else if ( format == "csv" ) {
		export_str += "BattleTag,Name,SR,Level,Main class,Secondary class,Main hero,Last updated\n";
		for( i in lobby) {
			var player_id = lobby[i].id.trim().replace("-", "#");
			var main_class = "";
			if( lobby[i].top_classes[0] !== undefined ) main_class = lobby[i].top_classes[0];
			var secondary_class = "";
			if( lobby[i].top_classes[1] !== undefined ) secondary_class = lobby[i].top_classes[1];
			var main_hero = "";
			if( lobby[i].top_heroes[0] !== undefined ) main_hero = lobby[i].top_heroes[0].hero;
			var last_updated = lobby[i].last_updated.toISOString();
			
			export_str += player_id+","+lobby[i].display_name+","+lobby[i].sr
						+","+lobby[i].level+","+main_class+","+secondary_class+","+main_hero+","+last_updated+"\n";
		}
	}
	
	return export_str.trim();
}

function export_teams( format, include_players, include_sr, include_classes, include_captains, table_columns ) {
	var setup_str = "";
	
	if ( format == "text-list" ) {
		for ( var t in teams ) {
			setup_str += teams[t].name + "\n";
			if ( include_players ) {
				for ( var p in teams[t].players ) {
					var player_str = "";
					if ( include_sr ) {
						player_str += teams[t].players[p].sr + "\t";
					}
					player_str += teams[t].players[p].display_name;
					if ( include_captains ) {
						if ( teams[t].captain_index == p ) {
							player_str += " \u265B";
						}
					}
					if ( include_classes ) {
						if ( teams[t].players[p].top_classes[0] != undefined ) {
							player_str += "\t" + teams[t].players[p].top_classes[0];
						}
					}
					setup_str += player_str + "\n";
				}
				setup_str += "\n";
			}
		}
	} else if ( format == "html-table" ) {
		var title_colspan = 1;
		if ( include_players ) {
			if ( include_sr ) title_colspan++;
			if ( include_classes ) title_colspan++;
		}
		var _team_size = teams[0].players.length;
		
		setup_str += "<table>\n";
		
		for ( var row = 1; row <= Math.ceil(teams.length / table_columns); row++ ) {
			var team_offset = (row-1)*table_columns;
			// print titles
			setup_str += "<tr>";
			for ( var t = team_offset; t < team_offset+table_columns; t++ ) {
				if ( t >= teams.length ) break;
				setup_str += "<td colspan='"+title_colspan+"' style='text-align: center;font-style: italic;background-color: gray; color: white;'>";
				setup_str += escapeHtml( teams[t].name );
				setup_str += "</td>";
				// vertical spacer
				setup_str += "<td></td>";
			}
			setup_str += "</tr>\n";
			
			// print players
			if ( include_players ) {
				for ( var p = 0; p < _team_size; p++ ) {
					setup_str += "<tr>";
					for ( var t = team_offset; t < team_offset+table_columns; t++ ) {
						if ( t >= teams.length ) break;
						
						if ( include_sr ) {
							setup_str += "<td style='text-align: right'>";
							if ( p < teams[t].players.length ) {
								setup_str += teams[t].players[p].sr;
							}
							
							setup_str += "</td>";
						}
						setup_str += "<td style='text-align: left'>";
						if ( p < teams[t].players.length ) {
							setup_str += escapeHtml( teams[t].players[p].display_name );
							if ( include_captains ) {
								if ( teams[t].captain_index == p ) {
									setup_str += " \u265B";
								}
							}
						}
						setup_str += "</td>";
						if ( include_classes ) {
							setup_str += "<td style='text-align: left'>";
							if ( p < teams[t].players.length ) {
								if ( teams[t].players[p].top_classes[0] != undefined ) {
									var class_str = teams[t].players[p].top_classes[0];
									if (class_str == "support") class_str = "sup";
									setup_str += class_str;
								}
							}
							setup_str += "</td>";
						}
						// vertical spacer
						setup_str += "<td></td>";
					}
					setup_str += "</tr>\n";
				}
			}
			
			// horizontal spacer
			setup_str += "<tr></tr>";
		}
		
		setup_str += "</table>\n";
	}
	
	return setup_str.trim();
}

function import_lobby( format, import_str ) {
	//var import_str = document.getElementById("dlg_textarea").value;
	var added_players = [];
	var players_for_update = [];

	if (import_str == null || import_str == "") {
		return;
	}
	if ( format == "json" ) {
		try {
			// try to parse json
			var import_struct = JSON.parse(import_str);
			
			// check format
			if ( import_struct.format_version > 3 ) {
				//throw "Unsupported format version";
				throw new Error("Unsupported format version");
			}
			
			for( var i=0; i<import_struct.players.length; i++) {
				var imported_player = import_struct.players[i];
				
				// check duplicates
				if (find_player_by_id(imported_player.id) !== undefined ) {
					continue;
				}
				
				imported_player = sanitize_player_struct( imported_player, import_struct.format_version );
				
				//lobby.splice(lobby.length, 0, imported_player);
				added_players.push( imported_player );
			}
			
			//redraw_lobby();
			//save_players_list();
		}
		catch(err) {
			// try to parse as plain battletag list?
			alert("Incorrect import format: "+err.message);
			return false;
		}
	} else if( format == "text") {
		try {
			var battletag_list = import_str.trim().split("\n");
			for( i in battletag_list ) {
				// split string to fields (btag, SR, class, offclass)
				var fields = battletag_list[i].split(/[ \t.,;|]+/);
				
				// @ToDo check battletag format ?				
				var player_id = format_player_id(fields[0]);
				//var player_id = format_player_id( battletag_list[i] );
				// check duplicates
				if (find_player_by_id(player_id) !== undefined ) {
					continue;
				}
				var player_name = format_player_name( player_id );
				
				var new_player = create_empty_player();
				delete new_player.empty;
				new_player.id = player_id;
				new_player.display_name = player_name;
				
				// additional fields
				if ( fields.length >= 2 ) {
					new_player.sr = Number( fields[1] );
					if ( Number.isNaN(new_player.sr) ) {
						throw new Error("Incorrect SR number "+fields[1]);
					}
					if ( new_player.sr < 0 || new_player.sr > 5000 ) {
						throw new Error("Incorrect SR value "+fields[1]);
					}
					new_player.last_updated = new Date;
				}
				if ( fields.length >= 3 ) {
					for ( var c = 2; c < fields.length; c++ ) {
						if (class_names.indexOf(fields[c]) == -1) {
							//throw "Incorrect class name "+fields[c];
							throw new Error("Incorrect class name "+fields[c]);
						}
						new_player.top_classes.push( fields[c] );
					}
				}
				
				//lobby.push( new_player );
				if ( fields.length == 1 ) {
					players_for_update.push( new_player );
				}
				added_players.push( new_player );
			}
		} 
		catch(err) {
			alert("Incorrect import format: "+err.message);
			return false;
		}
		
		/*for( var p in added_players ) {
			lobby.push( added_players[p] );
		}*/
		
		//redraw_lobby();
		//save_players_list();
		
		// get stats for added players
		if (players_for_update.length > 0) {
			StatsUpdater.addToQueue( players_for_update );
		}
	} else {
		alert("Unknown import format: "+format);
		return false;
	}
	
	for( var p in added_players ) {
		lobby.push( added_players[p] );
	}
		
	redraw_lobby();
	save_players_list();
	
	// highlight all new players and scroll to show last one
	if (added_players.length > 0) {
		setTimeout( function() {document.getElementById( added_players[added_players.length-1].id ).scrollIntoView(false);}, 100 );
		setTimeout( function() {highlight_players( added_players );}, 500 );
	}
	return true;
}

function restore_saved_teams() {
	var saved_format = localStorage.getItem("saved_format");
	if ( saved_format === null ) {
		saved_format = 1;
	}
	
	var saved_players_json = localStorage.getItem("lobby");
	if ( saved_players_json != null ) {
		var saved_team = JSON.parse(saved_players_json);
		for ( var i in saved_team ) {
			lobby.push( sanitize_player_struct(saved_team[i], saved_format) );
		}
	}
	
	var saved_team_setup_json = localStorage.getItem("team_setup");
	if ( saved_team_setup_json != null ) {
		var saved_team_setup = JSON.parse(saved_team_setup_json);
		for ( var t in saved_team_setup ) {
			var new_team = create_empty_team();
			new_team.name = saved_team_setup[t].name;
			new_team.captain_index = saved_team_setup[t].captain_index;
			if ( new_team.captain_index === undefined ) {
				new_team.captain_index = -1;
			}
			for ( var i in saved_team_setup[t].players ) {
				new_team.players.push( sanitize_player_struct(saved_team_setup[t].players[i], saved_format) );
			}
			teams.push( new_team );
		}
	}
	
	// draw teams
	redraw_lobby();
	redraw_teams();
}

function sanitize_player_struct( player_struct, saved_format ) {	
	if ( ! Array.isArray(player_struct.top_classes) ) {
		player_struct.top_classes = [];
	}
	if ( ! Array.isArray(player_struct.top_heroes) ) {
		player_struct.top_heroes = [];
	}
	
	if ( saved_format == 1 ) {
		// delete deprecated fields, add new fields
		delete player_struct.current_sr;
		delete player_struct.max_sr;
		
		// convert offence and defence classes to dps
		if( (player_struct.top_classes[0] == "offence") || (player_struct.top_classes[0] == "defence") ) {
			player_struct.top_classes[0] = "dps";
		}
		if( (player_struct.top_classes[1] == "offence") || (player_struct.top_classes[1] == "defence") ) {
			player_struct.top_classes[1] = "dps";
		}
		if( (player_struct.top_classes[0] == "dps") && (player_struct.top_classes[1] == "dps") ) {
			player_struct.top_classes.pop();
		}
	}
	
	if ( saved_format <= 2 ) {
		player_struct.last_updated = new Date(0);
	}
	
	if ( saved_format >= 3 ) {
		// restore dates from strings
		if ( player_struct.last_updated !== undefined ) {
			player_struct.last_updated = new Date(player_struct.last_updated);
		} else {
			player_struct.last_updated = new Date(0);
		}
	}
	
	
	return player_struct;
}

function save_players_list() {
	// store players to browser local storage
	localStorage.setItem("lobby", JSON.stringify(lobby));
	localStorage.setItem("team_setup", JSON.stringify(teams));
	localStorage.setItem("saved_format", 3);
}
