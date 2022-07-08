;(function() {
    function script() {
      // your main code here
      // @ts-ignore
      window.narwallets = 'bar'
      console.log("Adeu")
    }
  
    // @ts-ignore
    function inject(fn) {
      const script = document.createElement('script')
      script.text = `(${fn.toString()})();`
      document.documentElement.appendChild(script)
    }
    console.log("Hellou")
    inject(script)
  })()