(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cytoscapeGraphml = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){

module.exports = function (cy, $, options) {

  function xmlToString(xmlData) {

    var xmlString;
    //IE
    if (window.ActiveXObject) {
      xmlString = xmlData.xml;
    }
    // code for Mozilla, Firefox, Opera, etc.
    else {
      xmlString = (new XMLSerializer()).serializeToString(xmlData);
    }
    return xmlString;
  }


  function getEleData(ele) {
    var type = ele.isNode() ? "node" : "edge";
    var attrs = ["css", "data", "position"];
    var result = {};

    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i];
      var opt = options[type][attr];
      if (!opt)
        result[attr] = {};
      else if ($.isArray(opt)) {
        result[attr] = {};
        for (var j = 0; j < opt.length; j++){
          var el = opt[i];
          if (ele[attr](el))
            result[attr][el] = ele[attr](el);
        }
      } else{
        var eleAttr = ele[attr]();
        result[attr] = {};
        for (var key in eleAttr)
          if($.inArray(key, options[type].discludeds) < 0)
            result[attr][key] = { value: eleAttr[key], attrType: attr };

      }
    }

    return $.extend(result.css, result.data, result.position);
  }


  function parseNode(ele) {
    var node = '<node id="' + ele.id() + '">';

    var eleData = getEleData(ele);
    for (var key in eleData)
      node += '<data type="' + eleData[key].attrType + '" key="' + key + '">' + eleData[key].value + '</data>';


    if (ele.isParent()) {
      node += '<graph id="' + ele.id() + ':">';
      ele.children().each(function (i, child) {
        node += parseNode(child);
      });
      node += '</graph>'
    }

    node += '</node>';
    return node;
  }


  options.node.discludeds.push("id");
  options.edge.discludeds.push("id", "source", "target");

  var xmlDoc = $.parseXML(
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<graphml xmlns="http://graphml.graphdrawing.org/xmlns"\n' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n' +
    'xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns\n' +
    'http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">\n' +
    '  <graph>\n' +
    ' </graph>\n' +
    ' </graphml>\n'
  );
  var $xml = $(xmlDoc);

  var $graph = $xml.find("graph");

  cy.nodes().orphans().forEach(function (ele) {
    $graph.append(parseNode(ele));
  });

  cy.edges().forEach(function (ele) {

    var edge = '<edge id="' + ele.id() + '" source="' + ele.source().id() + '"' + ' target="' + ele.target().id() + '" >';

    var eleData = getEleData(ele);
    for (var key in eleData)
      edge += '<data key="' + key + '">' + eleData[key] + '</data>';

    edge += '</edge>';

    $graph.append(edge);

  });


  return xmlToString(xmlDoc);
};
},{}],2:[function(_dereq_,module,exports){
module.exports = function(cy, $, options, cyGraphML) {
    function renderNode($graph){
        $graph.find("node").each(function () {
            var $node = $(this);

            var settings = {
                data: {id: $node.attr("id")},
                css: {},
                position: {}
            };

            $node.find('data').each(function () {
                var $data = $(this);

                settings[$data.attr("type")][$data.attr("key")] = $data.text();

            });

            cy.add({
                group: "nodes",
                data: settings.data,
                css: settings.css,
                position: settings.position
            });

            $node.find("graph").each(function () {
                var $graph = $(this);

                renderNode($graph);
            })
        });
    }

    cy.batch(function () {
        xml = $.parseXML(cyGraphML);
        $xml = $(xml);

        $graphs = $xml.find("graph");

        $graphs.each(function () {
            var $graph = $(this);

            renderNode($graph);

            $graph.find("edge").each(function () {
                var $edge = $(this);

                var settings = {
                    data: {id: $edge.attr("id"), source: $edge.attr("source"), target: $edge.attr("target")},
                    css: {},
                    position: {}
                };

                $edge.find('data').each(function () {
                    var $data = $(this);

                    settings[$data.attr("type")][$data.attr("key")] = $data.text();

                });

                cy.add({
                    group: "edges",
                    data: settings.data,
                    css: settings.css
                });
            });

        });
        var layoutOptT = typeof options.layoutBy;
        if (layoutOptT == "string")
            cy.layout({name: "cose"});
        else if (layoutOptT == "function")
          options.layoutBy();
    });
};
},{}],3:[function(_dereq_,module,exports){
;(function () {
  'use strict';

  // registers the extension on a cytoscape lib ref
  var register = function (cytoscape, $) {

    if (!cytoscape || !$) {
      return;
    } // can't register if cytoscape unspecified

    var exporter = _dereq_("./exporter");
    var importer = _dereq_("./importer");


    var options = {
      node: {
        css: false,
        data: true,
        position: true,
        discludeds: []
      },
      edge: {
        css: false,
        data: true,
        discludeds: []
      },
      layoutBy: "cose" // string of layout name or layout function
    };



    cytoscape('core', 'graphml', function (cyGraphML) {
      var cy = this;
      var res;

      switch (typeof cyGraphML) {
        case "string": // import
          res = importer(cy, $, options, cyGraphML);
          break;
        case "object": // set options
          $.extend(true, options, cyGraphML);
          res = cy;
          break;
        case "undefined": // export
          res = exporter(cy, $, options);
          break;
        default:
          console.log("Functionality(argument) of .graphml() is not recognized.");
      }

      return res;
      
    });

  };

  if (typeof module !== 'undefined' && module.exports) { // expose as a commonjs module
    module.exports = register;
  }

  if (typeof define !== 'undefined' && define.amd) { // expose as an amd/requirejs module
    define('cytoscape-graphml', function () {
      return register;
    });
  }

  if (typeof cytoscape !== 'undefined' && typeof $ !== 'undefined') { // expose to global cytoscape (i.e. window.cytoscape)
    register(cytoscape, $);
  }

})();

},{"./exporter":1,"./importer":2}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZXhwb3J0ZXIuanMiLCJzcmMvaW1wb3J0ZXIuanMiLCJzcmMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjeSwgJCwgb3B0aW9ucykge1xyXG5cclxuICBmdW5jdGlvbiB4bWxUb1N0cmluZyh4bWxEYXRhKSB7XHJcblxyXG4gICAgdmFyIHhtbFN0cmluZztcclxuICAgIC8vSUVcclxuICAgIGlmICh3aW5kb3cuQWN0aXZlWE9iamVjdCkge1xyXG4gICAgICB4bWxTdHJpbmcgPSB4bWxEYXRhLnhtbDtcclxuICAgIH1cclxuICAgIC8vIGNvZGUgZm9yIE1vemlsbGEsIEZpcmVmb3gsIE9wZXJhLCBldGMuXHJcbiAgICBlbHNlIHtcclxuICAgICAgeG1sU3RyaW5nID0gKG5ldyBYTUxTZXJpYWxpemVyKCkpLnNlcmlhbGl6ZVRvU3RyaW5nKHhtbERhdGEpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHhtbFN0cmluZztcclxuICB9XHJcblxyXG5cclxuICBmdW5jdGlvbiBnZXRFbGVEYXRhKGVsZSkge1xyXG4gICAgdmFyIHR5cGUgPSBlbGUuaXNOb2RlKCkgPyBcIm5vZGVcIiA6IFwiZWRnZVwiO1xyXG4gICAgdmFyIGF0dHJzID0gW1wiY3NzXCIsIFwiZGF0YVwiLCBcInBvc2l0aW9uXCJdO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXR0cnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGF0dHIgPSBhdHRyc1tpXTtcclxuICAgICAgdmFyIG9wdCA9IG9wdGlvbnNbdHlwZV1bYXR0cl07XHJcbiAgICAgIGlmICghb3B0KVxyXG4gICAgICAgIHJlc3VsdFthdHRyXSA9IHt9O1xyXG4gICAgICBlbHNlIGlmICgkLmlzQXJyYXkob3B0KSkge1xyXG4gICAgICAgIHJlc3VsdFthdHRyXSA9IHt9O1xyXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgb3B0Lmxlbmd0aDsgaisrKXtcclxuICAgICAgICAgIHZhciBlbCA9IG9wdFtpXTtcclxuICAgICAgICAgIGlmIChlbGVbYXR0cl0oZWwpKVxyXG4gICAgICAgICAgICByZXN1bHRbYXR0cl1bZWxdID0gZWxlW2F0dHJdKGVsKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZXtcclxuICAgICAgICB2YXIgZWxlQXR0ciA9IGVsZVthdHRyXSgpO1xyXG4gICAgICAgIHJlc3VsdFthdHRyXSA9IHt9O1xyXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBlbGVBdHRyKVxyXG4gICAgICAgICAgaWYoJC5pbkFycmF5KGtleSwgb3B0aW9uc1t0eXBlXS5kaXNjbHVkZWRzKSA8IDApXHJcbiAgICAgICAgICAgIHJlc3VsdFthdHRyXVtrZXldID0geyB2YWx1ZTogZWxlQXR0cltrZXldLCBhdHRyVHlwZTogYXR0ciB9O1xyXG5cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiAkLmV4dGVuZChyZXN1bHQuY3NzLCByZXN1bHQuZGF0YSwgcmVzdWx0LnBvc2l0aW9uKTtcclxuICB9XHJcblxyXG5cclxuICBmdW5jdGlvbiBwYXJzZU5vZGUoZWxlKSB7XHJcbiAgICB2YXIgbm9kZSA9ICc8bm9kZSBpZD1cIicgKyBlbGUuaWQoKSArICdcIj4nO1xyXG5cclxuICAgIHZhciBlbGVEYXRhID0gZ2V0RWxlRGF0YShlbGUpO1xyXG4gICAgZm9yICh2YXIga2V5IGluIGVsZURhdGEpXHJcbiAgICAgIG5vZGUgKz0gJzxkYXRhIHR5cGU9XCInICsgZWxlRGF0YVtrZXldLmF0dHJUeXBlICsgJ1wiIGtleT1cIicgKyBrZXkgKyAnXCI+JyArIGVsZURhdGFba2V5XS52YWx1ZSArICc8L2RhdGE+JztcclxuXHJcblxyXG4gICAgaWYgKGVsZS5pc1BhcmVudCgpKSB7XHJcbiAgICAgIG5vZGUgKz0gJzxncmFwaCBpZD1cIicgKyBlbGUuaWQoKSArICc6XCI+JztcclxuICAgICAgZWxlLmNoaWxkcmVuKCkuZWFjaChmdW5jdGlvbiAoaSwgY2hpbGQpIHtcclxuICAgICAgICBub2RlICs9IHBhcnNlTm9kZShjaGlsZCk7XHJcbiAgICAgIH0pO1xyXG4gICAgICBub2RlICs9ICc8L2dyYXBoPidcclxuICAgIH1cclxuXHJcbiAgICBub2RlICs9ICc8L25vZGU+JztcclxuICAgIHJldHVybiBub2RlO1xyXG4gIH1cclxuXHJcblxyXG4gIG9wdGlvbnMubm9kZS5kaXNjbHVkZWRzLnB1c2goXCJpZFwiKTtcclxuICBvcHRpb25zLmVkZ2UuZGlzY2x1ZGVkcy5wdXNoKFwiaWRcIiwgXCJzb3VyY2VcIiwgXCJ0YXJnZXRcIik7XHJcblxyXG4gIHZhciB4bWxEb2MgPSAkLnBhcnNlWE1MKFxyXG4gICAgJzw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cIlVURi04XCI/PlxcbicgK1xyXG4gICAgJzxncmFwaG1sIHhtbG5zPVwiaHR0cDovL2dyYXBobWwuZ3JhcGhkcmF3aW5nLm9yZy94bWxuc1wiXFxuJyArXHJcbiAgICAneG1sbnM6eHNpPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEtaW5zdGFuY2VcIlxcbicgK1xyXG4gICAgJ3hzaTpzY2hlbWFMb2NhdGlvbj1cImh0dHA6Ly9ncmFwaG1sLmdyYXBoZHJhd2luZy5vcmcveG1sbnNcXG4nICtcclxuICAgICdodHRwOi8vZ3JhcGhtbC5ncmFwaGRyYXdpbmcub3JnL3htbG5zLzEuMC9ncmFwaG1sLnhzZFwiPlxcbicgK1xyXG4gICAgJyAgPGdyYXBoPlxcbicgK1xyXG4gICAgJyA8L2dyYXBoPlxcbicgK1xyXG4gICAgJyA8L2dyYXBobWw+XFxuJ1xyXG4gICk7XHJcbiAgdmFyICR4bWwgPSAkKHhtbERvYyk7XHJcblxyXG4gIHZhciAkZ3JhcGggPSAkeG1sLmZpbmQoXCJncmFwaFwiKTtcclxuXHJcbiAgY3kubm9kZXMoKS5vcnBoYW5zKCkuZm9yRWFjaChmdW5jdGlvbiAoZWxlKSB7XHJcbiAgICAkZ3JhcGguYXBwZW5kKHBhcnNlTm9kZShlbGUpKTtcclxuICB9KTtcclxuXHJcbiAgY3kuZWRnZXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChlbGUpIHtcclxuXHJcbiAgICB2YXIgZWRnZSA9ICc8ZWRnZSBpZD1cIicgKyBlbGUuaWQoKSArICdcIiBzb3VyY2U9XCInICsgZWxlLnNvdXJjZSgpLmlkKCkgKyAnXCInICsgJyB0YXJnZXQ9XCInICsgZWxlLnRhcmdldCgpLmlkKCkgKyAnXCIgPic7XHJcblxyXG4gICAgdmFyIGVsZURhdGEgPSBnZXRFbGVEYXRhKGVsZSk7XHJcbiAgICBmb3IgKHZhciBrZXkgaW4gZWxlRGF0YSlcclxuICAgICAgZWRnZSArPSAnPGRhdGEga2V5PVwiJyArIGtleSArICdcIj4nICsgZWxlRGF0YVtrZXldICsgJzwvZGF0YT4nO1xyXG5cclxuICAgIGVkZ2UgKz0gJzwvZWRnZT4nO1xyXG5cclxuICAgICRncmFwaC5hcHBlbmQoZWRnZSk7XHJcblxyXG4gIH0pO1xyXG5cclxuXHJcbiAgcmV0dXJuIHhtbFRvU3RyaW5nKHhtbERvYyk7XHJcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjeSwgJCwgb3B0aW9ucywgY3lHcmFwaE1MKSB7XHJcbiAgICBmdW5jdGlvbiByZW5kZXJOb2RlKCRncmFwaCl7XHJcbiAgICAgICAgJGdyYXBoLmZpbmQoXCJub2RlXCIpLmVhY2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgJG5vZGUgPSAkKHRoaXMpO1xyXG5cclxuICAgICAgICAgICAgdmFyIHNldHRpbmdzID0ge1xyXG4gICAgICAgICAgICAgICAgZGF0YToge2lkOiAkbm9kZS5hdHRyKFwiaWRcIil9LFxyXG4gICAgICAgICAgICAgICAgY3NzOiB7fSxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB7fVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgJG5vZGUuZmluZCgnZGF0YScpLmVhY2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyICRkYXRhID0gJCh0aGlzKTtcclxuXHJcbiAgICAgICAgICAgICAgICBzZXR0aW5nc1skZGF0YS5hdHRyKFwidHlwZVwiKV1bJGRhdGEuYXR0cihcImtleVwiKV0gPSAkZGF0YS50ZXh0KCk7XHJcblxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGN5LmFkZCh7XHJcbiAgICAgICAgICAgICAgICBncm91cDogXCJub2Rlc1wiLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogc2V0dGluZ3MuZGF0YSxcclxuICAgICAgICAgICAgICAgIGNzczogc2V0dGluZ3MuY3NzLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHNldHRpbmdzLnBvc2l0aW9uXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgJG5vZGUuZmluZChcImdyYXBoXCIpLmVhY2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyICRncmFwaCA9ICQodGhpcyk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmVuZGVyTm9kZSgkZ3JhcGgpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGN5LmJhdGNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB4bWwgPSAkLnBhcnNlWE1MKGN5R3JhcGhNTCk7XHJcbiAgICAgICAgJHhtbCA9ICQoeG1sKTtcclxuXHJcbiAgICAgICAgJGdyYXBocyA9ICR4bWwuZmluZChcImdyYXBoXCIpO1xyXG5cclxuICAgICAgICAkZ3JhcGhzLmVhY2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgJGdyYXBoID0gJCh0aGlzKTtcclxuXHJcbiAgICAgICAgICAgIHJlbmRlck5vZGUoJGdyYXBoKTtcclxuXHJcbiAgICAgICAgICAgICRncmFwaC5maW5kKFwiZWRnZVwiKS5lYWNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciAkZWRnZSA9ICQodGhpcyk7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIHNldHRpbmdzID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtpZDogJGVkZ2UuYXR0cihcImlkXCIpLCBzb3VyY2U6ICRlZGdlLmF0dHIoXCJzb3VyY2VcIiksIHRhcmdldDogJGVkZ2UuYXR0cihcInRhcmdldFwiKX0sXHJcbiAgICAgICAgICAgICAgICAgICAgY3NzOiB7fSxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjoge31cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgJGVkZ2UuZmluZCgnZGF0YScpLmVhY2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciAkZGF0YSA9ICQodGhpcyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzWyRkYXRhLmF0dHIoXCJ0eXBlXCIpXVskZGF0YS5hdHRyKFwia2V5XCIpXSA9ICRkYXRhLnRleHQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBjeS5hZGQoe1xyXG4gICAgICAgICAgICAgICAgICAgIGdyb3VwOiBcImVkZ2VzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogc2V0dGluZ3MuZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICBjc3M6IHNldHRpbmdzLmNzc1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9KTtcclxuICAgICAgICB2YXIgbGF5b3V0T3B0VCA9IHR5cGVvZiBvcHRpb25zLmxheW91dEJ5O1xyXG4gICAgICAgIGlmIChsYXlvdXRPcHRUID09IFwic3RyaW5nXCIpXHJcbiAgICAgICAgICAgIGN5LmxheW91dCh7bmFtZTogXCJjb3NlXCJ9KTtcclxuICAgICAgICBlbHNlIGlmIChsYXlvdXRPcHRUID09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICAgIG9wdGlvbnMubGF5b3V0QnkoKTtcclxuICAgIH0pO1xyXG59OyIsIjsoZnVuY3Rpb24gKCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gcmVnaXN0ZXJzIHRoZSBleHRlbnNpb24gb24gYSBjeXRvc2NhcGUgbGliIHJlZlxyXG4gIHZhciByZWdpc3RlciA9IGZ1bmN0aW9uIChjeXRvc2NhcGUsICQpIHtcclxuXHJcbiAgICBpZiAoIWN5dG9zY2FwZSB8fCAhJCkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9IC8vIGNhbid0IHJlZ2lzdGVyIGlmIGN5dG9zY2FwZSB1bnNwZWNpZmllZFxyXG5cclxuICAgIHZhciBleHBvcnRlciA9IHJlcXVpcmUoXCIuL2V4cG9ydGVyXCIpO1xyXG4gICAgdmFyIGltcG9ydGVyID0gcmVxdWlyZShcIi4vaW1wb3J0ZXJcIik7XHJcblxyXG5cclxuICAgIHZhciBvcHRpb25zID0ge1xyXG4gICAgICBub2RlOiB7XHJcbiAgICAgICAgY3NzOiBmYWxzZSxcclxuICAgICAgICBkYXRhOiB0cnVlLFxyXG4gICAgICAgIHBvc2l0aW9uOiB0cnVlLFxyXG4gICAgICAgIGRpc2NsdWRlZHM6IFtdXHJcbiAgICAgIH0sXHJcbiAgICAgIGVkZ2U6IHtcclxuICAgICAgICBjc3M6IGZhbHNlLFxyXG4gICAgICAgIGRhdGE6IHRydWUsXHJcbiAgICAgICAgZGlzY2x1ZGVkczogW11cclxuICAgICAgfSxcclxuICAgICAgbGF5b3V0Qnk6IFwiY29zZVwiIC8vIHN0cmluZyBvZiBsYXlvdXQgbmFtZSBvciBsYXlvdXQgZnVuY3Rpb25cclxuICAgIH07XHJcblxyXG5cclxuXHJcbiAgICBjeXRvc2NhcGUoJ2NvcmUnLCAnZ3JhcGhtbCcsIGZ1bmN0aW9uIChjeUdyYXBoTUwpIHtcclxuICAgICAgdmFyIGN5ID0gdGhpcztcclxuICAgICAgdmFyIHJlcztcclxuXHJcbiAgICAgIHN3aXRjaCAodHlwZW9mIGN5R3JhcGhNTCkge1xyXG4gICAgICAgIGNhc2UgXCJzdHJpbmdcIjogLy8gaW1wb3J0XHJcbiAgICAgICAgICByZXMgPSBpbXBvcnRlcihjeSwgJCwgb3B0aW9ucywgY3lHcmFwaE1MKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJvYmplY3RcIjogLy8gc2V0IG9wdGlvbnNcclxuICAgICAgICAgICQuZXh0ZW5kKHRydWUsIG9wdGlvbnMsIGN5R3JhcGhNTCk7XHJcbiAgICAgICAgICByZXMgPSBjeTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJ1bmRlZmluZWRcIjogLy8gZXhwb3J0XHJcbiAgICAgICAgICByZXMgPSBleHBvcnRlcihjeSwgJCwgb3B0aW9ucyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgY29uc29sZS5sb2coXCJGdW5jdGlvbmFsaXR5KGFyZ3VtZW50KSBvZiAuZ3JhcGhtbCgpIGlzIG5vdCByZWNvZ25pemVkLlwiKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHJlcztcclxuICAgICAgXHJcbiAgICB9KTtcclxuXHJcbiAgfTtcclxuXHJcbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7IC8vIGV4cG9zZSBhcyBhIGNvbW1vbmpzIG1vZHVsZVxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSByZWdpc3RlcjtcclxuICB9XHJcblxyXG4gIGlmICh0eXBlb2YgZGVmaW5lICE9PSAndW5kZWZpbmVkJyAmJiBkZWZpbmUuYW1kKSB7IC8vIGV4cG9zZSBhcyBhbiBhbWQvcmVxdWlyZWpzIG1vZHVsZVxyXG4gICAgZGVmaW5lKCdjeXRvc2NhcGUtZ3JhcGhtbCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIHJlZ2lzdGVyO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBpZiAodHlwZW9mIGN5dG9zY2FwZSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mICQgIT09ICd1bmRlZmluZWQnKSB7IC8vIGV4cG9zZSB0byBnbG9iYWwgY3l0b3NjYXBlIChpLmUuIHdpbmRvdy5jeXRvc2NhcGUpXHJcbiAgICByZWdpc3RlcihjeXRvc2NhcGUsICQpO1xyXG4gIH1cclxuXHJcbn0pKCk7XHJcbiJdfQ==
