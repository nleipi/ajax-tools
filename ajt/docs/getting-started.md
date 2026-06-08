# Getting started

## Initialization

``` html
<script type="module" src="./ajt/index.js">
```

By default, ajt will intercept `click` and `submit` events on elements with
`data-via-ajt` attribute. This behavior can be turned of by setting
`window.ajtNoTriggers = false` before loading the library.

## Updating DOM

Now comes the fun part. The one where you _don't_ have to write same ajax handlers
over and over again and update dom node by node. Instead of responding with
json, as is usually the case, your server should respond with plain html. I
assume you are doing good old server-side rendering anyway, otherwise you
wouldn't be here. The content of your the response will define what should
be updated and how.

### Simple response

``` html title="simple response"
<div id="minicart" data-ajt-mode="replace">
  <div>{{count}}</div>
  <img src="/cart-icon.svg"/>
</div>
```
This response will instruct ajt to replace element with id `minicart`. While
id is used as a default identifier for the target element,
`data-ajt-target="<valid css selector>"` can be utilized instead, which also
allows for multiple targets.

### Complex responses

The responses are not limited to one element annotated with `data-ajt-mode`.
Imagine a typical product details page with 'add to cart' functionality. When
user clicks on 'add to cart' button, you want to update the cart icon in the
corner, but you also might want to apply a visual feedback to the button or
to show the cart in an overlay. Then there are all sort of edge cases. You want
show an error message in case the desired quantity exeeds the stock. And for
every 1000th 'add to cart' interaction the marketing department wants you show
a popup in addition to all the other stuff. Your response might look like this:

``` html title="add to cart response"
<div id="minicart" data-ajt-mode="replace">
  <div>{{count}}</div>
  <img src="/cart-icon.svg"/>
</div>
<button id="add-to-cart"
    class="btn success-animation"
    data-ajt-mode="replace">Add to cart</button>
<div data-ajt-mode="appendContent" data-ajt-target="#overlay-container">
    <div id="cart-overlay"
        class="cart-overlay">
        <ul>
            <li>Product item</li>
        </ul>
    </div>
</div>
```

Of course, to make the most of ajt, you should rather re-use existing templates.
The reponse template might look more like this:
``` htmldjango title="add to cart response template"
{% error %}
    <div id="pdp-errors" data-ajt-mode"replaceContent">
    {% include 'partials/errors.html' %}
    </div>
{% else %}
    {% include 'partials/minicart.html' %}
    {% include 'partials/cart_button.html' %}
    {% lucky_customer %}
    <div data-ajt-mode="appendContent" data-ajt-target="#overlay-container">
        {% include 'partials/marketing_popup.html' %}
    </div>
    {% endif %}
{% endif %}
```
You will notice that the client-side of the process does not care about the
result of the request. All the 'add to cart' form knows is that it has to send
a `POST` request to `/cart`. 

### Nesting

To make it even easier to re-use existing templates, the annotated elements do
not have to reside on the top level of the response. In addition annotated
elements, that are nested in another annotated elements, are ignored.
``` htmldjango title="partials/cart_button.html"
<button id="add-to-cart"
    class="btn"
    data-ajt-mode="replace">Add to cart</button>
```
``` htmldjango title="partials/add_to_cart_form.html"
<div class="form-container">
    <form id="add-to-cart-form"
        action="/cart"
        method="POST"
        data-ajt-mode="update">
        <input type="number" name="quantity"/>
        {% include 'partials/cart_button.html' %}
    </form>
</div>
```
In the example `form-container` element won't play any role. Also the 
`data-ajt-mode` of the `add-to-cart` button is ignored, because it is child of
the form with `data-ajt-mode` attribute.

### Scripts

Ajt allows you to execute `<script>` nodes. To make it safe(r) it takes the
same `nonce` approach many other libraries take (more on it later). In order
for a `<script>` node to be executed, it has to be a child of an annotated
element.
``` html
<div id="my-element" data-ajt-mode="replace">
    <script>
        console.log('This one will show up')
    </script>
</div>
<div>
    <script>
        console.log('This one won\'t show up')
    </script>
</div>
```

### Modes
ajt comes with some default modes, which will do most of the time, but allows
for custom modes as well.

#### `replace`
Replaces the target element with the annotated element. This is the most basic,
but quite useful mode.

#### `replaceContent`
Replaces the children of the target element with the children of the annotated
element. This mode is useful if removing the target element itself is not
desirable. There might be some listeners on the element, or the state of the
element was changed by the client, e.g. the `<details>` element's open state.

#### `replaceWithContent`
Replaces the target element with children of the annotated element. Useful when
you want to insert bunch of new children at a designated position.

#### `appendContent/prependContent`
Inserts the children of the annotated element at the start/end of target
element's child list. Appending/prepending items to a list. e.g. 'load more'
kind of pagination.

#### `update`
Makes a diff of the target element and the annotated element and applied only
necessary changes. This mode is very useful for use-cases like as-you-type
server-side form validation.

#### `remove`
Removes target element.

## Events

Ajt allows you to extend it's functionality via events and hooks.

### Document

#### ajtDomProcess

This is the main event dipatched when the response has been parsed and the
process of updating DOM is about to start. The `detail` property of the event
object contains the DomProcess object, which is an EventTarget itself and
dispatches events in the scope of the current update process.

### DomProcess

#### addElement

This event is dipatched for every Node, that will be added to the DOM later in
the process. The `detail` property of the event object contains the node.
This is a good place to do some initialization, adding event listeners, css
classes or styles on the element etc.

#### removeElement

This event is dipatched for every Node, that will be removed fromthe DOM later
in the process. The `detail` property of the event object contains the node.
This is a good place to do some de-initialization, removing event listeners etc.

#### beforeUpdate

This event is dipatched after all addElement/removeElement events but before
the view transition starts.
You can use this event if you need to do some processing on all the elements,
which are about to be added/removed.

#### afterUpdate

This event is dispatched after the view transition.
This event can be useful to clean up the state of the DOM after the transition.
E.g. removing `view-transition-name` or css classes.

#### transition

This event is dispatched when the `ViewTransition` object has been created via
`window.startViewTransition`
If view transitions are not supported by the browser the event is not dispatched.
The `detail` property of the event contains the `ViewTransition` object.

#### beforeApplyDomChanges
This event is dispatched inside the view transition update function before the
dom changes are applied.
If view transitions are not supported by the browser the event is still
dispatched.

#### afterApplyDomChanges

This event is dispatched inside the view transition update function after the
dom changes are applied.
If view transitions are not supported by the browser the event is still
dispatched.
