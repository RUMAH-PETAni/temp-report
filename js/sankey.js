let rawData = [
  ["Amerika", "US", 1512],
  ["Asia", "Filipina", 920],
  ["Asia", "Malaysia", 1498],
  ["Eropa", "UK", 4847],
  ["Eropa", "Belgia", 3564],
  ["Eropa", "Jerman", 3326],
  ["Eropa", "Rusia", 2700],
  ["Eropa", "Italia", 1643],
  ["Eropa", "Prancis", 432],
  ["Eropa", "Georgia", 401],
  ["Lainnya", "Lain-lain", 1247],
];

const total = rawData.reduce((sum, r) => sum + r[2], 0);

// Sorting
let negaraOrder = [...rawData]
  .sort((a, b) => {
    if (a[1] === "Lain-lain") return 1;
    if (b[1] === "Lain-lain") return -1;
    return b[2] - a[2];
  })
  .map((r) => r[1]);

let benuaOrder = [...new Set(rawData.map((r) => r[0]))].sort((a, b) => {
  if (a === "Lainnya") return 1;
  if (b === "Lainnya") return -1;
  return a.localeCompare(b);
});

let benuaColors = {
  Amerika: "#ff7f0e",
  Asia: "#2ca02c",
  Eropa: "#1f77b4",
  Lainnya: "#7f7f7f",
};

function truncateText(textSel, maxWidth) {
  textSel.each(function(d) {
    const self = this;
    const t = d3.select(self);
    let s = d.name;
    t.text(s);
    let len = self.getComputedTextLength();
    if (maxWidth <= 0) { t.text(''); return; }
    if (len <= maxWidth) return;
    while (s.length && self.getComputedTextLength() > maxWidth) {
      s = s.slice(0, -1);
      t.text(s + "…");
    }
  });
}

function drawSankey() {
  let svg = d3.select("#sankey");
  let width = Math.floor(svg.node().clientWidth); // sesuai 100vw
  let height = parseInt(svg.style("height"));

  svg.selectAll("*").remove(); // clear previous
  d3.selectAll("div.tooltip").remove(); // buang tooltip lama agar tidak numpuk

  // build nodes
  let nodes = [{ name: "Asia Makmur", type: "root" }];
  benuaOrder.forEach((b) => nodes.push({ name: b, type: "benua" }));
  negaraOrder.forEach((n) => {
    let benua = rawData.find((r) => r[1] === n)[0];
    nodes.push({ name: n, type: "negara", benua });
  });

  // build links
  let links = [];
  benuaOrder.forEach((b) => {
    let vol = rawData.filter((r) => r[0] === b).reduce((sum, r) => sum + r[2], 0);
    links.push({ source: "Asia Makmur", target: b, value: vol, benua: b });
  });
  negaraOrder.forEach((n) => {
    let entry = rawData.find((r) => r[1] === n);
    links.push({ source: entry[0], target: n, value: entry[2], benua: entry[0] });
  });

  let nodeIndex = {};
  nodes.forEach((n, i) => (nodeIndex[n.name] = i));
  links.forEach((l) => {
    l.source = nodeIndex[l.source];
    l.target = nodeIndex[l.target];
  });

  let sortMap = {};
  nodes.forEach((n) => {
    if (n.type === "benua") sortMap[n.name] = benuaOrder.indexOf(n.name);
    if (n.type === "negara") sortMap[n.name] = negaraOrder.indexOf(n.name);
  });

  let sankey = d3.sankey()
    .nodeWidth(20)
    .nodePadding(15)
    .extent([[1, 1], [width - 1, height - 6]])
    .nodeSort((a, b) => sortMap[a.name] - sortMap[b.name]);

  let { nodes: graphNodes, links: graphLinks } = sankey({
    nodes: nodes.map((d) => Object.assign({}, d)),
    links: links.map((d) => Object.assign({}, d)),
  });

  let tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  let color = (d) => {
    if (d.type === "root") return "#ccc";
    if (d.type === "benua") return benuaColors[d.name] || "#ccc";
    return benuaColors[d.benua] || "#ccc";
  };

  svg.append("g")
    .attr("fill", "none")
    .attr("stroke-opacity", 0.4)
    .selectAll("path")
    .data(graphLinks)
    .join("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", (d) => color({ type: "benua", name: d.benua }))
    .attr("stroke-width", (d) => Math.max(1, d.width))
    .on("mousemove", function (event, d) {
      tooltip.style("opacity", 1)
        .html(`<strong>${graphNodes[d.source.index].name} ➜ ${graphNodes[d.target.index].name}</strong><br/>
               Volume: ${d.value.toLocaleString("id-ID")} ton<br/>
               Persentase total: ${((d.value / total) * 100).toFixed(2)}%`)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + 10 + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0))
    .on("touchstart", function (event, d) {
      event.preventDefault();
      let touch = event.touches[0];
      tooltip.style("opacity", 1)
        .html(`<strong>${graphNodes[d.source.index].name} ➜ ${graphNodes[d.target.index].name}</strong><br/>
               Volume: ${d.value.toLocaleString("id-ID")} ton<br/>
               Persentase total: ${((d.value / total) * 100).toFixed(2)}%`)
        .style("left", touch.pageX + 10 + "px")
        .style("top", touch.pageY + 10 + "px");
    })
    .on("touchend", () => tooltip.style("opacity", 0));

  const margin = 6;

  let node = svg.append("g")
    .selectAll("g")
    .data(graphNodes)
    .join("g")
    .attr("class", "node");

  node.append("rect")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("width", sankey.nodeWidth())
    .attr("fill", color)
    .attr("stroke", "#000");

  node.append("text")
    .attr("x", (d) => (d.x0 < width / 2 ? d.x1 + margin : d.x0 - margin))
    .attr("y", (d) => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", (d) => (d.x0 < width / 2 ? "start" : "end"))
    .text((d) => d.name)
    .each(function(d) {
      const available = d.x0 < width / 2
        ? width - (d.x1 + margin)   // ruang ke kanan
        : d.x0 - margin;            // ruang ke kiri
      truncateText(d3.select(this), Math.max(0, available - 4));
    });
}

window.addEventListener("resize", drawSankey);
drawSankey();
