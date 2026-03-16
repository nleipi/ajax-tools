from django.urls import path, include

from . import views

app_name = "examples"

urlpatterns = [
    path("", views.index, name="index"),
    path("simple-usecase/", include(([
        path("", views.simple_usecase, name="Simple usecase"),
        path("more/", views.simple_usecase_more, name="more"),
    ], "simple_usecase"))),
]
