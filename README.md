# WxViewer
## Setup Guide

Welcome to the Wx Viewer Dashboard! This guide will walk you through setting up and running the Wx Viewer Dashboard on your system.

## Prerequisites

Before you begin, ensure you have Python installed on your system. This project was developed with Python 3.8, but it should work with other Python 3 versions.

## Setting Up

### 1. Virtual Environment

It's recommended to use a virtual environment for Python projects. This keeps your project's dependencies separate from your system's Python environment.

To create a virtual environment, run:

`python -m venv venv`

Activate the virtual environment:

- On Windows:

    `venv\Scripts\activate`

- On macOS and Linux:

    `source venv/bin/activate`


### 2. Install Dependencies

After activating your virtual environment, install the project's dependencies by running:

`pip install -r requirements.txt`


The `requirements.txt` file includes the following essential packages:

- Django
- netCDF4
- numpy

### 3. Setup Static and Media Files

The `static` directory contains all the CSS, JavaScript, images, and topo information required for the project. Ensure this directory is placed at the root level of the project, so Django can serve these files correctly.

### 4. Adding NetCDF Files

To view NetCDF data, place your `.nc` files in the `/data` folder at the root level of your Django project. The application will automatically detect and list these files for viewing.

## Running the Project

To run the Django server, execute the following command from the root directory of the project:

`python manage.py runserver`


This will start the development server on `http://127.0.0.1:8000/`. You can access the Wx Viewer Dashboard by navigating to `http://127.0.0.1:8000/dashboard/` on the local computers web browser.




