var lastfmAPIKey = 'f43ee972802462f7a6e9e6b9b5805c5d';
var cacheDirectory = process.env.APPDATA+"\\OpenTune\\cache";
if (!fs.existsSync(cacheDirectory)) {
	fs.mkdirSync(process.env.APPDATA+"\\OpenTune\\");
	fs.mkdirSync(cacheDirectory);
}

var searchEntered = function (e) {
	e.preventDefault();
	var input = $(this).find('input[type=text]').val();
	if (input == '') {
		alert('You entered no query.');
		return;
	}
	searchiTunes(input);
	updateSectionHeader(input);
	$('#results').empty();
	$('#loadingGif').show();
	switchTabTo('explore');
}
var getUserHome = function() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}
var searchLastFm = function(input) {
	var LastFmNode = require('lastfm').LastFmNode;

	var lastfm = new LastFmNode({
	  api_key: lastfmAPIKey,    // sign-up for a key at http://www.last.fm/api
	  secret: '16e5606bad8c33f16b0b42e4253c54ee'
	});

	lastfm.request("track.search", {
		track: input,
		limit: 46,
		handlers: {
			success: function (data) {
				var result = data.results.trackmatches.track;
				$('#results').empty();
				_.each(result, function (result) {
					var hq = ((result.image && result.image.length > 0) ? _.last(result.image)['#text'] : '');
					var mbid = "";
					if (result.mbid) {
						mbid = result.mbid;
					}
					makeSearchResult(result.name, result.artist, "", hq, hq, mbid);
				});
				console.log(data);
				refreshGenreAnimation();
			},
			error: function(error) {
				alert(error);
				return;
			}
		}
	});
}
var result;
var searchiTunes = function(input) {
	request("https://itunes.apple.com/search?term=" + input + "&limit=50&entity=song", 
	function(err, response, body) {
		if (err) {
			alert("error retreiving results!");
			return;
		}
		body = JSON.parse(body);
		result = body.results;
		$('#results').empty();
		_.each(result, function (result) {
			var albumcover = result.artworkUrl100.replace("100x100", "200x200");
			var hq = result.artworkUrl100.replace("100x100", "400x400");
			makeSearchResult(result.trackName, result.artistName, result.collectionName, albumcover, hq);
		});
		refreshGenreAnimation();
	});
}
var makeSearchResult = function(title, artist, album, albumcover, hq, mbid) {
	var template = [
		'<div class="listItem" data-title="<%- title %>" data-artist="<%- artist %>" data-album="<%- album %>" data-hq="<%- hq %>" data-mbid="<%- mbid %>">',
			'<img src=<%- albumcover %> class="albumArt" onerror="imgError(this);">',
			'<p class="listText">',
				'<span class="title"><%- title %></span><br>',
				'<span class="artist"><%- artist %></span>',
			'</p>',
			'<img src="images/downloadIcon.png" class="downloadIcon" />',
		'</div>'
	].join('\n');

	var output = _.template(template, {artist: artist, title: title, album: album, albumcover: albumcover, hq: hq, mbid: mbid});
	$('#results').append(output);
}

var chooseFormat = function(formats, options) {
  if (options.filter) {
    formats = formats.filter(options.filter);
    if (formats.length === 0) {
      return new Error('no formats found with custom filter');
    }
  }

  var format;
  var quality = options.quality || 'highest';
  switch (quality) {
    case 'highest':
      format = formats[0];
      break;

    case 'lowest':
      format = formats[formats.length - 1];
      break;

    default:
      format = formats.filter(function(format) {
        return format.itag === '' + quality;
      })[0];

  }

  if (!format) {
    return new Error('No such format found: ' + quality);
  } else if (format.rtmp) {
    return new Error('rtmp protocol not supported');
  }
  return format;
};
var convertPNGtoJPG = function(image, imgname) {
	var canvas = document.createElement("canvas");
	canvas.width = image.width;
	canvas.height = image.height;
	canvas.getContext("2d").drawImage(image, 0, 0);
	string = canvas.toDataURL("image/jpeg");
	//console.log(string);
	var regex = /^data:.+\/(.+);base64,(.*)$/;

	var matches = string.match(regex);
	var ext = matches[1];
	var data = matches[2];
	var buffer = new Buffer(data, 'base64');
	fs.writeFile(cacheDirectory+imgname+'.' + ext, buffer);
	return image;
}
var download = function(info, ytid) {
	var newItem = [
		'<div class="downloadItem newDownloadItem" data-id="<% ytid %>">',
			'<img src="<%- hq %>" class="albumArt">',
			'<p class="title second"><%- title %>',
			'<p class="artist second"><%- artist %></p>',
			'<p class="downloading second">Waiting...</p>',
			'<div class="progress-container second">',
				'<div class="current-progress"></div>',
			'</div>',
			'<img src="images/closeIcon.png" class="closeIcon" />',
		'</div>'
	].join('\n');
	var _newItem = $(_.template(newItem, {ytid: ytid, hq: info.hq, title: info.title, artist: info.artist}));
	if ($('.downloadItem').length == 0) {
		$('#downloadBar').css("padding", "9px");
		$('#downloadBar').animate({height: '90px'}, 300);
		$('#content').animate({bottom: '90px'}, 300);
		$('#downloadsTab').animate({bottom: '90px'}, 300);
	}
	$('#downloadBar').prepend(_newItem);
	$(_newItem).animate({width: '190px'}, 300);
	setTimeout(function () {
		$(_newItem).find('.second').fadeTo(300, 1);
	}, 300);
	var req = ytdl('http://www.youtube.com/watch?v=' + ytid, { filter: function(format) { return format.container === 'mp4'; } }, function(url) {
		//var filename = _.string.slugify(info.title + ' _ ' + info.artist).replace(/-/g, '');
		//var filename = _.string.slugify(info.title + info.artist).replace(/-/g, '');
		var tmpstr = info.title + " - " + info.artist;
		var filename = tmpstr.replace(/[\/\\#,\s+$~%.'":*?<>{}]/g,'_');
		console.log(filename);
		var status = $(_newItem).find('.downloading');
		status.text('Downloading...');
		progress(request(url.url), {
			throttle: 100,
			delay: 100
		})
		.on('progress', function(prog) {
			$('#progress').remove();
			$(_newItem).find('.current-progress').css('width', prog.percent+ '%');
			status.text('Downloading... ' + prog.percent + '%').appendTo('#download');
		})
		.pipe(require('fs').createWriteStream(cacheDirectory+filename+".mp4"))
		.on('error', function (err) {
			status.text('Error downloading.')
		})
		.on('finish', function () {
			$(_newItem).find('.current-progress').css('width', '100%');
			status.text('Converting to MP3...');
			var ff = new ffmpeg({
				source: cacheDirectory+filename+".mp4"
			})
			.saveToFile(cacheDirectory+filename+'.mp3', function (stderr, stdout) {
				require('fs').unlink(cacheDirectory+filename+".mp4");
				filename += '.mp3';
				status.text('Converted to MP3');
				$('.downloading, .progress-container').remove();
				var newdir = getUserHome() + '\\Music\\OpenTune';
				if (!fs.existsSync(newdir)) {
					fs.mkdirSync(newdir);
				}
				newdir += ('\\' + filename);
				var id3 = require('ffmetadata');
				status.text('Changing metadata..');
				
				var http = require('http')
				  , options;
				var urllib = require('url');
				var afterImageFetched = function() {
					    status.text('Moving file..');
					    var _move = function() {
					    	move(cacheDirectory+filename, newdir, function (err) {
					    		if (err) {
					    			alert('Could not move file.');
					    			return;
					    		}
					    		//status.remove();
					    		$(_newItem).append('<span class="btn smallBtn">open folder</span>').on('click', function() {
					    			gui.Shell.showItemInFolder(newdir);
					    		});
					    		info.filepath = newdir;
					    		downloadFinished(info);
					    	});
					    }
					    if (info.hq) {
					    	var slugifiedTitle = _.string.slugify(info.title);
					    	id3.write(cacheDirectory+filename, {title: info.title, artist: info.artist, album: info.album}, [cacheDirectory+slugifiedTitle+'.jpeg'], function (err) {
					    		if (err) {
					    			console.log(err);
					    		}
					    		_move();
								require('fs').unlink(cacheDirectory+slugifiedTitle+'.jpeg');
								require('fs').unlink(cacheDirectory+slugifiedTitle+'.png');
					    	});
					    }
					    else {
					    	id3.write(cacheDirectory+filename, {title: info.title, artist: info.artist, album: info.album}, function (err) {
					    		if (err) {
					    			console.log(err);
					    		}
					    		_move();
					    	})
					    }
				}
				if (!info.hq) {
					afterImageFetched();
					return;
				}
				options = {
				    host: urllib.parse(info.hq).hostname
				  , port: 80
				  , path: urllib.parse(info.hq).pathname
				}
				
				var request = http.get(options, function(res){
				    var imagedata = ''
				    res.setEncoding('binary')
				
				    res.on('data', function(chunk){
				        imagedata += chunk
				    })
				
				    res.on('error', function (err) {
				    	console.log('error');
				    	console.log(err)
				    })
				
				    res.on('end', function(){
				    	status.text('Downloading artwork...');
				    	console.log("fetching artwork..");
				    	var imgname = _.string.slugify(info.title);
				        fs.writeFile(cacheDirectory+imgname+'.png', imagedata, 'binary', function(err){
				            if (err) throw err
				            $('<img src="'+cacheDirectory+imgname+'.png">').on('load', function() {
				            	convertPNGtoJPG(this, imgname);
				            	afterImageFetched();	
				            });
				    	});
					});
				});
			})
		});
	});
}
var trackClicked = function() {
	var info = this.dataset;
	if (info.mbid) {
		console.log(info.mbid);
		request("http://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=" + lastfmAPIKey + "&artist=cher&mbid=" + info.mbid + "&format=json", function(err, response, body) {
			if (err) {
				populatePopup(info);
				return;
			}
			body = JSON.parse(body);
			if (body.error) { //somehow there's an error - just pretend like no mbid existed
				populatePopup(info);
				return;
			}
			info.album = body.track.album.title;
			populatePopup(info);
		});
	} else { //result has no mbid - can't find album name
		console.log("no mbid");
		populatePopup(info);
	}
}
var populatePopup = function(info) {
	yt(info.title + ' ' + info.artist, {maxResults: 6}, function (err, results) {
		
		if (!results || results.length == 0) {
			alert('No audio source was found for this song.');
			return;
		}
		results = _.first(results, 6);
		var tmpl = [
			'<div id="download-popup">',
				'<img src="images/popupClose.png" id="popupCloseBtn">',
				'<img src="<%- cover %>" id="song-page-cover">',
				'<p id="title-area">',
					'<span class="song-page-title"><%- shorten(title) %></span> <br>',
					'<span class="song-page-artist"><%- artist %></span> <br>',
					'<span class="btn bigBtn song-page-download" data-artist="<%- artist %>" data-title="<%- title %>" data-album="<%- album %>" data-hq="<%- hq %>">Download</span>',
				'</p>',
				'<div class="divider"></div>',
				'<div id="video-options-container">',
					'<% _.each(youtube, function(yt_vid, key) { %>',
						'<div class="video-option <% if (key == 0) { %>active-video-option<% } %>" data-ytid="<%- yt_vid.url.substr(31, 11) %>" data-duration="<%- timify(yt_vid.duration) %>">',
							'<img src="<%- _.last(yt_vid.thumbnails).url %>" class="yt-thumbnail">',
							'<p class="yt-text">',
								'<span class="yt-title"><%- yt_vid.title %></span><br>',
								'<span class="yt-duration"><%- timify(yt_vid.duration) %></span> | <span class="yt-views"><%- commafy(yt_vid.statistics.viewCount) %> views</span>',
							'</p>',
						'</div>',
					'<% }); %>',
				'</div>',
			'</div>',
			'<div id="curtain" style="display:none"></div>'
		].join('\n');
		var output = _.template(tmpl, {cover: info.hq, title: info.title, artist: info.artist, album: info.album, youtube: results, hq: info.hq, timify: timify, commafy: commafy, shorten: shorten});
		$(document.body).append(output);
		var ytid = results[0].url.substr(31, 11);
		togglePopup();
	});
}
var togglePopup = function() {
	$('#download-popup').fadeIn(300);
    $('#curtain').fadeIn(300);
    $('body').on('click', function (e) {
    	if (!$(e.target).is('#download-popup') && $(e.target).parents('#download-popup').length == 0) {
    		closepopup();
    	}
    });   
}
var changeYTVideo = function() {
	$('.active-video-option').removeClass('active-video-option');
	$(this).addClass('active-video-option');
}
var clickedDownload = function() {
	var ytid = $('.active-video-option')[0].dataset.ytid;
	var info = this.dataset;
	info.duration = $('.active-video-option')[0].dataset.duration;
	closepopup();
	download(info, ytid);
}
var closepopup = function() {
	$('#download-popup').fadeOut(300);
    $('#curtain').fadeOut(300);
    setTimeout(function () {
    	$('#download-popup').remove();
    	$('#curtain').remove();
    }, 300);
	$('body').off('click');
}
var openFile = function() {
	gui.Shell.openItem(this.dataset.filepath);
}

var win = gui.Window.get();

$(document)
.on('click', '#logo', function(){updateGenre('All Genres');updateSectionHeader("toDefault")})
.on('submit', '#search', searchEntered)
.on('click', '.listItem', trackClicked)
.on('click', '.video-option', changeYTVideo)
.on('click', '.song-page-download', clickedDownload)
.on('click', '#popupCloseBtn', closepopup)
.on('click', '#minimize', function(){win.minimize();})
.on('click', '#maximize', function(){win.maximize();})
.on('click', '#close', function(){win.close();})
.on('click', '.table-row', openFile)


/*ADDED AFTER SENDING OVER TO PRODUCTION*/



function updateGenre(genre) {
	//update current genre text
	$('#currentGenre').text(genre);

	//display loading gif
	$('#loadingGif').show();

	//remove current listItems
	$('#results').empty();

	//depending on genre, set rss request code
	var code;
	if (genre == 'All Genres') code = 1;
	else if (genre == 'Alternative') code = 20;
	else if (genre == 'Blues') code = 2;
	else if (genre == 'Classical') code = 5;
	else if (genre == 'Comedy') code = 3;
	else if (genre == 'Country') code = 6;
	else if (genre == 'Dance') code = 17;
	else if (genre == 'Electronic') code = 7;
	else if (genre == 'Hip-Hop/Rap') code = 18;
	else if (genre == 'Pop') code = 14;
	else if (genre == 'R&B/Soul') code = 15;
	else if (genre == 'Rock') code = 21;
	else if (genre == 'Kpop') code = 51;

	//make ajax request to rss feed
	request('https://itunes.apple.com/us/rss/topsongs/limit=49/genre=' + code + '/json', function (error, response, body) {
		if (!error && response.statusCode == 200) {
			response = JSON.parse(body);
			if (response.feed.entry) { //another error check - sometimes RSS feed succeeds in loading, but doesn't return a list
				for (var i=0;i<response.feed.entry.length;i++) {
					var songObject = response.feed.entry[i];

					var listItem = $("<div>");
					listItem.addClass("listItem");
					listItem.attr("data-title", songObject['im:name'].label);
					listItem.attr("data-artist", songObject['im:artist'].label);
					listItem.attr("data-album", songObject['im:collection']['im:name'].label);
					listItem.attr("data-hq", songObject['im:image'][2].label.replace("170x170", "400x400")); //hehe
					listItem.append("<img src='" + songObject['im:image'][2].label + "' class='albumArt' />");
					listItem.append("<p class='listText'><span class='title'>" + songObject['im:name'].label + "</span><br /><span class='artist'>" + songObject['im:artist'].label + "</span></p>");
					listItem.append("<img src='images/downloadIcon.png' class='downloadIcon' />");

					$('#results').append(listItem);
				}
				refreshGenreAnimation(); //refresh list with animation when everything is loaded
			} else {
				alert("Error fetching top charts!");
				return;
			}
		} else {
			alert("Error fetching top charts!");
			return;
		}
	});
}

function populateDownloads() {
	var downloads;
	if (!localStorage.downloads) {
		downloads = [];
	} else {
		downloads = JSON.parse(localStorage.downloads);
	}
	var tmpl = [
		'<table id="song-table" class="sortable">',
			'<tr class="table-header">',
				'<th data-value="order" class="sorttable_nosort"></th>',
				'<th data-value="name" data-order>Title</th>',
				'<th data-value="artist" data-order>Artist</th>',
				'<th data-value="album" data-order>Album</th>',
				'<th data-value="duration" class="sorttable_nosort" data-order>Length</th>',
			'</tr>',
			'<% _.each(downloads, function(song, key) { %>',
				'<tr class="table-row" data-filepath="<%- song.filepath %>">',
					'<td class="table-order"><img src="<%- song.albumArt %>" class="playBtn" onerror="imgError(this);" /></td>',
					'<td class="table-name"><%- song.title %></td>',
					'<td class="table-artist"><%- song.artist %></td>',
					'<td class="table-album"><%- song.album %></td>',
					'<td class="table-length"><%- song.duration %></td>',
				'</tr>',
			'<% }); %>',
		'</table>'
	].join('\n');
	var output = _.template(tmpl, {downloads: downloads});
	$('#downloadsTab').html(output);
	sorttable.makeSortable(document.getElementById("song-table"));
}

function refreshGenreAnimation() {
	$('#loadingGif').hide();
	$('.listItem').each(function(i) {
		$(this).delay((i++) * 50).fadeTo(300, 1); 
	});
}

function imgError(image) {
    image.onerror = "";
    image.src = "images/genericAlbumLarge.png";
    image.className = "albumArt";
    return true;
}

function updateSectionHeader(option) {
	if (option != "toDefault") {
		$('.sectionHeader').html("Search results for <span style='color:#949494'>" + option + "</span>");
	} else {
		$('.sectionHeader').html("Top trending today in <span id='currentGenre' class='dropdownGroup'>All Genres</span><img src='images/dropdownArrow.png' id='dropdownArrow' class='dropdownGroup' />")
	}
}

function switchTabTo(destination) {
	if (destination == 'downloads') {
		$('#downloadsTab').show();
		$('.tabTitle').removeClass("activeTabTitle");
		$('#downloadsTabTitle').addClass("activeTabTitle");
	}
	else if (destination == 'explore') {
		$('#downloadsTab').hide();
		$('.tabTitle').removeClass("activeTabTitle");
		$('#exploreTabTitle').addClass("activeTabTitle");
	}
}

function downloadFinished(info) {
	//add this file to localStorage downloads variable (parse > insert > stringify > save)
	//call populateDownloads

	if (!localStorage.downloads) {
		localStorage.downloads = JSON.stringify([{"albumArt": info.hq, "title": info.title, "artist": info.artist, "album": info.album, "duration": info.duration, "filepath": info.filepath}]);
	} else {
		var downloads = JSON.parse(localStorage.downloads);
		downloads[downloads.length] = {"albumArt": info.hq, "title": info.title, "artist": info.artist, "album": info.album, "duration": info.duration, "filepath": info.filepath};
		localStorage.downloads = JSON.stringify(downloads);
		
	}
	populateDownloads();
}

function commafy(x) {
    if (!x) {
    	return "0";
    }
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function timify(secs) {
    var minutes = Math.floor(secs / 60);
    var seconds = Math.floor(secs - minutes * 60);
    if (seconds < 10) {
        seconds = "0" + seconds;
    }
    return minutes + ":" + seconds;
}
function shorten(x) {
	var y = x;
	if (x.length > 54) {
		y = x.substr(0, 51) + "...";
	}
	return y;
}