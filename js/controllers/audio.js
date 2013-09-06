
app.AudioController = {

  // playlist defaults
  playlistId: 0, // 0 = audio

  currentPlaylist: {
    'items': [],
    'status': 'none'
  }

};


/**
 * Refresh the playlist
 * @param callback
 */
app.AudioController.playlistRefresh = function(callback){

  app.AudioController.getPlaylistItems(function(result){

    app.playlistView = new app.PlaylistView({model:{models:result.items}});
    $('.sidebar-items').html(app.playlistView.render().el);

    app.AudioController.getNowPlaying(function(data){
      console.log('now playing',data);
    });

    //sortable
    this.$sortable = $( "ul.playlist", this.el );
    console.log(this.$sortable);
    this.$sortable.sortable({
      placeholder: "playlist-item-placeholder",
      handle: ".menubtn",
      items: "> li",
      axis: "y",
      stop: function( event, ui ) {
        console.log('stopped', ui);
        console.log('stopped', ui.position);
        console.log('stopped', ui.originalPosition);
      }
    });

    if(app.helpers.exists(callback)){
      callback(result);
    }

  });

};




/**
 * Adds an artist/album/song to the playlist
 * @param type
 *  eg. artistid, albumid, songid
 * @param id
 *  value of type
 *
 */
app.AudioController.playlistAdd = function(type, id, callback){

  var filter = {};
  filter[type] = id;

  //add the album to the playlist
  app.xbmcController.command('Playlist.Add', [app.AudioController.playlistId,filter], function(data){

    //get playlist items
    app.AudioController.getPlaylistItems(function(result){

      //update cache
      app.AudioController.currentPlaylist = result;

      callback(result);

    })
  });

};


/**
 * Clear then adds an artist/album/song to the playlist
 * @param type
 *  eg. artistid, albumid, songid
 * @param id
 *  value of type
 *
 */
app.AudioController.playlistClearAdd = function(type, id, callback){

  // clear playlist
  app.xbmcController.command('Playlist.Clear', [app.AudioController.playlistId], function(data){
    app.notification('Playlist Cleared');
    app.AudioController.playlistAdd(type, id, callback);
  });

};



/**
 * Adds an an artist/album/song to the playlist then starts playing
 * @param playSongId
 *  song to play
 * @param type
 *  eg. artistid, albumid, songid
 * @param id
 *  value of type
 *
 */
app.AudioController.playlistPlaySongId = function(playSongId, callback){

    //@TODO: fix below to be nicer

    //find the song and play it
    var playing = false;
    $.each(app.AudioController.currentPlaylist.items, function(i,d){
      //matching song!
      if(d.id == playSongId && playing === false){
        app.AudioController.playPlaylistPosition(i, function(data){
          //update playlist
          app.AudioController.playlistRefresh();
          //notify
          app.notification('Now playing "' + d.label + '"');
        });
        playing = true;
      }
    });

};





/**
 * Play Song
 */
app.AudioController.playSongById = function(songid, type, id, clearList){

  if(app.helpers.exists(clearList) && clearList === true){
    // clear playlist first
    app.AudioController.playlistClearAdd( type, id, function(result){
      app.AudioController.playlistPlaySongId(songid);
    });
  } else {
    //just add
    app.AudioController.playlistAdd( type, id, function(result){
      app.AudioController.playlistPlaySongId(songid);
    });
  }

};

/**
 * Adds an album to the playlist and starts playing the given songid
 * @param songid
 * @param albumid
 */
/*app.AudioController.playSongInAlbum = function(songid, albumid){


  app.AudioController.playlistAdd('albumid', albumid, function(result){

    //find the song and play it
    var playing = false;
    $.each(app.AudioController.currentPlaylist.items, function(i,d){
      //matching song!
      if(d.id == songid && playing === false){
        app.AudioController.playPlaylistPosition(i, function(data){
          //update playlist
          app.AudioController.playlistRefresh();
          //notify
          app.notification('Now playing "' + d.label + '"');
        });
        playing = true;
      }
    });

  });

};*/


/**
 * Generic player command with to callback required
 */
app.AudioController.sendPlayerCommand = function(command, param){
  app.xbmcController.command(command, [ app.cached.nowPlaying.activePlayer, param], function(result){
    app.AudioController.updatePlayerState();
  });
};

/**
 * Play something from playlist
 */
app.AudioController.playPlaylistPosition = function(position, callback ){
  app.xbmcController.command('Player.Open', [{"playlistid": app.AudioController.playlistId,"position":position}], function(result){
    callback(result.result); // return items
  });
};


/**
 * Remove something from playlist
 */
app.AudioController.removePlaylistPosition = function(position, callback ){
  app.xbmcController.command('Playlist.Remove', [app.AudioController.playlistId,position], function(result){
    callback(result.result); // return items
  });
};



/**
 * Seek curently playing to a percentage
 */
app.AudioController.seek = function(position, callback ){
  app.xbmcController.command('Player.Seek', [app.AudioController.playlistId, position], function(result){
    if(app.helpers.exists(callback)){
      callback(result.result); // return items
    }
  });
};

/**
 * Get items from playlist
 */
app.AudioController.getPlaylistItems = function(callback){
  app.xbmcController.command('Playlist.GetItems', [app.AudioController.playlistId, ['albumid', 'artistid', 'thumbnail', 'file']], function(result){
    callback(result.result); // return items
  });
};



/**
 * Set Volume
 */
app.AudioController.setVolume = function(val){
  app.xbmcController.command('Application.SetVolume', [val], function(data){
    //volume set
    //app.AudioController.updatePlayerState();
  });
};


/**
 * Library Scan
 */
app.AudioController.audioLibraryScan = function(){

  app.xbmcController.command('AudioLibrary.Scan', [], function(data){
    console.log(data);
  });

};


/**
 * Get now playing
 */

app.AudioController.getNowPlaying = function(callback){

  var fields = {
    item: ["title", "artist", "artistid", "album", "albumid", "genre", "track", "duration", "year", "rating", "playcount", "albumartist", "file", "thumbnail", "fanart"],
    player: [ "playlistid", "speed", "position", "totaltime", "time", "percentage", "shuffled", "repeat", "canrepeat", "canshuffle", "canseek" ]
  };
  var ret = {'status':'notPlaying', 'item': {}, 'player': {}, 'activePlayer': 0, 'volume': 0};

  app.xbmcController.command('Application.GetProperties', [["volume", "muted"]], function(properties){
    //get volume level
    ret.volume = properties.result;
    app.xbmcController.command('Player.GetActivePlayers', [], function(players){

      app.AudioController.activePlayers = players.result;

      if(players.result.length > 0){
        //something is playing
        ret.activePlayer = players.result[0].playerid;
        app.xbmcController.command('Player.GetItem', [ret.activePlayer, fields.item], function(item){
          ret.item = item.result.item;
          ret.status = 'playing';

          app.xbmcController.command('Player.GetProperties', [ret.activePlayer, fields.player], function(player){
            ret.player = player.result;
            app.cached.nowPlaying = ret;
            callback(ret);
          });

        });
      } else {
        //nothing playing
        app.cached.nowPlaying = ret;
        callback(ret);
      }

    });

  });



};

/**
 * Kick off a refresh of playing state
 */
var stateTimeout = {};
app.AudioController.updatePlayerState = function(){
  clearTimeout(stateTimeout);
  app.AudioController.getNowPlaying(function(data){
    app.shellView.updateState(data);
    stateTimeout = setTimeout(app.AudioController.updatePlayerState, 5000);
  });
};