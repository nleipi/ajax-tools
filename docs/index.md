# Overview

Are you developing or maintaining a server-side rendered website and want to
add some ajax functionality to improve UX? Ajax tools will help you to achieve
it with ease.

## TL;DR;

Following example shows an oversimplified product page with mini cart icon,
'add to cart' form and links to different product color variations.
Click on 'add to cart' button should update the mini cart icon with the new amount
and click on color variation links updates the product data and the form.
While the example if oversimplified it contains all client-side js you'll need
to implement these features.

``` js title="main.js"
import ajt from './ajt/index.js'
document.querySelectorAll('[data-ajt-trigger]').forEach(el => {/* (1)! */
    el.addEventListener(el.dataset.ajtTrigger, (event) => {
        event.preventDefault();
        ajt(event);
    }
});
document.getElementById('mini-cart').addEventListener('click', () => {/* (2)! */
});
```

1. Global setup. All events defined in attribute `data-ajt-trigger` will be intercepted and
processed via ajt
2. `click` event listener used for demonstraction purpose

``` html title="/product"
<html>
    <head>
        <script type="module" src"/js/main.js"></script>
    </head>
    <body>
        <header>
            <div id="mini-cart">
                <img src="empty-cart-icon.svg"/>
                <div>0</div>
            </div>
        </header>
        <div id="product-data">
            <!-- product image and description -->
        </div>
        <a href="/product?color=red"
           data-ajt-trigger="click">Red<a><!-- (1)! -->
        <a href="/product?color=green"
           data-ajt-trigger="click">Green<a><!-- (2)! -->
        <form id="cart-form"
              action="/cart"
              method="post"
              data-ajt-trigger="submit"><!-- (3)! -->
            <input type="hidden" name="product-id" value="prod_0001" />
            <input type="number" name="quantity" />
            <button>Add product to cart</button>
        </form>
    </body>
</html>
```

1. Click on this link will update the `product-data` and the `cart-form`
with the data of red product
2. Click on this link will update the `product-data` and the `cart-form`
with the data of green product
3. Submitting the form will update the `mini-cart`

``` html title="/product?color=red"
<div id="product-data" data-ajt-mode="replace"><!-- (1)! -->
    <!-- red product image and description -->
</div>
<form id="cart-form"
      action="/cart"
      method="post"
      data-ajt-trigger="submit"
      data-ajt-mode="update"><!-- (2)! -->
    <input type="hidden" name="product-id" value="prod_0001_red" />
    <input type="number" name="quantity" />
    <button>Add product to cart</button>
</form>
```

1. Mode `replace` will replace the element with the same `id` in the current document
1. Mode `upadate` will merge the attributes and the content of element with the same `id`
in the current document. Useful for forms to keep users input after updating
the html.

``` html title="/product?color=green"
<div id="product-data" data-ajt-mode="replace"><!-- (1)! -->
    <!-- green product image and description -->
</div>
<form id="cart-form"
      action="/cart"
      method="post"
      data-ajt-trigger="submit"
      data-ajt-mode="update"><!-- (2)! -->
    <input type="hidden" name="product-id" value="prod_0001_green" />
    <input type="number" name="quantity" />
    <button disabled>Sold out</button>
</form>
```

1. Mode `replace` will replace the element with the same `id` in the current document
1. Mode `upadate` will merge the attributes and the content of element with the same `id`
in the current document. Useful for forms to keep users input after updating
the html.

``` html title="/cart"
<div id="mini-cart" data-ajt-mode="replaceContent"><!-- (1)! -->
    <img src="full-cart-icon.svg"/>
    <div><!-- new quantity --></div>
</div>
```

1. Mode `replace` will replace the content of the element with the same `id`.
Useful to keep the listeners.

## Rationale

There are myriads of ways to add ajax to a SSR page in a modern web. Most of them
share same downsides:

### Boilerplate code

Implementing ajax calls with jQuery or vanilla js is quite easy, but there is
just so much boilerplate code. You make the XHR call/fetch, receive the response,
parse json and update some html. Over and over and over again.

### Ever-growing client-side js

How often did you see a piece of js and asked yourself whether it is still used
somewhere? Keeping you client-side code neat and tidy can be extremely difficult
and tedious task. You can spend hours of thorough clean up work, but in the end
lighthouse still tells you 90% of your code it not used. Ouch!

### Tigtht coupling between templates and js

In order to update html with the new data ajax functions will mostly rely on css
selectors. That means when html changes you have to double-check the client-side
js as well, which can difficult if some smarty-pants collegue concatenated class
name. Sometimes there is just no suitable selector so devs end up adding css
classes just for js, or worse, using combinators like `.some-element > div:first-child > span`

### HTML rendering in js

Sometimes there is a need to add some new html rather than just update existing
element. It can be cumbersome to render html in your client-side js without
additional libraries. But the real pain is if you have to render the same html
on server- and client-side, e.g. server renders the initial list of items and
client renders new items added by user. Not very DRY.

## Ajax tools to the rescue!

Ajax tools tackles all of these problems by offloading most of the decisions to
the server-side. The response is in controll of what and how will be updated. As
a result, most of ajax calls can be implemented without you writing js at all.
