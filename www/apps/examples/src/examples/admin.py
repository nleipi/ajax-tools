from django.contrib import admin
from django.contrib.sessions import models

from .models import Product, Address

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['sku', 'name']

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ['address', 'city', 'postal_code', 'country_code']

@admin.register(models.Session)
class SessionAdmin(admin.ModelAdmin):
    pass
