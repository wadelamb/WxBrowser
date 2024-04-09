# wx_viewer/views.py

import os
from django.shortcuts import render
import netCDF4
from django.conf import settings
from django.http import JsonResponse
import numpy as np
from .utils import convert_to_json

def list_netcdf_files(request):
    data_dir = os.path.join(settings.BASE_DIR, 'data')
    netcdf_files = [f for f in os.listdir(data_dir) if f.endswith('.nc')]
    return render(request, 'wx_viewer/list_files.html', {'netcdf_files': netcdf_files})

def view_netcdf(request, filename):
    data_dir = os.path.join(settings.BASE_DIR, 'data')  # Construct path using BASE_DIR
    filepath = os.path.join(data_dir, filename)
    
    dataset = netCDF4.Dataset(filepath)
    dimensions = {name: dim.size for name, dim in dataset.dimensions.items()}
    variables = {var: dataset.variables[var].ncattrs() for var in dataset.variables.keys()}
    
    # Fetching global attributes and their values
    global_attributes = {attr: dataset.getncattr(attr) for attr in dataset.ncattrs()}

    variable_details = {}
    for name, variable in dataset.variables.items():
        variable_details[name] = {
            'dimensions': variable.dimensions,
            'data_type': str(variable.datatype),
            'attributes': {attr: variable.getncattr(attr) for attr in variable.ncattrs()}
        }

    dataset.close()

    context = {
        'filename': filename,
        'dimensions': dimensions,
        'variables': variables,
        'global_attributes': global_attributes,
        'variable_details': variable_details,
    }

    return render(request, 'wx_viewer/view_netcdf.html', context)


def dashboard(request):
    # Assuming NetCDF files are stored in the /data directory
    data_dir = os.path.join(settings.BASE_DIR, 'data')
    netcdf_files = [f for f in os.listdir(data_dir) if f.endswith('.nc')]

    context = {
        'netcdf_files': netcdf_files,
        'variables': [],  # Start with an empty list
    }
    return render(request, 'wx_viewer/dashboard.html', context)

def netcdf_data_view(request, filename):
    # Construct the full filepath
    filepath = "data/" + filename

    # Convert netCDF data to JSON
    json_data = convert_to_json(filepath)

    # For an AJAX request, you might return the JSON data directly
    return JsonResponse(json_data, safe=False)

def fetch_netCDF_details(request, filename):
    try:
        # Construct the full filepath
        data_dir = os.path.join(settings.BASE_DIR, 'data')  # Assuming netCDF files are in 'data' directory
        filepath = os.path.join(data_dir, filename)

        # Open the netCDF file
        dataset = netCDF4.Dataset(filepath)

        # Extracting variables from the dataset
        variables = list(dataset.variables.keys())

        # Extracting dimensions from the dataset
        dimensions = {name: dim.size for name, dim in dataset.dimensions.items()}

        # Close the dataset
        dataset.close()

        # Construct the JSON response
        response_data = {
            'variables': variables,  # List of variable names
            'dimensions': dimensions,  # Dictionary of dimension names and sizes
        }

        # Return the JSON response
        return JsonResponse(response_data)
    except Exception as e:
        # In case of an error, return an error message
        error_message = str(e)
        return JsonResponse({'error': error_message}, status=500) 
    
def variable_data_view(request, filename, variable):
    filepath = os.path.join(settings.DATA_DIR, filename)

    try:
        dataset = netCDF4.Dataset(filepath, 'r')

        # Fetch the latitude, longitude, and variable data
        latitudes = dataset.variables['latitude'][:]
        longitudes = dataset.variables['longitude'][:]
        var_data = dataset.variables[variable]

        # For simplicity, let's use the first time slice and level if they are dimensions of the variable
        if 'time' in var_data.dimensions and 'level' in var_data.dimensions:
            var_data = var_data[0, 0, :, :]  # First time slice and level
        elif 'time' in var_data.dimensions:
            var_data = var_data[0, :, :]  # First time slice
        elif 'level' in var_data.dimensions:
            var_data = var_data[0, :, :]  # First level

        # Convert the data to a list of dictionaries with lat, lon, and value
        data = []
        for i, lat in enumerate(latitudes):
            for j, lon in enumerate(longitudes):
                data_point = {
                    "latitude": float(lat),
                    "longitude": float(lon),
                    "value": float(var_data[i, j])
                }
                data.append(data_point)

        dataset.close()
        return JsonResponse(data, safe=False)  # 'safe=False' is required for non-dict objects

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)