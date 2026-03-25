from django.urls import path, include

from . import views

app_name = "examples"

urlpatterns = [
    path("", views.index, name="index"),
    path("replace/", include(([
        path("", views.replace, name="replace"),
        path("full/", views.replace_more, name="full"),
    ], "replace"))),
    path("replace-content/", include(([
        path("", views.replace_content, name="replaceContent"),
        path("more/", views.replace_content_more, name="more"),
    ], "replace_content"))),
    path("replace-with-content/", include(([
        path("", views.replace_with_content, name="replaceWithContent"),
        path("more/", views.replace_with_content_more, name="more"),
    ], "replace_with_content"))),
    path("update/", include(([
        path("", views.update, name="update"),
        path("more/", views.update_more, name="more"),
    ], "update"))),
]
