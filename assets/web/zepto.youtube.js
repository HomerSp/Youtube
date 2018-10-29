if(window.$$ === undefined)
    window.$$ = Zepto;

;(function($){
	$.extend($.fn, {
		observe: function(opts, callback) {
			var obj = this; 
			var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
			var observer = new MutationObserver(function(mutations) {
				mutations.forEach(function(mutation) {
					callback.call(obj, mutation);
				});
			});

			return this.each(function(idx){
				observer.observe(this, opts);
			});
		}
	})
})($$)

if (!Object.prototype.watch) {
    Object.defineProperty(Object.prototype, "watch", {
          enumerable: false
        , configurable: true
        , writable: false
        , value: function (prop, handler) {
            var
              oldval = this[prop]
            , newval = oldval
            , getter = function () {
                return newval;
            }
            , setter = function (val) {
                oldval = newval;
                return newval = handler.call(this, prop, oldval, val);
            }
            ;

            if (delete this[prop]) { // can't watch constants
                Object.defineProperty(this, prop, {
                      get: getter
                    , set: setter
                    , enumerable: true
                    , configurable: true
                });
            }
        }
    });
}

// object.unwatch
if (!Object.prototype.unwatch) {
    Object.defineProperty(Object.prototype, "unwatch", {
          enumerable: false
        , configurable: true
        , writable: false
        , value: function (prop) {
            var val = this[prop];
            delete this[prop]; // remove accessors
            this[prop] = val;
        }
    });
}

var Youtube = (function() {
	var youtube = {};
	youtube.songInfo = {
		albumArt: "",
		artist: "",
		album: "",
		title: "",
		year: "",
		length: 0,
		trackId: 1
	};
	youtube.songPosition = 0
	youtube.songState = {
		playing: 0, // 0 = stopped, 1 = playing, 2 = paused
        repeat: 0, // 0 = off, 1 = all, 2 = one
        shuffle: false
	}
	youtube.volume = 0.0
	youtube.user = {
		name: ""
	}
    youtube.theater = false

	youtube.songChanged = function(callback) {
        var player = document.querySelector("ytd-player");
        player.getPlayerPromise().then(function(api) {
            var videoDataChange = function(state) {
                var thumbnail = "";
                var artist = api.getVideoData().author;
                var album = "";
                var title = api.getVideoData().title;
                var year = "";
                var length = api.getDuration();
                var trackId = 1;
                if(api.getPlaylistIndex() >= 0) {
                    trackId = api.getPlaylistIndex();
                }

                var playerResponse = api.getPlayerResponse();
                if(playerResponse !== null && playerResponse.videoDetails !== null && playerResponse.videoDetails.thumbnail !== null && playerResponse.videoDetails.thumbnail.thumbnails.length > 0) {
                    var index = 0;
                    var maxW = 0, maxH = 0;
                    for(var i = 0; i < playerResponse.videoDetails.thumbnail.thumbnails.length; i++) {
                        if(maxW < playerResponse.videoDetails.thumbnail.thumbnails[i].width
                                || maxH < playerResponse.videoDetails.thumbnail.thumbnails[i].height) {
                            maxW = playerResponse.videoDetails.thumbnail.thumbnails[i].width;
                            maxH = playerResponse.videoDetails.thumbnail.thumbnails[i].height;
                            index = i;
                        }
                    }

                    thumbnail = playerResponse.videoDetails.thumbnail.thumbnails[index].url;
                }

                var playlist = document.querySelector("yt-playlist-manager");
                if(playlist !== null && playlist.playlistComponent !== null) {
                    album = playlist.playlistComponent.title;
                }

                var secondaryInfo = document.querySelector("ytd-video-secondary-info-renderer");
                if(secondaryInfo !== null && secondaryInfo.data !== null && secondaryInfo.data.dateText !== null) {
                    year = secondaryInfo.data.dateText.simpleText.match(/\d+$/gm)
                }

                if(youtube.songInfo.albumArt !== thumbnail
                    || youtube.songInfo.artist !== artist
                    || youtube.songInfo.album !== album
                    || youtube.songInfo.title !== title
                    || youtube.songInfo.year !== year
                    || youtube.songInfo.length !== length
                    || youtube.songInfo.trackId !== trackId) {
                    youtube.songInfo.albumArt = thumbnail;
                    youtube.songInfo.artist = artist;
                    youtube.songInfo.album = album;
                    youtube.songInfo.title = title;
                    youtube.songInfo.year = year;
                    youtube.songInfo.length = length;
                    youtube.songInfo.trackId = trackId;

                    callback.call(youtube);
                }
            };

            player.listenToPlayerEvent(api, "onVideoDataChange", videoDataChange);
            videoDataChange(null);
        });
	}

	youtube.songPositionChanged = function(callback) {
        var player = document.querySelector("ytd-player");
        player.getPlayerPromise().then(function(api) {
            var videoProgress = function(pos) {
                if(youtube.songPosition !== pos) {
                    youtube.songPosition = pos;
                    callback.call(youtube);
                }
            };

            player.listenToPlayerEvent(api, "onVideoProgress", videoProgress);
            videoProgress(api.getCurrentTime());
        });
	}

	youtube.songStateChanged = function(callback) {
        var player = document.querySelector("ytd-player");
        player.getPlayerPromise().then(function(api) {
            var stateChange = function(state) {
                var playing = 0;
                if(state === 1) {
                    playing = 1;
                } else if(state === 2) {
                    playing = 2;
                }

                if(youtube.songState.playing !== playing) {
                    youtube.songState.playing = playing;
                    callback.call(youtube);
                }
            };

            player.listenToPlayerEvent(api, "onStateChange", stateChange);
            stateChange(api.getPlayerState());
        });

        var playlist = document.querySelector("yt-playlist-manager");
        if(playlist !== null && playlist.playlistComponent !== null) {
            playlist.playlistComponent.onZeptoToggleLoopShuffle_ = function(a) {
                var repeat = youtube.songState.repeat;
                var shuffle = youtube.songState.shuffle;
                if(a !== null && a.detail !== null && a.detail.actions !== null) {
                    if(a.detail.actions.loop !== undefined) {
                        repeat = (a.detail.actions.loop) ? 1 : 0;
                    }
                    if(a.detail.actions.shuffle !== undefined) {
                        shuffle = a.detail.actions.shuffle;
                    }
                }

                if(youtube.songState.repeat !== repeat
                    || youtube.songState.shuffle !== shuffle) {
                    youtube.songState.repeat = repeat;
                    youtube.songState.shuffle = shuffle;
                    callback.call(youtube);
                }
            }

            playlist.playlistComponent.listen(playlist.playlistComponent, "yt-toggle-button", "onZeptoToggleLoopShuffle_");
        }
	}

	youtube.volumeChanged = function(callback) {
        var player = document.querySelector("ytd-player");
        player.getPlayerPromise().then(function(api) {
            var volumeChange = function(vol) {
                if(vol !== null && youtube.volume !== vol.volume) {
                    youtube.volume = vol.volume;
                    callback.call(youtube);
                }
            };

            player.listenToPlayerEvent(api, "onVolumeChange", volumeChange);
            volumeChange({volume: api.getVolume()});
        });
	}

	youtube.userChanged = function(callback) {
        var loaded = function() {
            console.error("userChanged loaded");
            var networkManager = document.querySelector("yt-network-manager");
            if(networkManager !== null) {
                networkManager.requestDataForServiceEndpoint({signalServiceEndpoint: {signal: "GET_ACCOUNT_MENU"}}).then(function(d) {
                    if(d !== null && d.data !== null && d.data.actions.length > 0) {
                        var activeAccount = d.data.actions[0].openPopupAction.popup.multiPageMenuRenderer.header.activeAccountHeaderRenderer.accountName.simpleText;
                        if(youtube.user.name !== activeAccount) {
                            youtube.user.name = activeAccount;
                            callback.call(youtube);
                        }
                    } else {
                        youtube.user.name = "";
                        callback.call(youtube);
                    }
                });
            } else {
                youtube.user.name = "";
                callback.call(youtube);
            }
        }

        window.addEventListener("load", loaded);
        if(document.readyState === "complete") {
            loaded();
        }
	}

    youtube.theaterChanged = function(callback) {
        var watch = document.querySelector("ytd-watch") || document.querySelector("ytd-watch-fixie") || document.querySelector("ytd-watch-flexy");
        if(watch !== null && watch.player !== null) {
            var modeChange = function(mode) {
                if(youtube.theater !== mode) {
                    youtube.theater = mode;
                    callback.call(youtube);
                }
            };

            watch.listenToPlayerEvent(watch.player, "SIZE_CLICKED", modeChange);
            modeChange(youtube.theater);
        }
    }

	youtube.gotoPage = function(page) {
		var endpoint = {};
		switch(page) {
            case "home": {
                endpoint = {endpoint: {
                    browseEndpoint: {
                        browseId: "FEwhat_to_watch"
                    }
                }};
                document.querySelector("ytd-player").fire("yt-navigate", endpoint);
                break;
            }
            case "history": {
                endpoint = {endpoint: {
                    browseEndpoint: {
                        browseId: "FEhistory"
                    }
                }};
                document.querySelector("ytd-player").fire("yt-navigate", endpoint);
                break;
            }
			case "signout": {
                endpoint = {endpoint: {
                        commandMetadata: {
                            webCommandMetadata: {
                                url: "/logout"
                            }
                        }
                    }
                };
                document.querySelector("ytd-player").fire("yt-navigate", endpoint);
				break;
			}
			case "settings": {
                endpoint = {endpoint: {
                        commandMetadata: {
                            webCommandMetadata: {
                                url: "/account"
                            }
                        },
                        signalNavigationEndpoint: {
                            signal: "ACCOUNT_SETTINGS"
                        }
                    }
                };
                document.querySelector("ytd-player").fire("yt-navigate", endpoint);
				break;
			}
			case "help": {
				endpoint = {signalServiceEndpoint: {
                    signal: "CLIENT_SIGNAL",
                    actions: [{
                        signalAction: {
                            signal: "HELP"
                        }
                    }]
                }};
                document.querySelector("ytd-player").sendServiceRequestAction([endpoint]);
                document.querySelector("ytd-player").fire("yt-execute-service-endpoint", endpoint);
				break;
			}
			case "feedback": {
				endpoint = {signalServiceEndpoint: {
                    signal: "CLIENT_SIGNAL",
                    actions: [{
                        sendFeedbackAction: {}
                    }]
                }};
                document.querySelector("ytd-player").sendServiceRequestAction([endpoint]);
                document.querySelector("ytd-player").fire("yt-execute-service-endpoint", endpoint);
				break;
			}
		}
	}

	youtube.pause = function() {
        var player = document.querySelector("ytd-player");
        player.getPlayerPromise().then(function(api) {
           api.pauseVideo();
        });

	}
	youtube.play = function() {
        var player = document.querySelector("ytd-player");
        player.getPlayerPromise().then(function(api) {
           api.playVideo();
        });
	}
	youtube.pausePlay = function() {
        var player = document.querySelector("ytd-player");
        player.getPlayerPromise().then(function(api) {
            if(youtube.songstate.playing) {
                api.pauseVideo();
            } else {
                api.playVideo();
            }
        });
	}
	youtube.stop = function() {
        var player = document.querySelector("ytd-player");
        player.getPlayerPromise().then(function(api) {
           api.stopVideo();
        });
	}
	youtube.next = function() {
        var player = document.querySelector("ytd-player");
        player.getPlayerPromise().then(function(api) {
           api.nextVideo();
        });
	}
	youtube.previous = function() {
        var player = document.querySelector("ytd-player");
        player.getPlayerPromise().then(function(api) {
           api.previousVideo();
        });
	}
	youtube.seek = function(offset) {
        var player = document.querySelector("ytd-player");
        player.getPlayerPromise().then(function(api) {
           api.seekBy(offset);
        });
	}
	youtube.setPosition = function(position) {
        var player = document.querySelector("ytd-player");
        player.getPlayerPromise().then(function(api) {
           api.seekTo(position);
        });
	}
	youtube.loopStatus = function(loop) {
        if(youtube.songState.repeat === loop) {
            return;
        }

        var repeat = false;
        if(loop === 1) {
            repeat = true;
        } else if(loop === 2) {
            console.error("Unsupported loop mode!");
            return;
		}

        var playlist = document.querySelector("yt-playlist-manager");
        if(playlist !== null && playlist.playlistComponent !== null) {
            $$(playlist.playlistComponent.$["playlist-actions"].children[0].$["top-level-buttons"].children[0]).click();
        }
	}
    youtube.shuffle = function(shuffle) {
        if(youtube.songState.shuffle === shuffle) {
            return;
        }

        var playlist = document.querySelector("yt-playlist-manager");
        if(playlist !== null && playlist.playlistComponent !== null) {
            $$(playlist.playlistComponent.$["playlist-actions"].children[0].$["top-level-buttons"].children[1]).click();
        }
	}
    youtube.setTheaterMode = function(mode) {
        var watch = document.querySelector("ytd-watch") || document.querySelector("ytd-watch-fixie") || document.querySelector("ytd-watch-flexy");
        if(watch !== null && watch.player !== null) {
            if(mode === watch.theaterRequested_) {
                return;
            }

            watch.sendAction("yt-toggle-theater-mode", [mode]);
        }
    }

	return youtube;
})()

window.Youtube = Youtube
