var setupRan = false;

function loadScript(url, callback)
{
    // Adding the script tag to the head as suggested before
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;

    // Then bind the event to the callback function.
    // There are several events for cross browser compatibility.
    script.onreadystatechange = callback;
    script.onload = callback;

    // Fire the loading
    head.appendChild(script);
}

function setupDone() {
    $$("<style></style>").attr("is", "custom-style").text(".left-content.ytmusic-nav-bar, .right-content.ytmusic-nav-bar {visibility: hidden !important;}").appendTo("head");

	webIntegration.themeChanged.connect(function(data) {
        var el = $$("style#webintegration");
		if(el.size() == 1) {
			el.text(data);
		} else {
            $$("<style></style>").attr("id", "webintegration").attr("is", "custom-style").text(data).appendTo("head");
		}
	});

    $$("ytmusic-browse-response").observe({attributes: true, attributeFilter: ["hidden"]}, function() {
        $$("ytmusic-nav-bar").attr("scrolled", $(this).attr("hidden") !== undefined ? "true" : null);
    });

    Youtube.theater = webIntegration.theaterMode;

	webIntegration.gotoPage.connect(function(page) {
		Youtube.gotoPage(page);
	});
	webIntegration.pause.connect(function() {
		Youtube.pause();
	});
	webIntegration.play.connect(function() {
		Youtube.play();
	});
	webIntegration.pausePlay.connect(function() {
		Youtube.pausePlay();
	});
	webIntegration.stop.connect(function() {
		Youtube.stop();
	});
	webIntegration.next.connect(function() {
		Youtube.next();
	});
	webIntegration.previous.connect(function() {
		Youtube.previous();
	});
	webIntegration.seek.connect(function(offset) {
		Youtube.seek(offset);
	});
	webIntegration.setPosition.connect(function(position) {
		Youtube.setPosition(position);
	});
	webIntegration.loopStatus.connect(function(loop) {
		Youtube.loopStatus(loop);
	});
    webIntegration.shuffle.connect(function(shuffle) {
        Youtube.shuffle(shuffle);
	});
    webIntegration.setTheaterMode.connect(function(mode) {
       Youtube.setTheaterMode(mode);
    });

	Youtube.songChanged(function() {
		webIntegration.songChanged(this.songInfo);
	});
    Youtube.songPositionChanged(function() {
		webIntegration.songPositionChanged(this.songPosition);
	});
	Youtube.songStateChanged(function() {
		webIntegration.songStateChanged(this.songState);
	});
	Youtube.volumeChanged(function() {
		webIntegration.volumeChanged(this.volume);
	});
	Youtube.userChanged(function() {
		webIntegration.userChanged(this.user);
    });
    Youtube.theaterChanged(function() {
       webIntegration.theaterChanged(this.theater);
    });

	webIntegration.loadTheme();

    var handler = {
        get: function(obj, prop) {
            console.error("get " + prop);
            return prop in obj ?
                obj[prop] :
                37;
        }
    };

    window = new Proxy(window, handler);

    setupRan = true;
}

var zeptoLoaded = function() {
    var channel = new QWebChannel(qt.webChannelTransport, function(channel) {
		window.webIntegration = channel.objects.webIntegration;

        $$("head").observe({childList: true}, function() {
            if(!setupRan && document.querySelector("ytd-player") !== null) {
                setupRan = true;
                setupDone();
            }
        });
	});
}

loadScript("qrc:/web/zepto.min.js", function() {
	loadScript("qrc:/web/zepto.youtube.js", function() {
		loadScript("qrc:/qtwebchannel/qwebchannel.js", zeptoLoaded);
	});
});
