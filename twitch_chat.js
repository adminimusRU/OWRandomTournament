var TwitchChat = {
	user_login: "",
	user_access_token: "",
	
	channel_name: "",
	
	// callback
	message_callback: undefined,
	
	// internal
	socket: undefined,
	
	// public methods
	
	init: function( user_login, user_access_token ) {
		if ( typeof user_login === 'string'  ) {
			this.user_login = user_login;
		}
		
		if ( typeof user_access_token === 'string'  ) {
			this.user_access_token = user_access_token;
		}
	},
	
	connect: function( channel_name="" ) {
		if ( channel_name != "" ) {
			this.channel_name = channel_name;
		}
		
		this.socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
		
		this.socket.addEventListener('open', function (event) {			
			TwitchChat.socket.send("PASS oauth:"+TwitchChat.user_access_token+"\r\n");
			TwitchChat.socket.send("NICK "+TwitchChat.user_login.toLowerCase()+"\r\n");
			TwitchChat.socket.send("JOIN #"+channel_name+"\r\n");
		});
		
		this.socket.addEventListener('message', TwitchChat.onMessage);
	},
	
	disconnect: function() {
		this.socket.onclose = function(event) {
			TwitchChat.socket = undefined;
		};
		this.socket.close();
	},
	
	// private methods
	
	onMessage: function(event) {
		// split packet to messages
		var msgs = event.data.split("\r\n");
		for (let msg of msgs) {
			if(typeof TwitchChat.message_callback == "function") {
				TwitchChat.message_callback.call( TwitchChat, msg );
			}
		}
	},
}