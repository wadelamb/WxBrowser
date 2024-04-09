# wx_viewer/utils.py

import netCDF4
import json
import numpy as np

def convert_to_json(filepath):
    dataset = netCDF4.Dataset(filepath)
    # Example: processing wind speed data
    time_index = 0
    level_index = 0
    wind_speed = dataset.variables['speed'][time_index, level_index, :, :].filled(np.nan)
    latitudes = dataset.variables['latitude'][:]
    longitudes = dataset.variables['longitude'][:]

    data = []
    for i, lat in enumerate(latitudes):
        for j, lon in enumerate(longitudes):
            data.append({
                "latitude": lat,
                "longitude": lon,
                "wind_speed": wind_speed[i, j]
            })

    dataset.close()
    return json.dumps(data)
