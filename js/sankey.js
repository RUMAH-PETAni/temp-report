
// --- Data & helpers (unchanged from your prior file assumptions) ---
const benuaOrder = ["Amerika","Eropa","Asia","Lainnya"];
const negaraOrder = ["Inggris","Belgia","Jerman","Rusia","Italia","Prancis"];
const rawData = [
  // [Benua, Negara, Volume]
  ["Eropa","Inggris", 6500],
  ["Eropa","Belgia", 8200],
  ["Eropa","Jerman", 12000],
  ["Eropa","Rusia", 3000],
  ["Eropa","Italia", 7800],
  ["Eropa","Prancis", 5400],
];

const total = rawData.reduce((a,b)=>a+b[2],0);

const benuaColors = {
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

function drawSankey(){
  const container = document.querySelector(".sankey-container");
  const svg = d3.select("#sankey");

  if(!container || svg.empty()) return;

  // Hitung lebar aktual: ambil lebar kontainer (sudah termasuk padding 10px kiri/kanan)
  // Kita gunakan clientWidth agar mengikuti layout tanpa menambah scroll horizontal
  const containerWidth = container.clientWidth;
  const width = Math.max(280, containerWidth); // tetap ada batas minimum
  const height = parseInt(svg.style("height")) || 400; // tinggi tetap

  // Bersihkan render sebelumnya + tooltip lama agar tidak dobel
  svg.selectAll("*").remove();
  d3.selectAll("div.tooltip").remove();

  // Terapkan atribut width/height ke SVG agar ukuran fix, tanpa memengaruhi font/tinggi
  svg.attr("width", width).attr("height", height);

  // Build nodes/links
  let nodes = [{ name: "Asia Makmur", type: "root" }];
  benuaOrder.forEach((b) => nodes.push({ name: b, type: "benua" }));
  negaraOrder.forEach((n) => {
    let benua = rawData.find((r) => r[1] === n)[0];
    nodes.push({ name: n, type: "negara", benua });
  });

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

  // Margin sisi dalam untuk node/label
  const innerLeftRight = 40;

  const sankey = d3.sankey()
    .nodeWidth(14)
    .nodePadding(10)
    .extent([[innerLeftRight, 1], [width - innerLeftRight, height - 6]])
    .nodeSort((a, b) => sortMap[a.name] - sortMap[b.name]);

  const { nodes: graphNodes, links: graphLinks } = sankey({
    nodes: nodes.map((d) => Object.assign({}, d)),
    links: links.map((d) => Object.assign({}, d)),
  });

  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  const color = (d) => {
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

  const marginLabel = 6;

  const node = svg.append("g")
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
    .attr("x", (d) => (d.x0 < width / 2 ? d.x1 + marginLabel : d.x0 - marginLabel))
    .attr("y", (d) => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", (d) => (d.x0 < width / 2 ? "start" : "end"))
    .text((d) => d.name)
    .each(function(d) {
      const available = d.x0 < width / 2
        ? width - (d.x1 + marginLabel)   // ruang ke kanan
        : d.x0 - marginLabel;            // ruang ke kiri
      truncateText(d3.select(this), Math.max(0, available - 4));
    });
}

window.addEventListener("resize", drawSankey);
drawSankey();
