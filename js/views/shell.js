app.ShellView = Backbone.View.extend({

  initialize: function () {

  },

  render: function () {
    this.$el.html(this.template());
    //    $('.navbar-search', this.el).append(this.searchresultsView.render().el);

    //set playlist
    app.AudioController.playlistRefresh(function(result){
      console.log('playlist',result);
    });

    //init the progress bar
    this.$progressSlider = $( "#progress-bar", this.el );
    console.log(this.$progressSlider);
    this.$progressSlider.slider({
      range: "min",
      value: 0,
      min: 0,
      max: 100,
      stop: function( event, ui ) {
        app.AudioController.seek(ui.value);

      }
    });

    //init the volume bar
    this.$volumeSlider = $( "#volume", this.el );
    console.log(this.$volumeSlider);
    this.$volumeSlider.slider({
      range: "min",
      value: 0,
      min: 0,
      max: 100,
      stop: function( event, ui ) {
        app.AudioController.setVolume(ui.value);
      }
    });

    app.AudioController.updatePlayerState();

    return this;
  },

  events: {
    "keyup #search": "search",
    "keypress #search": "onkeypress",
    "click #logo": "home",
    "click .player-prev": "playerPrev",
    "click .player-next": "playerNext",
    "click .player-play": "playerPlay"
  },

  /**
   * Search artists, albums & songs
   * requires all data to be loaded into memory
   * @param event
   */
  search: function (event) {
    var key = $('#search').val(),
        self = this;
    console.log(key.length);

    var res = {ablums: [], artists: [], songs: []};

    if(key.length > 1){

      this.selectMenuItem('search', 'sidebar');

      //empty content as we append
      var $content = $('#content'),
          $title = $('#title');

      $content.empty().html('<div id="search-albums"></div><div id="search-songs"></div>');
      $title.html('<a href="#artists">Artists </a>Albums');

      // get artists list (sidebar)
      this.artistsList = new app.ArtistCollection();
      this.artistsList.fetch({success: function(data){
        // filter based on string match
        var artists = data.models.filter(function (element) {
          var label = element.attributes.artist;
          return label.toLowerCase().indexOf(key.toLowerCase()) > -1;
        });
        // update model with new collection
        data.models = artists;
        // add the sidebar view
        this.artistsListSearch = new app.AristsListView({model: data, className: 'artist-search-list'});
        app.helpers.setFirstSidebarContent(this.artistsListSearch.render().el);
      }});


      //get albums
      var $albums = $('#search-albums'),
          loading = '<div class="loading-box">Loading Albums</div>';

      $albums.html(loading);

      this.albumList = new app.AlbumsCollection();
      this.albumList.fetch({success: function(data){
        $albums.empty();
        // filter based on string match
        var albums = data.models.filter(function (element) {
          var label = element.attributes.label;
          return label.toLowerCase().indexOf(key.toLowerCase()) > -1;
        });
        // update model with new collection
        data.models = albums;
        // add to content
        this.albumList = new app.SmallAlbumsList({model: data, className: 'album-search-list'});
        $albums.append(this.albumList.render().el);
      }});


      //get songs
      var $songs = $('#search-songs'),
          indexing = false,
          indexingCopy = '<div class="loading-box">Loading Songs - Very slow!</div>',
          notIndexedCopy =
            '<p class="text-copy">To search song titles we need to load the entire song collection into the browser,' +
            'this takes a very long and some non-cached stuff might not work while while indexing' +
            ' so no controlls work while indexing. <br /><br />' +
            '<a id="index-songs-btn" href="#index-songs" class="btn btn-large btn-inverse">Ok, Index the songs</a></p>';


      $songs.html(indexingCopy);

      if(app.store.songsIndexed !== true){

        // check if indexing
        indexing = (typeof self.indexing != 'undefined' && self.indexing === true);
        // provide correct copy
        $songs.html((indexing ? indexingCopy : notIndexedCopy));

        // attach lookup to click
        $('#index-songs-btn').click(function(e){
          self.indexing = true;
          $songs.html(indexingCopy);
          // update and search
          app.store.indexSongs(function(data){
            key = $('#search').val();
            self.searchSongs(key);
            self.indexing = false;
          });
        });

      } else {
        // already indexed
        self.searchSongs(key);
      }

    }



   // this.searchResults.fetch({reset: true, data: {name: key}});
    var self = this;
    setTimeout(function () {
     // $('.dropdown').addClass('open');
    });
  },






  onkeypress: function (event) {
    if (event.keyCode === 13) { // enter key pressed
      event.preventDefault();
    }
  },


  /**
   * This acts as layout definer wrapper
   * @param menuItem
   * @param sidebar
   */
  selectMenuItem: function(menuItem, sidebar) {

    var $body = $('body');

    //sidebar - reset and add
    $body.removeClass('sidebar').removeClass('no-sidebar').addClass(sidebar);

    // layout changes for different pages
    if(menuItem == 'home'){
      //specific to home
      $body.addClass('home');
    } else {
      if($('.backstretch').length > 0){
        $.backstretch("destroy", false);
      }
      $body.removeClass('home');
    }


    $('.mainnav li').removeClass('active');
    if (menuItem) {
      $('.' + menuItem).addClass('active');
    }
  },


  //player commands
  playerPrev:function(){
    app.AudioController.sendPlayerCommand('Player.GoTo', 'previous');
  },
  playerNext:function(){
    app.AudioController.sendPlayerCommand('Player.GoTo', 'next');
  },
  playerPlay:function(){
    app.AudioController.sendPlayerCommand('Player.PlayPause', 'toggle');
  },

  // update the playing state
  updateState:function(data){
    var $nowPlaying = $('#now-playing'),
        $body = $('body'),
        $songs = $('.song'); //songs currently rendered

    //body classes
    $body.addClass('playing');

    //song row playing
    $songs.removeClass('playing-row');
    $songs.each(function(i,d){
      // console.log(data.item);
      if($(d).attr('data-songid') == data.item.id){
        $(d).addClass('playing-row');
      }
    });


    //now playing section

    //set thumb
    $nowPlaying.find('#playing-thumb')
      .attr('src',app.parseImage(data.item.thumbnail))
      .attr('title', data.item.album)
      .parent().attr('href', '#album/' + data.item.albumid);

    //set title
    $('.playing-song-title').html(data.item.label); //now playing
    document.title = data.item.label + ' | Chorus.'; //doc

    //set artists
    var meta = app.helpers.parseArtistsArray(data.item),
        $playlistActive = $('.playlist .playing-row');

    $('.playing-song-meta').html(meta);
    $playlistActive.find('.playlist-meta').html(meta);
    $playlistActive.find('.thumb').attr('src', app.parseImage(data.item.thumbnail));

    // if backstretch exists and changed, update
    var $bs = $('.backstretch img'),
        origImg = $bs.attr('src'),
        newImg = app.parseImage(data.item.fanart);
    if($bs.length > 0 && origImg != newImg){
      //$bs.attr('src', newImg);
      $.backstretch(newImg);
    }

   //progress section

    //set progress
    this.$progressSlider.slider( "value",data.player.percentage );
    //set volume
    this.$volumeSlider.slider( "value",data.volume.volume );

    //time
    var $time = $('#time');
    var cur = (parseInt(data.player.percentage) / 100) * parseInt(data.item.duration);
    $time.find('.time-cur').html(app.helpers.secToTime(Math.floor(cur)));
    $time.find('.time-total').html(app.helpers.secToTime(data.item.duration));

  },

  searchSongs: function(key){

    var $songs = $('#search-songs');


    // bind to songs ready
    $songs.html('<p class="loading-box">Loading Songs</p>');
    app.store.libraryCall(function(){
      this.songList = new app.SongCollection();
      this.songList.fetch({success: function(data){
        $songs.empty();
        // filter based on string match
        var songs = data.models.filter(function (element) {
          var label = element.attributes.label;
          return label.toLowerCase().indexOf(key.toLowerCase()) > -1;
        });
        // update model with new collection
        data.models = songs;
        if(songs.length > 0){
          $songs.append('<h3 class="section-title">Songs</h3>');
        }
        console.log('songsz', data);
        // add to content
        this.songList = new app.SongListView({model: data.models, className: 'song-search-list song-list'});
        $songs.append(this.songList.render().el);
      }});

    },'songsReady');


  }


});