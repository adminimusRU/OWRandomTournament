// Twitch interface object (using new API)
// API docs: https://dev.twitch.tv/docs/api/
// usage: 
//	1. call init(). Optionally pass saved auth token
//	2. use getLoginURL() to get twitch auth page link
//	3. if document.location.hash is not empty (user redirected back from twitch auth page) - pass it to authenticate()
//	4. check successfull auth with Twitch.isLoggedIn()
//	5. call getAuthorizedUserInfo() to get user data
//	6. save auth token (optional) received by getToken
//	7. use other public methods

// @todo rewrite ajax calls

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
	subscibers_map: new Map(),
	state: "", //OAuth 2.0 parameter to prevent CSRF attacks
	
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
						if ( response_obj["data"].length == 0 ) {
							throw new Error("user not found");
						}
						
						if (typeof callback_success == "function") {
							if ( ! is_processed ) {
								is_processed = true;
								let user_data = response_obj["data"][0];
								Twitch.user_login = user_data["login"];
								Twitch.user_display_name = user_data["display_name"];
								Twitch.user_id = user_data["id"];
								Twitch.user_profile_image_url = user_data["profile_image_url"];
								
								callback_success.call( Twitch );
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
		
		xhttp.open("GET", "https://api.twitch.tv/helix/users", true);
		xhttp.setRequestHeader("Authorization", "Bearer "+this.user_access_token);
		xhttp.send();
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
						if ( response_obj["data"].length == 0 ) {
							throw new Error("user not found");
						}
						
						var user_data = response_obj["data"];
						
						if (typeof callback_success == "function") {
							if ( ! is_processed ) {
								is_processed = true;
								let user_data = response_obj["data"][0];							
								callback_success.call( Twitch, user_data );
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
		
		var url = "https://api.twitch.tv/helix/users?login="+encodeURIComponent(twitch_login);
		
		xhttp.open("GET", url, true);
		xhttp.setRequestHeader("Authorization", "Bearer "+this.user_access_token);
		xhttp.send();
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
	
	// private methods
	
	processSubrsciberListBatch: function( pagination_cursor="", callback_complete, callback_fail, callback_unathorized ) {
		var is_processed = false;
		var xhttp = new XMLHttpRequest();
		xhttp.onload = function() {
			if (this.readyState == 4 ) {
				// @todo remove, dbg only
				document.getElementById("debug_log").innerHTML += this.responseText + "<br/>";
				if ( this.status == 200) {
					try {
						var response_obj = JSON.parse(this.responseText);
						if ( response_obj["data"] === null ) {	
							throw new Error("parsing failed (0)");
						}
						if ( ! Array.isArray(response_obj["data"]) ) {
							throw new Error("parsing failed (1)");
						}
						
						var user_data = response_obj["data"];
						var pagination_data = response_obj["pagination"];						
						
						if ( ! is_processed ) {
							is_processed = true;
							
							if ( user_data.length == 0 ) {
								// all data grabbed
								if(typeof callback_complete == "function") {
									callback_complete.call( Twitch, Twitch.subscibers_map );
									return;
								}
							}
							
							for ( var i=0; i<user_data.length; i++) {
								let user_name = user_data[i]["user_name"];
								let user_id = user_data[i]["id"];
								let sub_tier = user_data[i]["tier"];
								let sub_info_obj = {
									"user_id": user_id,
									"tier": sub_tier,
								}
								
								Twitch.subscibers_map.set( user_name, sub_info_obj );
							}
							
							// process next batch
							let pagination_cursor = pagination_data["cursor"];							
							Twitch.processSubrsciberListBatch( pagination_cursor, callback_complete, callback_fail, callback_unathorized );
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
		
		var url = "https://api.twitch.tv/helix/subscriptions?broadcaster_id="+encodeURIComponent(Twitch.user_id);
		if ( pagination_cursor != "" ) {
			url += "&after="+encodeURIComponent(pagination_cursor);
		}
		
		xhttp.open("GET", url, true);
		xhttp.setRequestHeader("Authorization", "Bearer "+this.user_access_token);
		xhttp.send();
	},
}