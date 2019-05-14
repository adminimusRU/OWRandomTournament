function array_shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function apply_stats_updater_settings() {
	StatsUpdater.update_edited_fields = Settings.update_edited_fields;
	StatsUpdater.update_sr = Settings.update_sr;
	StatsUpdater.update_class = Settings.update_class;
	StatsUpdater.region = Settings.region;
}

function b64DecodeUnicode(str) {
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
    }));
}

function calc_team_sr( team ) {
	var team_sr = 0;
	if (team.players.length > 0) {
		for( var i=0; i<team.players.length; i++) {
			var player_sr = team.players[i].sr;	
			team_sr += player_sr;
		}
		team_sr = Math.round(team_sr / Settings.team_size);
	}
	return team_sr;
}

function convert_range_log_scale( raw_value, out_min, out_max, precision=0, input_range=100 ) {
	return round_to( Math.pow( 2, Math.log2(out_min)+(Math.log2(out_max)-Math.log2(out_min))*raw_value/input_range ), precision );
}

function create_empty_player() {
	return {
			id: "",
			display_name: "",
			twitch_name: "",
			sr: 0,
			empty: true,
			level: 0,
			top_classes: [],
			top_heroes: [],
			last_updated: new Date(0),
			captain: false,
			order: 0,
		};
}

function create_empty_team() {
	return {
			name: "",
			captain_index: -1,
			players: []
		};
}

function create_random_player( id ) {
	var classes = class_names.slice();
	var top_classes = [];
	top_classes.push( classes.splice( Math.round(Math.random()*(classes.length-1)), 1 )[0] );
	if( Math.random() > 0.4 ) {
		top_classes.push( classes[ Math.round(Math.random()*(classes.length-1)) ] );
	}
	var top_heroes = [];
	return {
			id: "player"+id+"-"+Math.round(Math.random()*99999),
			display_name: "player "+id,
			twitch_name: "",
			sr: Math.round(Math.random()*5000),
			level: Math.round(Math.random()*2000),
			empty: false,
			top_classes: top_classes,
			top_heroes: top_heroes,
			last_updated: new Date(0),
			captain: false,
			fake_id: true,
			order: 0,
		};
}

function escapeHtml(html){
	var text_node = document.createTextNode(html);
	var p = document.createElement('p');
	p.appendChild(text_node);
	return p.innerHTML;
}

function find_player_by_id(player_id, additional_player_array=[]) {
	for( var i=0; i<lobby.length; i++) {
		if ( player_id == lobby[i].id) {
			return lobby[i];
		}
	}
	for( var t=0; t<teams.length; t++) {
		for( var i=0; i<teams[t].players.length; i++) {
			if ( player_id == teams[t].players[i].id) {
				return teams[t].players[i];
			}
		}
	}
	for( var i=0; i<additional_player_array.length; i++) {
		if ( player_id == additional_player_array[i].id) {
			return additional_player_array[i];
		}
	}
	return undefined;
}

function find_player_by_twitch_name( twitch_name, additional_player_array=[] ) {
	twitch_name = twitch_name.toLowerCase();
	for( var i=0; i<lobby.length; i++) {
		if ( twitch_name == lobby[i].twitch_name.toLowerCase()) {
			return lobby[i];
		}
	}
	for( var t=0; t<teams.length; t++) {
		for( var i=0; i<teams[t].players.length; i++) {
			if ( twitch_name == teams[t].players[i].twitch_name.toLowerCase()) {
				return teams[t].players[i];
			}
		}
	}
	for( var i=0; i<additional_player_array.length; i++) {
		if ( twitch_name == additional_player_array[i].twitch_name.toLowerCase()) {
			return additional_player_array[i];
		}
	}
	return undefined;
}

function format_player_id( id ) {
	return id.trim().replace("#", "-");
}

function format_player_name( id ) {
	return id.slice( 0, id.search("-") );
}

function get_default_settings() {
	return {
		team_size: 6,
		show_numeric_sr: true,
		
		roll_adjust_sr: false,
		roll_adjust_dps: 110,
		roll_adjust_maintank: 100,
		roll_adjust_offtank: 100,
		roll_adjust_support: 90,
		roll_sr_scale: 0,
		roll_balance_priority_sr: 34,
		roll_balance_priority_class: 33,
		roll_balance_priority_dispersion: 33,
		roll_sr_stdev_adjust: 0,
		roll_quality: 70, // ~= 50k combinations
		roll_coverage: 57, // OF_max_thresold = 50
		roll_separate_otps: true,
		roll_team_count_power2: false,
		roll_min_level: 0,
		roll_captains: "highest-ranked",
		roll_exclude_twitch_unsubs: true,
		
		region: "eu",
		update_class: true,
		update_sr: true,
		update_edited_fields: false,
	};
}

function get_new_player_order() {
	var max_order = 0;
	for (var i=0; i<lobby.length; i++){
		max_order = Math.max( max_order, lobby[i].order );
	}
	for( var t=0; t<teams.length; t++) {
		for( var i=0; i<teams[t].players.length; i++) {
			max_order = Math.max( max_order, teams[t].players[i].order );
		}
	}
	return max_order+1;
}

function get_player_index( player_id, team ) {
	for( var i=0; i<team.length; i++) {
		if ( player_id == team[i].id) {
			return i;
		}
	}
	
	return -1;
}

function get_player_team( player_id ) {
	for( var t=0; i<teams.length; t++) {
		for( var i=0; i<teams[t].players.length; i++) {
			if ( player_id == teams[t].players[i].id) {
				return team;
			}
		}
	}
	return undefined;
}

function get_rank_icon_src( rank_name, player_id=undefined ) {
	return "rank_icons/"+rank_name+"_small.png";
}

function get_rank_name( sr ) {
	for ( const rank_name in ow_ranks ) {
		if ( (sr >= ow_ranks[rank_name].min) && (sr <= ow_ranks[rank_name].max) ) {
			return rank_name;
		}
	}
	return "unranked";
}

function get_scrollbar_width() {
	var outer = document.createElement("div");
	outer.style.visibility = "hidden";
	outer.style.width = "100px";
	outer.style.msOverflowStyle = "scrollbar"; // needed for WinJS apps

	document.body.appendChild(outer);

	var widthNoScroll = outer.offsetWidth;
	// force scrollbars
	outer.style.overflow = "scroll";

	// add innerdiv
	var inner = document.createElement("div");
	inner.style.width = "100%";
	outer.appendChild(inner);        

	var widthWithScroll = inner.offsetWidth;

	// remove divs
	outer.parentNode.removeChild(outer);

	return widthNoScroll - widthWithScroll;
}

function is_active_player( player_struct ) {
	var roll_allowed = true;
	if ( Settings.roll_exclude_twitch_unsubs ) {
		if (twitch_subs_list.length > 0) {
			if (twitch_subs_list.indexOf(player_struct.id) == -1) {
				roll_allowed = false;
			}
		}
	}
	if (checkin_list.length > 0) {
		if (checkin_list.indexOf(player_struct.id) == -1) {
			roll_allowed = false;
		}
	}
	return roll_allowed;
}

function is_undefined( expr, if_undefined ) {
	if( typeof expr === "undefined" ) {
		return if_undefined;
	} else {
		return expr;
	}
}

// returns true if val is number or a valid number string
function is_number_string( val ) {
	if( typeof val !== "string" ) {
		return false;
	}
	return (+val === +val);
}

function print_date( date_value ) {
	if( typeof date_value === "undefined" ) {
		return "-";
	} else if (date_value.getTime() == 0) {
		return "-";
	} else {
		return date_value.toLocaleString();
	}
}

function print_time( date_value ) {
	var hr = date_value.getHours();
	var min = date_value.getMinutes();
	if (min < 10) {
		min = "0" + min;
	}
	var sec = date_value.getSeconds();
	if (sec < 10) {
		sec = "0" + sec;
	}
	var result = hr+":"+min+":"+sec;
	return result;
}

function round_to( value, precision ) {
	return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
}

function sort_players( team, sort_field = 'sr', order_asc=false ) {
	var order = 1;
	if (order_asc) {
		order = -1;
	}
	if ( sort_field == 'class' ) {
		team.sort( function(player1, player2){
				var val1 = -1;
				if (player1.top_classes.length > 0) {
					val1 = 10 * (class_names.indexOf( player1.top_classes[0] )+1);
				}
				if (player1.top_classes.length > 1) {
					val1 += class_names.indexOf( player1.top_classes[1] ) + 1;
				}
				var val2 = -1;
				if (player2.top_classes.length > 0) {
					val2 = 10 * (class_names.indexOf( player2.top_classes[0] )+1);
				}
				if (player2.top_classes.length > 1) {
					val2 += class_names.indexOf( player2.top_classes[1] ) + 1;
				}
				return order * (val1 - val2);
			} );
	} else if ( sort_field == 'checkin' ) {
		team.sort( function(player1, player2){
				var val1 = checkin_list.indexOf(player1.id) ;
				var val2 = checkin_list.indexOf(player2.id) ;
				return order * (val1 - val2);
			} );
	} else if ( sort_field == 'twitch_sub' ) {
		team.sort( function(player1, player2){
				var val1 = twitch_subs_list.indexOf(player1.id) ;
				var val2 = twitch_subs_list.indexOf(player2.id) ;
				return order * (val1 - val2);
			} );
	} else {
		team.sort( function(player1, player2){
				if( typeof player1[sort_field] === 'string') {
					var val1 = player1[sort_field].toLowerCase();
					var val2 = player2[sort_field].toLowerCase();
					return order * ( val1<val2 ? -1 : (val1>val2?1:0) );
				} else { 
					return order * (player2[sort_field] - player1[sort_field]);
				} 
			} );
	}
}

function str_padding( source_str, length, padding_char=" " ) {
	var result = source_str;
	while ( result.length < length ) {
		result += padding_char;
	}
	return result;
}
