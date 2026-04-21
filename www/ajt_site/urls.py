from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('examples/', include('examples.urls')),
    path('admin/', admin.site.urls),
]
