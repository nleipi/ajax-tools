# AJT

ajt is a lightweight library for progressive enhancement of server-side rendered web pages via AJAX.
It makes it easy to add interactivity while reducing the amount of client-side code typically required for AJAX.

## Why use it?

Server-side rendered HTML provides a simple, reliable way to build web application,
AJAX has been long used to add dynamic interactions without full page reloads.

However, traditional AJAX requires you to create additional endpoints, handle requests,
update states, and modify the DOM for each AJAX interaction.

Over time, this leads to common problems: error-prone client side code, that breaks
when the DOM structure changes, duplicated rendering logic, and an ever-growing JavaScript codebase.

With ajt, the server remains responsible for rendering HTML,
while ajt handles the browser-side mechanics of requesting updates and applying them to the page.
This lets you reuse existing routes and templates,
reducing duplicated rendering logic and keeping related code closer together.
As a result, your application can evolve without requiring large amounts of client-side JavaScript to maintain.

## How it works?

Ajt uses declarative HTML attributes to describe how to process the response.
When an element triggers an ajt request, the server receives the request as usual and returns HTML.
The trigger does not need to know what response it will receive or how to render it.
Instead, the server determines the resulting representation, and ajt applies it to the page.
This server-driven approach keeps rendering logic in one place,
allowing existing routes and templates to be reused while reducing the amount of client-side code required.

### Short example
``` html title="trigger"
<!-- trigger -->
<a href="/user-details" data-via-ajt>Show more...</a>
<div id="additional-info"></div>
```

``` html title="response"
<!-- response -->
<div id="additional-info" data-ajt-mode="replace">
    User details
</div>
```
`data-via-ajt` prevents the default a-tag behavior sending the request via ajt instead.
The server renders the response as HTML describing how to update the DOM.
`data-ajt-mode="replace"` tells ajt to replace the existing element with the same id as the returned element.
Notice that there is no JavaScript code, no JSON endpoint, and no client-side rendering logic.
The server remains responsible for producing the HTML that appears on the page.

## Core concepts

### Triggers

Out of the box ajt only implements two trigger elements: anchors and forms.
They're activated by `data-via-ajt` or `data-via-ajt="true"` attribute on the element.
The triggers aim to closely mimic the default browser behavior of the trigger elements,
though they offer some additional features.

#### Anchor

An ajt-enabled anchor behaves like a normal link: it has an `href`, follows normal URL semantics,
and can still work without JavaScript.
The difference is that ajt can intercept the request and update the page instead of performing a full navigation.

In addition, a `data-href` can be used to override the target URL.
This makes it possible to turn any clickable element with `data-href` attribute into a trigger.

#### Form

An ajt-enabled form behaves like a normal form,
except that the submission is intercepted by ajt and the response is handled as an ajt update.

In addition, the default action, method, and enctype can be overridden using the `data-ajt-formaction`,
`data-ajt-formmethod`, and `data-ajt-formenctype` attributes on form input or button elements,
in the same way how `formaction`, `formmethod` and `formenctype` attributes override forms
action, method and enctype. `data-ajt-...` attributes take priority over standard html attributes.

### Response processing

Ajt processes the response by looking at elements annotated with `data-ajt-mode` attribute.
It is important to understand, that while the response may contain a lot of annotated elements,
nested annotated elements are ignored. Here is an example:
``` html title="response"
<!-- response -->
<body>
    <div id="main" data-ajt-mode="replace">
        <div id="fragment" data-ajt-mode="replace"></div>
        ...
    </div>
    <div id="footer" data-ajt-mode="replace">
        ...
    </div>
</body>
```
Only the elements `main` and `footer` will be considered for processing.
The value of `data-ajt-mode` tells ajt what to do with the element.

### Builtin Modes

By default, builtin modes match response elements to existing page elements using their `id` attribute.

This behavior can be overridden on individual response elements with the data-ajt-target attribute, which accepts a valid CSS selector and allows a response to update multiple targets.

This keeps the update logic with the response rather than requiring the trigger to know how the page should change.

#### replace

Replaces the target element with the response element.

``` html
<!-- target -->
<div id="my-div">Old content</div>
...
<!-- response -->
<div id="my-div" class="p-0" data-ajt-mode="replace">New content</div>
...
<!-- result -->
<div id="my-div" class="p-0" data-ajt-mode="replace">New content</div>
```

#### replaceContent

Replaces all children of the target element with the children of the response element.

``` html
<!-- target -->
<div id="my-div" class="p-5">Old content</div>
...
<!-- response -->
<div id="my-div" class="p-0" data-attr="42"
    data-ajt-mode="replaceContent">New content</div>
...
<!-- result -->
<div id="my-div" class="p-5">New content</div>
```

#### replaceWithContent

Replaces the target element with with the children of the response element.

``` html
<!-- target -->
<div id="my-div">Old content</div>
...
<!-- response -->
<div id="my-div" data-ajt-mode="replaceWithContent">
    <div>New content</div>
    <div>More content</div>
</div>
...
<!-- result -->
<div>New content</div>
<div>More content</div>
```

#### appendContent/prependContent

Inserts the childern of the response element at the beginning/end of target elements child list.

``` html
<!-- target -->
<div id="my-div" class="p-5">
    <div>original child</div>
</div>
...
<!-- response -->
<div id="my-div" class="p-0" data-attr="42"
    data-ajt-mode="appendContent">
    <div>new child 1</div>
    <div>new child 2</div>
</div>
...
<!-- result -->
<div id="my-div" class="p-5">
    <div>original child</div>
    <div>new child 1</div>
    <div>new child 2</div>
</div>
```

#### update

Diffs the target element and the the response element and applies only
necessary changes.
Unlike the other modes, `update` preserves the existing DOM nodes where possible
and only applies the minimal changes needed to match the response.

Detailed documentation comming some day..

#### remove

Removes the target element.

### Scripts

Ajt allows you to execute `<script>` nodes.
In order for a `<script>` node to be executed,
it has to be an annotated element or a child of annotated element.
``` html title="response"
<!-- response -->
<script data-ajt-mode="append" data-ajt-target="body">
    console.log('This one will show up')
</script>
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
In this example, the first two scripts execute because they are part of an ajt-managed update. The last script is ignored because it is not associated with an annotated element.

#### Security

By default, ajt does not execute scripts without explicit authorization.
You have to utilize [nonce](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP#nonces) to allow ajt to execute the script.
You have to add a nonce value to the script node and set a `Content-Security-Policy` header with the same nonce value.
Ajt will compare these values and only if they match,
the script will be executed.

If the page issuing ajt requests also uses CSP nonces, provide the current nonce through:
```JavaScript
window.ajtNonce = 'your nonce';
```
ajt will use this value to rewrite script nonces before inserting script nodes into the DOM.

For development purposes, this behavior can be disabled by setting:
```JavaScript
window.ajtAllowUnsafeScripts = true;
```

## Examples

To see ajt in action and hack around you can look at the examples project in the www folder.
The easiest way to start the project, if you have docker, is:
```
npm run examples:dev
```
or
```
npm run examples:dev -- --watch
```
