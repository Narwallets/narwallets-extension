//
// LMT migrated to ES2020/ts module format
// more functions added .- TODO restore node/browser conditionals
//
// Written in 2014-2016 by Dmitry Chestnykh and Devi Mandiri.
// Public domain.

export function encodeUTF8(arr: Uint8Array): string {
    var i, s = [];
    for (i = 0; i < arr.length; i++) s.push(String.fromCharCode(arr[i]));
    return decodeURIComponent(escape(s.join('')));
  };

export function decodeUTF8(s: string): Uint8Array {
    if (typeof s !== 'string') throw new TypeError('expected string');
    var i, d = unescape(encodeURIComponent(s)), b = new Uint8Array(d.length);
    for (i = 0; i < d.length; i++) b[i] = d.charCodeAt(i);
    return b;
  };


export  function validateBase64(s:string) {
    if (!(/^(?:[A-Za-z0-9+\/]{2}[A-Za-z0-9+\/]{2})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/.test(s))) {
      throw new TypeError('invalid encoding');
    }
  }


  export function encodeBase64(arr: Uint8Array): string {
    let s = [], len = arr.length;
    for (let i = 0; i < len; i++) s.push(String.fromCharCode(arr[i]));
    return btoa(s.join(''));
  };

export function decodeBase64(s: string): Uint8Array {
    validateBase64(s);
    let d = atob(s), b = new Uint8Array(d.length);
    for (let i = 0; i < d.length; i++) b[i] = d.charCodeAt(i);
    return b;
  };


//--helper fn
export function encodeHex(buffer: Uint8Array):string {
  return [...buffer]
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
}

export function decodeHex(hexString:string): Uint8Array{
  if (hexString.slice(0,2)=="0x")  hexString = hexString.slice(2);
  let b = new Uint8Array(hexString.length/2);
  for (let i = 0; i<hexString.length; i+=2) b[i] = parseInt(hexString.slice(i,i+2),16);
  return b;
}

//--helper fn
export function stringToUint8Array(data:string): Uint8Array{
  return new TextEncoder().encode(data)
}

/*
  util.encodeUTF8 = function(arr) {
    var i, s = [];
    for (i = 0; i < arr.length; i++) s.push(String.fromCharCode(arr[i]));
    return decodeURIComponent(escape(s.join('')));
  };

  if (typeof atob === 'undefined') {
    // Node.js

    if (typeof Buffer.from !== 'undefined') {
       // Node v6 and later
      util.encodeBase64 = function (arr) { // v6 and later
          return Buffer.from(arr).toString('base64');
      };

      util.decodeBase64 = function (s) {
        validateBase64(s);
        return new Uint8Array(Array.prototype.slice.call(Buffer.from(s, 'base64'), 0));
      };

    } else {
      // Node earlier than v6
      util.encodeBase64 = function (arr) { // v6 and later
        return (new Buffer(arr)).toString('base64');
      };

      util.decodeBase64 = function(s) {
        validateBase64(s);
        return new Uint8Array(Array.prototype.slice.call(new Buffer(s, 'base64'), 0));
      };
    }

  } else {
    // Browsers

    util.encodeBase64 = function(arr) {
      var i, s = [], len = arr.length;
      for (i = 0; i < len; i++) s.push(String.fromCharCode(arr[i]));
      return btoa(s.join(''));
    };

    util.decodeBase64 = function(s) {
      validateBase64(s);
      var i, d = atob(s), b = new Uint8Array(d.length);
      for (i = 0; i < d.length; i++) b[i] = d.charCodeAt(i);
      return b;
    };

  }

  return util;

}));
*/
