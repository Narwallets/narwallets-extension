// -------------------------------------------------------------
// Crypto-primitives *BROWSER ONLY* .- uses crypto.subtle
// -------------------------------------------------------------
// based on: https://gist.github.com/Allegan/97a7b002837e21fa37a3e929c546ca11
// async functions returning ArrayBuffer (underlying buffer for UInt8Array & other views)
// https://stackoverflow.com/questions/42416783/where-to-use-arraybuffer-vs-typed-array-in-javascript
//

//random
export function getRandomValues(byteLength:number):Uint8Array { 
  return crypto.getRandomValues(new Uint8Array(byteLength))
}

//sha256
export async function sha256Async(byt:Uint8Array|ArrayBuffer) 
: Promise<ArrayBuffer>  {
  return crypto.subtle.digest("SHA-256", byt)
}
//sha512
export async function sha512Async(byt:Uint8Array|ArrayBuffer) 
: Promise<ArrayBuffer>  {
  return crypto.subtle.digest("SHA-512", byt);
}

// export pbkdf2_sha256_Async
export async function pbkdf2_sha256_Async(key:string, salt:string, iterations:number)
:Promise<ArrayBuffer> {
  return pbkdf2Async(key,salt,iterations,'SHA-256',256)
}

// export pbkdf2_sha512_Async
export async function pbkdf2_sha512_Async(key:string, salt:string, iterations:number)
:Promise<ArrayBuffer> {
  return pbkdf2Async(key,salt,iterations,'SHA-512',512)
}

//-- Internal common
async function pbkdf2Async(key:string, salt:string, iterations:number, shaAlgo:string, dkLenBits:number)
  :Promise<ArrayBuffer> {
  
  const te = new TextEncoder()

  // turn password into a key object
  const bytKey = await crypto.subtle.importKey(
      "raw",
      te.encode(key),
      "PBKDF2",
      false,
      ["deriveBits"]
  )

  return crypto.subtle.deriveBits(
      {
          "name": "PBKDF2",
          hash: {name: shaAlgo}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
          salt: te.encode(salt),
          iterations: iterations,
      },
      bytKey , //your key from generateKey or importKey
      dkLenBits //length in bits
    );

}

