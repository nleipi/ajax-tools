# Getting started

# Installation

At this stage of development I don't really care how you are going to add
the library to your project. All that matters is that somehow you can load
the index module of ajt.

``` html title="in html"
<script type="module">
  import ajt from './ajt/index.js'
</script>
```

``` js title="in js"
  import ajt from './ajt/index.js'
```

Next, you need to decide how you want to trigger ajt. Default ajt function
expects either a url or click or sumbit event. There is no 'right' way to do
it in my opinion. 

``` html title="global function"
<script type="module">
  import ajt from './ajt/index.js'
  window.ajt = ajt;
</script>
...
<a href="/" onclick="event.preventDefault(); ajt(event)">Click me!</a>
```

``` js title="in js"
  import ajt from './ajt/index.js'
  document.querySelectorAll('[data-ajt-link]').forEach(el => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      ajt(event);
    })
  })
```

These are two very simplistic approaches. Both of them would work. I'd advise
to do whatever you feel is right for you, just make sure you prevent default
event behavior where necessary. If page speed is a big deal for you,
you could even use dynamic import.

``` html title="dynamit import"
<script type="module">
  window.ajt = function (urlOrEvent) {
    let loadAjt = import('./ajt/index.js')}')
    let currentTarget = null
    if (urlOrEvent instanceof Event) {
      urlOrEvent.preventDefault();
      currentTarget = event.currentTarget;
    }
    return loadAjt.then(module => {
          module.default(urlOrEvent, currentTarget)
        }).catch(err => {
          console.error(err)
        });
  }
</script>
...
<a href="/" onclick="event.preventDefault(); ajt(event)">Click me!</a>
```
This way ajt won't be loaded until it's actually needed.

## Updating DOM

Now comes the fun part. The one where you _don't_ have to write same ajax handlers
over and over again and update dom node by node. Instead of responding with
json, as is usually the case, your server should respond with plain html. I
assume you are doing good old server-side rendering anyway, otherwise you
wouldn't be here. The content of your the response will define what should
be updated and how.
``` html title="simple response"
<div id="minicart" data-ajt-mode="replace">
  <div>{{count}}</div>
  <img src="/cart-icon.svg"/>
</div>
```
What to update is defined by id. There is another way to do it, but id is the
default target for ajt. How to update is defined by data-ajt-mode attribute.
`data-ajt-mode="replace"` means that element with `id="minicart"` in the
current document will be replaced with the new element. The beauty of this
approach is that it allows you to re-use templates. You can create dedicated
template for the 'minicart' element and then include it in the page template
and the response template
