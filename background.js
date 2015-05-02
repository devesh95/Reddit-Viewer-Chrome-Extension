chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('html/main.html', {
    'bounds': {
      'width': Math.round(window.screen.availWidth*0.85),
      'height': Math.round(window.screen.availHeight*0.85)
    }
  });
});