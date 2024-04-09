# WxBrowser\project_WxBroswer\urls.py

"""
ASGI config for project_WxBrowser.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project_WxBrowser.settings')

application = get_asgi_application()

