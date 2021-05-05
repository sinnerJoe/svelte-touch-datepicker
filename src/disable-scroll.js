// left: 37, up: 38, right: 39, down: 40,
// spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
const keys = {37: 1, 38: 1, 39: 1, 40: 1};

function preventDefault(e) {
  e.preventDefault();
}

function preventDefaultForScrollKeys(e) {
  if (keys[e.keyCode]) {
    preventDefault(e);
    return false;
  }
}

let config = null;

function loadConfig() {
  if(config) {
    return config;
  }
  // modern Chrome requires { passive: false } when adding event
  let supportsPassive = false;
  try {
    if(window) {
      window.addEventListener("test", null, Object.defineProperty({}, 'passive', {
          get: function () { supportsPassive = true; } 
      }));
    }
  } catch(e) {}

  const wheelOpt = supportsPassive ? { passive: false } : false;
  const wheelEvent = document && 'onwheel' in document.createElement("div") ? 'wheel' : 'mousewheel';

  config = {
    wheelOpt,
    wheelEvent
  }
  return config;
}

// call this to Disable
export function disableScroll() {
  const {wheelOpt, wheelEvent} = loadConfig();
  window.addEventListener('DOMMouseScroll', preventDefault, false); // older FF
  window.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
  window.addEventListener('touchmove', preventDefault, wheelOpt); // mobile
  window.addEventListener('keydown', preventDefaultForScrollKeys, false);
}

// call this to Enable
export function enableScroll() {
  const {wheelOpt, wheelEvent} = loadConfig();
  window.removeEventListener('DOMMouseScroll', preventDefault, false);
  window.removeEventListener(wheelEvent, preventDefault, wheelOpt); 
  window.removeEventListener('touchmove', preventDefault, wheelOpt);
  window.removeEventListener('keydown', preventDefaultForScrollKeys, false);
}