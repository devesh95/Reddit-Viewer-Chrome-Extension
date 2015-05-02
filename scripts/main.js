/*

	************ ANGULAR APPLICATION MODULES ****************
	Author: Devesh Dayal

*/

var myApp = angular.module('reddit++', ['communication', 'ngSanitize'])
.config(function ($httpProvider) {
	/* Allow cross-origin HTTP requests */
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
});


angular.module('communication', [])
	.factory('commservice', function () {
		return function(){};
	})
	.filter('utcdatetolocal', function () {
      return function (input) {
        var d = new Date(0);
		d.setUTCSeconds(input);
		return d;
      };
    })
	.filter('timeago', function () {
		return function (input) {
			return $.timeago(input);
		};
	});

/*

	************ ANGULAR APPLICATION CONTROLLERS ****************
	Author: Devesh Dayal

*/
myApp.controller('subredditController', ['$rootScope', '$scope', '$http', function ($rootScope, $scope, $http) {
	$scope.loading = true;
	$scope.radio = '1';
	//pull out currently popular subreddits
	$http.get('http://api.reddit.com/subreddits/popular').success(function (data) {
		$scope.loading = false;
		$scope.subreddits = data.data.children;
	});

	var action = function () {
		if ($scope.searchText !== undefined && $scope.searchText !== '') {
			if ($scope.radio === '1') {
				$rootScope.$emit('search_text', $scope.searchText);
			} else if ($scope.radio === '2') {
				$rootScope.$emit("search_text", 'subreddit:' + $scope.searchText);
			}
		}
	};
	//catch user input into searchbox
	$scope.$watch('searchText', function () { action(); });
	//or clicks on eith radio button
	$scope.$watch('radio', function () { action(); });

	//catch user click on a subreddit	
	var lastLinkClicked = null;
	$scope.selectSubreddit = function (post) {
		$scope.searchText = '';
		$rootScope.$emit('selected_subreddit', post.data.url);
		if (lastLinkClicked !== null) {
			lastLinkClicked.state = '';
		}
		post.state = 'selectedlink';
		lastLinkClicked = post;
	};
}]);

myApp.controller('postsController', ['$rootScope', '$scope', '$http', 'redditSearch', function ($rootScope, $scope, $http, redditSearch) {
$scope.loading = false;
$scope.subreddit = false;
$scope.search = false;

	//activate this when text is input
	$rootScope.$on('search_text', function (name, text) {
		$scope.subreddit = false;
		$scope.search = true;
		$scope.redditSearch = new redditSearch(text);
		$scope.redditSearch.nextPage();
	});
	//activate this when a subreddit link is clicked
	$rootScope.$on('selected_subreddit', function (name, url) {
		$scope.loading = true;
		$scope.subreddit = true;
		$scope.search = false;
		$http.get('http://api.reddit.com' + url + '?limit=100').success(function (data) {
			var query = 'http://www.reddit.com/r/' + data.data.children[0].data.subreddit + '/about.json?limit=100';
			$http.get(query).success(function (metadata) {
				angular.forEach(data.data.children, function (val) {
					//store the header image for the subreddit
					val.data.subredditheader = metadata.data.header_img;
					if (metadata.data.header_img) {
						$scope.subredditheader = metadata.data.header_img;
					}
					//set thumbnail image for each post 
					if (val.data.thumbnail === 'self' || val.data.thumbnail === 'default') {
						if (metadata.data.header_img) {
						val.data.thumbnail = metadata.data.header_img;
						} else {
							val.data.thumbnail = $scope.subredditheader;
						}
					}
					//find full image and fix the imgur URL issues
					var imageExt = ['jpg', 'gif', 'png', 'jpeg'];
					if (imageExt.indexOf(val.data.url.substr(-3)) >= 0 || imageExt.indexOf(val.data.url.substr(-4)) >= 0) {
						val.data.full_image = val.data.url;
					} else if (val.data.url.length >= 16 && val.data.url.substr(0, 16) === 'http://imgur.com') {
						val.data.full_image = val.data.url.replace('imgur.com', 'i.imgur.com') + '.jpg';
					}

					//autoplay embedded youtube videos
					if(val.data.url.indexOf('youtube.com') > -1) {
						var video_id = val.data.url.split('v=')[1];
							if (video_id !== undefined) {
							var breakPoint = video_id.indexOf('&');
							if (breakPoint >= 0) {
								video_id = video_id.substring(0, breakPoint);
							}
							}
						val.data.embedded_video_url = 'http://www.youtube.com/embed/' + video_id + '?autoplay=1&origin=' + document.URL;
					}
				});
				$scope.loading = false;
				$scope.posts = data.data.children;
			});
		});
	});
	var lastPost = null;
	//catch user clicks on a post
	$scope.selectPost = function (post) {
		$rootScope.$emit('selected_post', post.data);
		if (lastPost !== null) {
			lastPost.state = '';
		}
		post.state = 'selected';
		lastPost = post;
	};
	$scope.selectResult = function (post) {
		$rootScope.$emit('selected_result', post);
		if (lastPost !== null) {
			lastPost.state = '';
		}
		post.state = 'selected';
		lastPost = post;
	};
}]);

myApp.controller('redditController', ['$rootScope', '$scope', '$http', '$sce', function ($rootScope, $scope, $http, $sce) {
	//reset the scope posts when new category selected
	var resetViews = function () {
		$scope.comments = null;
		$scope.loading = false;
		$scope.post = null;
		$scope.showUrl = false;
		document.getElementById("video").terminate();
		document.getElementById("video").style.display = 'none';
	};

	$scope.trustSrc = function(src) {
      return $sce.trustAsResourceUrl(src);
    };

	$scope.copyUrl = function () {
		$scope.showUrl = true;
	};

	$scope.openSubreddit = function () {
		var searchSubRedditQuery = 'subreddit:' + $scope.post.subreddit + '&sort=hot';
		$rootScope.$emit('search_text', searchSubRedditQuery);
	};

	$rootScope.$on('selected_subreddit', function (name, url) {
		resetViews();
	});
	$rootScope.$on('search_text', function (name, url) {
		resetViews();
	});

	var update = function (name, post) {
		document.getElementById("video").terminate();
		$scope.showUrl = false;
		$scope.comments = null;
		$scope.loading = true;
		$scope.post = post;
		$scope.post.selftext_html = $('<div/>').html($scope.post.selftext_html).text();
		$http.get('http://www.reddit.com' + post.permalink + '.json').success(function (data) {
			$scope.loading = false;
			$scope.rawUrl = 'http://www.reddit.com' + post.permalink;
			$scope.post = data[0].data.children[0].data;
			$scope.post.subredditheader = post.subredditheader;
			$scope.post.thumbnail = post.thumbnail;
			$scope.post.embedded_video_url = post.embedded_video_url;
			$scope.post.full_image = post.full_image;
			$scope.post.selftext_html = $('<div/>').html($scope.post.selftext_html).text();
			$scope.comments = data[1].data.children;
			$scope.shareText = 'Check out this post on Reddit: ' + $scope.rawUrl;
			$scope.$emit('ready', $scope.post);
		});
		$scope.$on('ready', function (name, post) {
			$("#post").find("img").each(function (i, elem) {
				var xhr = new XMLHttpRequest();
				xhr.open('GET', post[$(elem).data("url")], true);
				xhr.responseType = 'blob';
				xhr.onreadystatechange = function (e) {
					if (xhr.readyState ==4) {
                        var blob = window.URL.createObjectURL(xhr.response);
						$(elem).attr('src', blob);
						if ($(elem).hasClass('full_image')) {
							$(elem).attr('alt', 'Image couldn\'t be loaded. URL: '+post[$(elem).data("url")]);
						}
					}
				};
				if (post[$(elem).data("url")] !== null && post[$(elem).data("url")] !== undefined) {
					xhr.send();
				}
				document.getElementById("video").src = post.embedded_video_url;
				document.getElementById("video").style.display = '';
				if (!post.embedded_video_url) {
					document.getElementById("video").style.display = 'none';
				}
			});
		});
	};
	//populate the view field with the parsed data
	$rootScope.$on('selected_post', function (name, post) {
		update(name, post);
	});
	$rootScope.$on('selected_result', function (name, post) {
		update(name, post);
	});
}]);

myApp.directive('avoidErrors', function() {
	return function (scope, element, attrs) {
		scope.$on('last', function (e) {
			$(element).find(".findMe").each(function (i, elem) {
				var xhr = new XMLHttpRequest();
				scope.$watch('ready', function (e) {
					xhr.open('GET', $(elem).data("url"), true);
					xhr.responseType = 'blob';
					xhr.onreadystatechange = function (e) {
						if (xhr.readyState ==4 && xhr.status == 200) {
                            var blob = window.URL.createObjectURL(xhr.response);
							$(elem).attr('src', blob);
						}
					};
					if ($(elem).data("url") !== null && $(elem).data("url") !== undefined) {
						xhr.send();
					}
				});
			});
		});
	};
});

myApp.directive('emitLast', function () {
	return function (scope) {
		if (scope.$last) {
			scope.$emit('last');
		}
	};
});
	
/*
	jQuery infinte-scroller for the custom search results
*/document.onscroll = function() {
	window.scrollTo(window.scrollX, window.scrollY - 15);
	// if  ($(window).scrollTop() == $(document).height() - $(window).height()) {
		if (angular.element('#post-list').scope().search) {
			angular.element('#post-list').scope().redditSearch.nextPage();
		}
	// }
};
