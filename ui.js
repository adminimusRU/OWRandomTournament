/*
*		User actions
*/

function add_empty_team() {
	var new_team = create_empty_team();
	new_team.name = "Team "+(teams.length+1);
	teams.push( new_team );
	save_players_list();
	redraw_teams();
	
	var last_team_node = document.getElementById("teams_container").lastChild;
	setTimeout( function() {last_team_node.scrollIntoView(false);}, 100 );
	
	update_teams_count();
}

function add_player_click() {
	var player_id = document.getElementById("new_player_id").value;
	player_id = format_player_id( player_id );
	
	// check duplicates
	if ( find_player_by_id(player_id) !== undefined ) {
		alert("Player already added");
		setTimeout( function() {document.getElementById(player_id).scrollIntoView(false);}, 100 );
		setTimeout( function() {highlight_player( player_id );}, 500 );
		return;
	}
		
	document.getElementById("add_btn").disabled = true;
	
	player_being_added = create_empty_player();
	player_being_added.id = player_id;
	player_being_added.order = get_new_player_order();
	
	StatsUpdater.addToQueue( player_being_added, 0, true );
}

function apply_settings() {
	var need_redraw_teams = false;
	var need_redraw_lobby = false;
	
	// check if team size changed
	var slots_count_setting = "slots_count";
	// compare slots count for each role, move players to lobby if slots reduced
	for ( class_name in Settings[slots_count_setting] ) {
		var setting_input = document.getElementById(slots_count_setting+"_"+class_name);
		var old_slot_count = Settings[slots_count_setting][class_name];
		new_slot_count = Number(setting_input.value);
		
		if ( new_slot_count < old_slot_count ) {
			need_redraw_teams = true;
			break;
		}
	}
	if ( need_redraw_teams ) {
		if ( ! confirm("Team size setting changed. All teams will be deleted!") ) {
			return;
		}
		reset_roll();
	}
	
	for ( class_name in Settings[slots_count_setting] ) {
		var setting_input = document.getElementById(slots_count_setting+"_"+class_name);		
		new_slot_count = Number(setting_input.value);
		Settings[slots_count_setting][class_name] = new_slot_count;
	}
	
	if ( Settings["show_numeric_sr"] != (document.getElementById("show_numeric_sr").value) ) {
		need_redraw_teams = true;
	}
	
	if ( Settings["roll_exclude_twitch_unsubs"] != (document.getElementById("roll_exclude_twitch_unsubs").checked) ) {
		need_redraw_lobby = true;
	}
	
	for ( setting_name in Settings ) {
		if ( setting_name == "slots_count" ) {
			continue;
		}
		var setting_input = document.getElementById(setting_name);
		var setting_value;
		
		switch( setting_input.type ) {
			case "checkbox":
				setting_value = setting_input.checked;
				break;
			case "number":
			case "range":
				setting_value = Number(setting_input.value);
				break;
			default:
				setting_value = setting_input.value;
		}
		
		Settings[setting_name] = setting_value;
	}
	
	localStorage.setItem( storage_prefix+"settings", JSON.stringify(Settings) );
	apply_stats_updater_settings();
	close_dialog( "popup_dlg_settings" );
	
	if (need_redraw_teams) {
		redraw_teams();
	}
	
	if (need_redraw_lobby) {
		redraw_lobby();
	}
}

function assign_captains() {
	var result = prompt("Minimum captain SR", "3600");
	if ( result === null ) {
		return;
	}
	var min_captain_sr = parseInt(result, 10);
	if ( isNaN(min_captain_sr) || (min_captain_sr>5000) || (min_captain_sr<1)) {
		alert("SR must be between 1 and 5000");
		return;
	}
	
	//clear current captains
	for (var i=0; i<lobby.length; i++) {
		lobby[i].captain = false;
	}
	
	var captains_count = Math.floor( lobby.length / get_team_size() );
	
	while( captains_count > 0 ) {
		//find highest ranked player
		var highest_sr = 0;
		var highest_sr_index = -1;
		for (var i=0; i<lobby.length; i++) {
			var player_sr = get_player_sr(lobby[i]);
			if ( player_sr <  min_captain_sr ) {
				continue;
			}
			if ( lobby[i].captain ) {
				continue;
			}
			
			if ( player_sr > highest_sr ) {
				highest_sr = player_sr;
				highest_sr_index = i;
			}
		}
		
		// new captain found
		if ( highest_sr_index != -1 ) {
			lobby[highest_sr_index].captain = true;
			captains_count--;
		} else {
			break;
		}
	}
	
	save_players_list();
	redraw_lobby();
}

function balance_priority_mousedown(ev) {
	balance_priority_mouse_moving = true;
	if (balance_priority_mouse_moving) {
		read_balance_prority_input(ev);
	}
}

function balance_priority_mousemove(ev) {
	if (balance_priority_mouse_moving) {
		read_balance_prority_input(ev);
	}
}

function balance_priority_mouseup(ev) {
	balance_priority_mouse_moving = false;
}

function cancel_roll() {
	RtbWorker.terminate();
	close_dialog( "popup_dlg_roll_progress" );
}

function clear_captains() {
	for (var i=0; i<lobby.length; i++) {
		lobby[i].captain = false;
	}
	save_players_list();
	redraw_lobby();
}

function clear_lobby() {
	if( confirm("Permanently delete all players?") ) {
		lobby.splice( 0, lobby.length );
		save_players_list();
		redraw_lobby();
	}
}

function clear_edited_mark( field_name ) {
	if (player_being_edited == undefined) {
		return;
	}
	
	var player_struct = player_being_edited;
	
	switch (field_name) {
		case 'ne': 
			player_struct.ne = false;
			document.getElementById("dlg_player_name_edited").style.visibility = "";
			break;
		case 'se': 
			player_struct.se = false;
			var marks = document.getElementById("dlg_player_class_table").getElementsByClassName("dlg-edited-mark-sr");
			for( i=0; i<marks.length; i++ ) {
				marks[i].style.visibility = "hidden";
			}
			break;
		case 'ce': 
			player_struct.ce = false;
			document.getElementById("dlg_player_class1_edited").style.visibility = "";			
			break;
		case 'le': 
			player_struct.le = false;
			document.getElementById("dlg_player_level_edited").style.visibility = "";
			break;
	}
	
	redraw_player( player_struct );
	save_players_list();
}

function clear_stats_update_log() {
	document.getElementById("stats_update_log").value = "";
	document.getElementById("stats_update_errors").style.visibility = "hidden";
}

function close_dialog( dialog_id ) {
	document.getElementById( dialog_id ).style.display = "none";
}

function dbg_roll() {
	document.getElementById("debug_log").innerHTML += "roll debug enabled</br>";
	roll_debug = true;
}

function dbg_twitch_chat() {
	document.getElementById("debug_log").innerHTML += "twitch chat debug enabled</br>";
	twitch_chat_debug = true;
}

function delete_team( team_index ) {
	if ( ! confirm("Delete team?") ) {
		return;
	}
	for ( let class_name in teams[team_index].slots ) {
		lobby = lobby.concat( teams[team_index].slots[class_name].splice( 0, teams[team_index].slots[class_name].length) );
	}
	teams.splice( team_index, 1 );
	save_players_list();
	redraw_lobby();
	redraw_teams();
}

function edit_player_ok() {
	if (player_being_edited == undefined) {
		return;
	}
		
	var need_full_lobby_redraw = false;
	
	var player_struct = player_being_edited;
	
	var twitch_name = document.getElementById("dlg_player_twitch_name").value.trim();
	// check twitch duplicates
	if ( twitch_name != "" ) {
		for( var i=0; i<lobby.length; i++) {
			if ( (twitch_name.toLowerCase() == lobby[i].twitch_name.toLowerCase()) && (lobby[i].id != player_struct.id) ) {
				alert("Twitch nickname already used: "+lobby[i].id);
				return;
			}
		}
		for( var t=0; t<teams.length; t++) {
			for ( let class_name in teams[t].slots ) {
				for( var i=0; i<teams[t].slots[class_name].length; i++) {
					if ( (twitch_name.toLowerCase() == teams[t].slots[class_name][i].twitch_name.toLowerCase()) && (teams[t].slots[class_name][i].id != player_struct.id) ) {
						alert("Twitch nickname already used: "+teams[t].slots[class_name][i].id);
						return;
					}
				}
			}
		}
	}
	
	var new_name = document.getElementById("dlg_player_display_name").value;
	if ( player_struct.display_name != new_name ) {
		player_struct.ne = true; // name edited
	}
	player_struct.display_name = new_name;
	
	player_struct.twitch_name = twitch_name;
	
	var class_rows = document.getElementById("dlg_player_class_table").rows;
	// check if SR was edited
	for ( var i=0; i<class_rows.length; i++ ) {
		var class_row = class_rows[i];
		var class_title = class_row.getElementsByClassName("dlg-class-name")[0];
		var class_name = class_title.innerHTML;

		var sr_edit = class_row.getElementsByClassName("dlg-sr-by-class")[0];
		var new_sr = Number(sr_edit.value);

		var old_sr = player_struct.sr_by_class[class_name];
		if ( old_sr == undefined ) {
			old_sr = 0;
		}

		if ( old_sr != new_sr ) {
			player_struct.se = true; // sr edited mark
			break;
		}
	}
	
	// check if class order was edited
	var new_classes = [];
	for ( var i=0; i<class_rows.length; i++ ) {
		var class_row = class_rows[i];
		var class_title = class_row.getElementsByClassName("dlg-class-name")[0];
		var class_name = class_title.innerHTML;
		
		var class_checkbox = class_row.getElementsByClassName("dlg-class-enabled-checkbox")[0];
		if ( class_checkbox.checked ) {
			new_classes.push( class_name );
		}
	}
	for ( var i=0; i<new_classes.length; i++ ) {
		var old_index = player_struct.classes.indexOf( new_classes[i] );
		if ( old_index != i ) {
			player_struct.ce = true;
			break;
		}
	}
	for ( var i=0; i<player_struct.classes.length; i++ ) {
		var new_index = new_classes.indexOf( player_struct.classes[i] );
		if ( new_index != i ) {
			player_struct.ce = true;
			break;
		}
	}
	
	// save class order and sr to player
	player_struct.sr_by_class = {};
	player_struct.classes = [];
	for ( var i=0; i<class_rows.length; i++ ) {
		var class_row = class_rows[i];
		var class_title = class_row.getElementsByClassName("dlg-class-name")[0];
		var class_name = class_title.innerHTML;
		
		if ( class_names.indexOf(class_name) == -1 ) {
			continue;
		}
		
		var sr_edit = class_row.getElementsByClassName("dlg-sr-by-class")[0];
		var new_sr = Number(sr_edit.value);
		
		player_struct.sr_by_class[class_name] = new_sr;
		
		var class_checkbox = class_row.getElementsByClassName("dlg-class-enabled-checkbox")[0];
		if ( class_checkbox.checked && (new_sr > 0) ) {
			player_struct.classes.push( class_name );
		}
	}
	
	var new_level = Number(document.getElementById("dlg_player_level").value);
	if ( new_level < 0 ) {
		new_level = 0;
	}
	if ( player_struct.level != new_level ) {
		player_struct.le = true; // sr edited
	}
	player_struct.level = new_level;
	
	player_struct.captain = document.getElementById("dlg_player_captain").checked;
	
	// twitch sub
	if ( document.getElementById("dlg_player_twitch_sub").checked ) {
		if ( twitch_subs_list.indexOf(player_struct.id) == -1 ){
			twitch_subs_list.push( player_struct.id );
			save_twitch_subs_list();
			need_full_lobby_redraw = true;
		}
	} else {
		var index = twitch_subs_list.indexOf(player_struct.id);
		if ( index !== -1 ){
			twitch_subs_list.splice( index, 1 );
			save_twitch_subs_list();
			need_full_lobby_redraw = true;
		}
	}
	
	// check-in
	if ( document.getElementById("dlg_player_checkin").checked ) {
		if ( checkin_list.indexOf(player_struct.id) == -1 ){
			checkin_list.push( player_struct.id );
			save_checkin_list();
			need_full_lobby_redraw = true;
		}
	} else {
		var index = checkin_list.indexOf(player_struct.id);
		if ( index !== -1 ){
			checkin_list.splice( index, 1 );
			save_checkin_list();
			need_full_lobby_redraw = true;
		}
	}
		
	close_dialog("popup_dlg_edit_player");
	save_players_list();
	if ( need_full_lobby_redraw ) {
		redraw_lobby();
	} else {
		redraw_player( player_struct );
	}
	update_captains_count();
	
	player_being_edited = undefined;
}

function edit_team(team_index) {
	team_being_edited = teams[team_index];
	fill_edit_team_dlg();
	open_dialog("popup_dlg_edit_team");
}

function edit_team_ok() {
	if (team_being_edited == undefined) {
		return;
	}
	
	team_being_edited.name = document.getElementById("dlg_edit_team_name").value;
	team_being_edited.captain_id = document.getElementById("dlg_edit_team_captain").value;
	
	team_being_edited = undefined;
	close_dialog("popup_dlg_edit_team");
	save_players_list();
	redraw_teams();
}

function export_captains_dlg_open() {
	open_dialog("popup_dlg_export_captains");
	var export_str = export_captains( );
	document.getElementById("dlg_textarea_export_captains").value = export_str;
	document.getElementById("dlg_textarea_export_captains").select();
	document.getElementById("dlg_textarea_export_captains").focus();
}

function export_lobby_dlg_open() {
	open_dialog("popup_dlg_export_lobby");
	export_lobby_dlg_change_format();
}

function export_lobby_dlg_change_format() {
	var format = document.getElementById("dlg_lobby_export_format_value").value;
	var export_str = export_lobby( format );
	document.getElementById("dlg_textarea_export_lobby").value = export_str;
	document.getElementById("dlg_textarea_export_lobby").select();
	document.getElementById("dlg_textarea_export_lobby").focus();
}

function export_teams_dlg_copy_html() {
	select_html( document.getElementById("dlg_html_export_teams") );
	document.execCommand("copy");
}

function export_teams_dlg_change_format() {
	var format = document.getElementById("dlg_team_export_format_value").value;
	var include_players = document.getElementById("dlg_team_export_players").checked;
	var include_sr = document.getElementById("dlg_team_export_sr").checked;
	var include_classes = document.getElementById("dlg_team_export_classes").checked;
	var include_captains = document.getElementById("dlg_team_export_captains").checked;
	var table_columns = Number(document.getElementById("dlg_team_export_columns").value);
	var name_field = document.getElementById("dlg_team_export_names").value;
	
	var export_str = export_teams( format, include_players, include_sr, include_classes, include_captains, table_columns, name_field );
	
	if ( format == "html-table" ) {
		var html_container = document.getElementById("dlg_html_export_teams");
		html_container.style.display = "";
		document.getElementById("dlg_html_export_teams_hint").style.display = "";
		document.getElementById("dlg_textarea_export_teams").style.display = "none";
		html_container.innerHTML = export_str;

		select_html( html_container );
	} else if ( format == "text-list" ) {
		document.getElementById("dlg_html_export_teams").style.display = "none";
		document.getElementById("dlg_html_export_teams_hint").style.display = "none";
		document.getElementById("dlg_textarea_export_teams").style.display = "";
		document.getElementById("dlg_textarea_export_teams").value = export_str;
		document.getElementById("dlg_textarea_export_teams").select();
		document.getElementById("dlg_textarea_export_teams").focus();
	} else if ( format == "image" ) {
		var html_container = document.getElementById("dlg_html_export_teams");
		html_container.innerHTML = "";
		html_container.style.display = "";
		document.getElementById("dlg_html_export_teams_hint").style.display = "none";
		document.getElementById("dlg_textarea_export_teams").style.display = "none";
		
		// convert html to image
				
		// calculate image size
		var tmp_div = document.createElement("div");
		tmp_div.innerHTML = export_str;
		document.body.appendChild(tmp_div);
		var img_width = tmp_div.firstChild.clientWidth;
		var img_height = tmp_div.firstChild.clientHeight;
		document.body.removeChild(tmp_div);

		var data = '<svg xmlns="http://www.w3.org/2000/svg" width="'+img_width+'" height="'+img_height+'">' +
				   '<foreignObject width="100%" height="100%">' +
				   '<div xmlns="http://www.w3.org/1999/xhtml" >' +
					 export_str +
				   '</div>' +
				   '</foreignObject>' +
				   '</svg>';
			
		data = encodeURIComponent(data);
		
		var canvas = document.createElement('canvas');
		canvas.width = img_width;
		canvas.height = img_height;
		var ctx = canvas.getContext('2d');
		
		var svg_img = new Image();

		svg_img.onload = function() {
			ctx.drawImage(svg_img, 0, 0);

			canvas.toBlob(function(blob) {
				var newImg = document.createElement('img'),
				url = URL.createObjectURL(blob);

				newImg.onload = function() { URL.revokeObjectURL(url); 	};

				newImg.src = url;
				html_container.appendChild(newImg);
			});
		}

		svg_img.src = "data:image/svg+xml," + data;
	}
}

function export_teams_dlg_open() {
	open_dialog("popup_dlg_export_teams");
	export_teams_dlg_change_format();
}

function generate_random_players() {
	var number_to_add_str = prompt("Enter number of players to generate", 1);

	if (number_to_add_str === null) {
		return;
	}
	var number_to_add = Number(number_to_add_str);
	if( Number.isNaN(number_to_add) ) {
		return;
	}
	if( ! Number.isInteger(number_to_add) ) {
		return;
	}
	
	if( number_to_add > 10000 ) {
		return;
	}

	var order_base = get_new_player_order();

	for( var i=1; i<=number_to_add; i++ ) {
		var new_player = create_random_player(i);
		new_player.order = order_base;
		order_base++;
		lobby.push( new_player );
	}

	save_players_list();
	redraw_lobby();
}

function generate_random_teams() {
	// fill teams with ramdom players
	var number_to_add_str = prompt("Enter number of teams to generate", 1);

	if (number_to_add_str === null) {
		return;
	}
	var number_to_add = Number(number_to_add_str);
	if( Number.isNaN(number_to_add) ) {
		return;
	}
	if( ! Number.isInteger(number_to_add) ) {
		return;
	}
	
	if( number_to_add > 10000 ) {
		return;
	}
	
	var order_base = get_new_player_order();

	var player_counter = 1;
	for( var i=1; i<=number_to_add; i++ ) {
		var new_team = create_empty_team();
		new_team.name = "Test team #"+i;
		
		for ( var class_name in Settings.slots_count ) {
			for (var ci=0; ci<Settings.slots_count[class_name]; ci++) {
				var new_player = create_random_player(player_counter);
				new_player.order = order_base;
				order_base++;
				new_team.slots[class_name].push( new_player );
				player_counter++;
			}
		}
		
		teams.push( new_team );
	}

	save_players_list();
	redraw_teams();
}

function import_captains_dlg_open() {
	open_dialog("popup_dlg_import_captains");
	document.getElementById("dlg_textarea_import_captains").value = "";
	document.getElementById("dlg_textarea_import_captains").focus();
}

function import_captains_ok() {
	var import_str = document.getElementById("dlg_textarea_import_captains").value;
	if ( import_captains(import_str) ) {
		close_dialog("popup_dlg_import_captains");
	}
}

function import_checkin_open() {
	open_dialog("popup_dlg_import_checkin");
	document.getElementById("dlg_textarea_import_checkin").value = "";
	document.getElementById("dlg_textarea_import_checkin").focus();
}

function import_checkin_ok() {
	var import_str = document.getElementById("dlg_textarea_import_checkin").value;
	if ( import_checkin(import_str) ) {
		close_dialog("popup_dlg_import_checkin");
		redraw_lobby();
	}
}

function import_lobby_dlg_open() {
	open_dialog("popup_dlg_import_lobby");
	document.getElementById("dlg_textarea_import_lobby").value = "";
	document.getElementById("dlg_textarea_import_lobby").focus();
}

function import_lobby_ok() {
	var format = document.getElementById("dlg_player_import_format_value").value;
	var import_str = document.getElementById("dlg_textarea_import_lobby").value;
	if ( import_lobby(format, import_str) ) {
		close_dialog("popup_dlg_import_lobby");
	}
}

function lobby_filter_clear() {
	document.getElementById("lobby_filter").value="";
	apply_lobby_filter();
}

function manual_checkin_open() {
	open_dialog("popup_dlg_manual_checkin");
	
	// fill players table
	var tbody = document.getElementById("manual_checkin_table").tBodies[0];
	var thead = document.getElementById("manual_checkin_table").tHead;
	var tfoot = document.getElementById("manual_checkin_table").tFoot;
	
	tbody.innerHTML = "";
	for (var i=0; i<lobby.length; i++) {
		var row = document.createElement("tr");
		row.onclick = manual_checkin_row_click;
		
		var cell = document.createElement("td");
		var cbox = document.createElement("input");
		cbox.type = "checkbox";
		cbox.setAttribute("player_id", lobby[i].id);
		cbox.onchange = manual_checkin_checkbox_change;
		cbox.autocomplete = "off";
		if ( checkin_list.indexOf(lobby[i].id) != -1 ) {
			cbox.checked = true;
			row.classList.add("checked");
		}
		cell.appendChild(cbox);
		row.appendChild(cell);
		
		cell = document.createElement("td");
		var cellText = document.createTextNode( lobby[i].order );
		cell.appendChild(cellText);
		row.appendChild(cell);
		
		cell = document.createElement("td");
		var cellText = document.createTextNode(lobby[i].id.replace("-", "#"));
		cell.appendChild(cellText);
		row.appendChild(cell);
		
		cell = document.createElement("td");
		var cellText = document.createTextNode(lobby[i].twitch_name);
		cell.appendChild(cellText);
		row.appendChild(cell);
		
		tbody.appendChild(row);
	}

	// reset sorting marks
	for ( var i=0; i<thead.rows[0].cells.length; i++ ) {
		thead.rows[0].cells[i].removeAttribute("order_inverse");
	}
	sort_manual_chekin_table( 2 );
	
	tfoot.getElementsByTagName("td")[0].innerHTML = checkin_list.length;
	tfoot.getElementsByTagName("td")[2].innerHTML = lobby.length;
}

function open_stats_update_log() {
	open_dialog("popup_dlg_stats_log");
}

function player_class_row_movedown(ev) {
	var current_row = get_parent_element( ev.currentTarget, "TR" );
	
	var rows = document.getElementById("dlg_player_class_table").rows;
	var row_index = current_row.rowIndex;
	if ( row_index == (rows.length-1) ) {
		return;
	}
	
	rows[row_index].parentNode.insertBefore(rows[row_index + 1], rows[row_index]);
}

function player_class_row_moveup(ev) {
	var current_row = get_parent_element( ev.currentTarget, "TR" );
	
	var rows = document.getElementById("dlg_player_class_table").rows;
	var row_index = current_row.rowIndex;
	if ( row_index == 0 ) {
		return;
	}
	
	rows[row_index].parentNode.insertBefore(rows[row_index], rows[row_index - 1]);
}

function reset_checkin() {
	if( ! confirm("Clear all check-in marks?") ) {
		return;
	}
	
	checkin_list = [];
	save_checkin_list();
	redraw_lobby();
}

function reset_roll_click() {
	if( ! confirm("Delete all teams?") ) {
		return;
	}
	reset_roll();
}

function reset_settings() {
	fill_settings_dlg( get_default_settings() );
}

function roll_teams() {
	if ( teams.length > 0 ) {
		if( ! confirm("Delete all teams?") ) {
			return;
		}
		reset_roll();
	}
	
	// roll teams with worker
	RtbWorker = new Worker('rtb_worker.js');
	RtbWorker.onmessage = on_rtb_worker_message;
	
	// convert roll quality to combinations with logarithmic scale
	var max_combinations = convert_range_log_scale( Settings.roll_quality, 1000, 300000 );
	var OF_max_thresold = convert_range_log_scale( Settings.roll_coverage, 1, 1000, 1 ) - 1;
	if (Settings.roll_coverage == 100) {
		OF_max_thresold = Number.MAX_VALUE;
	}
	
	var rtb_settings = {
		slots_count: Settings.slots_count,
		team_count_power2: Settings.roll_team_count_power2,
		
		adjust_sr: Settings.roll_adjust_sr,
		adjust_sr_by_class: {			
			tank: Settings.roll_adjust_tank,
			dps: Settings.roll_adjust_dps,
			support: Settings.roll_adjust_support,
		},
		sr_exp_scale: Settings.roll_sr_scale,
		
		balance_priority_sr: Settings.roll_balance_priority_sr,
		balance_priority_class: Settings.roll_balance_priority_class,
		balance_priority_dispersion: Settings.roll_balance_priority_dispersion,
		
		target_sr_stdev_adjust: Settings.roll_sr_stdev_adjust,
		
		separate_otps: Settings.roll_separate_otps,
		min_level: Settings.roll_min_level,
		assign_captains: Settings.roll_captains,
		
		max_combinations: max_combinations,
		OF_max_thresold: OF_max_thresold,
		roll_debug: roll_debug,
		
		checkin_list: checkin_list,
		
		twitch_subs_list: checkin_list,
		exclude_twitch_unsubs: Settings.roll_exclude_twitch_unsubs,
	}
		
	RtbWorker.postMessage(["init", rtb_settings]);
	RtbWorker.postMessage(["roll", lobby]);
	
	document.getElementById("roll_progress_bar").value = 0;
	document.getElementById("dlg_roll_progress_text").innerHTML = "0 %";
	open_dialog( "popup_dlg_roll_progress" );
}

function settings_dlg_open() {
	fill_settings_dlg( Settings );
	open_dialog( "popup_dlg_settings" );
}

function shuffle_lobby() {
	lobby = array_shuffle( lobby );
	save_players_list();
	redraw_lobby();
}

function shuffle_teams() {
	teams = array_shuffle( teams );
	save_players_list();
	redraw_teams();
}

function sort_lobby( sort_field = 'sr', button_element=undefined ) {
	var order_inverse = false;
	if (button_element !== undefined) {
		if (button_element.hasAttribute("order_inverse")) {
			order_inverse = true;
			button_element.removeAttribute("order_inverse");
		} else {
			button_element.setAttribute("order_inverse", "");
		}
	}
	sort_players(lobby, sort_field, order_inverse);
	save_players_list();
	redraw_lobby();
}

function sort_manual_chekin_table( sort_column_index ) {
	var tbody = document.getElementById("manual_checkin_table").tBodies[0];
	var thead = document.getElementById("manual_checkin_table").tHead;
	var header_cell = thead.rows[0].cells[sort_column_index];
	
	var order = 1;
	if (header_cell.hasAttribute("order_inverse")) {
		order = -1;
		header_cell.removeAttribute("order_inverse");
	} else {
		header_cell.setAttribute("order_inverse", "");
	}
	
	// create temporary array of table rows and sort it in memory
	// avoiding expensive DOM updates
	var temp_rows = [];
	for (var i = 0; i < tbody.rows.length; i++) {
		temp_rows.push(tbody.rows[i]);
	}
	
	temp_rows.sort( function(row1, row2){
			if ( sort_column_index == 0 ) {
				var this_row_calue = row1.cells[sort_column_index].getElementsByTagName("input")[0].checked;
				var next_row_calue = row2.cells[sort_column_index].getElementsByTagName("input")[0].checked;
			} else {
				var this_row_calue = row1.cells[sort_column_index].innerText.toLowerCase();
				var next_row_calue = row2.cells[sort_column_index].innerText.toLowerCase();
			}
			
			// convert to number if possible
			if ( is_number_string(this_row_calue) ) {
				this_row_calue = Number(this_row_calue);
			}
			if ( is_number_string(next_row_calue) ) {
				next_row_calue = Number(next_row_calue);
			}
			
			return order * ( this_row_calue<next_row_calue ? -1 : (this_row_calue>next_row_calue?1:0) );
			} 
		);
	
	// rearrange table rows in DOM according to sorted array
	for (var i = temp_rows.length-1; i >= 0; i--) {
		temp_rows[i].parentNode.insertBefore(temp_rows[i], temp_rows[i].parentNode.firstChild);
	}
	
	// draw arrow on this column header
	for(var i=0; i<thead.rows[0].cells.length; i++) {
		thead.rows[0].cells[i].classList.remove("sort-up");
		thead.rows[0].cells[i].classList.remove("sort-down");
	}
	
	if ( order > 0 ) {
		thead.rows[0].cells[sort_column_index].classList.add("sort-up");
	} else {
		thead.rows[0].cells[sort_column_index].classList.add("sort-down");
	}
}

function sort_team( team_index, sort_field = 'sr', order_inverse=false ) {	
	for ( let class_name in teams[team_index].slots ) {
		sort_players( teams[team_index].slots[class_name], sort_field, order_inverse, class_name );
	}
}

function sort_team_click( team_index, sort_field = 'sr', button_element=undefined ) {
	// @ToDo: inverse order not working: team buttons will be deleted on redraw and order_inverse will be lost... 
	var order_inverse = false;
	if (button_element !== undefined) {
		if (button_element.hasAttribute("order_inverse")) {
			order_inverse = true;
			button_element.removeAttribute("order_inverse");
		} else {
			button_element.setAttribute("order_inverse", "");
		}
	}
	
	sort_team( team_index, sort_field, order_inverse );
	save_players_list();
	// @ToDo: redraw only one team
	redraw_teams();
}

function sort_teams(button_element=undefined, sort_field = 'name') {
	var order = 1;
	if (button_element !== undefined) {
		if (button_element.hasAttribute("order_inverse")) {
			order = -1;
			button_element.removeAttribute("order_inverse");
		} else {
			button_element.setAttribute("order_inverse", "");
		}
	}
	
	if ( sort_field == 'captain_sr' ) {
		teams.sort( function(team1, team2){
					if ( team1.captain_id != "" ) {
						var val1 = get_player_sr( get_team_captain(team1) );
					} else {
						var val1 = get_player_sr( get_player_at_index(team1, 0) );
					}
					
					if ( team2.captain_index >= 0 ) {
						var val2 = get_player_sr(get_team_captain(team2) );
					} else {
						var val2 = get_player_sr(get_player_at_index(team2, 0) );
					}
					return order *( val1<val2 ? -1 : (val1>val2?1:0) );
				} );
		
	} else {
		teams.sort( function(team1, team2){
					var val1 = team1[sort_field].toLowerCase();
					var val2 = team2[sort_field].toLowerCase();
					return order *( val1<val2 ? -1 : (val1>val2?1:0) );
				} );
	}
	save_players_list();
	redraw_teams();
}

function sort_teams_players( sort_field = 'sr', button_element=undefined  ) {
	var order_inverse = false;
	if (button_element !== undefined) {
		if (button_element.hasAttribute("order_inverse")) {
			order_inverse = true;
			button_element.removeAttribute("order_inverse");
		} else {
			button_element.setAttribute("order_inverse", "");
		}
	}
	
	for( var t in teams ) {
		sort_team( t, sort_field, order_inverse );
	}
	save_players_list();
	redraw_teams();
}

function stop_stats_update() {
	StatsUpdater.stop( true );
}

function test() {
	/*document.getElementById("debug_log").innerHTML += "roll debug enabled</br>";
	roll_debug = true;*/
	
	/*twitch_sub_icon_src = "https://static-cdn.jtvnw.net/badges/v1/e60ff002-31a7-45e7-8a71-4243aa18af1e/1";
	twitch_subs_list.push("player8-38611");
	twitch_subs_list.push("player10-15135");
	save_twitch_subs_list();
	redraw_lobby();
	return;*/
	
	/*Twitch.getUserInfoByLogin( "bloodghast_zk", function( twitch_user_info ) {
		document.getElementById("debug_log").innerHTML += twitch_user_info.login+" = "+twitch_user_info.id
		+", broadcaster_type="+twitch_user_info.broadcaster_type+"</br>";
		}, undefined, undefined );*/
		
	/*Twitch.getGameInfoByName( "Overwatch", 
		function( game_info ) {
			document.getElementById("debug_log").innerHTML += JSON.stringify(game_info, null, ' ') + "<br/>";
		},
		undefined, 
		undefined
		);*/
		
	/*Twitch.getStreamsByGameId(
		"488552",
		"fr",
		function( streams_list ) {
			for (var i=0; i<streams_list.length; i++) {
				document.getElementById("debug_log").innerHTML += JSON.stringify(streams_list[i], null, ' ') + "<br/>";
			}
		},
		undefined, 
		undefined
	);
	return;*/
	
	var test_map = new Map();
	test_map.set("abc", 111);
	test_map.set("def", 222);
	test_map.set("ghi", 333);
	
	document.getElementById("debug_log").innerHTML += test_map.get("def") + "<br/>";
	document.getElementById("debug_log").innerHTML += test_map.get("Def") + "<br/>";
}

function twitch_chat_connect() {
	var channel_name = document.getElementById("twitch_checkin_channel").value.trim();
	localStorage.setItem( storage_prefix+"twitch_checkin_channel", channel_name );
	
	if ( channel_name.trim() == "" ) {
		return;
	}
	
	document.getElementById("twitch_checkin_connect").disabled = true;
	
	twitch_checkin_keyword = document.getElementById("twitch_checkin_keyword").value;
	
	TwitchChat.init( Twitch.user_login, Twitch.getToken() );
	
	TwitchChat.message_callback = on_twitch_chat_message;
	TwitchChat.connect_callback = on_twitch_chat_connect;
	TwitchChat.disconnect_callback = on_twitch_chat_disconnect;
	TwitchChat.system_message_callback = on_twitch_chat_sysmessage;
	TwitchChat.error_callback = on_twitch_chat_error;
	TwitchChat.debug_callback = on_twitch_chat_debug;

	TwitchChat.connect( channel_name );
}

function twitch_chat_disconnect() {
	document.getElementById("twitch_checkin_disconnect").disabled = true;
	TwitchChat.disconnect();
}

function twitch_checkin_open() {
	document.getElementById("twitch_checkin_chat").innerHTML = "";
	document.getElementById("twitch_checkin_connect").style.display = "inline";
	document.getElementById("twitch_checkin_connect").disabled = false;
	document.getElementById("twitch_checkin_disconnect").style.display = "none";
	
	var twitch_checkin_channel = localStorage.getItem( storage_prefix+"twitch_checkin_channel" );
	if ( (twitch_checkin_channel === null) || (twitch_checkin_channel == "") ) {
		twitch_checkin_channel = Twitch.user_login;
	}
	document.getElementById("twitch_checkin_channel").value = twitch_checkin_channel;
	
	var twitch_checkin_keyword = localStorage.getItem( storage_prefix+"twitch_checkin_keyword" );
	if ( twitch_checkin_keyword !== null ) {
		document.getElementById("twitch_checkin_keyword").value = twitch_checkin_keyword;
	}
	
	open_dialog("popup_dlg_twitch_checkin");
	
	// show already checked-in players
	twitch_chat_draw_checkin_list();
}

function twitch_checkin_close() {
	close_dialog('popup_dlg_twitch_checkin');
	
	if ( TwitchChat.isConnected() ) {
		TwitchChat.disconnect();
	}
	
	redraw_lobby();
}

function twitch_signin() {
	localStorage.setItem( storage_prefix+"twitch_state", Twitch.getState() );
	return true;
}

function twitch_signout() {
	Twitch.logout( on_twitch_logout_success, on_twitch_logout_fail );
}

function twitch_sub_check() {
	if ( teams.length > 0 ) {
		alert("Only players in lobby will be checked for twitch subscription!");
	}
	
	open_dialog("popup_dlg_pending_action");
	
	document.getElementById("dlg_pending_action_title").innerHTML = "Twitch";
	document.getElementById("dlg_pending_action_message").innerHTML = "Loading Twitch subscribers list...";
	document.getElementById("popup_dlg_pending_action_loader").style.display = "";
	document.getElementById("popup_dlg_pending_action_ok").disabled = true;
	
	Twitch.getAllSubscibers( on_twitch_subs_get_complete, on_twitch_subs_get_fail, on_twitch_subs_get_unathorized );
}

function twitch_sub_reset() {
	if( ! confirm("Clear twitch subscribers list?") ) {
		return;
	}
	
	twitch_subs_list = [];
	save_twitch_subs_list();
	redraw_lobby();
}

function update_all_stats() {
	open_dialog("popup_dlg_stats_update_init");
	on_stats_update_limit_change();
}

function update_current_player_stats() {
	// forcing update of manually edited fields
	delete player_being_edited.se;
	delete player_being_edited.ce;
	delete player_being_edited.le;
	
	StatsUpdater.addToQueue( player_being_edited, 0, true );
	
	document.getElementById("dlg_update_player_stats_loader").style.display = "";
	document.getElementById("dlg_edit_player_update_result").style.display = "none";
	document.getElementById("dlg_edit_player_update_result").innerHTML = "";
}

function update_stats_ok() {
	close_dialog("popup_dlg_stats_update_init");
	clear_stats_update_log();
	
	// pass date limit to updater
	var raw_value = Number(document.getElementById("stats_update_limit").value);
	var stats_max_age = convert_range_log_scale( raw_value, 1, 3000 ) - 1;
	
	StatsUpdater.addToQueue( lobby, stats_max_age );
	for( t in teams ) {
		StatsUpdater.addToQueue( teams[t].players, stats_max_age);
	}
}

/*
*		UI events
*/

function on_lobby_filter_change() {
	clearTimeout( lobby_filter_timer );
	lobby_filter_timer = setTimeout( apply_lobby_filter, 400 );
}

function on_player_edit_main_class_change() {
	var new_class = document.getElementById("dlg_main_class").value;
	var icon_src = "class_icons/"+new_class+".png";
	if (new_class == "" ) {
		// 1px image. Empty src causes image to collapse in chrome
		icon_src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs%3D";
	}
	document.getElementById("dlg_player_main_class_icon").src = icon_src;
}

function on_player_edit_secondary_class_change() {
	var new_class = document.getElementById("dlg_secondary_class").value;
	var icon_src = "class_icons/"+new_class+".png";
	if (new_class == "" ) {
		icon_src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs%3D";
	}
	document.getElementById("dlg_player_secondary_class_icon").src = icon_src;
}

function on_player_edit_sr_change() {
	var new_sr = Number(document.getElementById("dlg_player_sr").value);
	var rank_name = get_rank_name(new_sr);
	var rank_icon = document.getElementById("dlg_player_sr_icon");
	rank_icon.src = get_rank_icon_src( rank_name );
	rank_icon.title = rank_name;
}

function on_player_class_sr_changed(ev) {
	var sr_edit = ev.currentTarget;
	var rank_name = get_rank_name( sr_edit.value );
	var sr_img = sr_edit.parentElement.getElementsByClassName("rank-icon-dlg")[0];	
	sr_img.src = "rank_icons/"+rank_name+"_small.png";
	sr_img.title = rank_name;
}

function on_player_edit_class_toggled(ev) {
	var class_checkbox = ev.currentTarget;
	var current_row = get_parent_element( class_checkbox, "TR" );

	if ( class_checkbox.checked ) {
		current_row.classList.remove("class-disabled");
	} else {
		current_row.classList.add("class-disabled");
	}
}

function on_stats_update_limit_change() {
	// convert from log scale
	var raw_value = Number(document.getElementById("stats_update_limit").value);
	var max_stats_age_days = convert_range_log_scale( raw_value, 1, 3000 ) - 1;
	document.getElementById("dlg_stats_update_days").innerHTML = max_stats_age_days;
	var max_stats_age_date = new Date(Date.now() - (max_stats_age_days*24*3600*1000));
	document.getElementById("dlg_stats_update_date").innerHTML = max_stats_age_date.toLocaleDateString();
}

function manual_checkin_checkbox_change(ev){
	var cbox = ev.target;
	var tr = cbox.parentNode.parentNode;
	
	manual_checkin_toggle_player( tr, cbox );
}

function manual_checkin_row_click(ev) {
	var tr = ev.currentTarget;
	var cbox = tr.cells[0].getElementsByTagName("input")[0];
	
	if (ev.target.tagName.toLowerCase() != "input") {
		cbox.checked = ! cbox.checked;
	}
	
	manual_checkin_toggle_player( tr, cbox );
}

function manual_checkin_toggle_player( tr, cbox ) {
	var player_id = cbox.getAttribute("player_id");
	if ( cbox.checked ) {			
		if ( checkin_list.indexOf(player_id) == -1 ) {
			checkin_list.push(player_id);
			save_checkin_list();
			tr.classList.toggle("checked", true);
		}
	} else {
		var index = checkin_list.indexOf(player_id);
		if (index !== -1) {
			checkin_list.splice( index, 1 );
			save_checkin_list();
			tr.classList.toggle("checked", false);
		}
	}
	
	document.getElementById("manual_checkin_table").tFoot.getElementsByTagName("td")[0].innerHTML = checkin_list.length;
}

function new_player_keyup(ev) {
	ev.preventDefault();
    if (ev.keyCode == 13) { //enter pressed
		if ( ! document.getElementById("add_btn").disabled ) {
			add_player_click();
		}
    }
}

function player_allowDrop(ev) {
    ev.preventDefault();
	ev.dataTransfer.dropEffect = "move";
}

function player_contextmenu(ev) {
	ev.preventDefault();
	
	var player_id = ev.currentTarget.id;
	player_being_edited = find_player_by_id(player_id);
	
	fill_player_stats_dlg();
	
	open_dialog("popup_dlg_edit_player");
}

function player_dblClick(ev) {
	var selected_id = ev.currentTarget.id;
	
	if (selected_id == "") {
		return;
	}

	// detect selected team
	var selected_team;
	var selected_team_struct;
	var parent_id = ev.currentTarget.parentElement.parentElement.id;
	if (parent_id == "lobby") {
		selected_team = lobby;
	} else {
		for( var t=0; t<teams.length; t++ ) {
			for ( let class_name in teams[t].slots ) {
				for( var i=0; i<teams[t].slots[class_name].length; i++) {
					if ( selected_id == teams[t].slots[class_name][i].id) {
						selected_team = teams[t].slots[class_name];
						selected_team_struct = teams[t];
					}
				}
			}
		}
	}
	
	// find index in team for player
	var selected_index = get_player_index( selected_id, selected_team );
	var selected_player = selected_team[selected_index];
	
	// update captain_id
	if ( selected_team_struct !== undefined ) {
		if ( selected_team_struct.captain_id == selected_id ) {
			selected_team_struct.captain_id = "";
		}
	}
	
	// detect target team
	var new_team;
	if (selected_team == lobby) {
		new_team = find_team_with_free_slot( selected_player );
		
		// if all teams are full - create new
		if ( new_team === undefined ) {
			var new_team_struct = create_empty_team();
			new_team_struct.name = "New team";
			teams.push( new_team_struct );
			new_team = new_team_struct.slots[ selected_player.classes[0] ];
		}
	} else {
		new_team = lobby;
	}
	
	// move player
	new_team.push( selected_player );
	selected_team.splice(selected_index, 1);
	
	save_players_list();
	redraw_lobby();
	redraw_teams();
}

function player_drag(ev) {
	 ev.dataTransfer.setData("text/plain", ev.currentTarget.id);
	 ev.dataTransfer.effectAllowed = "move";
	 ev.dropEffect = "move";
}

function player_drop(ev) {
	ev.preventDefault();
	ev.stopPropagation();
	
    var dragged_id = ev.dataTransfer.getData("text");
	var target_id = ev.currentTarget.id;
	if (dragged_id == target_id) {
		return false;
	}
	
	var drag_action = "swap";
	
	if( target_id == "trashcan" ) {
		drag_action = "remove";
		target_id = "";
	}
	
	// find team and index in team for both players 
	var dragged_team;
	var dragged_team_struct;
	var dragged_index;
	var dragged_player;
	var target_team;
	var target_team_struct;
	var target_index;
	var target_player;
	
	for( var i=0; i<lobby.length; i++) {
		if ( dragged_id == lobby[i].id) {
			dragged_team = lobby;
			dragged_index = i;
			dragged_player = lobby[i];
		}
		if ( target_id == lobby[i].id) {
			target_team = lobby;
			target_index = i;
			target_player = lobby[i];
		}
	}
	for( var t=0; t<teams.length; t++ ) {
		for ( let class_name in teams[t].slots ) {
			for( var i=0; i<teams[t].slots[class_name].length; i++) {
				if ( dragged_id == teams[t].slots[class_name][i].id) {
					dragged_team = teams[t].slots[class_name];
					dragged_team_struct = teams[t];
					dragged_index = i;
					dragged_player = teams[t].slots[class_name][i];
				}
				if ( target_id == teams[t].slots[class_name][i].id) {
					target_team = teams[t].slots[class_name];
					target_team_struct = teams[t];
					target_index = i;
					target_player = teams[t].slots[class_name][i];
				}
			}
		}
	}
	
	// update captain_id
	if ( dragged_team_struct !== undefined ) {
		// captain moved out of team
		if ( (dragged_team_struct.captain_id == dragged_id) && ( dragged_team_struct !== target_team_struct ) ) {
			dragged_team_struct.captain_id = "";
		}
		
		// if captain swapped with another player within team - no need to update captain_id
	}
	if ( target_team_struct !== undefined ) {
		// player replaces captain of new team
		if ( (target_team_struct.captain_id == target_id) && ( dragged_team !== target_team ) ) {
			target_team_struct.captain_id = "";
		}
	}
	
	if ( (target_id == "") && (drag_action != "remove") ) {
		// dropped on empty slot
		var parent_id = ev.currentTarget.parentElement.parentElement.id;
		if (parent_id == "lobby") {
			target_team = lobby;
			target_index = lobby.length;
		} else {
			var team_node = ev.currentTarget.parentElement.parentElement.parentElement.parentElement;
			var team_index = Array.prototype.indexOf.call( document.getElementById("teams_container").children , team_node);
			if ( team_index !== -1 ) {
				target_team = teams[team_index][ ev.currentTarget.getAttribute("slotClass") ];
				target_index = teams[team_index][ ev.currentTarget.getAttribute("slotClass") ].length;
			} else {
				// wtf?
				return false;
			}
		}
		
		if ( dragged_team == target_team ) {
			// just move to end within team
			target_index = target_team.length - 1;
		} else {
			drag_action = "move"; 
		}
	}
	
	if ((target_team == lobby) && (dragged_team != lobby)) {
		drag_action = "move"; 
	}
	
	if (drag_action == "move") {
		// move dragged player to target team (lobby)
		target_team.splice(target_index, 0, dragged_player);
		dragged_team.splice(dragged_index, 1);
	} else {
		if (target_id == "") {
			// remove dragged player from source team
			dragged_team.splice(dragged_index, 1);
		} else {
			// replace dragged player with target
			dragged_team[dragged_index] = target_player;
		}
	}
	
	if (drag_action == "swap") {
		// replace target with dragged player
		target_team[target_index] = dragged_player;
	}
	
	if (drag_action == "remove") {
		// remove from update queue
		StatsUpdater.removeFromQueue(dragged_id);
	}
	
	save_players_list();
	redraw_lobby();
	redraw_teams();
}

function roll_adjust_sr_change() {
	var adjust_enabled = document.getElementById("roll_adjust_sr").checked;
	var inputs = document.getElementById("roll_adjust_sr_sub").getElementsByTagName("INPUT");
	for (var i=0; i<inputs.length; i++ ) {
		inputs[i].disabled = ! adjust_enabled;
	}
}

function roll_balance_priority_input_change(input) {
	if (Number(input.value) < 0) {
		input.value = 0;
	}
	if (Number(input.value) > 100) {
		input.value = 100;
	}
	
	// change remaining balance factor proportionally
	var input_names = [
		"roll_balance_priority_sr",
		"roll_balance_priority_class",
		"roll_balance_priority_dispersion"
	];
	input_names.splice( input_names.indexOf(input.id), 1 );
	
	var input_values = [];
	var values_sum = 0;
	for (var i=0; i<input_names.length; i++ ) {
		let input_value = Number(document.getElementById(input_names[i]).value);
		input_values.push( input_value );
		values_sum += input_value;
	}
	
	var reminder = 100 - Number(input.value);
	
	var new_sum = 0;
	var max_index = 0;
	for (var i=0; i<input_values.length; i++ ) {
		if (values_sum > 0 ) {
			input_values[i] = Math.round( reminder * input_values[i]/values_sum );
		} else {
			input_values[i] = 0;
		}
		new_sum += input_values[i];
		if ( input_values[i] > input_values[max_index] ) {
			max_index = i;
		}
	}
	
	// rounding error
	input_values[max_index] += reminder - new_sum;
	
	for (var i=0; i<input_names.length; i++ ) {
		document.getElementById(input_names[i]).value = input_values[i];
	}
	
	// redraw canvas
	var pointer = balance_priority_calc_pointer( 
		Number(document.getElementById("roll_balance_priority_sr").value),
		Number(document.getElementById("roll_balance_priority_class").value),
		Number(document.getElementById("roll_balance_priority_dispersion").value)
	);

	balance_priority_draw_canvas( pointer.x, pointer.y );
}

function settings_on_range_change( range_input, include_sign=false ) {
	var span = document.getElementById(range_input.id+"_value");
	if (span !== null) {
		var value = Number(range_input.value);
		if (include_sign) {
			if (value >= 0) {
				value = "+"+value;
			} else {
				value = "-"+value;
			}
		}
		span.innerHTML = value;
	}
}

function team_contextmenu(ev) {
	ev.preventDefault();
	
	var team_node = ev.currentTarget;
	while (team_node.parentElement.id != "teams_container" ) {
		team_node = team_node.parentElement;
	}
	
	var team_index = Array.prototype.indexOf.call( document.getElementById("teams_container").children , team_node);
	edit_team(team_index);
}

function twitch_checkin_channel_keyup(ev) {
	ev.preventDefault();
    if (ev.keyCode == 13) { //enter pressed
		if ( ! document.getElementById("twitch_checkin_connect").disabled ) {
			twitch_chat_connect();
		}
    }
}

function twitch_checkin_keyword_change() {
	twitch_checkin_keyword = document.getElementById("twitch_checkin_keyword").value;
	twitch_chat_print_sysmessage( "keyword changed to '"+twitch_checkin_keyword+"'" );
	
	localStorage.setItem( storage_prefix+"twitch_checkin_keyword", twitch_checkin_keyword );
}

/*
*		Other events
*/

function on_player_stats_updated( player_id ) {
	if ( player_being_added !== undefined ) {
		if ( player_id == player_being_added.id ) {
			// add new player to lobby
			lobby.push( player_being_added );
			save_players_list();
			redraw_lobby();
			highlight_player( player_id );
			setTimeout( function() {document.getElementById(player_id).scrollIntoView(false);}, 100 );
			document.getElementById("new_player_id").value = "";
			document.getElementById("add_btn").disabled = false;
			
			player_being_added = undefined;
		}
	} else {
		if ( player_being_edited !== undefined  ) {
			if ( player_id == player_being_edited.id ) {
				// redraw edit dialog
				fill_player_stats_dlg(false);
				
				// hide loader
				document.getElementById("dlg_update_player_stats_loader").style.display = "none";
			}
		}
		
		// find and redraw player
		var player_struct = find_player_by_id( player_id );
		if ( player_struct !== undefined ) {
			redraw_player( player_struct );
			highlight_player( player_id );
			save_players_list();
		}
	}
}

function on_rtb_worker_message(e) {
	if ( ! Array.isArray(e.data) ) {
		return;
	}
	if ( e.data.length == 0 ) {
		return;
	}
	
	var event_type = e.data[0];
	if ( event_type == "progress" ) {
		if (e.data.length < 2) {
			return;
		}
		var progress_struct = e.data[1];
		document.getElementById("roll_progress_bar").value = progress_struct.current_progress;
		document.getElementById("dlg_roll_progress_text").innerHTML = progress_struct.current_progress.toString() + " %";
	} else if ( event_type == "finish" ) {
		if (e.data.length < 2) {
			return;
		}
		var result_struct = e.data[1];
		lobby = result_struct.players;
		teams = result_struct.teams;
		
		save_players_list();
		redraw_lobby();
		sort_teams(undefined, 'captain_sr');
		
		document.getElementById("roll_progress_bar").value = 100;
		document.getElementById("dlg_roll_progress_text").innerHTML = "Roll complete";
		setTimeout( function(){close_dialog("popup_dlg_roll_progress")}, 1000 );
	} else if ( event_type == "dbg" ) {
		if (e.data.length < 2) {
			return;
		}
		
		var dbg_msg = e.data[1];
		document.getElementById("debug_log").innerHTML += dbg_msg+"</br>";
	}
}

function on_stats_update_complete() {
	document.getElementById("stats_updater_status").innerHTML = "Update complete";
	setTimeout( draw_stats_updater_status, StatsUpdater.min_api_request_interval );
	document.getElementById("roll_btn").disabled = false;
	
	document.getElementById("update_all_stats_btn").style.display = "";
	document.getElementById("update_stats_stop_btn").style.display = "none";
	document.getElementById("stats_update_progress").style.visibility = "hidden";
}

function on_stats_update_error( player_id, error_msg ) {
	log_stats_update_error( player_id+": "+error_msg );
	
	if ( player_being_added !== undefined ) {
		if ( player_being_added.id == player_id ) {
			if( confirm("Can't get player stats: "+error_msg+"\nAdd manually?") ) {
				var new_player = create_empty_player();
				new_player.id = player_id;
				new_player.display_name = format_player_name( player_id );
				
				new_player.order = get_new_player_order();
				delete new_player.empty;
				
				lobby.push( new_player );
				save_players_list();
				redraw_lobby();
				highlight_player( player_id );
				document.getElementById("new_player_id").value = "";				
				
				// open edit dialog
				player_being_edited = new_player;
				fill_player_stats_dlg();
				open_dialog("popup_dlg_edit_player");
			}
			
			document.getElementById("add_btn").disabled = false;
			
			// release created object for garbage collector
			player_being_added = undefined;
		}
	}
	
	if ( player_being_edited !== undefined  ) {
		if ( player_id == player_being_edited.id ) {
			// hide loader, show message
			document.getElementById("dlg_update_player_stats_loader").style.display = "none";
			document.getElementById("dlg_edit_player_update_result").style.display = "";
			document.getElementById("dlg_edit_player_update_result").innerHTML = escapeHtml( error_msg );
		}
	}
}

function on_stats_update_warning( player_id, error_msg ) {
	log_stats_update_error( player_id+": "+error_msg );
	
	if ( player_being_edited !== undefined  ) {
		if ( player_id == player_being_edited.id ) {
			document.getElementById("dlg_edit_player_update_result").innerHTML = escapeHtml( error_msg );
		}
	}
}

function on_stats_update_progress() {
	draw_stats_updater_status();
}

function on_stats_update_start() {
	document.getElementById("roll_btn").disabled = true;
	
	document.getElementById("update_all_stats_btn").style.display = "none";
	document.getElementById("update_stats_stop_btn").style.display = "";

	document.getElementById("stats_update_progress").style.visibility = "visible";
	clear_stats_update_log();
	draw_stats_updater_status();
}

function on_twitch_chat_connect() {
	document.getElementById("twitch_checkin_connect").style.display = "none";
	document.getElementById("twitch_checkin_disconnect").style.display = "inline";
	document.getElementById("twitch_checkin_disconnect").disabled = false;
	twitch_chat_print_sysmessage( "connected to #"+TwitchChat.channel_name );
}

function on_twitch_chat_debug( msg_struct ) {
	if ( ! twitch_chat_debug ) {
		return;
	}
	document.getElementById("debug_log").innerHTML += "raw: " 		+ msg_struct.raw_msg + "<br/>";
	document.getElementById("debug_log").innerHTML += "prefix: " 	+ msg_struct.prefix + "<br/>";
	document.getElementById("debug_log").innerHTML += "command: " 	+ msg_struct.command + "<br/>";
	document.getElementById("debug_log").innerHTML += "params: " 	+ msg_struct.params + "<br/>";
	document.getElementById("debug_log").innerHTML += "params array: " 	+ JSON.stringify(msg_struct.params_array, null, ' ') + "<br/>";
	document.getElementById("debug_log").innerHTML += "<br/><br/>";
}

function on_twitch_chat_disconnect() {
	document.getElementById("twitch_checkin_connect").style.display = "inline";
	document.getElementById("twitch_checkin_connect").disabled = false;
	document.getElementById("twitch_checkin_disconnect").style.display = "none";
	twitch_chat_print_sysmessage( "disconnected from #"+TwitchChat.channel_name );
}

function on_twitch_chat_error( msg_text ) {
	twitch_chat_print_sysmessage( "Error:" + msg_text );
}

function on_twitch_chat_message( message_username, message_text ) {
	var chat_container = document.getElementById("twitch_checkin_chat");
	
	if ( chat_container.childElementCount >= twitch_chat_max_messages ) {
		// remove oldest message
		let oldest_message = chat_container.children[0];
		oldest_message.parentNode.removeChild(oldest_message);
	}
	
	var msg_container = document.createElement("div");
	msg_container.className = "twitch-chat-msg";
	
	// timestamp
	var span = document.createElement("span");
	span.className = "twitch-chat-timestamp";
	var text_node = document.createTextNode( print_time( new Date() ) );
	span.appendChild(text_node);
	msg_container.appendChild(span);
	
	// user name
	var span = document.createElement("span");
	span.className = "twitch-chat-username";
	var text_node = document.createTextNode( message_username );
	span.appendChild(text_node);
	msg_container.appendChild(span);
	
	// separator
	var text_node = document.createTextNode( ": " );
	msg_container.appendChild(text_node);
	
	// message text
	// search keyword and split message text for highlighting
	var keyword_found = false;
	var current_pos = 0;
	if ( twitch_checkin_keyword != "" ) {
		var keyword_pos = message_text.toLowerCase().indexOf(twitch_checkin_keyword.toLowerCase());
		while ( keyword_pos != -1 ) {
			var keyword_found = true;
			var text_part = message_text.slice( current_pos, keyword_pos );
			
			var span = document.createElement("span");
			var text_node = document.createTextNode( text_part );
			span.appendChild(text_node);
			msg_container.appendChild(span);
			
			text_part = message_text.slice( keyword_pos, keyword_pos+twitch_checkin_keyword.length );
			
			span = document.createElement("span");
			span.className = "twitch-chat-keyword";
			text_node = document.createTextNode( text_part );
			span.appendChild(text_node);
			msg_container.appendChild(span);
			
			current_pos = keyword_pos+twitch_checkin_keyword.length;
			
			keyword_pos = message_text.toLowerCase().indexOf(twitch_checkin_keyword.toLowerCase(), current_pos);
		}
	} else {
		keyword_found = true;
	}
	
	if ( current_pos < message_text.length ) {
		var text_part = message_text.slice( current_pos );
		
		var span = document.createElement("span");
		var text_node = document.createTextNode( text_part );
		span.appendChild(text_node);
		msg_container.appendChild(span);
	}
	
	// autoscroll if at end
	var shouldScroll = chat_container.scrollTop + chat_container.clientHeight + 20 >= chat_container.scrollHeight;
	
	chat_container.appendChild(msg_container);
		
	if ( shouldScroll ) {
		msg_container.scrollIntoView({behavior: "auto", block: "end", inline: "nearest"});
	}
	
	if ( keyword_found ) {
		twitch_chat_keyword_message( message_username );
	}
}

function on_twitch_chat_sysmessage( msg_text ) {
	twitch_chat_print_sysmessage( msg_text );
}

function on_twitch_getuser_success() {
	document.getElementById("twitch_login_name").innerHTML = escapeHtml( Twitch.user_display_name );
	document.getElementById("twitch_profile_image").src = Twitch.user_profile_image_url;
	
	// unlock twitch buttons
	document.getElementById("twitch_sub_check_btn").disabled = false;
	document.getElementById("twitch_checkin_btn").disabled = false;
	
	Twitch.getSubscriberIcon( on_twitch_sub_icon_success, undefined, on_twitch_unathorized );
}

function on_twitch_getuser_fail( error_msg ) {
	alert("Cant get Twitch user data: "+error_msg);
}

function on_twitch_logout_success() {
	document.getElementById("twitch_signin").style.display = "block";
	document.getElementById("twitch_user_info").style.display = "none";
	localStorage.removeItem( storage_prefix+"twitch_token" );
	localStorage.setItem( storage_prefix+"twitch_logged_out", true );
	document.getElementById("twitch_signin_link").href = Twitch.getLoginURL();
	
	// lock actions with auth requirement
	document.getElementById("twitch_sub_check_btn").disabled = true;
	document.getElementById("twitch_checkin_btn").disabled = true;
}

function on_twitch_logout_fail( error_msg ) {
	alert("Twitch logout failed: "+error_msg);
}

function on_twitch_sub_icon_success( icon_src ) {
	twitch_sub_icon_src = icon_src;
}

function on_twitch_subs_get_complete( subscibers_map ) {
	let twitch_subs_last_checked = new Date();
	localStorage.setItem( storage_prefix+"twitch_subs_last_checked", twitch_subs_last_checked.toJSON() );
	document.getElementById("twitch_subs_last_checked_date").innerHTML = print_date( twitch_subs_last_checked, true );
	
	twitch_subs_list = [];
	var players_with_twitch_accs = 0;
	for (var i=0; i<lobby.length; i++) {
		// twitch logins are lower case
		if ( lobby[i].twitch_name.trim() != "" ) {
			players_with_twitch_accs++;
			var sub_info = subscibers_map.get( lobby[i].twitch_name.toLowerCase() );
			if ( sub_info !== undefined ) {
				twitch_subs_list.push( lobby[i].id );
			}
		}
	}
	
	document.getElementById("popup_dlg_pending_action_loader").style.display = "none";
	document.getElementById("dlg_pending_action_message").innerHTML = "Total subscribers: "+subscibers_map.size;
	document.getElementById("dlg_pending_action_message").innerHTML += "<br/>Players with Twitch names: "+players_with_twitch_accs;
	document.getElementById("dlg_pending_action_message").innerHTML += "<br/>Players with subscription: "+twitch_subs_list.length;
	document.getElementById("popup_dlg_pending_action_ok").disabled = false;
	
	save_twitch_subs_list();
	redraw_lobby();
}

function on_twitch_subs_get_fail( error_msg ) {
	document.getElementById("popup_dlg_pending_action_loader").style.display = "none";
	document.getElementById("dlg_pending_action_message").innerHTML = "Twitch error: "+error_msg+"</br>";
	document.getElementById("popup_dlg_pending_action_ok").disabled = false;
}

function on_twitch_subs_get_unathorized() {
	document.getElementById("popup_dlg_pending_action_loader").style.display = "none";
	document.getElementById("dlg_pending_action_message").innerHTML = "Twitch authorisation failed</br>";
	document.getElementById("popup_dlg_pending_action_ok").disabled = false;
	on_twitch_unathorized();
}

function on_twitch_unathorized() {
	// probably token expired
	document.getElementById("twitch_signin").style.display = "block";
	document.getElementById("twitch_user_info").style.display = "none";
	document.getElementById("twitch_sub_check_btn").disabled = true;
	document.getElementById("twitch_checkin_btn").disabled = true;
	
	localStorage.removeItem( storage_prefix+"twitch_token" );
}

/*
*		Common UI functions
*/

function apply_lobby_filter() {
	var filter_value = document.getElementById("lobby_filter").value.toLowerCase();
	if (filter_value != "") {
		document.getElementById("lobby_filter").classList.add("filter-active");
	} else {
		document.getElementById("lobby_filter").classList.remove("filter-active");
	}
	
	for( var i=0; i<lobby.length; i++) {
		if ( filter_value == "" || lobby[i].display_name.toLowerCase().includes( filter_value )
			|| lobby[i].id.toLowerCase().includes( filter_value ) || lobby[i].twitch_name.toLowerCase().includes( filter_value ) ) {
			document.getElementById(lobby[i].id).parentElement.style.display = "table-row";
		} else {
			document.getElementById(lobby[i].id).parentElement.style.display = "none";
		}
	}
}

function balance_priority_calc_pointer( priority_sr, priority_class, priority_dispersion ) {
	var triangle = get_balance_triangle_dimensions();
	
	//denormalize distances
	if ( priority_class > 0 ) {
		denorm_class = triangle.width / 
			( 1/Math.cos(30*Math.PI/180) +
			2/Math.tan(60*Math.PI/180)*priority_sr/priority_class +
			priority_dispersion/priority_class/Math.cos(30*Math.PI/180) );
		denorm_sr = denorm_class * priority_sr/priority_class;
		denorm_disp = denorm_class * priority_dispersion/priority_class;
	} else if ( priority_sr > 0 ) {
		denorm_class = 0;
		denorm_sr = Math.round( triangle.width * Math.sin(60*Math.PI/180) / ( 1 + priority_dispersion/priority_sr));
		denorm_disp = Math.round( denorm_sr * priority_dispersion/priority_sr );
	} else {
		denorm_class = 0;
		denorm_sr = 0;
		denorm_disp = Math.round( triangle.width * Math.sin(60*Math.PI/180) );
	}
	
	// calc pointer coordinates
	x = Math.round( triangle.width + triangle.offset_x - denorm_class/Math.cos(30*Math.PI/180) - denorm_sr/Math.tan(60*Math.PI/180) );
	y = Math.round( triangle.height + triangle.offset_y - denorm_sr );
	
	return {
		x: x,
		y: y
	};
}

function balance_priority_draw_canvas( pointer_x, pointer_y ) {
	var canvas = document.getElementById("roll_balance_priority_canvas");
	if (canvas.getContext) {
		var ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		// draw triangle
		var triangle = get_balance_triangle_dimensions();
	
		ctx.beginPath();
		ctx.moveTo(triangle.offset_x, triangle.height + triangle.offset_y);
		ctx.lineTo(triangle.offset_x + triangle.width, triangle.height + triangle.offset_y);
		ctx.lineTo(triangle.offset_x + triangle.width/2, triangle.offset_y);
		ctx.closePath();
 
		ctx.lineWidth = 3;
		ctx.strokeStyle = '#666666';
		ctx.stroke();
		
		ctx.fillStyle = balance_priority_canvas_gradient;
		ctx.fill();
		
		// draw pointer circle
		ctx.beginPath();
		ctx.arc(pointer_x, pointer_y, 8, 0, 2 * Math.PI);
		ctx.lineWidth = 2;
		ctx.strokeStyle = '#0000FF';
		ctx.stroke();
		ctx.closePath();
	}
}

function draw_player( player_struct, small=false, is_captain=false, slot_class=undefined ) {
	var new_player_item_row = document.createElement("div");
	new_player_item_row.className = "row";
	
	if ( slot_class != undefined ) {
		var class_cell = document.createElement("div");
		class_cell.className = "cell class-cell";
		
		var class_icon = document.createElement("img");
		class_icon.className = "class-icon-slot";
		class_icon.src = "class_icons/"+slot_class+".png";
		class_icon.title = slot_class;
		class_cell.appendChild(class_icon);
		
		new_player_item_row.appendChild(class_cell);
	}
	
	var new_player_cell = draw_player_cell( player_struct, small, is_captain, slot_class );
	new_player_item_row.appendChild(new_player_cell);
	
	return new_player_item_row;
}

function draw_player_cell( player_struct, small=false, is_captain=false, slot_class=undefined ) {
	var text_node;
	var br_node;
	
	var new_player_item = document.createElement("div");
	new_player_item.className = "cell player-item";
	if( player_struct.empty ) {
			new_player_item.classList.add("empty-player");
	}
	new_player_item.id = player_struct.id;
	if( ! player_struct.empty) {
		new_player_item.title = player_struct.id.replace("-", "#");
		new_player_item.title += "\nTwitch name: " + player_struct.twitch_name;		
		new_player_item.title += "\nLevel: " + player_struct.level;
		new_player_item.title += "\nOrder added: #" + player_struct.order;
		for( let class_name of player_struct.classes ) {
			new_player_item.title += "\n"+class_name+": "+is_undefined(player_struct.sr_by_class[class_name],0)+" sr";
		}
	}
	if ( Array.isArray(player_struct.top_heroes) ) {
		new_player_item.title += "\nTop heroes: ";
		for( i=0; i<player_struct.top_heroes.length; i++ ) {
			new_player_item.title += player_struct.top_heroes[i].hero;
			if ( i< player_struct.top_heroes.length-1) {
				new_player_item.title += ", ";
			}
		}
	}
	new_player_item.title += "\nLast updated: " + print_date(player_struct.last_updated);
	if ( is_captain ) {
		new_player_item.title += "\nTeam captain";
	}
	
	if( ! player_struct.empty) {
		new_player_item.draggable = true;
	}
	new_player_item.ondragstart = function(event){player_drag(event);};
	new_player_item.ondrop = function(event){player_drop(event);};
	new_player_item.ondragover = function(event){player_allowDrop(event);};
	new_player_item.ondblclick = function(event){player_dblClick(event);};
	new_player_item.oncontextmenu = function(event){player_contextmenu(event);};
	
	if( slot_class != undefined ) {
		new_player_item.setAttribute( "slotClass", slot_class );
	}
	
	// player background color depending on check-in process (only in lobby)
	if ( !small ) {	
		if ( is_active_player(player_struct) ) {
			new_player_item.classList.add("player-roll-allow");
		} else {
			new_player_item.classList.add("player-roll-deny");
		}
	}
	
	// rank icon
	var player_icon = document.createElement("div");
	player_icon.className = "player-icon";
	if ( small ) {
		player_icon.classList.add("player-icon-small");
	}
		
	var icon_image = document.createElement("div");
	icon_image.className = "icon-image";
	
	var img_node = document.createElement("img");
	img_node.className = "rank-icon";
	if ( small ) {
		img_node.classList.add("rank-icon-small");
	}
	var player_sr = get_player_sr( player_struct, slot_class );
	var rank_name = get_rank_name( player_sr );
	img_node.src = get_rank_icon_src( rank_name, player_struct.id );
	img_node.title = rank_name;
	icon_image.appendChild(img_node);
	player_icon.appendChild(icon_image);
	
	// SR value
	if ( (! small) || Settings["show_numeric_sr"] ) {
		if (! small) {
			br_node = document.createElement("br");
			player_icon.appendChild(br_node);
		}
	
		var icon_sr = document.createElement("div");
		icon_sr.className = "icon-sr";
	
		var sr_display = document.createElement("span");
		sr_display.id = "sr_display_"+player_struct.id;
		var sr_text = player_sr;
		if( player_struct.empty ) {
			sr_text = '\u00A0';
		}
		text_node = document.createTextNode( sr_text );
		sr_display.appendChild(text_node);
		if( player_struct.se === true ) {
			sr_display.classList.add("sr-edited");
		}
		icon_sr.appendChild(sr_display);
	
		player_icon.appendChild(icon_sr);
	}
	new_player_item.appendChild(player_icon);
	
	// space after rank icon
	text_node = document.createTextNode("\u00A0");
	new_player_item.appendChild(text_node)
	
	// player name
	var player_name = document.createElement("div");
	if ( small ) {
		player_name.className = "player-name-small";
	} else {
		player_name.className = "player-name";
	}
		
	var name_display = document.createElement("span");
	name_display.id = "name_display_"+player_struct.id;
	var display_name = player_struct.display_name;
	if ( display_name == "" ) {
		display_name = "\u00A0"; // nbsp
	}
	text_node = document.createTextNode( display_name );
	name_display.appendChild(text_node);
	player_name.appendChild(name_display);
	
	// captain mark
	if ( is_captain || ( (!small) && player_struct.captain ) ) {
		var captain_icon = document.createElement("span");
		captain_icon.className = "captain-mark";
		captain_icon.title = "team captain";
		text_node = document.createTextNode( " \u265B" );
		captain_icon.appendChild(text_node);
		player_name.appendChild(captain_icon);
	}
	
	// twitch sub mark
	if ( (!small) && (twitch_subs_list.indexOf(player_struct.id) !== -1) ) {
		if ( twitch_sub_icon_src != "" ) {
			var mark_display = document.createElement("img");
			mark_display.src = twitch_sub_icon_src;
			mark_display.alt = "[sub]";
			mark_display.title = "Twitch subsciber";
			mark_display.className = "player-twitch-sub-mark";
			player_name.appendChild(mark_display);
		} else {
			// default sub icon
			var mark_display = document.createElement("span");
			mark_display.className = "player-twitch-sub-mark-default";
			mark_display.title = "Twitch subsciber";
			text_node = document.createTextNode( "\u2B50" );
			mark_display.appendChild(text_node);
			player_name.appendChild(mark_display);
		}
	}
	
	// check-in mark
	if ( (!small) && (checkin_list.indexOf(player_struct.id) !== -1) ) {
		var mark_display = document.createElement("span");
		mark_display.className = "player-checkin-mark";
		mark_display.title = "Checked-in";
		text_node = document.createTextNode( "\u2713" );
		mark_display.appendChild(text_node);
		player_name.appendChild(mark_display);
	}
	
	new_player_item.appendChild(player_name);
	
	// active classes icons
	if ( player_struct.classes !== undefined ) {
		for(var i=0; i<player_struct.classes.length; i++) {
			var class_icon = document.createElement("img");
			class_icon.className = "class-icon";
			if( i != 0 )  {
				class_icon.classList.add("secondary-class");
			}
			if ( small ) {
				class_icon.classList.add("class-icon-small");
			}
			if( player_struct.ce === true ) {
				class_icon.classList.add("class-edited");
			}
			class_icon.src = "class_icons/"+player_struct.classes[i]+".png";
			class_icon.title = player_struct.classes[i] + " " + is_undefined(player_struct.sr_by_class[player_struct.classes[i]],0) + " SR";
			new_player_item.appendChild(class_icon);
		}
	}
	
	return new_player_item;
}

function draw_stats_updater_status() {
	var updater_status_txt = "";
	if ( StatsUpdater.state == StatsUpdaterState.updating ) {
		updater_status_txt += "Updating stats <br/>"+ StatsUpdater.currentIndex + " / " + StatsUpdater.totalQueueLength;
		updater_status_txt += " "+StatsUpdater.current_id;
	}
	document.getElementById("stats_updater_status").innerHTML = updater_status_txt;
	
	document.getElementById("stats_update_progress").value = StatsUpdater.currentIndex;
	document.getElementById("stats_update_progress").max = StatsUpdater.totalQueueLength;
}

function fill_edit_team_dlg() {
	if (team_being_edited === undefined) {
		return;
	}
	
	document.getElementById("dlg_edit_team_title").innerHTML = escapeHtml( team_being_edited.name );
	document.getElementById("dlg_edit_team_name").value = team_being_edited.name;
	
	document.getElementById("dlg_edit_team_captain").innerHTML = "";
	
	// empty option to remove captain
	var select_option = document.createElement("option");
	select_option.value = "";
	var text_node = document.createTextNode("-");
	select_option.appendChild(text_node);
	document.getElementById("dlg_edit_team_captain").appendChild(select_option);
	
	for ( var class_name in team_being_edited.slots ) {
		for (var p in team_being_edited.slots[class_name]) {
			var current_player = team_being_edited.slots[class_name][p];
			var select_option = document.createElement("option");
			select_option.value = current_player.id;
			if ( current_player.id == team_being_edited.captain_id ) {
				select_option.selected = true;
			}
			var text_node = document.createTextNode(current_player.display_name);
			select_option.appendChild(text_node);
					
			document.getElementById("dlg_edit_team_captain").appendChild(select_option);
		}
	}
}

function fill_player_stats_dlg(clear_errors=true) {
	if (player_being_edited === undefined) {
		return;
	}
	
	var player_struct = player_being_edited;
	
	document.getElementById("dlg_title_edit_player").innerHTML = escapeHtml( player_struct.display_name );
	
	document.getElementById("dlg_player_id").innerHTML = player_struct.id.replace("-","#");
	document.getElementById("dlg_player_id_link").href = "https://playoverwatch.com/en-us/career/pc/"+player_struct.id;
	document.getElementById("dlg_player_id_link").title = "https://playoverwatch.com/en-us/career/pc/"+player_struct.id;
	
	document.getElementById("dlg_player_twitch_name").value = player_struct.twitch_name;
	if ( player_struct.twitch_name !== "" ) {
		document.getElementById("dlg_player_twitch_link").style.display = "inline";
		document.getElementById("dlg_player_twitch_link").href = "https://www.twitch.tv/"+player_struct.twitch_name;
		document.getElementById("dlg_player_twitch_link").title = "https://www.twitch.tv/"+player_struct.twitch_name;
	} else {
		document.getElementById("dlg_player_twitch_link").style.display = "none";
		document.getElementById("dlg_player_twitch_link").href = "";
		document.getElementById("dlg_player_twitch_link").title = "";
	}
	
	document.getElementById("dlg_player_captain").checked = player_struct.captain;
	
	if ( twitch_subs_list.indexOf(player_struct.id) !== -1 ) {
		document.getElementById("dlg_player_twitch_sub").checked = true;
	} else {
		document.getElementById("dlg_player_twitch_sub").checked = false;
	}
	
	if ( checkin_list.indexOf(player_struct.id) !== -1 ) {
		document.getElementById("dlg_player_checkin").checked = true;
	} else {
		document.getElementById("dlg_player_checkin").checked = false;
	}
	
	document.getElementById("dlg_player_display_name").value = player_struct.display_name;
	if( player_struct.ne === true )  {
		document.getElementById("dlg_player_name_edited").style.visibility = "visible";
	} else {
		document.getElementById("dlg_player_name_edited").style.visibility = "";
	}	
	
	document.getElementById("dlg_player_level").value = player_struct.level;
	if( player_struct.le === true )  {
		document.getElementById("dlg_player_level_edited").style.visibility = "visible";
	} else {
		document.getElementById("dlg_player_level_edited").style.visibility = "";
	}
	
	// fill class table	
	document.getElementById("dlg_player_class_table").innerHTML = "";
	// prepare array of classes, ordered for specified player (main class is first)
	var class_order = [];
	if ( Array.isArray(player_struct.classes) ) {
		for( i=0; i<player_struct.classes.length; i++ ) {
			class_order.push( player_struct.classes[i] );
		}
	}
	for( let class_name of class_names ) {
		if ( class_order.indexOf(class_name) == -1 ) {
			class_order.push( class_name );
		}
	}
	for( let class_name of class_order ) {
		var class_row = player_class_row_add();
		
		//var class_name = player_struct.classes[i];
		var class_checkbox = class_row.getElementsByClassName("dlg-class-enabled-checkbox")[0];
		if ( player_struct.classes.indexOf(class_name) == -1 ) {
			class_checkbox.checked = false;
			class_row.classList.add("class-disabled");
		} else {
			class_checkbox.checked = true;
		}
		
		var class_title = class_row.getElementsByClassName("dlg-class-name")[0];
		class_title.innerHTML = class_name;		
		
		var class_img = class_row.getElementsByClassName("class-icon-dlg")[0];
		class_img.src = "class_icons/"+class_name+".png";
		
		var sr_edit = class_row.getElementsByClassName("dlg-sr-by-class")[0];
		var sr = player_struct.sr_by_class[class_name];
		if ( sr == undefined ) {
			sr = 0;
		}
		sr_edit.value = sr;
		
		var rank_name = get_rank_name( sr );
		var sr_img = class_row.getElementsByClassName("rank-icon-dlg")[0];	
		sr_img.src = "rank_icons/"+rank_name+"_small.png";
		sr_img.title = rank_name;
		
		var time_played = player_struct.playtime_by_class[class_name];
		if ( time_played == undefined ) {
			time_played = 0;
		}
		var time_span = class_row.getElementsByClassName("dlg-payer-class-playtime")[0];
		time_span.innerHTML =  time_played + " hrs";
	}
	
	
	if( player_struct.se === true ) {
		var marks = document.getElementById("dlg_player_class_table").getElementsByClassName("dlg-edited-mark-sr");
		for( i=0; i<marks.length; i++ ) {
			marks[i].style.visibility = "visible";
		}
	}
	
	document.getElementById("dlg_top_heroes_icons").innerHTML = "";
	if ( Array.isArray(player_struct.top_heroes) ) {
		for( i=0; i<player_struct.top_heroes.length; i++ ) {
			var hero_id = player_struct.top_heroes[i].hero;
			if( hero_id == "soldier76") {
				hero_id = "soldier-76";
			}
			if( hero_id == "wrecking_ball") {
				hero_id = "wrecking-ball";
			}
			var img_node = document.createElement("img");
			img_node.className = "hero-icon";
			img_node.src = "https://blzgdapipro-a.akamaihd.net/hero/"+hero_id+"/hero-select-portrait.png";
			img_node.title = hero_id + "\nPlayed: " + player_struct.top_heroes[i].playtime+" h";
			img_node.alt = hero_id;
			document.getElementById("dlg_top_heroes_icons").appendChild(img_node);
		}
	}
	
	if( player_struct.ce === true )  {
		document.getElementById("dlg_player_class1_edited").style.visibility = "visible";		
	} else {
		document.getElementById("dlg_player_class1_edited").style.visibility = "";
	}
	
	document.getElementById("dlg_edit_player_last_updated").innerHTML = print_date(player_struct.last_updated);
	document.getElementById("dlg_update_player_stats_loader").style.display = "none";
	
	if (clear_errors) {
		document.getElementById("dlg_edit_player_update_result").style.display = "none";
		document.getElementById("dlg_edit_player_update_result").innerHTML = "";
	};
}

function fill_settings_dlg( settings_obj ) {
	for ( setting_name in settings_obj ) {
		if ( setting_name == "slots_count" ) {
			continue;
		}
		var setting_value = settings_obj[setting_name];
		var setting_input = document.getElementById(setting_name);
		if (setting_input === null) { alert("input not found: "+setting_name); continue;}
		switch( setting_input.type ) {
			case "checkbox":
				setting_input.checked = setting_value;
				break;
			default:
				setting_input.value = setting_value;
		}
		
		// trigger onchange event to update ui
		if (setting_input.type != "number") {
			setting_input.dispatchEvent(new Event("change"));
		}
	}
	
	var setting_name = "slots_count";
	for ( class_name in settings_obj[setting_name] ) {
		var setting_input = document.getElementById(setting_name+"_"+class_name);
		if (setting_input === null) { alert("broken setting: "+setting_name);}
		var setting_value = settings_obj[setting_name][class_name];
		setting_input.value = setting_value;
	}
	
	// init balance priority input canvas
	var canvas = document.getElementById("roll_balance_priority_canvas");
	var x = 0;
	var y = 0;
	if (canvas.getContext) {
		var ctx = canvas.getContext('2d');
		
		var triangle = get_balance_triangle_dimensions();
	
		canvas.width = triangle.width + triangle.offset_x*2;
		canvas.height = triangle.height + triangle.offset_y*2;
		
		canvas.addEventListener("mousedown", balance_priority_mousedown);
		canvas.addEventListener("mousemove", balance_priority_mousemove);
		canvas.addEventListener("mouseup", balance_priority_mouseup);
		
		// color gradient
		var center = balance_priority_calc_pointer( 34, 33, 33 );
		balance_priority_canvas_gradient = ctx.createRadialGradient(center.x, center.y, 1, center.x, center.y, Math.round(triangle.width/2/Math.cos(30*Math.PI/180)) );
		balance_priority_canvas_gradient.addColorStop(0, "#6be585");
		balance_priority_canvas_gradient.addColorStop(0.3, "#92ac74");
		balance_priority_canvas_gradient.addColorStop(1, "#dd3e54");
		
		var pointer = balance_priority_calc_pointer( settings_obj.roll_balance_priority_sr, settings_obj.roll_balance_priority_class, settings_obj.roll_balance_priority_dispersion );

		balance_priority_draw_canvas( pointer.x, pointer.y );
	}
}

function get_balance_triangle_dimensions() {
	var w = 200;
	var h = Math.round( (w/2) * Math.tan(60*Math.PI/180) );
	return {
		width: w,
		height: h,
		offset_x: 10,
		offset_y: 10
	};
}

function get_parent_element( current_element, parent_tagname ) {
	var parent_element = current_element;
	// ascend in dom tree 
	while ( parent_element.tagName != parent_tagname ) {
		parent_element = parent_element.parentElement;
		if ( parent_element == null ) {
			return null;
		}
	}
	return parent_element;
}

function highlight_player( player_id ) {
	document.getElementById(player_id).classList.toggle("player-highlighted", true);
	setTimeout( reset_highlighted_players, 2000 );
}

function highlight_players( player_list ) {
	for( i=0; i<player_list.length; i++ ) {
		var player_id = "";
		if ( typeof player_list[i] == "String" ) {
			player_id = player_list[i];
		} else {
			player_id = player_list[i].id;
		}
		document.getElementById(player_id).classList.toggle("player-highlighted", true);
	}
	
	setTimeout( reset_highlighted_players, 2000 );
}

function log_stats_update_error( msg ) {
	var log_text = document.getElementById("stats_update_log").value;
	log_text = (log_text + "\n" + msg).trim();
	document.getElementById("stats_update_log").value = log_text;
	
	document.getElementById("stats_update_errors").style.visibility = "visible";
	document.getElementById("stats_update_errors_count").innerHTML = log_text.split("\n").length;
}

function open_dialog( dialog_id ) {
	document.getElementById( dialog_id ).style.display = "block";
}

function player_class_row_add() {
	var class_table = document.getElementById("dlg_player_class_table");
	var row = class_table.insertRow(-1);
	row.className = "dlg-player-class-row";

	var cell, img, input_node, text_node, span_node;

	cell = row.insertCell(-1);
	input_node = document.createElement("input");
	input_node.type = "checkbox";
	input_node.title = "class enabled for balance";
	input_node.className = "dlg-class-enabled-checkbox";
	input_node.checked = true;
	input_node.onchange = function(event){on_player_edit_class_toggled(event);};
	cell.appendChild(input_node);


	cell = row.insertCell(-1);
	cell.style = "text-align: left;";
	img = document.createElement("img");
	img.className = "class-icon-dlg";
	img.src = "class_icons/"+class_names[0]+".png";
	cell.appendChild(img);
	span_node = document.createElement("span");
	span_node.className = "dlg-class-name";
	text_node = document.createTextNode( "class_name" );
	span_node.appendChild(text_node);
	cell.appendChild(span_node);


	cell = row.insertCell(-1);
	img = document.createElement("img");
	img.className = "rank-icon-dlg";
	img.src = "rank_icons/unranked_small.png";
	cell.appendChild(img);
	input_node = document.createElement("input");
	input_node.className = "dlg-sr-by-class";
	input_node.type = "number";
	input_node.min = 0;
	input_node.max = 4999;
	input_node.value = 0;
	input_node.oninput = function(event){on_player_class_sr_changed(event);};
	cell.appendChild(input_node);
	text_node = document.createTextNode( " SR " );
	cell.appendChild(text_node);
	span_node = document.createElement("span");
	span_node.className = "dlg-edited-mark-sr";
	span_node.title = "SR was manually edited";
	span_node.style.visibility = "hidden";
	span_node.onclick = function(event){clear_edited_mark('se');};
	text_node = document.createTextNode( "\u270D" );
	span_node.appendChild(text_node);
	cell.appendChild(span_node);


	cell = row.insertCell(-1);
	span_node = document.createElement("span");
	span_node.className = "dlg-payer-class-playtime";
	text_node = document.createTextNode( "0 hrs" );
	span_node.appendChild(text_node);
	cell.appendChild(span_node);


	cell = row.insertCell(-1);
	input_node = document.createElement("input");
	input_node.type = "button";
	input_node.value = "\u2191";
	input_node.onclick = function(event){player_class_row_moveup(event);};
	input_node.title = "move class higher";
	cell.appendChild(input_node);
	input_node = document.createElement("input");
	input_node.type = "button";
	input_node.value = "\u2193";
	input_node.onclick = function(event){player_class_row_movedown(event);};
	input_node.title = "move class lower";
	cell.appendChild(input_node);
	input_node = document.createElement("input");

	return row;
}

function read_balance_prority_input(ev) {
	var canvas = document.getElementById("roll_balance_priority_canvas");
	var canvas_bounds = canvas.getBoundingClientRect();
	var x = ev.clientX - Math.round(canvas_bounds.left);
	var y = ev.clientY - Math.round(canvas_bounds.top);
	
	var triangle = get_balance_triangle_dimensions();
	
	// calc distance to opposite edge
	var coord_sr = triangle.height + triangle.offset_y - y;
	var coord_class = Math.round((triangle.width - (x-triangle.offset_x) - (triangle.height-(y-triangle.offset_y))*Math.tan(30*Math.PI/180)) * Math.sin(60*Math.PI/180));
	var coord_disp = Math.round(((x-triangle.offset_x) - (triangle.height-(y-triangle.offset_y))*Math.tan(30*Math.PI/180)) * Math.sin(60*Math.PI/180));
	
	// check if point inside triangle
	if ( (coord_sr<0) || (coord_class<0) || (coord_disp<0) ) {
		return;
	}
	
	// normalize
	var priority_sr 	= Math.round( 100*coord_sr/(coord_sr+coord_class+coord_disp) );
	var priority_class 	= Math.round( 100*coord_class/(coord_sr+coord_class+coord_disp) );
	var priority_disp 	= Math.round( 100*coord_disp/(coord_sr+coord_class+coord_disp) );
	
	// rounding error
	var diff = 100-priority_sr-priority_class-priority_disp;
	if ( (priority_sr >= priority_class) && (priority_sr >= priority_disp) ) {
		priority_sr += diff;
	} else if ( (priority_class >= priority_sr) && (priority_class >= priority_disp) ) {
		priority_class += diff;
	} else {
		priority_disp += diff;
	}
	
	document.getElementById("roll_balance_priority_sr").value = priority_sr;
	document.getElementById("roll_balance_priority_class").value = priority_class;
	document.getElementById("roll_balance_priority_dispersion").value = priority_disp;
	
	balance_priority_draw_canvas( x, y );
}

function redraw_lobby() {
	var count_active = 0; // checked-in && twitch subs
	
	var team_container = document.getElementById("lobby");
	team_container.innerHTML = "";
	for( var i=0; i<lobby.length; i++) {
		var player_widget = draw_player( lobby[i] );
		team_container.appendChild(player_widget);
		
		if ( is_active_player(lobby[i]) ) {
			count_active++;
		}
	}
	for( i=lobby.length; i<get_team_size(); i++) {
		var player_widget = draw_player( create_empty_player() );
		team_container.appendChild(player_widget);
	}
	
	document.getElementById("lobby_count").innerHTML = lobby.length;
	
	update_captains_count();
		
	if (document.getElementById("lobby_filter").value != "") {
		apply_lobby_filter();
	}
	
	//check-in counter
	document.getElementById("checkin_counter").innerHTML = checkin_list.length;
	
	// twitch counter
	document.getElementById("twitch_subs_counter").innerHTML = twitch_subs_list.length;
	
	document.getElementById("lobby_active_count").innerHTML = count_active;
}

function redraw_player( player_struct ) {
	var is_small = (lobby.indexOf(player_struct) == -1);
	
	var is_captain = false;
	var player_team = get_player_team( player_struct.id );
	if (player_team !== undefined ) {
		if ( player_team.captain_id == player_struct.id ) {
			is_captain = true;
		}
	}
	
	var player_cell_old = document.getElementById( player_struct.id );
	var player_item_row = player_cell_old.parentElement;
	
	var slot_class = undefined;
	if (is_small && (player_team !== undefined)) {
		// find player slot
		slot_class = get_player_role( player_team, player_struct );
	}
	
	var player_cell_new = draw_player_cell( player_struct, is_small, false, slot_class );
	player_item_row.replaceChild( player_cell_new, player_cell_old );
	
	//update_teams_sr(); ???
}

function redraw_teams() {
	var teams_container = document.getElementById("teams_container");
	teams_container.innerHTML = "";
	for( var t=0; t<teams.length; t++) {
		var current_team_toolbar_container = document.createElement("div");
		current_team_toolbar_container.className = "team-toolbar-container";
		
		// toolbar
		var current_team_toolbar = document.createElement("div");
		current_team_toolbar.className = "team-toolbar";
		current_team_toolbar.classList.add("small-toolbar");
		
		var toolbar_btn = document.createElement("input");
		toolbar_btn.type = "button";
		toolbar_btn.className = "team_btn";
		toolbar_btn.value = " X ";
		toolbar_btn.title = "Delete team";
		toolbar_btn.onclick = delete_team.bind(this,t);
		current_team_toolbar.appendChild(toolbar_btn);
		
		/*var toolbar_btn = document.createElement("button");
		toolbar_btn.className = "team_btn";
		var text_node = document.createTextNode("\u2191\u2193");
		toolbar_btn.appendChild(text_node);
		var img = document.createElement("img");
		img.src = "class_icons/dps.png";
		img.style.height = "0.9em";
		toolbar_btn.appendChild(img);
		toolbar_btn.title = "Sort players by class";
		toolbar_btn.onclick = sort_team_click.bind(this, t, 'class', toolbar_btn);
		current_team_toolbar.appendChild(toolbar_btn);*/
		
		var toolbar_btn = document.createElement("input");
		toolbar_btn.type = "button";
		toolbar_btn.className = "team_btn";
		toolbar_btn.value = "\u2191\u2193 Az";
		toolbar_btn.title = "Sort players by name";
		toolbar_btn.onclick = sort_team_click.bind(this, t, 'display_name', toolbar_btn);
		current_team_toolbar.appendChild(toolbar_btn);
		
		var toolbar_btn = document.createElement("input");
		toolbar_btn.type = "button";
		toolbar_btn.className = "team_btn";
		toolbar_btn.value = "\u2191\u2193 123";
		toolbar_btn.title = "Sort players by SR";
		toolbar_btn.onclick = sort_team_click.bind(this, t, 'sr', toolbar_btn);
		current_team_toolbar.appendChild(toolbar_btn);
		
		var toolbar_btn = document.createElement("input");
		toolbar_btn.type = "button";
		toolbar_btn.className = "team_btn";
		toolbar_btn.value = "\u270e";
		toolbar_btn.title = "Edit team";
		toolbar_btn.onclick = edit_team.bind(this, t);
		current_team_toolbar.appendChild(toolbar_btn);
		
		current_team_toolbar_container.appendChild(current_team_toolbar);
		
		// team as table
		// team header
		var current_team_container = document.createElement("div");
		current_team_container.className = "small-team";
		var current_team_table = document.createElement("div");
		current_team_table.className = "small-team-table";
		
		var team_title_row = document.createElement("div");
		team_title_row.className = "row table-caption";
		var team_title_cell = document.createElement("div");
		team_title_cell.className = "cell team-title-small";
		
		var div_node = document.createElement("div");
		div_node.className = "team-title-name";
		var text_node = document.createTextNode(teams[t].name);
		div_node.appendChild(text_node);
		team_title_cell.appendChild(div_node);
		
		div_node = document.createElement("div");
		div_node.className = "team-title-sr";
		text_node = document.createTextNode(calc_team_sr(teams[t]) + " avg. SR");
		div_node.appendChild(text_node);
		team_title_cell.appendChild(div_node);
		team_title_row.appendChild(team_title_cell);

		team_title_row.oncontextmenu = function(event){team_contextmenu(event);};
		current_team_table.appendChild(team_title_row);
		
		// draw players from slots (role lock)
		for( let class_name of class_names ) {
			var players_drawn = 0;
			
			if ( teams[t].slots[class_name] != undefined ) {
				for( var i=0; i<teams[t].slots[class_name].length; i++) {
					var is_captain = (teams[t].slots[class_name][i].id == teams[t].captain_id);
					var player_widget = draw_player( teams[t].slots[class_name][i], true, is_captain, class_name );
					current_team_table.appendChild(player_widget);
					players_drawn++;
				}
			}
			
			// add empty slots up to slots count
			for( var i=players_drawn; i<Settings["slots_count"][class_name]; i++) {
				var player_widget = draw_player( create_empty_player(), true, false, class_name );
				current_team_table.appendChild(player_widget);
			}
		}
		
		current_team_container.appendChild(current_team_table);
		current_team_toolbar_container.appendChild(current_team_container);
		teams_container.appendChild(current_team_toolbar_container);
	}
	
	update_teams_count();
}

function reset_highlighted_players() {
	var elems = document.getElementsByClassName( "player-highlighted" );
	for( i=0; i<elems.length; i++ ) {
		elems[i].classList.toggle("player-highlighted", false);
	}
}

function reset_roll() {
	for( t in teams ) {
		for ( class_name in teams[t].slots ) {
			lobby = lobby.concat( teams[t].slots[class_name].splice( 0, teams[t].slots[class_name].length) );
		}
	}
	teams.splice( 0, teams.length );
	
	save_players_list();
	redraw_lobby();
	redraw_teams();
}

function select_html( html_container ) {
	if (document.body.createTextRange) {
		const range = document.body.createTextRange();
		range.moveToElementText(html_container);
		range.select();
	} else if (window.getSelection) {
		const selection = window.getSelection();
		const range = document.createRange();
		range.selectNodeContents(html_container);
		selection.removeAllRanges();
		selection.addRange(range);
	}
}

function twitch_chat_keyword_message( message_username ) {
	var player_struct = find_player_by_twitch_name( message_username );
	if ( player_struct === undefined ) {
		return;
	}
	if ( checkin_list.indexOf( player_struct.id) == -1 ) {
		checkin_list.push( player_struct.id );
		checkin_list.sort();
		save_checkin_list();
		twitch_chat_draw_checkin_list( message_username );
	}
}

function twitch_chat_draw_checkin_list( highlight_name="" ) {
	var checkin_container = document.getElementById("twitch_checkin_list");
	checkin_container.innerHTML = "";
	
	// sort check-in list by twitch name
	checkin_list.sort( function( id1, id2){
			var val1 = find_player_by_id( id1 ).twitch_name.toLowerCase();
			var val2 = find_player_by_id( id2 ).twitch_name.toLowerCase();
			return ( val1<val2 ? -1 : (val1>val2?1:0) );
		}
	);
	
	for( player_id of checkin_list ) {
		var player_struct = find_player_by_id( player_id );
		if ( undefined === player_struct ) {
			continue; // wtf
		}
		
		var div = document.createElement("div");
		if ( player_struct.twitch_name == highlight_name ) {
			div.classList.add("player-highlighted");
		}
		div.title = player_struct.id.replace("-", "#");
		var text_node = document.createTextNode( player_struct.twitch_name );
		div.appendChild(text_node);
		checkin_container.appendChild(div);
	}
	
	document.getElementById("twitch_checkin_total").innerHTML = checkin_list.length;
}

function twitch_chat_print_sysmessage( msg ) {
	var chat_container = document.getElementById("twitch_checkin_chat");
	
	var msg_container = document.createElement("div");
	msg_container.className = "twitch-chat-system-msg";
	
	// timestamp
	var span = document.createElement("span");
	span.className = "twitch-chat-timestamp";
	var text_node = document.createTextNode( print_time( new Date() ) );
	span.appendChild(text_node);
	msg_container.appendChild(span);
	
	text_node = document.createTextNode( msg );
	msg_container.appendChild(text_node);
	
	chat_container.appendChild(msg_container);
	
	msg_container.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
}

function update_captains_count() {
	var captains_count=0;
	for( var i=0; i<lobby.length; i++) {
		if (lobby[i].captain) {
			captains_count++;
		}
	}
	document.getElementById("lobby_captain_count").innerHTML = captains_count;
}

function update_sr_scale_sample() {
	var container = document.getElementById("settings_sr_scale_sample");
	container.innerHTML = "";
	var sr_scale = Number(document.getElementById("roll_sr_scale").value);
	
	var samples = [
		2000,
		3200,		
		3700,
		4000,
		4200,
		4400
	];
	
	for ( i=0; i<samples.length; i++ ) {
		var sr_new = samples[i] + convert_range_log_scale( samples[i], 1, sr_scale, 0, 5000 );
		var text_node = document.createTextNode(samples[i].toString()+" → "+sr_new);
		var elem = document.createElement("div");
		elem.appendChild(text_node);
		container.appendChild(elem);
	}
}

function update_teams_count() {
	document.getElementById("team_count").innerHTML = teams.length;
}
