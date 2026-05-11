from django.db import models

class Product(models.Model):
    sku = models.CharField(max_length=200)
    name = models.CharField(max_length=200)
    image = models.ImageField(upload_to='products')

    def __str__(self):
        return self.name
