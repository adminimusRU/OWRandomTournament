/*
*		Initialization
*/


// init stats updater
StatsUpdater.onPlayerUpdated = on_player_stats_updated;
StatsUpdater.onComplete = on_stats_update_complete;
StatsUpdater.onStart = on_stats_update_start;
StatsUpdater.onProgressChange = on_stats_update_progress;
StatsUpdater.onError = on_stats_update_error;
StatsUpdater.onWarning = on_stats_update_warning;

// rename old storage items
var old_stogage_items = ["settings", "lobby", "saved_format", "team_setup"];
for( let item_name of old_stogage_items ) {
	var item_value = localStorage.getItem(item_name);
	if ( item_value !== null ) {
		localStorage.setItem( storage_prefix+item_name, item_value );
		localStorage.removeItem( item_name );
	}
}

// restore settings
Settings = get_default_settings();
var saved_settings_json = localStorage.getItem(storage_prefix+"settings");
if ( saved_settings_json != null ) {
	var saved_settings = JSON.parse(saved_settings_json);
	for ( var i in Settings ) {
		if ( (saved_settings[i] !== undefined) && Settings.hasOwnProperty(i) ) {
			Settings[i] = saved_settings[i];
		}
	}
}

//restore saved players to teams
restore_saved_teams();

restore_checkin_list();
restore_twitch_subs_list();
redraw_lobby();

apply_stats_updater_settings();

// adjust lobby margin to account scrollbar width
var lobby_container = document.getElementsByClassName("lobby-container").item(0);
lobby_container.style.marginRight = "-"+get_scrollbar_width()+"px";
lobby_container.style.paddingRight = ""+get_scrollbar_width()+"px";

// load class and rank icons and convert them to data:uri strings, for team export
prepare_datauri_icons();



// twitch api init
let client_id = "x4ywn8cwvjvvipexitcdidxhoz1kem";
let	redirect_uri = "https://adminimusru.github.io/OWRandomTournament/index.html";
let	scope = "channel:read:subscriptions chat:read";
let twitch_access_token = localStorage.getItem(storage_prefix+"twitch_token");
let twitch_state = localStorage.getItem(storage_prefix+"twitch_state");
localStorage.removeItem( storage_prefix+"twitch_state" );
let twitch_logged_out = ( localStorage.getItem(storage_prefix+"twitch_logged_out") === 'true' );

Twitch.init( client_id, redirect_uri, scope, twitch_access_token, twitch_state, twitch_logged_out );
document.getElementById("twitch_signin_link").href = Twitch.getLoginURL();

let url_hash = document.location.hash;
document.location.hash = "";
if ( url_hash.startsWith('#') ) {
	url_hash = url_hash.substring(1);
}
if (url_hash != "" ) {
	// process twitch response after redirect
	let result = Twitch.authenticate( url_hash );
	if ( result === true ) {
		// save token
		localStorage.setItem( storage_prefix+"twitch_token", Twitch.getToken() );
		localStorage.setItem( storage_prefix+"twitch_logged_out", false );
	} else if ( typeof result === 'string' ) {
		alert("Twitch login failed: "+result);
	}
}

if ( Twitch.isLoggedIn() ) {
	// user logged in - show name and icon
	Twitch.getAuthorizedUserInfo( on_twitch_getuser_success, on_twitch_getuser_fail, on_twitch_unathorized );
	document.getElementById("twitch_signin").style.display = "none";
	document.getElementById("twitch_user_info").style.display = "block";
}

let twitch_subs_last_checked = localStorage.getItem(storage_prefix+"twitch_subs_last_checked");
if ( twitch_subs_last_checked === null ) {
	twitch_subs_last_checked = new Date(0);
} else {
	twitch_subs_last_checked = new Date( twitch_subs_last_checked );
}
document.getElementById("twitch_subs_last_checked_date").innerHTML = print_date( twitch_subs_last_checked, true );
