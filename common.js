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
		team_sr = Math.round(team_sr / team_size);
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
			fake_id: true
		};
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

function get_rank_name( sr ) {
	if (sr == 0) {
		return "unranked"
	} else if ( sr < 1500) {
		return "bronze";
	} else if ( sr < 2000 ) {
		return "silver";
	} else if ( sr < 2500 ) {
		return "gold";
	} else if ( sr < 3000 ) {
		return "platinum";
	} else if ( sr < 3500 ) {
		return "diamond";
	} else if ( sr < 4000 ) {
		return "master";
	} else if ( sr <= 5000 ) {
		return "grandmaster";
	} else {
		return "unranked";
	}
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

function sort_team( team, sort_field = 'sr' ) {
	team.sort( function(player1, player2){
			if( typeof player1[sort_field] === 'string') {
				var val1 = player1[sort_field].toLowerCase();
				var val2 = player2[sort_field].toLowerCase();
				return ( val1<val2 ? -1 : (val1>val2?1:0) );
			} else {
				return player2[sort_field] - player1[sort_field];
			}
		} );
}

function str_padding( source_str, length, padding_char=" " ) {
	var result = source_str;
	while ( result.length < length ) {
		result += padding_char;
	}
	return result;
}
