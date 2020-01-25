/*
*		Global variables
*/

// array of player objects in lobby
var lobby = [];

// array of team objects
var teams = [];

// id's of checked-in players
var checkin_list = []; 

// reference to temporary empty player object for new added player for loading stats
var player_being_added;
// reference to player object for edit dialog
var player_being_edited;
//
var team_being_edited;

var lobby_filter_timer = 0;

// global settings
var Settings = {};
const storage_prefix = "owrt_";

// class icons in data:url strings
var class_icons_datauri = {};
var rank_icons_datauri = {};

// team builder
// RandomTeamBuilder object inside worker thread
var RtbWorker;
var roll_debug = false;

// balance priority canvas input
var balance_priority_mouse_moving = false;
var balance_priority_canvas_gradient;

// id's of twitch subscribers
var twitch_subs_list = [];

var twitch_sub_icon_src = "";
var twitch_checkin_keyword = "";
var twitch_chat_max_messages = 200;
var twitch_chat_debug = false;