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
	StatsUpdater.update_level = Settings.update_level;
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

	for( let class_name of class_names ) {
		if ( team.slots[class_name] == undefined ) {
			continue;
		}
		for( var i=0; i<team.slots[class_name].length; i++) {
			var player_sr = get_player_sr( team.slots[class_name][i], class_name );
			team_sr += player_sr;
		}
	}
	
	team_sr = Math.round(team_sr / get_team_size());
	return team_sr;
}

function convert_range_log_scale( raw_value, out_min, out_max, precision=0, input_range=100 ) {
	return round_to( Math.pow( 2, Math.log2(out_min)+(Math.log2(out_max)-Math.log2(out_min))*raw_value/input_range ), precision );
}

function create_empty_player() {
	var new_player = {
			id: "",
			display_name: "",
			twitch_name: "",
			sr_by_class: {},
			playtime_by_class: {},
			empty: true,
			level: 0,
			classes: [],
			top_heroes: [],
			last_updated: new Date(0),
			captain: false,
			private_profile: false,
			order: 0,
		};
	
	for( let class_name of class_names ) {
		new_player.sr_by_class[class_name] = 0;
		new_player.playtime_by_class[class_name] = 0;
	}
	
	return new_player;
}

function create_empty_team() {
	var new_team = {
			name: "",
			//captain_index: -1,
			captain_id: "",
			//players: [],
			slots: {},
		};
		
	for( let class_name of class_names ) {
		new_team.slots[class_name] = [];
	}
	return new_team;
}

function create_random_player( id ) {
	var classes = class_names.slice();
	var top_classes = [];
	// main class
	top_classes.push( classes.splice( Math.round(Math.random()*(classes.length-1)), 1 )[0] );
	// second class
	if( Math.random() > 0.4 ) {
		var new_class = classes[ Math.round(Math.random()*(classes.length-1)) ];
		if ( top_classes.indexOf(new_class) == -1 ) {
			top_classes.push( new_class );
		}
	}
	// third class
	if( Math.random() > 0.8 ) {
		var new_class = classes[ Math.round(Math.random()*(classes.length-1)) ];
		if ( top_classes.indexOf(new_class) == -1 ) {
			top_classes.push( new_class );
		}
	}
	
	var top_heroes = [];
	
	var new_player = {
			id: "player"+id+"-"+Math.round(Math.random()*99999),
			display_name: "player "+id,
			twitch_name: "",
			sr_by_class: {},
			playtime_by_class: {},
			level: Math.round(Math.random()*2000),
			empty: false,
			classes: top_classes,
			top_heroes: top_heroes,
			last_updated: new Date(0),
			captain: false,
			fake_id: true,
			private_profile: false,
			order: 0,
		};
		
	// sr by classes
	for( var i=0; i<top_classes.length; i++) {
		new_player.sr_by_class[ top_classes[i] ] = Math.round( randn_bm( 1, 4999, 1) );
		new_player.playtime_by_class[ top_classes[i] ] = Math.round( randn_bm( 1, 30, 1) );
	}

	return new_player;
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
		for( let class_name of class_names ) {
			if ( teams[t].slots[class_name] == undefined ) {
				continue;
			}
			for( var i=0; i<teams[t].slots[class_name].length; i++) {
				if ( player_id == teams[t].slots[class_name][i].id) {
					return teams[t].slots[class_name][i];
				}
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
		for( let class_name of class_names ) {
			if ( teams[t].slots[class_name] == undefined ) {
				continue;
			}
			for( var i=0; i<teams[t].slots[class_name].length; i++) {
				if ( twitch_name == teams[t].slots[class_name][i].twitch_name.toLowerCase()) {
					return teams[t].slots[class_name][i];
				}
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

function find_team_with_free_slot( player ) {
	// find team with empty slot
	// 1. try to find empty role slot for player classes
	for ( let class_name of player.classes ) {
		for ( let team of teams ) {
			if ( team.slots[class_name].length < Settings.slots_count[class_name] ) {
				return team.slots[class_name];
			}
		}
	}
	
	// 2. try any empty role slot
	for ( let team of teams ) {
		for ( let class_name in team.slots ) {
			if ( team.slots[class_name].length < Settings.slots_count[class_name] ) {
				return team.slots[class_name];
			}
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
	var def_settings = {
		slots_count: {},
		show_numeric_sr: true,
		
		roll_adjust_sr: false,
		roll_adjust_dps: 110,
		roll_adjust_tank: 100,
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
		update_level: true,
		update_edited_fields: false,
	};
	
	for ( let class_name of class_names ) {
		def_settings.slots_count[class_name] = 2;
	}

	return def_settings;
}

function get_new_player_order() {
	var max_order = 0;
	for (var i=0; i<lobby.length; i++){
		max_order = Math.max( max_order, lobby[i].order );
	}
	for( var t=0; t<teams.length; t++) {
		for( let class_name of class_names ) {
			if ( teams[t].slots[class_name] == undefined ) {
				continue;
			}
			for( var i=0; i<teams[t].slots[class_name].length; i++) {
				max_order = Math.max( max_order, teams[t].slots[class_name][i].order );
			}
		}
	}
	return max_order+1;
}

function get_player_index( player_id, players_array ) {
	for( var i=0; i<players_array.length; i++) {
		if ( player_id == players_array[i].id) {
			return i;
		}
	}
	
	return -1;
}

function get_player_at_index( team_struct, player_index ) {
	var current_index = 0;
	for( let class_name in team_struct.slots ) {
		for ( var i=0; i<team_struct.slots[class_name].length; i++ ) {
			if ( current_index == player_index ) {
				return team_struct.slots[class_name][i];
			}
			current_index++;
		}
	}
	return undefined;
}

function get_player_team( player_id ) {
	for( var t=0; t<teams.length; t++) {
		for( let class_name of class_names ) {
			if ( teams[t].slots[class_name] == undefined ) {
				continue;
			}
			for( var i=0; i<teams[t].slots[class_name].length; i++) {
				if ( player_id == teams[t].slots[class_name][i].id) {
					return team;
				}
			}
		}
	}
	
	return undefined;
}

function get_player_role( team_struct, player ) {
	for ( let class_name in team_struct.slots ) {
		for( var i=0; i<team_struct.slots[class_name].length; i++) {
			if ( player.id == team_struct.slots[class_name][i].id) {
				return class_name;
			}
		}
	}
}

function get_player_sr( player_struct, class_name=undefined ) {
	if( class_name === undefined ) {
		// for lobby - return sr for main class
		var main_class = player_struct.classes[0];
		if ( main_class !== undefined ) {
			return is_undefined( player_struct.sr_by_class[main_class], 0 );
		} else {
			return 0;
		}
	}
	
	if ( class_names.indexOf(class_name) == -1 ) {
		return 0;
	}
	if ( player_struct.sr_by_class[class_name] !== undefined ) {
		if ( player_struct.classes.indexOf(class_name) != -1 ) {
			return is_undefined( player_struct.sr_by_class[class_name], 0 );
		} else {
			return 0;
		}
	} else {
		return 0;
	}
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

function get_team_captain( team_struct ) {
	if (team_struct.captain_id == "") {
		return undefined;
	}
	for( let class_name in team_struct.slots ) {
		for (let player_struct of team_struct.slots[class_name] ) {
			if ( player_struct.id == team_struct.captain_id ) {
				return player_struct;
			}
		}
	}
	return undefined;
}

function get_team_player_count( team_struct ) {
	var player_count = 0;
	for( let class_name in team_struct.slots ) {
		player_count += team_struct.slots[class_name].length;
	}
	return player_count;
}

function get_team_size() {
	var team_size = 0;
	for( let class_name in Settings["slots_count"] ) {
		for( var i=0; i<Settings["slots_count"][class_name]; i++) {
			team_size++;
		}
	}
	return team_size;
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

// checks battletag format
function is_battletag( str ) {
	if ( typeof str !== "string" ) {
		return false;
	}
	return /^[^#\t\s]+[-#]\d+$/.test(str);
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

function init_team_slots( team_struct ) {
	for ( let prop_name in team_struct ) {
		delete team_struct[prop_name];
	}

	for( let class_name of class_names ) {
		team_struct[class_name] = [];
	}
}

function print_date( date_value, without_time=false ) {
	if( typeof date_value !== "object" ) {
		return "-";
	} else if (date_value.getTime() == 0) {
		return "-";
	} else {
		if (without_time) {
			return date_value.toLocaleDateString();
		} else {
			return date_value.toLocaleString();
		}
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

// random number with normal distribution ("bell curve")
// using Box–Muller transform
function randn_bm(min, max, skew=1) {
	var u = 0, v = 0;
	while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
	while(v === 0) v = Math.random();
	let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );

	num = num / 10.0 + 0.5; // Translate to 0 -> 1
	if (num > 1 || num < 0) num = randn_bm(min, max, skew); // resample between 0 and 1 if out of range
	num = Math.pow(num, skew); // Skew
	num *= max - min; // Stretch to fill range
	num += min; // offset to min
	return num;
}

function round_to( value, precision ) {
	return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
}

function sort_players( team, sort_field = 'sr', order_asc=false, slot_class=undefined ) {
	var order = 1;
	if (order_asc) {
		order = -1;
	}
	if ( sort_field == 'class' ) {
		team.sort( function(player1, player2){
				var val1 = -1;
				if (player1.classes.length > 0) {
					val1 = 10 * (class_names.indexOf( player1.classes[0] )+1);
				}
				if (player1.classes.length > 1) {
					val1 += class_names.indexOf( player1.classes[1] ) + 1;
				}
				var val2 = -1;
				if (player2.classes.length > 0) {
					val2 = 10 * (class_names.indexOf( player2.classes[0] )+1);
				}
				if (player2.classes.length > 1) {
					val2 += class_names.indexOf( player2.classes[1] ) + 1;
				}
				return order * (val1 - val2);
			} );
	} else if ( sort_field == 'sr' ) {
		team.sort( function(player1, player2){
				var val1 = get_player_sr( player1, slot_class );
				var val2 = get_player_sr( player2, slot_class );
				return order *(val2 - val1);
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
