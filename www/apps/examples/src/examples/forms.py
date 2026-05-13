from django import forms

from . import models

class AddressForm(forms.ModelForm):
    class Meta:
        model = models.Address
        fields = ['address', 'city', 'state', 'postal_code', 'country_code']
