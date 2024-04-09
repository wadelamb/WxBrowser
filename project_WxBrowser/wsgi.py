
# WxBrowser\project_WxBroswer\urls.py
"""
URL configuration for project_WxBrowser.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, reverse_lazy
from django.views.generic.base import RedirectView
from wx_viewer import views


urlpatterns = [
    path('admin/', admin.site.urls),
    path('wx_viewer/', include('wx_viewer.urls')),
    path('data/<str:filename>/', views.view_netcdf, name='view_netcdf'),
    path('', RedirectView.as_view(url=reverse_lazy('dashboard')), name='root_redirect'),
]

"""
WSGI config for project_WxBrowser.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project_WxBrowser.settings')

application = get_wsgi_application()
