from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views import View
from django.views.generic.detail import BaseDetailView, SingleObjectMixin
from django.views.generic.edit import FormMixin
from os.path import splitext
from django.utils import timezone
from django.views.generic.base import TemplateResponseMixin
from django.contrib.messages.views import SuccessMessageMixin
from django.contrib import messages
from django.http import HttpRequest, HttpResponseRedirect
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


class AjtTemplateResponseMixin(TemplateResponseMixin):
    def get_template_names(self):
        names = super().get_template_names()
        request = getattr(self, 'request', None)
        if request:
            if getattr(request, 'is_ajt', False):
                ajax_names = []
                for name in names:
                    ajax_name = '_ajt'.join(splitext(name))
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
    if request.headers.get('x-requested-with') == 'ajt':
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
    if request.headers.get('x-requested-with') == 'ajt':
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
    if request.headers.get('x-requested-with') == 'ajt':
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
    if request.headers.get('x-requested-with') == 'ajt':
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
    if request.headers.get('x-requested-with') == 'ajt':
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
    if request.headers.get('x-requested-with') == 'ajt':
        return render(request, "examples/script/partial.html", {
            'summary': 'This is the replacement summary',
            'text': "This text replaced the anchor tag. The <details> element hasn't been closed because only its contents were replaced"
        })

    return render(request, "examples/update/index.html", {
        'summary': 'This is the summary',
        'text': "Looks like you clicked 'show more' without ajt."
    })

class ShowMoreView(AjtTemplateResponseMixin, ListView):
    """More complex example demonstating pagination
    """
    paginate_by = 6
    model = models.Product

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['direction'] = self.request.GET.get('direction', 'down')
        return context

@method_decorator(never_cache, name="dispatch")
class AddressesView(AjtTemplateResponseMixin, ListView):
    """More complex example demonstating forms
    """
    model = models.Address

    def get_queryset(self):
        return super().get_queryset().for_session(
            self.request.session.session_key)

@method_decorator(never_cache, name="dispatch")
class AddressCreateView(SuccessMessageMixin, AjtTemplateResponseMixin, CreateView):
    model = models.Address
    fields = ['address', 'city', 'state', 'postal_code', 'country_code']
    success_url = reverse_lazy('examples:addresses:Addresses')
    template_name_suffix = '_create'
    success_message = 'New address added'

    def form_valid(self, form):
        if self.request.POST.get('validate', None) == 'yes':
            return self.form_invalid(form)

        if not self.request.session.session_key:
            self.request.session.create()
        form.instance.session_id = self.request.session.session_key

        res = super().form_valid(form)
        if getattr(self.request, 'is_ajt', False):
            if res.status_code == 302:
                return self.response_class(
                    request=self.request,
                    template='examples/addresses/create_address_success_ajt.html',
                    context=self.get_context_data(),
                    using=self.template_engine,
                )
        return res

@method_decorator(never_cache, name="dispatch")
class AddressUpdateView(SuccessMessageMixin, AjtTemplateResponseMixin, UpdateView):
    model = models.Address
    fields = ['address', 'city', 'state', 'postal_code', 'country_code']
    success_url = reverse_lazy('examples:addresses:Addresses')
    template_name_suffix = '_update'
    success_message = 'Address saved'

    def form_valid(self, form):
        res = super().form_valid(form)
        if getattr(self.request, 'is_ajt', False):
            if res.status_code == 302:
                return self.response_class(
                    request=self.request,
                    template='examples/addresses/update_address_success_ajt.html',
                    context=self.get_context_data(),
                    using=self.template_engine,
                )
        return res

class SoftDeleteMixin:
    def form_valid(self, form):
        object = getattr(self, 'object')
        request = getattr(self, 'request')
        response_class = getattr(self, 'response_class')
        get_context_data = getattr(self, 'get_context_data')
        template_engine = getattr(self, 'template_engine')
        get_success_url = getattr(self, 'get_success_url')

        object.deleted_at = timezone.now()
        object.save()

        if getattr(request, 'is_ajt', False):
            return response_class(
                request=request,
                template='examples/addresses/delete_address_success_ajt.html',
                context=get_context_data(undo=True),
                using=template_engine,
            )
            
        success_url = get_success_url()
        return HttpResponseRedirect(success_url)

@method_decorator(never_cache, name="dispatch")
class AddressDeleteView(SuccessMessageMixin, AjtTemplateResponseMixin, SoftDeleteMixin, DeleteView):
    model = models.Address
    success_url = reverse_lazy('examples:addresses:Addresses')
    success_message = 'Address deleted'

    def form_valid(self, form):
        if getattr(self.request, 'is_ajt', False):
            return super().form_valid(form)
        return super().form_valid(form)

@method_decorator(never_cache, name="dispatch")
class AddressRestoreView(TemplateResponseMixin, SingleObjectMixin, View):
    model = models.Address
    template_name = 'examples/addresses/restore_address_success_ajt.html'

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        self.object.deleted_at = None
        self.object.save()
        context = self.get_context_data(object=self.object)
        return self.render_to_response(context)
