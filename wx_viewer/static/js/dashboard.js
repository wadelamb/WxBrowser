var colorScale; // Define colorScale variable in a broader scope

function fetchNetCDFDetails(filename) {
    fetch(`/data/${filename}/`)
        .then(response => response.text())
        .then(html => {
            const detailsContainer = document.querySelector('.netCDF_detail');
            detailsContainer.innerHTML = html;

            // Set the currently selected filename
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
    const variableNames = Array.from(variableRows).map(row => row.cells[0].textContent.trim());
    return variableNames;
}

function updateVariableDropdown(variables) {
    const variableSelect = document.getElementById('variable-select');
    variableSelect.innerHTML = '';
    variables.forEach(variable => {
        const option = document.createElement('option');
        option.value = variable;
        option.textContent = variable;
        variableSelect.appendChild(option);
    });
}

// Debounce function
function debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounced version of updateVisualization
const debouncedUpdateVisualization = debounce(updateVisualization, 100); // 100ms delay

// Event listeners for variable selection, time slider, level slider, min value, and max value
document.getElementById('variable-select').addEventListener('change', updateVisualization);
document.getElementById('time-slider').addEventListener('input', debouncedUpdateVisualization);
document.getElementById('level-slider').addEventListener('input', debouncedUpdateVisualization);
document.getElementById('min-value').addEventListener('input', updateVisualization);
document.getElementById('max-value').addEventListener('input', updateVisualization);

// Define geojsonData outside of the function to make it accessible
var geojsonData;

// Load and draw the coastline on top of other visualizations
d3.json("/static/topo/ne_10m_coastline.topojson").then(topojsonData => {
    geojsonData = topojson.feature(topojsonData, topojsonData.objects.ne10m_coastline);
    drawCoastline();
});

// Function to draw coastline
function drawCoastline() {
    g.selectAll('.coastline')
        .data(geojsonData.features)
        .enter().append('path')
        .attr('class', 'coastline')
        .attr('d', pathGenerator)
        .attr('stroke', '#353538')
        .attr('fill', 'none');
}

function updateVisualization() {
    var selectedVariable = document.getElementById('variable-select').value;
    var selectedFile = document.getElementById('selected-filename').getAttribute('data-filename');
    var selectedTime = document.getElementById('time-slider').value;
    var selectedLevel = document.getElementById('level-slider').value; // Get the level value

    // Get min and max values from the input fields
    var minValue = parseFloat(document.getElementById('min-value').value);
    var maxValue = parseFloat(document.getElementById('max-value').value);

    fetch(`/wx_viewer/variable_data/${selectedFile}/${selectedVariable}/?time=${selectedTime}&level=${selectedLevel}`)
        .then(response => response.json())
        .then(data => {
            // Compute the geographic extent of the data points
            var bounds = d3.geoBounds({
                type: "FeatureCollection",
                features: data.map(d => ({
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [d.longitude, d.latitude] }
                }))
            });

            // Define the scale and translate to center the map
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
            d3.selectAll("circle").remove();

            // Define color scale based on min and max values
            const values = data.map(d => d.value);
            if (!isNaN(minValue)) {
                minValue = Math.min(minValue, d3.min(values));
            } else {
                minValue = d3.min(values);
            }
            if (!isNaN(maxValue)) {
                maxValue = Math.max(maxValue, d3.max(values));
            } else {
                maxValue = d3.max(values);
            }
            // console.log('Min value:', minValue); // Debugging
            // console.log('Max value:', maxValue); // Debugging

            colorScale = d3.scaleSequential(d3.interpolateViridis)
                .domain([minValue, maxValue]);

            // Update the input fields for min and max values
            document.getElementById('min-value').value = minValue.toFixed(2);
            document.getElementById('max-value').value = maxValue.toFixed(2);

            var tooltipFrozen = false; // Flag to control the state of the tooltip

            // Add new data points as squares
            g.selectAll('rect')
                .data(data)
                .enter().append('rect')
                .attr('x', d => projection([d.longitude, d.latitude])[0] - gridSide / 2)  // Center the square on the projected point
                .attr('y', d => projection([d.longitude, d.latitude])[1] - gridSide / 2)
                .attr('width', gridSide)  // gridSide is the length of the side of each square
                .attr('height', gridSide)
                .attr('fill', d => colorScale(d.value))  // Apply color based on the value
                .attr('opacity', 0.9)
                .on("mouseover", function(event, d) {
                    if (!tooltipFrozen) {
                        tooltip.transition()
                            .duration(50)
                            .style("opacity", .9);
                        tooltip.html(`<strong>Value:</strong> ${d.value.toFixed(2)}`)
                            .style("left", (event.pageX) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    }
                })
                .on("mouseout", function() {
                    if (!tooltipFrozen) {
                        tooltip.transition()
                            .duration(50)
                            .style("opacity", 0);
                    }
                })
                .on("click", function() {
                    tooltipFrozen = !tooltipFrozen;
                    if (!tooltipFrozen) {  // Hide both tooltip and red dot when unfreezing
                        tooltip.style("opacity", 0);
                    }
                });

            // Update the time and level values
            const firstDataPoint = data[0]; // Get the first data point
            document.getElementById('slider-value').textContent = firstDataPoint.time;

            // Convert level from meters to feet
            const levelInFeet = Math.round(firstDataPoint.level * 3.28084); // Convert to feet and round to 2 decimal places
            document.getElementById('level-value').textContent = `${levelInFeet} ft`; // Set the level in feet

        })
        .catch(error => console.error('Error fetching variable data:', error));
    
    // Redraw coastline
    drawCoastline();   
}


// Initialize D3 visualization
var projection = d3.geoMercator()
    .scale(200)
    .translate([300, 200]);
var pathGenerator = d3.geoPath()
    .projection(projection);
var zoom = d3.zoom()
    .scaleExtent([1, 150])
    .on('zoom', zoomed);
var svg = d3.select('#d3-container')
    .append('svg')
    .attr('width', 945)
    .attr('height', 680)
    .call(zoom);
var g = svg.append("g");

// Create a tooltip div that is hidden by default
var tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')

// Initially define a base size for the grid squares
var baseGridSize = 5; // Base size in pixels

// Function to calculate grid size based on the zoom level
function calculateGridSize(transformScale) {
    return baseGridSize / transformScale; // Adjust the grid size inversely with the zoom scale
}

// Inside your zoomed function, update gridSide based on the current zoom scale
function zoomed(event) {
    g.attr('transform', event.transform);

    var mapCenter = projection.invert([svg.attr('width') / 2, svg.attr('height') / 2]);
    //console.log('Map Center:', mapCenter);

    g.selectAll('.coastline')
        .attr('stroke-width', 1 / event.transform.k + 'px');

    // Update gridSide based on the current zoom level
    gridSide = calculateGridSize(event.transform.k);

    // Redraw or adjust the grid squares if needed
    g.selectAll('rect')
        .attr('width', gridSide)
        .attr('height', gridSide)
        .attr('x', d => projection([d.longitude, d.latitude])[0] - gridSide / 2)
        .attr('y', d => projection([d.longitude, d.latitude])[1] - gridSide / 2);
    
    // Redraw coastline
    drawCoastline(); 
}

// When initializing your visualization, set an initial value for gridSide
var gridSide = calculateGridSize(1); // Assuming the initial zoom scale is 1
