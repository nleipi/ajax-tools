from django.http import HttpRequest

def is_ajt(request: HttpRequest):
    return { 'is_ajt': getattr(request, 'is_ajt', False) }
