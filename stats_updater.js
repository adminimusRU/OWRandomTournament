var StatsUpdaterState = {
	idle: 1,
	updating: 2,
	waiting: 3,
};

var StatsUpdater = {
	queue: [], // players to update
	current_retry: 2,
	state: StatsUpdaterState.idle,
	
	totalQueueLength: 0,
	update_fails: 0,
	currentIndex: 0,
	current_id: "",
	
	// settings	
	min_api_request_interval: 6000, //milliseconds
	max_retry: 2,
	update_edited_fields: true,
	update_sr: true,
	update_class: true,
	
	
	// callbacks
	onPlayerUpdated: undefined,
	onComplete: undefined,
	onStart: undefined,
	onProgressChange: undefined,
	onError: undefined,
	
	addToQueue: function( player_s ) {
		if ( Array.isArray(player_s) ) {
			for (i in player_s) {
				// check duplicates
				if ( this.queue.indexOf( player_s[i] ) !== -1 ) {
					continue;
				}
				this.queue.push( player_s[i] );
			}
			this.totalQueueLength += player_s.length;
		} else {
			// check duplicates
			if ( this.queue.indexOf( player_s ) !== -1 ) {
				return;
			}
			this.queue.push( player_s );
			this.totalQueueLength ++;
		}
		
		if ( this.state == StatsUpdaterState.idle ) {
			this.currentIndex = 1;
			this.state = StatsUpdaterState.updating;
			
			this.updateNextPlayer();
			if(typeof this.onStateChange == "function") {
				this.onStart.call( undefined );
			}
		} else if ( this.state == StatsUpdaterState.updating ) {
			this.totalQueueLength++;
			this.state = StatsUpdaterState.updating;
		} else if ( this.state == StatsUpdaterState.waiting ) {
			this.totalQueueLength = 1;
			this.update_fails = 0;
			this.currentIndex = 1;
			this.state = StatsUpdaterState.updating;
			setTimeout( this.updateNextPlayer.bind(this), this.min_api_request_interval );
			if(typeof this.onStateChange == "function") {
				this.onStart.call( undefined );
			}
		}
	},
	
	updateNextPlayer: function() {
		player_struct = this.queue[0];
		
		OWAPI.id = player_struct.id;
		OWAPI.onSuccess = this.onOWAPISuccess.bind(StatsUpdater);
		OWAPI.onFail = this.onOWAPIFail.bind(StatsUpdater);
		OWAPI.getStats();
		//this.currentIndex++;
		this.current_id = player_struct.id;
		
		if(typeof this.onProgressChange == "function") {
			this.onProgressChange.call( undefined );
		}
	},
	
	resetState: function() {
		if ( this.state == StatsUpdaterState.waiting ) {
			this.totalQueueLength = 0;
			this.update_fails = 0;
			this.state = StatsUpdaterState.idle;
		}
	},
	
	onOWAPISuccess: function() {
		var player = this.queue.shift();
		
		player.level = OWAPI.level;
	
		// check if name was manually edited
			if ( (player.ne !== true) || this.update_edited_fields ) {
			player.display_name = OWAPI.display_name;
		}

		if( this.update_sr ) {
			if ( OWAPI.sr != 0 ) {
				// check if SR was manually edited and update option checked
				if ( (player.se !== true) || this.update_edited_fields ) {
					player.sr = OWAPI.sr;
					player.se = false;
				}
			} else {
				// log error
				var msg = "Player has 0 SR, not completed placements in current season";
				if(typeof this.onError == "function") {
					this.onError.call( undefined, OWAPI.id, msg );
				}
				//document.getElementById("stats_update_log").innerHTML += OWAPI.id+": "+msg+"</br>";
			}
		}
		
		if( this.update_class ) {
			// check if class was manually edited and update option checked
			if ( (player.ce !== true) || this.update_edited_fields ) {
				player.top_classes = OWAPI.top_classes;
				player.ce = false;
			}
		}
		
		player.top_heroes = OWAPI.top_heroes;
		
		player.last_updated = new Date;
		
		delete player.empty;
				
		this.current_retry = 0;
		
		if ( this.queue.length > 0 ) {
			this.currentIndex++;
			setTimeout( this.updateNextPlayer.bind(this), this.min_api_request_interval );
		} else {
			this.state = StatsUpdaterState.waiting;
			this.totalQueueLength = 0;
			this.update_fails = 0;
			this.currentIndex = 0;
			if(typeof this.onComplete == "function") {
				this.onComplete.call();
			}
			setTimeout( this.resetState.bind(this), this.min_api_request_interval );
		}
		
		if(typeof this.onPlayerUpdated == "function") {
			this.onPlayerUpdated.call( undefined, player.id );
		}
	},
	
	onOWAPIFail: function ( msg ) {
		if ( OWAPI.can_retry == true && (this.current_retry <= this.max_retry) ) {
			// log error and retry
			this.current_retry++;
			setTimeout( this.updateNextPlayer.bind(this), this.min_api_request_interval );
		} else {
			// log error and update next player
			this.update_fails++;
			this.queue.shift();
			this.current_retry = 0;
			
			if ( this.queue.length > 0 ) {
				this.currentIndex++;
				setTimeout( this.updateNextPlayer.bind(this), this.min_api_request_interval );
			} else {
				this.state = StatsUpdaterState.waiting;
				this.totalQueueLength = 0;
				this.currentIndex = 0;
				if(typeof this.onComplete == "function") {
					this.onComplete.call();
				}
				setTimeout( this.resetState.bind(this), this.min_api_request_interval );
			}
			
		}
		
		if(typeof this.onError == "function") {
			this.onError.call( undefined, OWAPI.id, msg );
		}
	},
}