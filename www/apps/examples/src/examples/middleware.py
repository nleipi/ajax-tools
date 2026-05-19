from django.utils.deprecation import MiddlewareMixin

class IsAjaxMiddleware(MiddlewareMixin):
    """
    Middleware that sets `is_ajax` attribute to request object.
    """

    def process_request(self, request):
        request.is_ajax = request.headers.get('x-requested-with') == 'XMLHttpRequest'
