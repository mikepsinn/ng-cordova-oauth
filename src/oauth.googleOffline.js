(function() {
  'use strict';

  angular.module('oauth.googleOffline', ['oauth.utils'])
    .factory('$ngCordovaGoogleOffline', googleOffline);

  function googleOffline($q, $http, $cordovaOauthUtility) {
    return { signin: oauthGoogleOffline };

    /*
     * Sign into the Google service with full process (code + token)
     * This method allow to obtain a refresh_token
     *
     * @param    string clientId
     * @param    string clientSecret
     * @param    array appScope
     * @param    object options
     * @return   promise
     */
    function oauthGoogleOffline(clientId, clientSecret, appScope, options) {
      var deferred = $q.defer();
      if(window.cordova) {
        var cordovaMetadata = cordova.require("cordova/plugin_list").metadata;
        if($cordovaOauthUtility.isInAppBrowserInstalled(cordovaMetadata) === true) {
          var redirect_uri = "http://localhost/callback";
          if(options !== undefined) {
            if(options.hasOwnProperty("redirect_uri")) {
              redirect_uri = options.redirect_uri;
            }
          }
          var browserRef = window.open('https://accounts.google.com/o/oauth2/auth?client_id=' + clientId + '&redirect_uri=' + redirect_uri + '&scope=' + appScope.join(" ") + '&approval_prompt=force&response_type=code&access_type=offline', '_blank', 'location=no,clearsessioncache=yes,clearcache=yes');
          browserRef.addEventListener("loadstart", function(event) {
            if((event.url).indexOf(redirect_uri) === 0) {
              var code = /code=([^#$]+)#?$/i.exec(event.url);
              if (code.length <= 1) {
                deferred.reject("Problem authenticating");
                return;
              }
              code = code[1];

              $http.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
              $http({method: "post", url: "https://accounts.google.com/o/oauth2/token", data: "client_id=" + clientId + "&client_secret=" + clientSecret + "&redirect_uri=" + redirect_uri + "&grant_type=authorization_code&code=" + code }).then(function(result) {
                deferred.resolve(result.data);

                setTimeout(function() {
                  browserRef.close();
                }, 10);
              }, function(data, status) {
                deferred.reject("Problem authenticating");

                setTimeout(function() {
                  browserRef.close();
                }, 10);
              });
            }
          });
          browserRef.addEventListener('exit', function(event) {
            deferred.reject("The sign in flow was canceled");
          });
        } else {
          deferred.reject("Could not find InAppBrowser plugin");
        }
      } else {
        deferred.reject("Cannot authenticate via a web browser");
      }
      return deferred.promise;
    }
  }

  googleOffline.$inject = ['$q', '$http', '$cordovaOauthUtility'];
})();
