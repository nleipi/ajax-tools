from django.http import HttpRequest
from inspect import getdoc
from django.urls import get_resolver, URLResolver
from django.shortcuts import render
from django.utils.lorem_ipsum import paragraphs

from . import urls

def index(request):
    resolver = get_resolver(urls)
    examples = []
    for resolver in resolver.url_patterns:
        if isinstance(resolver, URLResolver):
            url_name = f"examples:{resolver.namespace}"
            for pattern in resolver.url_patterns:
                if str(pattern.pattern) == '':
                    examples.append({
                        'full_name': f"{url_name}:{pattern.name}",
                        'name': pattern.name,
                        'description': getdoc(pattern.callback),
                    })


    return render(request, "examples/index.html", {
        'examples': examples
    })

def replace(request):
    """Simple example of data-ajt-mode="replace".
    """
    return render(request, "examples/replace/index.html", {
        'text': "This is the initial content, that will be replaced",
        'show_more': True,
    })

def replace_more(request: HttpRequest):
    print(request.headers)
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return render(request, "examples/replace/text.html", {
            'text': "This is the new content. The parent element has been replaced.",
        })
    return render(request, "examples/replace/index.html", {
        'text': "Looks like you clicked 'show more' without ajt."
    })

def replace_content(request):
    """Simple example of data-ajt-mode="replaceContent".
    """
    return render(request, "examples/replace_content/index.html", {
        'summary': 'This is the initial summary, that will be replaced',
    })

def replace_content_more(request: HttpRequest):
    print(request.headers)
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return render(request, "examples/replace_content/text.html", {
            'summary': 'This is the replacement summary',
            'text': "This is added text section. The <details> element hasn't been closed because only its contents were replaced"
        })

    return render(request, "examples/replace_content/index.html", {
        'summary': 'This is the summary',
        'text': "Looks like you clicked 'show more' without ajt."
    })

def replace_with_content(request):
    """Simple example of data-ajt-mode="replaceWithContent"
    """
    return render(request, "examples/replace_with_content/index.html", {
        'text': "This is the initial content.",
        'show_more': True,
    })

def replace_with_content_more(request):
    print(request.headers)
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return render(request, "examples/replace_with_content/more.html", {})
    return render(request, "examples/replace_with_content/index.html", {
        'text': "Looks like you clicked 'show more' without ajt."
    })

def update(request):
    """Simple example of data-ajt-mode="replaceContent".
    """
    return render(request, "examples/update/index.html", {
        'summary': 'This is the initial summary, that will be replaced',
    })

def update_more(request: HttpRequest):
    print(request.headers)
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return render(request, "examples/update/text.html", {
            'summary': 'This is the replacement summary',
            'text': "This text replaced the anchor tag. The <details> element hasn't been closed because only its contents were replaced"
        })

    return render(request, "examples/update/index.html", {
        'summary': 'This is the summary',
        'text': "Looks like you clicked 'show more' without ajt."
    })
