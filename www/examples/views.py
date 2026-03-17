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
    """
    Simple example of data-ajt-mode="replace".
    """
    return render(request, "examples/replace/index.html", {
        'text': paragraphs(1),
        'show_more': True,
    })

def replace_more(request: HttpRequest):
    print(request.headers)
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        template = "examples/replace/text.html"
    else:
        template = "examples/replace/index.html"
    return render(request, template, {
        'text': paragraphs(5)
    })

def replace_with_content(request):
    """
    Simple example of data-ajt-mode="replaceWithContent"
    """
    return render(request, "examples/replace_with_content/index.html", {
        'text': paragraphs(1),
        'show_more': True,
    })

def replace_with_content_more(request):
    print(request.headers)
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        template = "examples/replace_with_content/more.html"
    else:
        template = "examples/replace_with_content/index.html"
    return render(request, template, {
        'text': paragraphs(5)[2:]
    })
