# wx_viewer/urls.py

from django.urls import path
from . import views
from .views import dashboard

urlpatterns = [
    path('files/', views.list_netcdf_files, name='list_netcdf_files'),
    path('dashboard/', dashboard, name='dashboard'),
    path('files/<str:filename>/', views.view_netcdf, name='view_netcdf'), 
    path('variable_data/<str:filename>/<str:variable>/', views.variable_data_view, name='variable_data'),
    path('data/<str:filename>/', views.fetch_netCDF_details, name='fetch_netCDF_details'),
    path('max_min_data_time_values/<str:filename>/<str:variable>/', views.max_min_data_time_values, name='max_min_data_time_values'),
]