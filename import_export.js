function current_format_version() {
	return 9;
	// format version history:
	// 2: removed 'current_sr', 'max_sr fields'. Offence and defence class merged to dps;
	// 3: added 'last_updated' field ( stats last updated Date ) [Date];
	// starting with v4 not compatible with tournament balancer
	// 4: added 'captain' field (predefined captain mark) [Boolean];
	// 5: added 'order' field (order of addition) [Number];
	// 6: added 'twitch_name' field [String];
	// 7: tank role splitted to maintank and offtank. Tank converted to offtank by default;
	// 8: added 'le' field (level manually edited) [Boolean];
	// 9: removed sr fields, added sr_by_class [struct] and playtime_by_class [struct]; top_classes renamed to classes; main and offtank classes merged back to 'tank'
	
	// added optional 'format_type' field to header to distinguish customs and tournament balancer formats
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
			format_type: "tournament",
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
		fields.push("Tank SR");
		fields.push("DPS SR");
		fields.push("Support SR");
		fields.push("Main_class");
		fields.push("Secondary_class");
		fields.push("Third_class");
		fields.push("Main_class");
		fields.push("Main_hero");
		fields.push("Captain");
		fields.push("Display_Name");
		fields.push("Level");
		fields.push("Last_updated");
		
		export_str += fields.join(",") + "\n";
		
		for( i in lobby) {
			var player_id = lobby[i].id.trim().replace("-", "#");
			
			var main_class = "";
			if( lobby[i].classes[0] !== undefined ) main_class = lobby[i].classes[0];
			var second_class = "";
			if( lobby[i].classes[1] !== undefined ) second_class = lobby[i].classes[1];
			var third_class = "";
			if( lobby[i].classes[2] !== undefined ) third_class = lobby[i].classes[2];
			
			var main_hero = "";
			if( lobby[i].top_heroes[0] !== undefined ) main_hero = lobby[i].top_heroes[0].hero;
			var last_updated = lobby[i].last_updated.toISOString();
			var sr_tank = is_undefined( lobby[i].sr_by_class["tank"], 0);
			var sr_dps = is_undefined(lobby[i].sr_by_class["dps"], 0);
			var sr_support = is_undefined(lobby[i].sr_by_class["support"], 0);
			
			fields = [];
			fields.push(player_id);
			fields.push(lobby[i].twitch_name);
			fields.push(sr_tank);
			fields.push(sr_dps);
			fields.push(sr_support);
			fields.push(main_class);
			fields.push(second_class);
			fields.push(third_class);
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
				for( var class_name in teams[t].slots ) {
					for ( var player of teams[t].slots[class_name] ) {
						var player_str = "";
							
						player_str += class_name + "\t";
						
						if ( include_sr ) {
							var player_sr = get_player_sr( player, class_name );
							player_str += player_sr + "\t";
						}
						
						var player_name = player_name = player[name_field];
						if ( name_field == "id" ) {
							player_name = player_name.replace("-", "#");
						}
						player_str += player_name;
						
						if ( include_captains ) {
							if ( teams[t].captain_id == player.id ) {
								player_str += " \u265B";
							}
						}
						
						player_str += "\t";
						
						if ( include_classes ) {
							player_str += player.classes.join("/");
						}
						
						setup_str += player_str + "\n";
					}
				}
			}
			setup_str += "\n";
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
	
	var title_colspan = 2;
	if ( include_players ) {
		if ( include_sr ) title_colspan++;
		if ( include_classes ) title_colspan++;
	}
	var _team_size = get_team_size();
	
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
					
					var player = get_player_at_index( teams[t], p );
					var team_length = get_team_player_count( teams[t] );
					
					// print cell with slot class
					setup_str += "<td style='text-align: left; border-bottom: 1px solid gray; border-left: 1px solid gray; border-right: 1px solid gray; white-space: nowrap;'>";
					if ( p < team_length ) {
						var slot_role = get_player_role(teams[t], player);
						if (draw_icons) {
							var class_str = "<img style='filter: opacity(60%);' src='"+class_icons_datauri[slot_role]+"' alt='"+slot_role+"'/>";
						} else {
							var class_str = slot_role;
							if (class_str == "support") class_str = "sup";
						}
						setup_str += class_str;
					}
					setup_str += "</td>";
					
					if ( include_sr ) {
						setup_str += "<td style='text-align: right; padding-right: 0.5em; border-bottom: 1px solid gray;border-left: 1px solid gray;'>";
						if ( p < team_length ) {
							var player_sr = get_player_sr( player, get_player_role(teams[t], player) );
							if (draw_icons) {
								var rank_name = get_rank_name(player_sr);
								setup_str += "<img src='"+rank_icons_datauri[rank_name]+"'/>";
							} else {
								setup_str += player_sr;
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
					if ( p < team_length ) {
						var player_name = player_name = player[name_field];
						if ( name_field == "id" ) {
							player_name = player_name.replace("-", "#");
						}
						setup_str += escapeHtml( player_name );
						
						if ( include_captains ) {
							if ( teams[t].captain_id == player.id ) {
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
						if ( p < team_length ) {
							// main class
							if ( player.classes[0] != undefined ) {
								var class_name = player.classes[0];
								if (draw_icons) {
									var class_str = "<img style='filter: opacity(60%);' src='"+class_icons_datauri[class_name]+"'/>";
								} else {
									var class_str = class_name;
									if (class_str == "support") class_str = "sup";
								}
								
								setup_str += class_str;
							}
							// secondary class
							if ( player.classes[1] != undefined ) {
								var class_name = player.classes[1];
								if (draw_icons) {
									var class_str = "<img style='height: 15px; width: auto; filter: opacity(40%);' src='"+class_icons_datauri[class_name]+"'/>";
								} else {
									var class_str = class_name;
									if (class_str == "support") class_str = "sup";
									class_str = "/"+class_str;
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
				if (find_player_by_id(imported_player.id, added_players) !== undefined ) {
					continue;
				}
				
				imported_player = sanitize_player_struct( imported_player, import_struct.format_version );
				
				// check twitch duplicates
				if ( imported_player["twitch_name"] != "" ) {
					if (find_player_by_twitch_name(imported_player["twitch_name"], added_players) !== undefined ) {
						throw new Error("Twitch name duplicate: "+imported_player["twitch_name"]);
					}
				}
				
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
	} else if( (format == "csv") || (format == "csv-tab") ) {
		var order_base = get_new_player_order();
		try {
			var battletag_list = import_str.trim().split("\n");
			for( i in battletag_list ) {
				// skip empty lines
				if ( battletag_list[i].trim().length == 0 ) {
					continue;
				}
				
				// @todo create google form template for import
				// split string to fields (btag, twitch name, main class, secondary class, third class, tank SR, DPS SR, support SR )
				var separator_regex = /[ \t.,;|]/;
				if (format == "csv-tab") {
					separator_regex = /\t/;
				}
				var fields = battletag_list[i].split( separator_regex );
				
				// try to guess if there is header row and skip it
				if ( i==0 ) {
					if ( (fields[0] == "BattleTag") || (fields[0] == "Twitch_name") ) {
						continue;
					}
				}
				
				// try to guess if field order is [btag,twitch] or [twitch,btag] 
				var btag = undefined;
				var twitch_name = "";
				var field_index = 0;
				if ( is_battletag(fields[0]) ) {
					btag = fields[0];
					field_index = 1;
					if ( fields.length >= 2 ) {
						twitch_name = ( fields[1] );
						field_index = 2;
					}					
				} else if ( (fields.length >= 2) && is_battletag(fields[1]) ) {
					twitch_name = fields[0];
					btag = fields[1];
					field_index = 2;
				} else {
					throw new Error("Can't find battletag on row #"+String(Number(i)+1));
				}
				
				var player_id = format_player_id(btag);

				// check duplicates
				if (find_player_by_id(player_id) !== undefined ) {
					continue;
				}
				var player_name = format_player_name( player_id );
				
				var new_player = create_empty_player();
				delete new_player.empty;
				new_player.id = player_id;
				new_player.display_name = player_name;
				new_player.twitch_name = twitch_name;
				
				new_player.order = order_base;
				order_base++;
				
				// additional fields: classes
				if ( field_index < fields.length ) {
					var last_class_field_index = Math.min(fields.length, field_index+class_names.length);
					for ( var c = field_index; c < last_class_field_index; c++ ) {
						if (fields[c] == "") continue;
						
						var class_name = undefined;
						switch (fields[c].toLowerCase()) {
							case "tank":
							case "offtank":
							case "off tank":
							case "maintank":
							case "main tank":
							case "танк":
								class_name = "tank";
								break;
							case "dps":
							case "damage":
							case "dd":
							case "дд":
							case "дпс":
							case "урон":
								class_name = "dps";
								break;
							case "support":
							case "sup":
							case "healer":
							case "сапорт":
							case "поддержка":
								class_name = "support";
								break;
						}
						if (class_names.indexOf(class_name) == -1) {
							throw new Error("Incorrect class name '"+fields[c]+"' on row #"+String(Number(i)+1));
						}
						new_player.classes.push( class_name );
						field_index++;
					}
				}
				
				// additional fields: sr per role
				if ( field_index < fields.length ) {
					for ( var class_index in class_names ) {
						var class_sr_text = Number( fields[field_index] );
						var class_sr = Number(class_sr_text);
						if ( Number.isNaN(class_sr) ) {
							throw new Error("Incorrect SR number "+class_sr_text);
						}
						if ( class_sr < 0 || class_sr > 5000 ) {
							throw new Error("Incorrect SR value "+class_sr);
						}
						
						new_player.sr_by_class[ class_names[class_index] ] = class_sr;
						field_index++;
					}
					new_player.last_updated = new Date;
				}
				
				
				// check twitch duplicates
				if ( new_player.twitch_name != "" ) {
					if (find_player_by_twitch_name(new_player.twitch_name, added_players) !== undefined ) {
						throw new Error("Twitch name duplicate: "+new_player.twitch_name);
					}
				}
				
				/*if ( new_player.sr == 0 ) {
					players_for_update.push( new_player );
				}*/
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
	}  else {
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
			if ( saved_format < 9 ) {
				// convert structure from plain array to classes
				if ( saved_team_setup[t].captain_index != -1 ) {
					saved_team_setup[t].captain_id = is_undefined( saved_team_setup[t].players[saved_team_setup[t].captain_index].id, "" );
				}
				delete saved_team_setup[t].captain_index;
				
				saved_team_setup[t].slots = {};
				for( let class_name of class_names ) {
					saved_team_setup[t].slots[class_name] = [];
				}
				
				for( let class_name of class_names ) {
					for( var i=0; i<Settings.slots_count[class_name]; i++ ) {
						var player_struct = saved_team_setup[t].players.shift();
						saved_team_setup[t].slots[class_name].push(player_struct);
					}
				}
				
				delete saved_team_setup[t].players;
			}
			
			var new_team = create_empty_team();
			new_team.name = saved_team_setup[t].name;
			new_team.captain_id = saved_team_setup[t].captain_id;
			if ( new_team.captain_id === undefined ) {
				new_team.captain_id = "";
			}
			
			/*for ( var i in saved_team_setup[t].players ) {
				var player_struct = sanitize_player_struct(saved_team_setup[t].players[i], saved_format);
					if ( player_struct.order <= 0 ) {
					player_struct.order = order;
					order++;
				}
				new_team.players.push( player_struct );
			}*/
			
			for ( let class_name in saved_team_setup[t].slots ) {
				for ( var i in saved_team_setup[t].slots[class_name] ) {
					var player_struct = sanitize_player_struct(saved_team_setup[t].slots[class_name][i], saved_format);
					if ( player_struct.order <= 0 ) {
						player_struct.order = order;
						order++;
					}
					new_team.slots[class_name].push( player_struct );
				}
			}

			teams.push( new_team );
		}
	}
	
	// draw teams
	redraw_lobby();
	redraw_teams();
}

function restore_twitch_subs_list() {
	var saved_twitch_subs_json = localStorage.getItem( storage_prefix+"twitch_subs" );
	if ( saved_twitch_subs_json != null ) {
		var saved_twitch_subs = JSON.parse(saved_twitch_subs_json);
		
		// restore only existing players
		for ( var i in saved_twitch_subs ) {
			if ( find_player_by_id(saved_twitch_subs[i]) !== undefined ) {
				twitch_subs_list.push(saved_twitch_subs[i]);
			}
		}
	}
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
	
	if ( saved_format <= 8 ) {
		// convert single SR to new separate rating by roles
		player_struct.classes = [];		
		player_struct.sr_by_class = {};
		player_struct.playtime_by_class = {};
		for( let class_name of player_struct.top_classes ) {
			player_struct.classes.push( class_name );
			player_struct.sr_by_class[class_name] = player_struct.sr;
			player_struct.playtime_by_class[class_name] = 0;
		}
		
		delete player_struct.top_classes;
		delete player_struct.sr;
		
		// merge offtank and maintank to tank
		for (var i=0; i<player_struct.classes.length; i++) {
			if (player_struct.classes[i] == "offtank") {
				player_struct.classes[i] = "tank";
			}
			if (player_struct.classes[i] == "maintank") {
				player_struct.classes[i] = "tank";
			}
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
	
	// remove class duplicates
	player_struct.classes = player_struct.classes.filter( 
		(class_name, class_index, classes) => classes.indexOf(class_name) === class_index ); 
	
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

function save_twitch_subs_list() {
	localStorage.setItem(storage_prefix+"twitch_subs", JSON.stringify(twitch_subs_list));
}