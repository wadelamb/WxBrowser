# wx_viewer/urls.py

from django.urls import path
from . import views
from .views import dashboard

urlpatterns = [
    path('files/', views.list_netcdf_files, name='list_netcdf_files'),
    path('dashboard/', dashboard, name='dashboard'),
    path('files/<str:filename>/', views.view_netcdf, name='view_netcdf'), 
    path('data/<str:filename>/', views.fetch_netCDF_details, name='fetch_netCDF_details'),
]