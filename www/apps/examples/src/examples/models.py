from django.db import models
from django.contrib.sessions.models import Session

class Product(models.Model):
    sku = models.CharField(max_length=200)
    name = models.CharField(max_length=200)
    image = models.ImageField(upload_to='products')

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-id']

class AddressQuerySet(models.QuerySet):
    def for_session(self, session_key):
        return self.filter(session_id=session_key).order_by('-created_at')

class Address(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE)
    address = models.CharField(max_length=200)
    city = models.CharField(max_length=200)
    state = models.CharField(max_length=200, blank=True)
    postal_code = models.CharField(max_length=20)
    country_code = models.CharField(
        max_length=2,
        verbose_name='Country',
        choices=[
        ("AT", "Austria"),
        ("BE", "Belgium"),
        ("BG", "Bulgaria"),
        ("HR", "Croatia"),
        ("CY", "Cyprus"),
        ("CZ", "Czech Republic"),
        ("DK", "Denmark"),
        ("EE", "Estonia"),
        ("FI", "Finland"),
        ("FR", "France"),
        ("DE", "Germany"),
        ("GR", "Greece"),
        ("HU", "Hungary"),
        ("IE", "Ireland"),
        ("IT", "Italy"),
        ("LV", "Latvia"),
        ("LT", "Lithuania"),
        ("LU", "Luxembourg"),
        ("MT", "Malta"),
        ("NL", "Netherlands"),
        ("PL", "Poland"),
        ("PT", "Portugal"),
        ("RO", "Romania"),
        ("SK", "Slovakia"),
        ("SI", "Slovenia"),
        ("ES", "Spain"),
        ("SE", "Sweden"),
    ])
    created_at = models.DateTimeField(auto_now_add=True)
    objects = AddressQuerySet.as_manager()

    def __str__(self):
        return self.address

    class Meta:
        ordering = ['-country_code', '-city']
