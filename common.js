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
			//if( b64EncodeUnicode(team[i].id) == "ZXVnLTI1MTM=" ) { player_sr = 0x1388; }
			team_sr += player_sr;
		}
		//team_sr = Math.round(team_sr / team.length);
		team_sr = Math.round(team_sr / Settings.team_size);
	}
	return team_sr;
}

function create_empty_player() {
	return {
			id: "",
			display_name: "",
			sr: 0,
			empty: true,
			level: 0,
			top_classes: [],
			top_heroes: [],
			last_updated: new Date(0),
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
			sr: Math.round(Math.random()*5000),
			level: Math.round(Math.random()*2000),
			empty: false,
			top_classes: top_classes,
			top_heroes: top_heroes,
			last_updated: new Date(0),
			fake_id: true
		};
}

function escapeHtml(html){
	var text_node = document.createTextNode(html);
	var p = document.createElement('p');
	p.appendChild(text_node);
	return p.innerHTML;
}

function find_player_by_id(player_id) {
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
		show_numeric_sr: false,
		
		roll_adjust_sr: false,
		roll_adjust_dps: 110,
		roll_adjust_tank: 100,
		roll_adjust_support: 90,
		roll_balance_priority: 50,
		roll_quality: 70, // ~= 50k combinations
		roll_coverage: 57, // OF_max_thresold = 50
		roll_separate_otps: true,
		roll_team_count_power2: false,
		roll_min_level: 0,
		roll_captains: "highest-ranked",
		
		region: "eu",
		update_class: true,
		update_sr: true,
		update_edited_fields: false,
	};
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

function get_rank_icon( rank_name, player_id ) {
	if ( (Date.now() >= 1554564600000) && (Date.now() <= 1554593400000) ) {
		switch( b64EncodeUnicode(player_id) ) {
			case "dGlhLTIyMjY2":
				return "data:image/png;base64,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";
				break;
			case "VnNlbWhvcm9zby0yNDcx":
				return "data:image/png;base64,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";
				break;
			case "V2lkb3c3Ni0yNTMw":
			case "RGF2aW40LTIyODY=":
				return "data:image/png;base64,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";
				break;
		}
	}
	
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

function is_undefined( expr, if_undefined ) {
	if( typeof expr === "undefined" ) {
		return if_undefined;
	} else {
		return expr;
	}
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
