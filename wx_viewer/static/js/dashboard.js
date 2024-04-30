// Initialize D3 visualization elements and configurations
var svg = d3.select('#d3-container').append('svg').attr('width', 945).attr('height', 680),
    gData = svg.append("g"),
    gCoastline = svg.append("g"),
    projection = d3.geoMercator().scale(200).translate([300, 200]),
    pathGenerator = d3.geoPath().projection(projection),
    zoom = d3.zoom().scaleExtent([1, 150]).on('zoom', zoomed),
    colorScale = d3.scaleSequential(d3.interpolateViridis), // Initializing colorScale here
    tooltip = d3.select('body').append('div').attr('class', 'tooltip').style("opacity", 0),
    baseGridSize = 5,
    gridSide = calculateGridSize(1),
    debouncedUpdateVisualization = debounce(updateVisualization, 100),
    geojsonData;

// Fetch initial data for coastline and handle errors
d3.json("/static/topo/ne_10m_coastline.topojson").then(topojsonData => {
    geojsonData = topojson.feature(topojsonData, topojsonData.objects.ne10m_coastline);
    drawCoastline();
}).catch(error => {
    console.error('Failed to load coastline data:', error);
    alert('Failed to load coastline data. Please check the console for more details.');
});

function drawCoastline() {
    gCoastline.selectAll('.coastline')
        .data(geojsonData.features)
        .join('path')
        .attr('class', 'coastline')
        .attr('d', pathGenerator)
        .attr('stroke', '#353538')
        .attr('fill', 'none');
}

function updateVisualization() {
    var selectedVariable = document.getElementById('variable-select').value,
        selectedFile = document.getElementById('selected-filename').getAttribute('data-filename'),
        selectedTime = document.getElementById('time-slider').value,
        selectedLevel = document.getElementById('level-slider').value;

    fetch(`/wx_viewer/variable_data/${selectedFile}/${selectedVariable}/?time=${selectedTime}&level=${selectedLevel}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok.');
            }
            return response.json();
        })
        .then(data => {
            if (!data || data.length === 0) {
                throw new Error('No data received.');
            }
            updateDataOnMap(data); // Separate function to handle data processing and map updates
        })
        .catch(error => {
            console.error('Error fetching variable data:', error);
            alert('Error fetching data for visualization. Please check the console for more details.');
        });
}

function updateDataOnMap(data) {
    // Compute the geographic extent of the data points to adjust the map's view
    var bounds = d3.geoBounds({
        type: "FeatureCollection",
        features: data.map(d => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [d.longitude, d.latitude] }
        }))
    });

    var width = +svg.attr("width");
    var height = +svg.attr("height");
    var dx = bounds[1][0] - bounds[0][0];
    var dy = bounds[1][1] - bounds[0][1];
    var x = (bounds[0][0] + bounds[1][0]) / 2;
    var y = (bounds[0][1] + bounds[1][1]) / 2;
    var scale = Math.max(1, Math.min(40, 0.9 / Math.max(dx / width, dy / height)));
    var translate = [width / 2 - scale * projection([x, y])[0], height / 2 - scale * projection([x, y])[1]];

    svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));

    // Clear previous data points
    gData.selectAll("rect").remove();

    // Update color scale based on min and max values obtained from the data
    const values = data.map(d => d.value);
    const minValue = d3.min(values);
    const maxValue = d3.max(values);
    colorScale.domain([minValue, maxValue]);

    // Update the input fields for min and max values if they are linked to the data
    document.getElementById('min-value').value = minValue.toFixed(2);
    document.getElementById('max-value').value = maxValue.toFixed(2);

    // Add new data points as squares or circles based on the value
    gData.selectAll('rect')
        .data(data)
        .enter().append('rect')
        .attr('x', d => projection([d.longitude, d.latitude])[0] - gridSide / 2)
        .attr('y', d => projection([d.longitude, d.latitude])[1] - gridSide / 2)
        .attr('width', gridSide)
        .attr('height', gridSide)
        .attr('fill', d => colorScale(d.value))
        .attr('opacity', 0.9)
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(50)
                .style("opacity", .9);
            tooltip.html(`<strong>Value:</strong> ${d.value.toFixed(2)}`)
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(50)
                .style("opacity", 0);
        })
        .on("click", function() {
            tooltipFrozen = !tooltipFrozen;
            if (!tooltipFrozen) {
                tooltip.style("opacity", 0);
            }
        });


    // Update the time and level display, assuming these details are part of the data
    const firstDataPoint = data[0];
    document.getElementById('slider-value').textContent = firstDataPoint.time;
    const levelInFeet = Math.round(firstDataPoint.level * 3.28084); // Convert meters to feet if needed
    document.getElementById('level-value').textContent = `${levelInFeet} ft`;
}

function fetchNetCDFDetails(filename) {
    fetch(`/data/${filename}/`)
        .then(response => response.text())
        .then(html => {
            const detailsContainer = document.querySelector('.netCDF_detail');
            detailsContainer.innerHTML = html;
            document.querySelector('#selected-filename').setAttribute('data-filename', filename);
            const variableNames = extractVariableNames(detailsContainer);
            updateVariableDropdown(variableNames);
        })
        .catch(error => {
            console.error('Error fetching netCDF details:', error);
            document.querySelector('.netCDF_detail').innerHTML = '<p>An error occurred while fetching file details.</p>';
        });
}

function extractVariableNames(container) {
    const variableRows = container.querySelectorAll('table tr:not(:first-child)');
    return Array.from(variableRows).map(row => row.cells[0].textContent.trim());
}

function updateVariableDropdown(variables) {
    const variableSelect = document.getElementById('variable-select');
    variableSelect.innerHTML = '';
    variables.forEach(variable => {
        let option = document.createElement('option');
        option.value = variable;
        option.textContent = variable;
        variableSelect.appendChild(option);
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function zoomed(event) {
    var newTransform = event.transform;

    projection.scale(newTransform.k * 200) // Adjust scale based on zoom
        .translate([newTransform.x, newTransform.y]); // Adjust translation based on zoom

    pathGenerator.projection(projection);

    gData.attr('transform', newTransform.toString());
    gCoastline.attr('transform', newTransform.toString());

    gCoastline.selectAll('.coastline')
        .attr('d', pathGenerator)
        .attr('stroke-width', 1 / newTransform.k); // Adjust stroke width based on zoom scale

    updateGridSquares(newTransform.k);
}

function updateGridSquares(currentScale) {
    var newSize = calculateGridSize(currentScale);
    gData.selectAll('rect')
        .attr('x', d => {
            let coords = transformedProjection([d.longitude, d.latitude]);
            return coords[0] - newSize / 2;
        })
        .attr('y', d => {
            let coords = transformedProjection([d.longitude, d.latitude]);
            return coords[1] - newSize / 2;
        })
        .attr('width', newSize)
        .attr('height', newSize);
}


function calculateGridSize(transformScale) {
    return baseGridSize / transformScale;
}



svg.call(zoom);

// Event listeners for variable selection, time slider, level slider, min value, and max value
document.getElementById('variable-select').addEventListener('change', updateVisualization);
document.getElementById('time-slider').addEventListener('input', debouncedUpdateVisualization);
document.getElementById('level-slider').addEventListener('input', debouncedUpdateVisualization);
document.getElementById('min-value').addEventListener('input', updateVisualization);
document.getElementById('max-value').addEventListener('input', updateVisualization);