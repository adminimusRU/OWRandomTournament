// Twitch interface object (using new API)
// API docs: https://dev.twitch.tv/docs/api/
// usage: 
//	1. call init(). Optionally pass saved auth token
//	2. use getLoginURL() to get twitch auth page link. Use getState() and save state when user clicks link (optional)
//	3. if document.location.hash is not empty (user redirected back from twitch auth page) - pass it to authenticate()
//	4. check successfull auth with Twitch.isLoggedIn()
//	5. call getAuthorizedUserInfo() to get user data
//	6. save auth token (optional) received by getToken
//	7. use other public methods

var Twitch = {
	// authentication parameters. Use init method to fill
	client_id: "",
	redirect_uri: "",
	scope: "",
	logged_out: false, // if true - force twitch auth page to show prompt
	
	// filled after successfull authentication
	user_login: "",
	user_display_name: "",
	user_id: "",
	user_profile_image_url: "",
	
	// internal
	
	user_access_token: "",
	state: "", //OAuth 2.0 parameter to prevent CSRF attacks
	
	subscibers_map: new Map(),
	streams_list: [],
	
	// public methods
	
	init: function( client_id, redirect_uri, scope, saved_token="", saved_state="", logged_out=false ) {
		this.client_id = client_id;
		this.redirect_uri = redirect_uri;
		this.scope = scope;
		
		if ( typeof saved_token === 'string'  ) {
			this.user_access_token = saved_token;
		}
		
		if ( (typeof saved_state === 'string') && (saved_state != "") ) {
			this.state = saved_state;
		} else {
			this.state = (Math.random() + 1).toString(36).substr(2, 5);
		}
		
		if ( typeof logged_out === 'boolean' ) {
			this.logged_out = logged_out;
		}
	},
	
	getLoginURL: function() {
		var url = "https://id.twitch.tv/oauth2/authorize?"
			+"client_id="+encodeURIComponent(this.client_id)
			+"&redirect_uri="+encodeURIComponent(this.redirect_uri)
			+"&response_type=token"
			+"&scope="+encodeURIComponent(this.scope);
		
		if (this.state != "") {
			url += "&state="+encodeURIComponent(this.state);
		}
		if (this.logged_out === true) {
			url += "&force_verify=true";
		}
			
		return url;
	},
	
	getState: function() {
		return this.state;
	},
	
	// return values:
	//		true - authenticated
	//		false - not authenticated
	//		<string> - error message
	authenticate: function( url_hash ) {
		try {
			if ( url_hash.startsWith('#') ) {
				url_hash = url_hash.substring(1);
			}
			
			var params = new URLSearchParams(url_hash);
			
			var token = params.get("access_token");
			if ( typeof token !== 'string'  ) {
				return false;
			}
			if ( token.trim() == "" ) {
				return "empty token";
			}
			if ( this.state != "" ) {
				if ( this.state !== params.get("state") ) {
					return "state not matching";
				}
			}
			if ( this.scope !== params.get("scope") ) {
				return "scope not matching";
			}
			
			this.user_access_token = token;
			return true;
		} catch(err) {
			return "parameters parsing error: "+err.message;
		}
	},
	
	getToken: function() {
		return this.user_access_token;
	},
	
	isLoggedIn: function() {
		return (this.user_access_token.length > 0);
	},
	
	getAuthorizedUserInfo: function( callback_success, callback_fail, callback_unathorized ) {
		this.apiRequest( 
			"https://api.twitch.tv/helix/users", 
			//success
			function( data, pagination_cursor ) {
				if ( data.length == 0 ) {
					if(typeof callback_fail == "function") {
						callback_fail.call( Twitch, "user not found" );
						return;
					}
				}
				Twitch.user_login = data[0]["login"];
				Twitch.user_display_name = data[0]["display_name"];
				Twitch.user_id = data[0]["id"];
				Twitch.user_profile_image_url = data[0]["profile_image_url"];
				if (typeof callback_success == "function") {
					callback_success.call( Twitch );
				}
			},
			// fail
			callback_fail,
			// unathorized
			callback_unathorized 
		);
	},
	
	// revoke access token
	logout: function( callback_success, callback_fail ) {
		var is_processed = false;
		var xhttp = new XMLHttpRequest();
		xhttp.onload = function() {
			if (this.readyState == 4 ) {
				if ( this.status == 200) {
					Twitch.logged_out = true;
					
					if(typeof callback_success == "function") {
						if ( ! is_processed ) {
							callback_success.call( Twitch );
						}
						is_processed = true;
					}
				} else {
					var msg = "HTTP "+this.status+": "+this.statusText+"";
					
					if(typeof callback_fail == "function") {
						if ( ! is_processed ) {
							callback_fail.call( Twitch, msg );
						}
						is_processed = true;
					}
				}
			}
		};
		xhttp.ontimeout = function() {
			var msg = "timeout";
			if(typeof callback_fail == "function") {
				if ( ! is_processed ) {
					callback_fail.call( Twitch, msg );
				}
				is_processed = true;
			}
		};
		
		xhttp.onerror = function() {
			var msg = "error - "+this.statusText;
			if(typeof callback_fail == "function") {
				if ( ! is_processed ) {
					callback_fail.call( Twitch, msg );
				} 
				is_processed = true;
			}
		};
		
		xhttp.open("POST", "https://id.twitch.tv/oauth2/revoke?client_id="+encodeURIComponent(this.client_id)+"&token="+encodeURIComponent(this.user_access_token), true);
		xhttp.send();
	},
	
	getAllSubscibers: function( callback_complete, callback_fail, callback_unathorized ) {
		Twitch.subscibers_map.clear();
		Twitch.processSubrsciberListBatch( "", callback_complete, callback_fail, callback_unathorized );
	},
	
	getUserInfoByLogin: function( twitch_login, callback_success, callback_fail, callback_unathorized ) {
		var url = "https://api.twitch.tv/helix/users?login="+encodeURIComponent(twitch_login);
		this.apiRequest( 
			url, 
			//success
			function( data, pagination_cursor ) {
				if ( data.length == 0 ) {
					if(typeof callback_fail == "function") {
						callback_fail.call( Twitch, "user not found" );
						return;
					}
				}
				if (typeof callback_success == "function") {
					callback_success.call( Twitch, data[0] );
				}
			},
			// fail
			callback_fail,
			// unathorized
			callback_unathorized 
		);
	},
	
	// using old v5 twitch api, not implemented in new
	getSubscriberIcon: function( callback_success, callback_fail, callback_unathorized ) {
		var is_processed = false;
		var xhttp = new XMLHttpRequest();
		xhttp.onload = function() {
			if (this.readyState == 4 ) {
				if ( this.status == 200) {
					try {
						var response_obj = JSON.parse(this.responseText);
						if ( response_obj["subscriber"] === null ) {	
							throw new Error("No subscriber badge in response");
						}
						var icon_src = response_obj["subscriber"]["image"];
						if ( icon_src === null ) {	
							throw new Error("No subscriber icon src in response");
						}
						
						if ( ! is_processed ) {
							is_processed = true;
							if(typeof callback_success == "function") {
								callback_success.call( Twitch, icon_src );
							}
						}
												
					} catch (err) {
						if(typeof callback_fail == "function") {
							if ( ! is_processed ) {
								callback_fail.call( Twitch, err.message );
							}
							is_processed = true;
						}
					}
						
				} else {
					var msg = "";
					switch (this.status) {
						case 401: msg = "Unauthorized";
									if(typeof callback_unathorized == "function") {
										if ( ! is_processed ) {
											callback_unathorized.call( Twitch );
										}
										is_processed = true;
									}
									break;
						default: msg = "HTTP "+this.status+": "+this.statusText+"";
					}
					if(typeof callback_fail == "function") {
						if ( ! is_processed ) {
							callback_fail.call( Twitch, msg );
						}
						is_processed = true;
					}
				}
			}
		};
		xhttp.ontimeout = function() {
			var msg = "timeout";
			if(typeof callback_fail == "function") {
				if ( ! is_processed ) {
					callback_fail.call( Twitch, msg );
				}
				is_processed = true;
			}
		};
		
		xhttp.onerror = function() {
			var msg = "error - "+this.statusText;
			if(typeof callback_fail == "function") {
				if ( ! is_processed ) {
					callback_fail.call( Twitch, msg );
				} 
				is_processed = true;
			}
		};
		
		var url = "https://api.twitch.tv/kraken/chat/"+encodeURIComponent(Twitch.user_id)+"/badges";
		xhttp.open("GET", url, true);
		xhttp.setRequestHeader("Accept", "application/vnd.twitchtv.v5+json");
		xhttp.setRequestHeader("Client-ID", this.client_id);
		
		xhttp.send();
	},
	
	getGameInfoByName: function( game_name, callback_success, callback_fail, callback_unathorized ) {
		var url = "https://api.twitch.tv/helix/games?name="+encodeURIComponent(game_name);
		this.apiRequest( 
			url, 
			//success
			function( data, pagination_cursor ) {
				if ( data.length == 0 ) {
					if(typeof callback_fail == "function") {
						callback_fail.call( Twitch, "game not found" );
						return;
					}
				}
				if (typeof callback_success == "function") {
					callback_success.call( Twitch, data[0] );
				}
			},
			// fail
			callback_fail,
			// unathorized
			callback_unathorized 
		);
	},
	
	getStreamsByGameId: function( game_id, language, callback_complete, callback_fail, callback_unathorized ) {
		Twitch.streams_list = [];
		Twitch.processStreamsListBatch( "", game_id, language, callback_complete, callback_fail, callback_unathorized );
	},
	
	// private methods
	
	apiRequest: function( url, callback_success, callback_fail, callback_unathorized, pagination_cursor="" ) {
		var is_processed = false;
		var xhttp = new XMLHttpRequest();
		xhttp.onload = function() {
			if (this.readyState == 4 ) {
				if ( this.status == 200) {
					try {
						var response_obj = JSON.parse(this.responseText);
						if ( response_obj["data"] === null ) {	
							throw new Error("parsing failed (0)");
						}
						if ( ! Array.isArray(response_obj["data"]) ) {
							throw new Error("parsing failed (1)");
						}
						
						var data = response_obj["data"];
						var pagination_data = response_obj["pagination"];
						var pagination_cursor = "";
						if ( pagination_data !== undefined ) {
							pagination_cursor = pagination_data["cursor"];
						}
						
						if ( ! is_processed ) {
							is_processed = true;
							if(typeof callback_success == "function") {
								callback_success.call( Twitch, data, pagination_cursor );
							}
						}
												
					} catch (err) {
						if(typeof callback_fail == "function") {
							if ( ! is_processed ) {
								callback_fail.call( Twitch, err.message );
							}
							is_processed = true;
						}
					}
						
				} else {
					var msg = "";
					switch (this.status) {
						case 401: msg = "Unauthorized";
									if(typeof callback_unathorized == "function") {
										if ( ! is_processed ) {
											callback_unathorized.call( Twitch );
										}
										is_processed = true;
									}
									break;
						default: msg = "HTTP "+this.status+": "+this.statusText+"";
					}
					if(typeof callback_fail == "function") {
						if ( ! is_processed ) {
							callback_fail.call( Twitch, msg );
						}
						is_processed = true;
					}
				}
			}
		};
		xhttp.ontimeout = function() {
			var msg = "timeout";
			if(typeof callback_fail == "function") {
				if ( ! is_processed ) {
					callback_fail.call( Twitch, msg );
				}
				is_processed = true;
			}
		};
		
		xhttp.onerror = function() {
			var msg = "error - "+this.statusText;
			if(typeof callback_fail == "function") {
				if ( ! is_processed ) {
					callback_fail.call( Twitch, msg );
				} 
				is_processed = true;
			}
		};
		
		xhttp.open("GET", url, true);
		xhttp.setRequestHeader("Authorization", "Bearer "+Twitch.user_access_token);
		xhttp.send();
	},
	
	processSubrsciberListBatch: function( pagination_cursor="", callback_complete, callback_fail, callback_unathorized ) {
		var url = "https://api.twitch.tv/helix/subscriptions?broadcaster_id="+encodeURIComponent(Twitch.user_id);
		if ( pagination_cursor != "" ) {
			url += "&after="+encodeURIComponent(pagination_cursor);
		}
		
		this.apiRequest( 
			url,
			//success
			function( data, pagination_cursor ) {
				if ( data.length == 0 ) {
					// all data grabbed
					if(typeof callback_complete == "function") {
						callback_complete.call( Twitch, Twitch.subscibers_map );
						return;
					}
				}
				
				for ( var i=0; i<data.length; i++) {
					let user_name = data[i]["user_name"];
					let user_id = data[i]["id"];
					let sub_tier = data[i]["tier"];
					let sub_info_obj = {
						"user_id": user_id,
						"tier": sub_tier,
					}
					
					Twitch.subscibers_map.set( user_name, sub_info_obj );
				}
				
				// process next batch
				Twitch.processSubrsciberListBatch( pagination_cursor, callback_complete, callback_fail, callback_unathorized );
			},
			// fail
			callback_fail,
			// unathorized
			callback_unathorized 
		);
	},
	
	processStreamsListBatch: function( pagination_cursor="", game_id, language, callback_complete, callback_fail, callback_unathorized ) {
		var url = "https://api.twitch.tv/helix/streams?game_id="+encodeURIComponent(game_id);
		url += "&language="+encodeURIComponent(language);
		if ( pagination_cursor != "" ) {
			url += "&after="+encodeURIComponent(pagination_cursor);
		}
		
		this.apiRequest( 
			url,
			//success
			function( data, pagination_cursor ) {
				if ( data.length == 0 ) {
					// all data grabbed
					if(typeof callback_complete == "function") {
						callback_complete.call( Twitch, Twitch.streams_list );
						return;
					}
				}
				
				for ( var i=0; i<data.length; i++) {
					let user_name = data[i]["user_name"];
					let title = data[i]["title"];
					let viewer_count = data[i]["viewer_count"];
					let stream_info_obj = {
						"user_name": user_name,
						"title": title,
						"viewer_count": viewer_count,
					}
					
					Twitch.streams_list.push( stream_info_obj );
				}
				
				// process next batch
				Twitch.processStreamsListBatch( pagination_cursor, game_id, language, callback_complete, callback_fail, callback_unathorized );
			},
			// fail
			callback_fail,
			// unathorized
			callback_unathorized 
		);
	},
}