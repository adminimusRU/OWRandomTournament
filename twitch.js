// Twitch interface object (using new API)
// API docs: https://dev.twitch.tv/docs/api/
// usage: 

var Twitch = {
	// authentication parameters. Use init method to fill
	client_id: "",
	redirect_uri: "",
	scope: "",
	
	// filled after successfull authentication
	user_login: "",
	user_display_name: "",
	user_id: "",
	user_profile_image_url: "",
	
	// internal
	
	user_access_token: "",
	
	/*logins_processing: [],
	id_login_map: new Map(),*/
	
	subscibers_map: new Map(),
	
	//state: "", //OAuth 2.0 parameter
	
	// public methods
	
	init: function( client_id, redirect_uri, scope, saved_token="" ) {
		this.client_id = client_id;
		this.redirect_uri = redirect_uri;
		this.scope = scope;
		
		if ( typeof saved_token === 'string'  ) {
			this.user_access_token = saved_token;
		}
		
		// @todo implement. Need to save in storage?
		//this.state = (Math.random() + 1).toString(36).substr(2, 5);
	},
	
	getLoginURL: function() {
		return "https://id.twitch.tv/oauth2/authorize?"
			+"client_id="+encodeURIComponent(this.client_id)
			+"&redirect_uri="+encodeURIComponent(this.redirect_uri)
			+"&response_type=token"
			+"&scope="+encodeURIComponent(this.scope);
			//+"&state="+encodeURIComponent(this.state);
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
			/*if ( this.state != "" ) {
				if ( this.state !== params.get("state") ) {
					return "state not matching";
				}
			}*/
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
							//OWAPI.can_retry = false;
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
						if(typeof callback_faill == "function") {
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
									//OWAPI.can_retry = false;
									if(typeof callback_unathorized == "function") {
										if ( ! is_processed ) {
											callback_unathorized.call( Twitch );
										}
										is_processed = true;
									}
									break;
						default: msg = "HTTP "+this.status+": "+this.statusText+"";
									//OWAPI.can_retry = true;
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
			//OWAPI.can_retry = true;
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
		//xhttp.timeout = OWAPI.owapi_timeout;
		xhttp.send();
	},
	
	// revoke access token
	logout: function( callback_success, callback_fail ) {
		var is_processed = false;
		var xhttp = new XMLHttpRequest();
		xhttp.onload = function() {
			if (this.readyState == 4 ) {
				if ( this.status == 200) {
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
			//OWAPI.can_retry = true;
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
		//xhttp.timeout = OWAPI.owapi_timeout;
		xhttp.send();
	},
	
	getAllSubscibers: function( callback_complete, callback_fail, callback_unathorized ) {
		Twitch.subscibers_map.clear();
		Twitch.processSubrsciberListBatch( "", callback_complete, callback_fail, callback_unathorized );
	},
	
	// probably getUserIdMap and checkSubscription not needed
	// fills id_login_map
	/*getUserIdMap: function( login_array=[], callback_complete, callback_fail, callback_unathorized ) {		
		for (var i=0; i<login_array.length; i++) {
			this.logins_processing.push( login_array[i] );
		}
		
		// get twitch user info, max portion of 100 logins
		this.processLoginsIdMap( callback_complete, callback_fail, callback_unathorized );
	},
	
	checkSubscription: function( login_array=[], callback_success, callback_fail, callback_unathorized ) {
		for (var i=0; i<login_array.length; i++) {
			this.logins_processing.push( login_array[i] );
		}
		
		this.processSubsciptions( callback_success, callback_fail, callback_unathorized );
	},*/
	
	
	// private methods
	
	
	/*processLoginsIdMap: function( callback_complete, callback_fail, callback_unathorized ) {
		if (this.logins_processing.length == 0 ) {
			if (typeof callback_complete == "function") {
				callback_complete.call( Twitch );
				return;
			}
		}
		
		var is_processed = false;
		var xhttp = new XMLHttpRequest();
		xhttp.onload = function() {
			if (this.readyState == 4 ) {
				if ( this.status == 200) {
					try {
						var response_obj = JSON.parse(this.responseText);
						if ( response_obj["data"] === null ) {	
							//OWAPI.can_retry = false;
							throw new Error("parsing failed (0)");
						}
						if ( ! Array.isArray(response_obj["data"]) ) {
							throw new Error("parsing failed (1)");
						}
						if ( response_obj["data"].length == 0 ) {
							throw new Error("user not found");
						}
						
						var user_data = response_obj["data"];
						
						if ( ! is_processed ) {
							is_processed = true;
							for ( var i=0; i<user_data.length; i++) {
								let user_login = user_data[i]["login"];
								let user_id = user_data[i]["id"];
								
								Twitch.id_login_map.set( user_id, user_login );
							}
							
							// process next batch
							Twitch.processLoginsIdMap( callback_complete, callback_fail, callback_unathorized );
						}
												
					} catch (err) {
						if(typeof callback_faill == "function") {
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
									//OWAPI.can_retry = false;
									if(typeof callback_unathorized == "function") {
										if ( ! is_processed ) {
											callback_unathorized.call( Twitch );
										}
										is_processed = true;
									}
									break;
						default: msg = "HTTP "+this.status+": "+this.statusText+"";
									//OWAPI.can_retry = true;
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
			//OWAPI.can_retry = true;
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
		
		var url = "https://api.twitch.tv/helix/users?";
		// batch of max 100 logins allowed
		for (i=1; i<=100; i++) {
			var login = this.logins_processing.pop();
			if (login === undefined) {
				break;
			}
			url += "login="+encodeURIComponent(login)+"&";
		}
		url = url.slice( 0, -1 );
		
		xhttp.open("GET", url, true);
		xhttp.setRequestHeader("Authorization", "Bearer "+this.user_access_token);
		//xhttp.timeout = OWAPI.owapi_timeout;
		xhttp.send();
	},
	
	processSubsciptions: function( callback_success, callback_fail, callback_unathorized ) {
		if (this.logins_processing.length == 0 ) {
			return;
		}
		
		var is_processed = false;
		var xhttp = new XMLHttpRequest();
		xhttp.onload = function() {
			if (this.readyState == 4 ) {
				if ( this.status == 200) {
					try {
						var response_obj = JSON.parse(this.responseText);
						if ( response_obj["data"] === null ) {	
							//OWAPI.can_retry = false;
							throw new Error("parsing failed (0)");
						}
						if ( ! Array.isArray(response_obj["data"]) ) {
							throw new Error("parsing failed (1)");
						}
						if ( response_obj["data"].length == 0 ) {
							throw new Error("user not found");
						}
						
						var user_data = response_obj["data"];
						
						if ( ! is_processed ) {
							is_processed = true;
							for ( var i=0; i<user_data.length; i++) {
								let user_id = user_data[i]["id"];
								let sub_tier = user_data[i]["tier"];
								
								if(typeof callback_success == "function") {
									callback_success.call( Twitch, Twitch.id_login_map.get(user_id), sub_tier );
								}
							}
							
							// process next batch
							Twitch.processLoginsIdMap( callback_complete, callback_fail, callback_unathorized );
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
									//OWAPI.can_retry = false;
									if(typeof callback_unathorized == "function") {
										if ( ! is_processed ) {
											callback_unathorized.call( Twitch );
										}
										is_processed = true;
									}
									break;
						default: msg = "HTTP "+this.status+": "+this.statusText+"";
									//OWAPI.can_retry = true;
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
			//OWAPI.can_retry = true;
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
		
		var url = "https://api.twitch.tv/helix/subscriptions?broadcaster_id="+encodeURIComponent(Twitch.user_id)+"&";
		// batch of max 100 logins allowed
		for (i=1; i<=100; i++) {
			var login = this.logins_processing.pop();
			if (login === undefined) {
				break;
			}
			for (var [key, value] of Twitch.id_login_map) {
				if ( value === login ) {
					url += "user_id="+encodeURIComponent(key)+"&";
				}
			}
		}
		url = url.slice( 0, -1 );
		
		xhttp.open("GET", url, true);
		xhttp.setRequestHeader("Authorization", "Bearer "+this.user_access_token);
		//xhttp.timeout = OWAPI.owapi_timeout;
		xhttp.send();
	},*/
	
	processSubrsciberListBatch: function( pagination_cursor="", callback_complete, callback_fail, callback_unathorized ) {
		var is_processed = false;
		var xhttp = new XMLHttpRequest();
		xhttp.onload = function() {
			if (this.readyState == 4 ) {
				if ( this.status == 200) {
					try {
						var response_obj = JSON.parse(this.responseText);
						if ( response_obj["data"] === null ) {	
							//OWAPI.can_retry = false;
							throw new Error("parsing failed (0)");
						}
						if ( ! Array.isArray(response_obj["data"]) ) {
							throw new Error("parsing failed (1)");
						}
						if ( response_obj["data"].length == 0 ) {
							throw new Error("user not found");
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
									//OWAPI.can_retry = false;
									if(typeof callback_unathorized == "function") {
										if ( ! is_processed ) {
											callback_unathorized.call( Twitch );
										}
										is_processed = true;
									}
									break;
						default: msg = "HTTP "+this.status+": "+this.statusText+"";
									//OWAPI.can_retry = true;
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
			//OWAPI.can_retry = true;
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
		//xhttp.timeout = OWAPI.owapi_timeout;
		xhttp.send();
	},
}