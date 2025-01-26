const apiUrl = 'https://api.electricitymap.org/v3/power-breakdown/history?zone=GB';
const apiKey = fetch("auth.txt")
.then((res) => res.text())
.catch((e) => console.error(e));

// set the dimensions and margins of the graph
var margin = {top: 20, right: 30, bottom: 20, left: 30},
    width = window.innerWidth - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

  window.addEventListener('resize', () => {
      width = window.innerWidth - margin.left - margin.right;
      d3.select('svg').attr('width', width);
      // Redraw the chart here if necessary
  });

// append the svg object to the body of the page
var svg = d3.select("#my_dataviz")
  .append("svg")
    .attr("width", "100%")
    .attr("height", height + margin.top + margin.bottom)
    svg.attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
  .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

fetch(apiUrl, {
  headers: {
    'auth-token': `${apiKey}`
  }
})
  .then(response => response.json())
  .then(data => {
    const history = data.history.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    // Find the latest hour
    const latestHour = new Date(history[history.length - 1].datetime).getHours();

    // Prepare the data for visualization
    const formattedData = history.map(entry => ({
      datetime: new Date(entry.datetime),
      hoursAgo: (new Date(entry.datetime).getHours() - latestHour + 23) % 24 - 23, // Range -23 to 0
      coal: entry.powerConsumptionBreakdown.coal || 0,
      oil: entry.powerConsumptionBreakdown.oil || 0,
      gas: entry.powerConsumptionBreakdown.gas || 0,
      nuclear: entry.powerConsumptionBreakdown.nuclear || 0,
      solar: entry.powerConsumptionBreakdown.solar || 0,
      hydro: entry.powerConsumptionBreakdown.hydro || 0,
      geothermal: entry.powerConsumptionBreakdown.geothermal || 0,
      biomass: entry.powerConsumptionBreakdown.biomass || 0,
      unknown: entry.powerConsumptionBreakdown.unknown || 0
    }));

    // Group data by hour
    let groupedData = d3.groups(formattedData, d => d.hoursAgo)
      .map(([hoursAgo, records]) => {
        const totals = records.reduce((acc, record) => {
          acc.coal += record.coal;
          acc.oil += record.oil;
          acc.gas += record.gas;
          acc.nuclear += record.nuclear;
          acc.solar += record.solar;
          acc.hydro += record.hydro;
          acc.geothermal += record.geothermal;
          acc.biomass += record.biomass;
          acc.unknown += record.unknown;
          return acc;
        }, { coal: 0, oil: 0, gas: 0, nuclear: 0, solar: 0,
          hydro: 0, geothermal: 0, biomass: 0, unknown: 0
        });
        return { hoursAgo, ...totals };
      });

    // Create keys for stacking
    const keys = ["coal", "oil", "gas", "nuclear",
      "solar", "hydro", "geothermal", "biomass", 
      "unknown"
    ];

    // Set up scales
    const x = d3.scaleLinear()
      .domain([-23, 0]) // Min and max of hours
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([d3.max(groupedData, 
        d => d.coal + d.oil + d.gas + d.nuclear +
      d.solar + d.hydro + d.geothermal + d.biomass + d.unknown) / 1.9 * -1, d3.max(groupedData, 
        d => d.coal + d.oil + d.gas + d.nuclear +
      d.solar + d.hydro + d.geothermal + d.biomass + d.unknown) / 1.9])
      .range([height, 0]);
    
    // set colours
    const keyColors = {
        coal: "#918f8e",       // grey
        oil: "#3b3938",        // black
        gas: "#594339",        // brown
        nuclear: "#395b82",    // dark blue
        solar: "#ccac37",      // yellow
        hydro: "#54c4b4",      // sky blue
        geothermal: "#6cc488", // light green
        biomass: "#65a160",    // green
        unknown: "#ded6ce"     // off white
      };

    const color = d3.scaleOrdinal()
      .domain(keys) // Keys from your dataset
      .range(keys.map(key => keyColors[key]));

    // Stack the data
    const stackedData = d3.stack()
      .keys(keys)
      .offset(d3.stackOffsetSilhouette) //stackOffsetSilhouette
      (groupedData);

      console.log(stackedData);

    // Add axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d => `${(latestHour+24+d) % 24}:00`));

    // Add an area generator
    const area = d3.area()
      .x(d => x(d.data.hoursAgo))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]));

      svg.selectAll(".layer")
      .data(stackedData)
      .join("path")
      .attr("class", "layer")
      .attr("d", area)
      .style("fill", d => color(d.key))
      .on("mouseover", (event, d) => {
        const key = d.key;
        updateLegend(key, true);
      })
      .on("mousemove", (event, d) => {
        const key = d.key;
        updateLegend(key, true);
      })
      .on("mouseleave", (event, d) => {
        updateLegend(null, false);
      });

    // Add legend container
    const legendContainer = d3.select("#my_dataviz")
      .append("div")
      .style("position", "absolute")
      .style("top", `${margin.top}px`)
      .style("left", `${margin.left}px`)
      .style("width", "200px");

    // Add legend items
    const legendItems = keys.map(key => {
      return legendContainer.append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "5px")
        .attr("data-key", key)
        .html(`<div style="width: 65px; height: 15px; background-color: ${color(key)}; margin-right: 5px;"></div>${key}: <span class="legend-value">0</span>`);
    });

    const highlightBox = legendContainer.append("div")
      .style("position", "absolute")
      .style("top", "0px")
      .style("left", "0px")
      .style("width", "100%")
      .style("height", "20px")
      .style("background-color", "rgba(255, 255, 0, 0.3)")
      .style("opacity", 0)
      .style("z-index", 3);

    function updateLegend(highlightKey, highlight) {
      legendItems.forEach(item => {
        const key = item.attr("data-key");
        const value = groupedData.reduce((sum, d) => sum + (d[key] || 0), 0);
        item.select(".legend-value").text(value.toFixed(2));

        if (highlight && key === highlightKey) {
          highlightBox.style("opacity", 1);
          highlightBox.style("top", `${item.node().offsetTop}px`);
        } else {
          highlightBox.style("opacity", 0);
        }
      });
    }

    // Add tooltip
    const tooltip = svg
      .append("text")
      .attr("x", 10)
      .attr("y", 10)
      .style("opacity", 0)
      .style("font-size", "14px");

    const mouseover = function () {
      let key = d3.select(this).key
      updateLegend(key, true);
      tooltip.style("opacity", 0);
      highlightBox.style("opacity", 1);
      d3.selectAll(".layer").style("opacity", 0.2);
      d3.select(this).style("opacity", 1).style("stroke", "594339");
    };

    const mousemove = function (event, d) {
      const category = d.key;
      tooltip.text(category);
    };

    const mouseleave = function () {
      tooltip.style("opacity", 0);
      d3.selectAll(".layer").style("opacity", 1).style("stroke", "none");
    };

    // Draw the streamgraph
    svg.selectAll(".layer")
      .data(stackedData)
      .join("path")
      .attr("class", "layer")
      .attr("d", area)
      .style("fill", d => color(d.key))
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave);
  })
  .catch(error => console.error('Error fetching data:', error));