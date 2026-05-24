from os.path import splitext
from django.views.generic.base import TemplateResponseMixin
from django.contrib.messages.views import SuccessMessageMixin
from django.http import HttpRequest
from inspect import getdoc
from django.urls import get_resolver, URLResolver, reverse_lazy
from django.shortcuts import render
from django.utils.lorem_ipsum import words
from django.views.generic import (
    ListView,
    CreateView,
    UpdateView,
    DeleteView,
)

from . import urls, models


class AjaxTemplateResponseMixin(TemplateResponseMixin):
    def get_template_names(self):
        names = super().get_template_names()
        request = getattr(self, 'request', None)
        if request:
            if getattr(request, 'is_ajax', False):
                ajax_names = []
                for name in names:
                    ajax_name = '_ajax'.join(splitext(name))
                    ajax_names.append(ajax_name)
                names = ajax_names + names
        return names


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

def append(request):
    """Simple example of data-ajt-mode="prependContent/appendContent".
    """
    items = words(5, True).split(' ')
    return render(request, "examples/append/index.html", {
        'items': items,
    })

def append_more(request: HttpRequest):
    items = words(10, True).split(' ')
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return render(request, "examples/append/list.html", {
            'items': items[5:],
            'mode': request.GET.get('mode', 'appendContent')
        })
    return render(request, "examples/append/index.html", {
        'items': items
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

def script(request):
    """Simple example of data-ajt-mode="replaceContent".
    """
    return render(request, "examples/script/index.html", {
        'summary': 'This is the initial summary, that will be replaced',
    })

def script_reload(request: HttpRequest):
    print(request.headers)
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return render(request, "examples/script/partial.html", {
            'summary': 'This is the replacement summary',
            'text': "This text replaced the anchor tag. The <details> element hasn't been closed because only its contents were replaced"
        })

    return render(request, "examples/update/index.html", {
        'summary': 'This is the summary',
        'text': "Looks like you clicked 'show more' without ajt."
    })

class ShowMoreView(AjaxTemplateResponseMixin, ListView):
    """More complex example demonstating pagination
    """
    paginate_by = 6
    model = models.Product

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['direction'] = self.request.GET.get('direction', 'down')
        return context

class AddressesView(AjaxTemplateResponseMixin, ListView):
    """More complex example demonstating forms
    """
    model = models.Address

    def get_queryset(self):
        return super().get_queryset().for_session(
            self.request.session.session_key)

class AddressCreateView(SuccessMessageMixin, AjaxTemplateResponseMixin, CreateView):
    model = models.Address
    fields = ['address', 'city', 'state', 'postal_code', 'country_code']
    success_url = reverse_lazy('examples:addresses:Addresses')
    template_name_suffix = '_create'
    success_message = 'New address added'

    def form_valid(self, form):
        if not self.request.session.session_key:
            self.request.session.create()
        form.instance.session_id = self.request.session.session_key
        return super().form_valid(form)

class AddressUpdateView(SuccessMessageMixin, AjaxTemplateResponseMixin, UpdateView):
    model = models.Address
    fields = ['address', 'city', 'state', 'postal_code', 'country_code']
    success_url = reverse_lazy('examples:addresses:Addresses')
    template_name_suffix = '_update'
    success_message = 'Address saved'

class AddressDeleteView(SuccessMessageMixin, AjaxTemplateResponseMixin, DeleteView):
    model = models.Address
    success_url = reverse_lazy('examples:addresses:Addresses')
