/*

  ************ ANGULAR APPLICATION CONTROLLERS ****************
  Author: Devesh Dayal

*/

myApp.factory('redditSearch', ['$http', function($http) {
  var redditSearch = function (query) {
    this.query = query;
    this.after = '';
    this.items = [];
    this.loading = false;
    this.noResults = false;
    this.noMoreResults = false;
    this.url = 'http://api.reddit.com/r/all/search/?q=' + this.query + '&after=' + this.after + '&limit=25';
  };

  redditSearch.prototype.nextPage = function () {
    if (!this.loading && !this.noMoreResults && !this.noResults) {
      this.loading = true;
      $http.get(this.url).success(function (data) {
        var results = data.data.children;
        angular.forEach(results, function (val) {
          var imageExt = ['jpg', 'gif', 'png', 'jpeg'];
          if (imageExt.indexOf(val.data.url.substr(-3)) >= 0 || imageExt.indexOf(val.data.url.substr(-4)) >= 0) {
            val.data.full_image = val.data.url;
          } else if (val.data.url.length >= 16 && val.data.url.substr(0, 16) === 'http://imgur.com') {
            val.data.full_image = val.data.url.replace('imgur.com', 'i.imgur.com') + '.jpg';
          }
          //autoplay embedded youtube videos
          if(val.data.url.indexOf('youtube.com') > -1) {
            var video_id = val.data.url.split('v=')[1];
            var breakPoint = video_id.indexOf('&');
            if (breakPoint >= 0) {
              video_id = video_id.substring(0, breakPoint);
            }
            val.data.embedded_video_url = 'http://www.youtube.com/embed/' + video_id + '?autoplay=1&origin=' + document.URL;
          }
        });
        if (results.length === 0 && this.items.length === 0) {
            this.noResults = true;
        } else {
          for (var i = 0; i < results.length; i++) {
            this.items.push(results[i].data);
          }
          //get the after value
          this.after = data.data.after;
          if (this.after === null) {
            this.noMoreResults = true;
          }
          //set the URL for the next request.
          this.url = 'http://api.reddit.com/r/all/search/?q=' + this.query + '&after=' + this.after + '&limit=25';
        }
        //completed the HTTP request
        this.loading = false;
      }.bind(this));
    }
  };

  return redditSearch;
}]);
