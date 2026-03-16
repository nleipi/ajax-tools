from django.urls import get_resolver, URLResolver
from django.shortcuts import render
from django.http import HttpResponse

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
                        'name': pattern.name
                    })


    return render(request, "examples/index.html", {
        'examples': examples
    })

def simple_usecase(request):
    return render(request, "examples/simple_usecase/index.html", {})

def simple_usecase_more(request):
    return render(request, "examples/simple_usecase/more.html", {})
