from django.urls import path, include

from . import views

app_name = "examples"

urlpatterns = [
    path("", views.index, name="index"),
    path("replace/", include(([
        path("", views.replace, name="Mode 'replace'"),
        path("full/", views.replace_more, name="full"),
    ], "replace"))),
    path("replace-content/", include(([
        path("", views.replace_content, name="Mode 'replaceContent' "),
        path("more/", views.replace_content_more, name="more"),
    ], "replace_content"))),
    path("replace-with-content/", include(([
        path("", views.replace_with_content, name="Mode 'replaceWithContent'"),
        path("more/", views.replace_with_content_more, name="more"),
    ], "replace_with_content"))),
    path("append", include(([
        path("", views.append, name="Mode 'append'"),
        path("more/", views.append_more, name="more"),
    ], "append"))),
    path("update/", include(([
        path("", views.update, name="Mode 'update'"),
        path("more/", views.update_more, name="more"),
    ], "update"))),
    path("script/", include(([
        path("", views.script, name="Executing scripts"),
        path("more/", views.script_reload, name="reload"),
    ], "script"))),
]
