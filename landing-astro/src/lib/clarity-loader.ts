// Clarity sets third-party cookies on load, so its script is injected on first
// interaction (or after 90 s). The queue stub exists immediately.
export const clarityLoaderScript = `(function(c,l,a,r,i){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  var done=0,ev=["pointerdown","keydown","touchstart","scroll"];
  function go(){
    if(done)return;
    done=1;
    clearTimeout(timer);
    ev.forEach(function(e){removeEventListener(e,go)});
    var t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    var y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  }
  ev.forEach(function(e){addEventListener(e,go,{passive:true,once:true})});
  var timer=setTimeout(go,90000);
})(window,document,"clarity","script","y6bv15rm1t");
window.clarity('set', 'project_id', 'karte');`;
