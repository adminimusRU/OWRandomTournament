var TwitchChat = {
	user_login: "",
	user_access_token: "",
	
	channel_name: "",
	
	// callbacks
	connect_callback: undefined,
	disconnect_callback: undefined,
	message_callback: undefined, // acutal chat messages from users
	system_message_callback: undefined, // server messages to show in chat
	error_callback: undefined,
	debug_callback: undefined, // raw messages
	
	// internal
	socket: undefined,
	is_connected: false,
	is_joined: false,
	
	// public methods
	
	init: function( user_login, user_access_token ) {
		if ( typeof user_login === 'string'  ) {
			this.user_login = user_login;
		}
		
		if ( typeof user_access_token === 'string'  ) {
			this.user_access_token = user_access_token;
		}
	},
	
	isConnected: function() {
		return this.is_connected ||  this.is_joined;
	},
	
	connect: function( channel_name="" ) {
		if ( channel_name != "" ) {
			this.channel_name = channel_name;
		}
		// make sure channel name is lower case. 
		// Twitch display namas can have capital letters, but logins and channel names are always in lower case
		this.channel_name = this.channel_name.toLowerCase();
		
		if ( this.channel_name == "" ) {
			if (typeof TwitchChat.error_callback == "function") {
				TwitchChat.error_callback.call( TwitchChat, "channel name is empty" );
			}
			return;
		}
		
		this.socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
		
		this.socket.addEventListener('open', function (event) {
			TwitchChat.is_connected = true;
			TwitchChat.socket.send("PASS oauth:"+TwitchChat.user_access_token);
			TwitchChat.socket.send("NICK "+TwitchChat.user_login.toLowerCase());
			
		});
		
		this.socket.addEventListener('message', TwitchChat.onMessage);
	},
	
	disconnect: function() {
		this.socket.onclose = function(event) {
			TwitchChat.is_connected = false;
			TwitchChat.is_joined = false;
			// @todo need to quit properly?
			TwitchChat.socket = undefined;
			if (typeof TwitchChat.disconnect_callback == "function") {
				TwitchChat.disconnect_callback.call( TwitchChat );
			}
		};
		this.socket.close( 1000 );
	},
	
	reconnect: function() {
		this.socket.onclose = function(event) {
			TwitchChat.is_connected = false;
			TwitchChat.is_joined = false;
			TwitchChat.socket = undefined;
			if (typeof TwitchChat.disconnect_callback == "function") {
				TwitchChat.disconnect_callback.call( TwitchChat );
			}
			
			TwitchChat.connect();
		};
		this.socket.close( 1000 );
	},
	
	// private methods
	
	onMessage: function(event) {
		// split packet to messages
		var raw_msgs = event.data.split("\r\n");
		for (let raw_msg of raw_msgs) {
			if ( raw_msg.trim() == "" ) {
				continue;
			}
			
			var msg_struct = TwitchChat.parse( raw_msg );
			if ( msg_struct === null ) {
				// parsing failed
				continue;
			}
			
			// debugging
			if (typeof TwitchChat.debug_callback == "function") {
				TwitchChat.debug_callback.call( TwitchChat, msg_struct );
			}
			
			// analyze message
			if ( msg_struct.prefix == "" ) {
				// no prefix - irc system message
				switch( msg_struct.command ) {
					case "PING":
						TwitchChat.socket.send("PONG")
						break;
					default:
						if (typeof TwitchChat.error_callback == "function") {
							TwitchChat.error_callback.call( TwitchChat, "Unknown irc command: "+msg_struct.command+", params:"+msg_struct.params );
						}
						break;
				}
			} else if ( msg_struct.prefix == "tmi.twitch.tv" ) {
				// twitch specific system messages
				switch( msg_struct.command ) {
					case "001":
						// received our user name (on auth)
						TwitchChat.user_login = msg_struct.params_array[0];
						break;
					case "002":
					case "003":
					case "004":
						// just some default server flood
						break;
					case "372":
						// actually successfull connection. Join specified channel
						TwitchChat.is_joined = true;
						TwitchChat.socket.send("JOIN #"+TwitchChat.channel_name.toLowerCase());
						if (typeof TwitchChat.connect_callback == "function") {
							TwitchChat.connect_callback.call( TwitchChat );
						}
						break;
					case "375":
					case "376":
					case "CAP":
						// just some default server flood
						break;

					// useful server messages
					case "NOTICE":			// moderator actions
					case "USERNOTICE":		// user resub
					case "HOSTTARGET":		// twitch host
					case "CLEARCHAT":
					case "CLEARMSG":		// someone got banned :)
					case "USERSTATE":		// someone joined chat
					case "GLOBALUSERSTATE":	// global twtich user changes
					case "ROOMSTATE":		// on joined chat room, or room settings changed
						// do nothing
						break;
					case "SERVERCHANGE":	// connected to wrong server o_0
						if (typeof TwitchChat.error_callback == "function") {
							TwitchChat.error_callback.call( TwitchChat, "SERVERCHANGE command reveived. Params: "+msg_struct.params );
						}
						break;
					case "RECONNECT":
						// reconnect request from server
						if (typeof TwitchChat.system_message_callback == "function") {
							TwitchChat.system_message_callback.call( TwitchChat, "server requested reconnect" );
						}
						TwitchChat.reconnect();
						break;
					default:
						if (typeof TwitchChat.error_callback == "function") {
							TwitchChat.error_callback.call( TwitchChat, "Unknown irc twitch command: "+msg_struct.command+", params:"+msg_struct.params );
						}
						break;
				}
				
			} else if ( msg_struct.prefix == "jtv" ) {
				// another twitch specific system messages
				// do nothing
			} else {
				// other prefix or no prefix
				switch( msg_struct.command ) {
					case "353":	// irc NAMES command
					case "366": // ??
						break;
					case "JOIN": // someone joined chat
						break;
					case "PART": // someone left chat
						// check if it was we :)
						var message_username = msg_struct.prefix.split("!")[0];
						if ( message_username == TwitchChat.user_login ) {
							TwitchChat.is_joined = false;
							if (typeof TwitchChat.disconnect_callback == "function") {
								TwitchChat.disconnect_callback.call( TwitchChat );
							}
						}
						break;
					case "WHISPER": // whispers
						break;
					case "PRIVMSG":
						// actial chat message here, woah
						var message_username = msg_struct.prefix.split("!")[0];
						var message_text = "";
						if ( msg_struct.params_array.length >= 2 ) {
							message_text = msg_struct.params_array[1];
						}
						if(typeof TwitchChat.message_callback == "function") {
							TwitchChat.message_callback.call( TwitchChat, message_username, message_text );
						}
						break;
					default:
						if (typeof TwitchChat.error_callback == "function") {
							TwitchChat.error_callback.call( TwitchChat, "Unknown irc twitch command: "+msg_struct.command+", params:"+msg_struct.params );
						}
						break;
				}
			}
		}
	},
	
	parse: function( raw_msg ) {
		var current_pos = 0;
		var next_space_pos = 0;
		var prefix = "";
		var command = "";
		var params = "";
		var params_array = [];
		
		try {
			// there could be irc v3.2 tags (twitch badges, emotes...) if we set opts
			
			// 1. split raw message to main parts: prefix, command, parameters
			// prefix (optional)
			if ( raw_msg.startsWith(':') ) {
				next_space_pos = raw_msg.indexOf(' ');
				if ( next_space_pos == -1 ) {
					throw new Error("Message parsing failed");
				}
				prefix = raw_msg.slice( 1, next_space_pos );
				current_pos = next_space_pos+1;
			}
			
			// command
			next_space_pos = raw_msg.indexOf(' ', current_pos);
			command = raw_msg.slice( current_pos, next_space_pos );
			
			if ( next_space_pos == -1 ) {
				// no parameters
				current_pos = raw_msg.length-1;
			} else {
				// parameters
				current_pos = next_space_pos+1;				
				params = raw_msg.slice( current_pos );
			}
			
			// 2. parse parameters to array
			if ( params != "" ) {
				current_pos = 0;
				while ( current_pos < params.length ) {
					// here we go again
					if ( params.charAt(current_pos) == ':' ) {
						//trailing parameter. Grab anything left including spaces
						params_array.push( params.slice(current_pos+1) );
						break;
					}
					next_space_pos = params.indexOf(' ', current_pos);
										
					if (next_space_pos == -1) {
						// no trailing, but ok...
						params_array.push( params.slice(current_pos) );
						break;
					} else {
						params_array.push( params.slice(current_pos, next_space_pos) );
						current_pos = next_space_pos+1;
					}
				}
			}
		} catch(err) {
			if (typeof TwitchChat.error_callback == "function") {
				TwitchChat.error_callback.call( TwitchChat, "parameters parsing error: "+err.message+". Raw msg:"+raw_msg );
			}
			return null;
		}
		
		var parsed_message_struct = {
			raw_msg: raw_msg,
			prefix: prefix,
			command: command,
			params: params,
			params_array: params_array,
		};
		
		return parsed_message_struct;
	},
}
