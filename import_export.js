function current_format_version() {
	return 7;
}

function export_captains() {
	var export_str = "";
	for( i in lobby) {
		if (lobby[i].captain) {
			export_str += lobby[i].id.trim().replace("-", "#")+"\n";
		}
	}
	return export_str.trim();
}

function export_lobby( format ) {
	var export_str = "";
	if ( format == "json" ) {
		var export_struct = {
			format_version: current_format_version(),
			players: lobby
			};
		export_str = JSON.stringify(export_struct, null, ' ');
	} else if ( format == "text" ) {
		for( i in lobby) {
			var player_id = lobby[i].id.trim().replace("-", "#");
			export_str += player_id + "\n";
		}
	} else if ( format == "csv" ) {
		var fields = [];
		
		// header row
		fields.push("BattleTag");
		fields.push("Twitch_name");
		fields.push("SR");
		fields.push("Main_class");
		fields.push("Secondary_class");
		fields.push("Main_hero");
		fields.push("Captain");
		fields.push("Display_Name");
		fields.push("Level");
		fields.push("Last_updated");
		
		export_str += fields.join(",") + "\n";
		
		for( i in lobby) {
			var player_id = lobby[i].id.trim().replace("-", "#");
			var main_class = "";
			if( lobby[i].top_classes[0] !== undefined ) main_class = lobby[i].top_classes[0];
			var secondary_class = "";
			if( lobby[i].top_classes[1] !== undefined ) secondary_class = lobby[i].top_classes[1];
			var main_hero = "";
			if( lobby[i].top_heroes[0] !== undefined ) main_hero = lobby[i].top_heroes[0].hero;
			var last_updated = lobby[i].last_updated.toISOString();
			
			fields = [];
			fields.push(player_id);
			fields.push(lobby[i].twitch_name);
			fields.push(lobby[i].sr);
			fields.push(main_class);
			fields.push(secondary_class);
			fields.push(main_hero);
			fields.push(lobby[i].captain);
			fields.push(lobby[i].display_name);
			fields.push(lobby[i].level);
			fields.push(last_updated);
			
			export_str += fields.join(",") + "\n";
		}
	}
	
	return export_str.trim();
}

function export_teams( format, include_players, include_sr, include_classes, include_captains, table_columns, name_field ) {
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
					
					var player_name = player_name = teams[t].players[p][name_field];
					if ( name_field == "id" ) {
						player_name = player_name.replace("-", "#");
					}
					player_str += player_name;
					
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
		setup_str = export_teams_html( format, include_players, include_sr, include_classes, include_captains, table_columns, name_field, false );
	} else if ( format == "image" ) {
		setup_str = export_teams_html( format, include_players, include_sr, include_classes, include_captains, table_columns, name_field, true );
	}
	
	return setup_str.trim();
}

function export_teams_html( format, include_players, include_sr, include_classes, include_captains, table_columns, name_field, draw_icons ) {
	var setup_str = "";
	
	var title_colspan = 1;
	if ( include_players ) {
		if ( include_sr ) title_colspan++;
		if ( include_classes ) title_colspan++;
	}
	var _team_size = Settings.team_size;
	
	setup_str += "<table style='border-collapse: collapse; background-color: white;'>\n";
	
	for ( var row = 1; row <= Math.ceil(teams.length / table_columns); row++ ) {
		var team_offset = (row-1)*table_columns;
		// print titles
		setup_str += "<tr>";
		for ( var t = team_offset; t < team_offset+table_columns; t++ ) {
			if ( t >= teams.length ) break;
			setup_str += "<td colspan='"+title_colspan+
				"' style='text-align: center;background-color: gray; color: white; border: 1px solid gray;'>";
			setup_str += escapeHtml( teams[t].name );
			setup_str += "</td>";
			// vertical spacer
			setup_str += "<td style='width: 1em;'></td>";
		}
		setup_str += "</tr>\n";
		
		// print players
		if ( include_players ) {
			for ( var p = 0; p < _team_size; p++ ) {
				setup_str += "<tr>";
				for ( var t = team_offset; t < team_offset+table_columns; t++ ) {
					if ( t >= teams.length ) break;
					
					if ( include_sr ) {
						setup_str += "<td style='text-align: right; padding-right: 0.5em; border-bottom: 1px solid gray;border-left: 1px solid gray;'>";
						if ( p < teams[t].players.length ) {
							if (draw_icons) {
								var rank_name = get_rank_name(teams[t].players[p].sr);
								setup_str += "<img src='"+rank_icons_datauri[rank_name]+"'/>";
							} else {
								setup_str += teams[t].players[p].sr;
							}
						}
						
						setup_str += "</td>";
					}
					
					var borders = "border-bottom: 1px solid gray;";
					if ( ! include_sr ) {
						borders += "border-left: 1px solid gray;";
					}
					if ( ! include_classes ) {
						borders += "border-right: 1px solid gray;";
					}
					setup_str += "<td style='text-align: left; padding: 0.2em; white-space: nowrap; "+borders+"'>";
					if ( p < teams[t].players.length ) {
						var player_name = player_name = teams[t].players[p][name_field];
						if ( name_field == "id" ) {
							player_name = player_name.replace("-", "#");
						}
						setup_str += escapeHtml( player_name );
						
						if ( include_captains ) {
							if ( teams[t].captain_index == p ) {
								if (draw_icons) {
									setup_str += "<span style='color: green;'> \u265B</span>";
								} else {
									setup_str += " \u265B";
								}
							}
						}
					}
					setup_str += "</td>";
					
					if ( include_classes ) {
						setup_str += "<td style='text-align: left; border-bottom: 1px solid gray; border-right: 1px solid gray;'>";
						if ( p < teams[t].players.length ) {
							if ( teams[t].players[p].top_classes[0] != undefined ) {
								var class_name = teams[t].players[p].top_classes[0];
								if (draw_icons) {
									var class_str = "<img style='filter: opacity(60%);' src='"+class_icons_datauri[class_name]+"'/>";
								} else {
									var class_str = class_name;
									if (class_str == "support") class_str = "sup";
								}
								
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
		setup_str += "<tr style='height: 1em;'></tr>";
	}
	
	setup_str += "</table>\n";
	
	return setup_str;
}

function import_captains( import_str ) {
	if (import_str == null || import_str == "") {
		return;
	}
	
	try {
		var battletag_list = import_str.trim().split("\n");
		for( i in battletag_list ) {
			// check battletag format
			if ( /^[^#]+[-#]\d+$/.test(battletag_list[i]) == false ) {
				throw new Error("Incorrect battletag "+battletag_list[i]);
			}
			
			var player_id = format_player_id(battletag_list[i]);
			var player_struct = find_player_by_id(player_id);
			if (player_struct == undefined) {
				continue;
			}
			
			player_struct.captain = true;
		}
	} catch(err) {
		alert("Incorrect import format: "+err.message);
		return false;
	}
	
	redraw_lobby();
	save_players_list();
	
	return true;
}

function import_checkin( import_str ) {
	if (import_str == null || import_str == "") {
		return;
	}
		
	var battletag_list = import_str.trim().split("\n");
	for( i in battletag_list ) {
		var player_id = undefined;
		// check battletag format
		if ( /^[^#]+[-#]\d+$/.test(battletag_list[i]) ) {
			// assume battletag
			player_id = format_player_id(battletag_list[i]);
		} else {
			// assume twitch nicknames
			for( p in lobby) {
				if ( lobby[p].twitch_name == battletag_list[i] ){
					player_id = lobby[p].id;
					break;
				}
			}
		}
		
		if (player_id == undefined) {
			continue;
		}
		
		if ( checkin_list.indexOf(player_id) == -1 ) {
			checkin_list.push(player_id);
		};
	}
	
	save_checkin_list();
	
	return true;
}

function import_lobby( format, import_str ) {
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
			if ( import_struct.format_version > current_format_version() ) {
				throw new Error("Unsupported format version");
			}
			
			var order_base = get_new_player_order();
			
			for( var i=0; i<import_struct.players.length; i++) {
				var imported_player = import_struct.players[i];
				
				// check duplicates
				if (find_player_by_id(imported_player.id) !== undefined ) {
					continue;
				}
				
				imported_player = sanitize_player_struct( imported_player, import_struct.format_version );
				
				if ( imported_player.order <= 0 ) {
					order_base++;
				}
				imported_player.order += order_base;
				
				added_players.push( imported_player );
			}
		}
		catch(err) {
			// try to parse as plain battletag list?
			alert("Incorrect import format: "+err.message);
			return false;
		}
	} else if( format == "text") {
		var order_base = get_new_player_order();
		try {
			var battletag_list = import_str.trim().split("\n");
			for( i in battletag_list ) {
				// split string to fields (btag, twitch, SR, class, offclass)
				var fields = battletag_list[i].split(/[ \t.,;|]/);
				
				// check battletag format
				if ( /^[^#]+[-#]\d+$/.test(fields[0]) == false ) {
					throw new Error("Incorrect battletag "+fields[0]);
				}
				
				var player_id = format_player_id(fields[0]);

				// check duplicates
				if (find_player_by_id(player_id) !== undefined ) {
					continue;
				}
				var player_name = format_player_name( player_id );
				
				var new_player = create_empty_player();
				delete new_player.empty;
				new_player.id = player_id;
				new_player.display_name = player_name;
				
				new_player.order = order_base;
				order_base++;
				
				// additional fields
				if ( fields.length >= 2 ) {
					new_player.twitch_name = ( fields[1] );
				}
				if ( fields.length >= 3 ) {
					new_player.sr = Number( fields[2] );
					if ( Number.isNaN(new_player.sr) ) {
						throw new Error("Incorrect SR number '"+fields[2]+"' on row #"+String(Number(i)+1));
					}
					if ( new_player.sr < 0 || new_player.sr > 5000 ) {
						throw new Error("Incorrect SR value '"+fields[2]+"' on row #"+String(Number(i)+1));
					}
					new_player.last_updated = new Date;
				}
				if ( fields.length >= 4 ) {
					for ( var c = 3; c < Math.min(fields.length, 5); c++ ) {
						if (fields[c] == "") continue;
						if (class_names.indexOf(fields[c]) == -1) {
							throw new Error("Incorrect class name '"+fields[c]+"' on row #"+String(Number(i)+1));
						}
						new_player.top_classes.push( fields[c] );
					}
				}
				
				if ( fields.length < 3 ) {
					players_for_update.push( new_player );
				}
				added_players.push( new_player );
			}
		} 
		catch(err) {
			alert("Incorrect import format: "+err.message);
			return false;
		}
		
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

function prepare_datauri_icons() {
	for ( var c in class_names ) {
		var image = new Image();
		image.class_name = class_names[c];

		image.onload = function () {
			var img_size_px = 20;
			
			// downscale in 3 steps to get better quality with offscreen canvas
			var oc = document.createElement('canvas');
			var octx = oc.getContext('2d');
			oc.width = this.width  * 0.5;
			oc.height = this.height * 0.5;
			octx.drawImage(this, 0, 0, oc.width, oc.height);
			
			var oc2 = document.createElement('canvas');
			var octx2 = oc2.getContext('2d');
			oc2.width = oc.width  * 0.5;
			oc2.height = oc.height * 0.5;
			octx2.drawImage(oc, 0, 0, oc.width * 0.5, oc.height * 0.5);

			var oc3 = document.createElement('canvas');
			var octx3 = oc3.getContext('2d');
			oc3.width = img_size_px;
			oc3.height = img_size_px;
			octx3.drawImage(oc2, 0, 0, img_size_px, img_size_px);
			
			class_icons_datauri[this.class_name] = oc3.toDataURL('image/png');
		};

		image.src = "class_icons/"+class_names[c]+".png";
	}
	
	for ( var rank_name in ow_ranks ) {
		var image = new Image();
		image.rank_name = rank_name;

		image.onload = function () {
			var img_size_px = 20;
			
			// downscale in 3 steps to get better quality with offscreen canvas
			var oc = document.createElement('canvas');
			var octx = oc.getContext('2d');
			oc.width = this.width  * 0.5;
			oc.height = this.height * 0.5;
			octx.drawImage(this, 0, 0, oc.width, oc.height);
			
			var oc2 = document.createElement('canvas');
			var octx2 = oc2.getContext('2d');
			oc2.width = oc.width  * 0.5;
			oc2.height = oc.height * 0.5;
			octx2.drawImage(oc, 0, 0, oc.width * 0.5, oc.height * 0.5);

			var oc3 = document.createElement('canvas');
			var octx3 = oc3.getContext('2d');
			oc3.width = img_size_px;
			oc3.height = img_size_px;
			octx3.drawImage(oc2, 0, 0, img_size_px, img_size_px);
			
			rank_icons_datauri[this.rank_name] = oc3.toDataURL('image/png');
		};

		image.src = get_rank_icon_src(rank_name);
	}
}

function restore_checkin_list() {
	var saved_checkin_json = localStorage.getItem( storage_prefix+"checkin" );
	if ( saved_checkin_json != null ) {
		var saved_checkin = JSON.parse(saved_checkin_json);
		
		// restore only existing players
		for ( var i in saved_checkin ) {
			if ( find_player_by_id(saved_checkin[i]) !== undefined ) {
				checkin_list.push(saved_checkin[i]);
			}
		}
	}
}

function restore_saved_teams() {
	var saved_format = localStorage.getItem( storage_prefix+"saved_format" );
	if ( saved_format === null ) {
		saved_format = 1;
	}
	
	var saved_players_json = localStorage.getItem( storage_prefix+"lobby" );
	var order = 1;
	if ( saved_players_json != null ) {
		var saved_team = JSON.parse(saved_players_json);
		for ( var i in saved_team ) {
			var player_struct = sanitize_player_struct(saved_team[i], saved_format);
			if ( player_struct.order <= 0 ) {
				player_struct.order = order;
				order++;
			}
			lobby.push( player_struct );
		}
	}
	
	var saved_team_setup_json = localStorage.getItem( storage_prefix+"team_setup" );
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
				var player_struct = sanitize_player_struct(saved_team_setup[t].players[i], saved_format);
					if ( player_struct.order <= 0 ) {
					player_struct.order = order;
					order++;
				}
				new_team.players.push( player_struct );
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
	}
	
	if ( saved_format <= 2 ) {
		player_struct.last_updated = new Date(0);
	}
	
	if ( saved_format <= 3 ) {
		player_struct.captain = false;
	}
	
	if ( saved_format <= 4 ) {
		player_struct.order = 0;
	}
	
	if ( saved_format <= 5 ) {
		player_struct.twitch_name = "";
	}
	
	if ( saved_format <= 6 ) {
		// convert tank to offtank
		if( player_struct.top_classes[0] == "tank" ) {
			player_struct.top_classes[0] = "offtank";
		}
		if( player_struct.top_classes[1] == "tank" ) {
			player_struct.top_classes[1] = "offtank";
		}
	}
	
	if ( saved_format >= 3 ) {
		// restore dates from strings
		if ( player_struct.last_updated !== undefined ) {
			player_struct.last_updated = new Date(player_struct.last_updated);
		} else {
			player_struct.last_updated = new Date(0);
		}
	}
	
	// class duplicates
	if( player_struct.top_classes[0] === player_struct.top_classes[1] ) {
		player_struct.top_classes.pop();
	}
	
	return player_struct;
}

function save_checkin_list() {
	localStorage.setItem(storage_prefix+"checkin", JSON.stringify(checkin_list));
}

function save_players_list() {
	// store players to browser local storage
	localStorage.setItem(storage_prefix+"lobby", JSON.stringify(lobby));
	localStorage.setItem(storage_prefix+"team_setup", JSON.stringify(teams));
	localStorage.setItem(storage_prefix+"saved_format", current_format_version());
}
