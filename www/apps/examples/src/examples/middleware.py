from django.utils.deprecation import MiddlewareMixin

class IsAjtMiddleware(MiddlewareMixin):
    """
    Middleware that sets `is_ajt` attribute to request object.
    """

    def process_request(self, request):
        request.is_ajt = request.headers.get('x-requested-with') == 'ajt'
