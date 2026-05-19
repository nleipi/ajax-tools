from django.http import HttpRequest

def is_ajax(request: HttpRequest):
    return { 'is_ajax': getattr(request, 'is_ajax', False) }
